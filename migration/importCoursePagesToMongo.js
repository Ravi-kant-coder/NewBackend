require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const cheerio = require("cheerio");

const CoursePage = require("../model/CoursePage");

// ==================================================
// CONFIGURATION
// ==================================================

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const ASSET_BASE = "https://www.onlinejapaneseclasses.com";

const SOURCE_DIR = path.join(__dirname, "source");

const REPORT_FILE = path.join(__dirname, "course-page-migration-report.json");

const PARSER_VERSION = "3.0";

// ==================================================
// URL HELPERS
// ==================================================

function normalizePath(value) {
  if (!value) {
    return null;
  }

  return String(value)
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "");
}

function makeAbsoluteUrl(value, baseUrl = ASSET_BASE) {
  if (!value) {
    return null;
  }

  const original = String(value).trim();

  if (!original) {
    return null;
  }

  // Don't modify special browser URLs.
  if (
    original.startsWith("#") ||
    original.startsWith("javascript:") ||
    original.startsWith("mailto:") ||
    original.startsWith("tel:")
  ) {
    return original;
  }

  try {
    return new URL(original, `${baseUrl}/`).href;
  } catch {
    return original;
  }
}

function makeLegacyHref(value) {
  if (!value) {
    return null;
  }

  return normalizePath(value);
}

// ==================================================
// SOURCE URL
// ==================================================

function makeSourceUrl(filePath) {
  const relativePath = path
    .relative(SOURCE_DIR, filePath)
    .split(path.sep)
    .join("/");

  return makeAbsoluteUrl(relativePath);
}

// ==================================================
// FIND ALL PHP FILES
// ==================================================
//
// IMPORTANT:
//
// There is deliberately NO filename filter here.
//
// The user's cleaned source directory is the
// whitelist.
//
// Every PHP file found here is migrated.
//

function getAllPhpFiles(directory) {
  const entries = fs.readdirSync(directory, {
    withFileTypes: true,
  });

  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...getAllPhpFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".php")) {
      files.push(fullPath);
    }
  }

  return files.sort((a, b) =>
    a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

// ==================================================
// REMOVE NON-CONTENT HTML
// ==================================================
//
// We don't want legacy header/footer/scripts/etc.
// to become course content.
//
// This does NOT decide which PHP pages to import.
// It only cleans the HTML representation of each
// imported page.
//

function cleanDocument($) {
  $(["script", "style", "noscript", "template", "iframe"].join(",")).remove();

  // These are common site-wide elements.
  //
  // We intentionally do NOT remove generic .container
  // elements because many actual course list pages
  // use them as their main content wrapper.
  $(["header", "footer", "nav"].join(",")).remove();
}

// ==================================================
// FIND MAIN CONTENT ROOT
// ==================================================

function findMainContainer($) {
  const pageBody = $(".pagebdy").first();

  if (pageBody.length) {
    return pageBody;
  }

  // Some catalog/list pages don't use .pagebdy.
  const main = $("main").first();

  if (main.length) {
    return main;
  }

  // Generic fallback.
  const body = $("body").first();

  if (body.length) {
    return body;
  }

  return $.root();
}

// ==================================================
// NORMALIZE HTML ATTRIBUTES
// ==================================================
//
// For fallback HTML blocks we still want the old
// relative asset paths converted to the www domain.
//

function normalizeHtmlAttributes($, root) {
  root.find("img").each((_, element) => {
    const el = $(element);

    const src = el.attr("src");

    if (src) {
      el.attr("src", makeAbsoluteUrl(src));
    }

    const srcset = el.attr("srcset");

    if (srcset) {
      const normalized = srcset
        .split(",")
        .map((part) => {
          const pieces = part.trim().split(/\s+/);

          if (!pieces.length) {
            return part;
          }

          pieces[0] = makeAbsoluteUrl(pieces[0]);

          return pieces.join(" ");
        })
        .join(", ");

      el.attr("srcset", normalized);
    }
  });

  root.find("audio").each((_, element) => {
    const el = $(element);

    const src = el.attr("src");

    if (src) {
      el.attr("src", makeAbsoluteUrl(src));
    }
  });

  root.find("source").each((_, element) => {
    const el = $(element);

    const src = el.attr("src");

    if (src) {
      el.attr("src", makeAbsoluteUrl(src));
    }
  });

  root.find("a").each((_, element) => {
    const el = $(element);

    const href = el.attr("href");

    if (href) {
      el.attr("href", makeAbsoluteUrl(href));
    }
  });
}

// ==================================================
// EXTRACT STRUCTURED BLOCK
// ==================================================

function extractStructuredBlock($, block, index, warnings) {
  const imageElements = block.find("img");

  const audioElements = block.find("audio");

  const sourceElements = block.find("source");

  const linkElements = block.find("a");

  const imageElement = imageElements.first();

  const audioElement = audioElements.first();

  const sourceElement = sourceElements.first();

  const linkElement = linkElements.first();

  const imageSrc = imageElement.attr("src");

  let audioSrc = audioElement.attr("src");

  if (!audioSrc) {
    audioSrc = sourceElement.attr("src");
  }

  const linkHref = linkElement.attr("href");

  // ==================================================
  // SIMPLE IMAGE + AUDIO
  // ==================================================

  if (imageSrc && audioSrc) {
    return {
      type: "audio",
      image: makeAbsoluteUrl(imageSrc),
      src: makeAbsoluteUrl(audioSrc),
    };
  }

  // ==================================================
  // IMAGE + LINK
  // ==================================================

  if (imageSrc && linkHref) {
    return {
      type: "link-image",
      src: makeAbsoluteUrl(imageSrc),
      href: makeAbsoluteUrl(linkHref),
      legacyHref: makeLegacyHref(linkHref),
    };
  }

  // ==================================================
  // IMAGE ONLY
  // ==================================================

  if (imageSrc) {
    return {
      type: "image",
      src: makeAbsoluteUrl(imageSrc),
    };
  }

  // ==================================================
  // AUDIO ONLY
  // ==================================================

  if (audioSrc) {
    return {
      type: "audio",
      src: makeAbsoluteUrl(audioSrc),
    };
  }

  // ==================================================
  // TEXT LINK
  // ==================================================

  if (linkHref) {
    const text = block.text().trim();

    return {
      type: "link-text",
      href: makeAbsoluteUrl(linkHref),
      text: text || linkHref,
      legacyHref: makeLegacyHref(linkHref),
    };
  }

  // ==================================================
  // PURE TEXT / OTHER HTML
  // ==================================================

  const text = block.text().trim();

  if (text) {
    const cloned = block.clone();

    normalizeHtmlAttributes($, cloned);

    return {
      type: "html",
      html: cloned.toString(),
    };
  }

  // ==================================================
  // COMPLETELY EMPTY BLOCK
  // ==================================================

  warnings.push(`Empty or unrecognized content block at item ${index}.`);

  return null;
}

// ==================================================
// DETERMINE CONTENT BLOCKS
// ==================================================
//
// Priority:
//
// 1. .postblock
// 2. meaningful direct children of main container
// 3. whole container fallback
//
// This allows both traditional lesson pages and
// course/catalog pages to be migrated.
//
function findContentBlocks($, container, warnings) {
  const postblocks = container.find(".postblock");

  // ==================================================
  // NORMAL LESSON PAGES
  // ==================================================

  if (postblocks.length) {
    return postblocks.toArray().map((element) => $(element));
  }

  warnings.push("No .postblock elements found; using generic page structure.");

  // ==================================================
  // GENERIC / COURSE LIST PAGES
  // ==================================================
  //
  // Process images in their original document order.
  //
  // Each image becomes its own block.
  //
  // If the image is inside an <a>, the entire <a>
  // element is preserved inside the wrapper so the
  // image + link relationship is not lost.
  //

  const blocks = [];
  const processedLinks = new Set();

  container.find("img").each((_, element) => {
    const img = $(element);

    const link = img.closest("a");

    // --------------------------------------------------
    // IMAGE INSIDE A LINK
    // --------------------------------------------------

    if (link.length) {
      const linkElement = link.get(0);

      // Prevent duplicate processing if one link
      // happens to contain more than one image.
      if (processedLinks.has(linkElement)) {
        return;
      }

      processedLinks.add(linkElement);

      const wrapper = $("<div></div>");

      wrapper.append(link.clone());

      blocks.push(wrapper);

      return;
    }

    // --------------------------------------------------
    // STANDALONE IMAGE
    // --------------------------------------------------

    const wrapper = $("<div></div>");

    wrapper.append(img.clone());

    blocks.push(wrapper);
  });

  // --------------------------------------------------
  // STANDALONE TEXT LINKS
  // --------------------------------------------------
  // Some catalog pages contain text links outside
  // .postblock and without an image, for example:
  //
  // <a href="hwtostdybe.php">
  //   <h1>勉強の仕方</h1>
  // </a>
  //
  // These are not picked up by the image-processing
  // loop above, so add them here.
  //
  // Image links are skipped because they have already
  // been handled above.

  const processedTextLinks = new Set();

  container.find("a").each((_, element) => {
    const link = $(element);

    // Skip links containing images.
    if (link.find("img").length) {
      return;
    }

    const href = link.attr("href");
    const text = link.text().trim();

    if (!href || !text) {
      return;
    }
    console.log(`TEXT LINK FOUND: "${text}" → ${href}`);

    // Avoid adding the same link twice.
    if (processedTextLinks.has(element)) {
      return;
    }

    processedTextLinks.add(element);

    const wrapper = $("<div></div>");
    wrapper.append(link.clone());

    blocks.push(wrapper);
  });

  if (blocks.length) {
    return blocks;
  }

  // ==================================================
  // FALLBACK FOR TEXT / OTHER HTML PAGES
  // ==================================================

  const children = container.children().filter((_, element) => {
    const tag = element.tagName ? element.tagName.toLowerCase() : "";

    return !["script", "style", "noscript", "template"].includes(tag);
  });

  if (children.length) {
    const blocks = children.toArray().map((element) => $(element));

    // Also capture standalone text links such as:
    // <a href="hwtostdybe.php"><h1>勉強の仕方</h1></a>
    //
    // Do not capture links that contain images because those are
    // already handled by the image-processing logic above.
    container.find("a").each((_, element) => {
      const link = $(element);
      const href = link.attr("href");

      if (!href) return;

      // Image links are already handled separately.
      if (link.find("img").length) return;

      const text = link.text().trim();

      if (!text) return;

      const wrapper = $("<div></div>");
      wrapper.append(link.clone());

      blocks.push(wrapper);
    });

    return blocks;
  }

  warnings.push(
    "No meaningful child elements found; preserving entire main container as HTML.",
  );

  return [container];
}

// ==================================================
// EXTRACT PAGE CONTENT
// ==================================================

function extractPageContent(php, filename) {
  const $ = cheerio.load(php, {
    decodeEntities: false,
  });

  cleanDocument($);

  const container = findMainContainer($);

  const warnings = [];

  if (!container || !container.length) {
    return {
      success: false,
      content: [],
      warnings: ["Could not find any usable HTML content container."],
    };
  }

  // Normalize attributes in the source DOM before
  // extracting fallback HTML.
  normalizeHtmlAttributes($, container);

  const blocks = findContentBlocks($, container, warnings);

  const content = [];

  blocks.forEach((block, index) => {
    const item = extractStructuredBlock($, block, index, warnings);

    if (item) {
      content.push(item);
    }
  });

  // ==================================================
  // EXTRA STRUCTURAL WARNINGS
  // ==================================================

  const allImages = container.find("img").length;

  const allAudio =
    container.find("audio").length + container.find("source").length;

  const allLinks = container.find("a").length;

  const extractedImages = content.filter(
    (item) =>
      item.type === "image" ||
      item.type === "audio" ||
      item.type === "link-image",
  ).length;

  const extractedAudio = content.filter(
    (item) => item.type === "audio" || item.type === "image-audio",
  ).length;

  const extractedLinks = content.filter(
    (item) => item.type === "link-image" || item.type === "link-text",
  ).length;

  if (allImages > extractedImages) {
    warnings.push(
      `Detected ${allImages} image element(s), but only ${extractedImages} structured image item(s) were extracted. Review this page.`,
    );
  }

  if (allAudio > extractedAudio) {
    warnings.push(
      `Detected ${allAudio} audio/source element(s), but only ${extractedAudio} structured audio item(s) were extracted. Review this page.`,
    );
  }

  if (allLinks > extractedLinks) {
    warnings.push(
      `Detected ${allLinks} link element(s), but only ${extractedLinks} structured link item(s) were extracted. Review this page.`,
    );
  }

  return {
    success: true,
    content,
    warnings,
    originalItemCount: blocks.length,
  };
}

// ==================================================
// IMPORT ONE PAGE
// ==================================================

async function importCoursePage(filePath, report) {
  const filename = path
    .relative(SOURCE_DIR, filePath)
    .split(path.sep)
    .join("/");

  const sourceUrl = makeSourceUrl(filePath);

  try {
    const php = fs.readFileSync(filePath, "utf8");

    const extracted = extractPageContent(php, filename);

    if (!extracted.success) {
      report.failed++;

      report.results.push({
        filename,
        sourceUrl,
        status: "FAILED",
        itemCount: 0,
        warnings: extracted.warnings,
      });

      console.log(`❌ ${filename} — FAILED`);

      return;
    }

    const document = {
      sourceFile: filename,

      sourceUrl,

      content: extracted.content,

      migration: {
        migratedAt: new Date(),

        parserVersion: PARSER_VERSION,

        warnings: extracted.warnings,

        originalItemCount: extracted.originalItemCount,
      },
    };

    // ==================================================
    // IDEMPOTENT UPSERT
    // ==================================================

    const existing = await CoursePage.findOne({
      sourceFile: filename,
    }).lean();

    await CoursePage.findOneAndUpdate(
      {
        sourceFile: filename,
      },

      {
        $set: document,
      },

      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    report.processed++;

    if (existing) {
      report.updated++;
    } else {
      report.imported++;
    }

    if (extracted.warnings.length) {
      report.warnings += extracted.warnings.length;
    }

    report.results.push({
      filename,

      sourceUrl,

      status: existing ? "UPDATED" : "IMPORTED",

      itemCount: extracted.content.length,

      warnings: extracted.warnings,
    });

    const warningText = extracted.warnings.length
      ? ` ⚠ ${extracted.warnings.length} warning(s)`
      : "";

    console.log(
      `✓ ${filename} → ` + `${extracted.content.length} items` + warningText,
    );
  } catch (error) {
    report.failed++;

    report.results.push({
      filename,

      sourceUrl,

      status: "ERROR",

      error: error.message,
    });

    console.log(`❌ ${filename} — ${error.message}`);
  }
}

// ==================================================
// MAIN MIGRATION
// ==================================================

async function runMigration() {
  // ==================================================
  // BASIC VALIDATION
  // ==================================================

  if (!MONGO_URI) {
    throw new Error(
      "MongoDB connection string not found. " +
        "Expected MONGO_URI or MONGODB_URI in your environment.",
    );
  }

  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error(`Source directory does not exist: ${SOURCE_DIR}`);
  }

  console.log("");
  console.log("==============================================");
  console.log("     NIHONGOMAX COURSE PAGE MIGRATION");
  console.log("==============================================");
  console.log("");

  console.log(`Source: ${SOURCE_DIR}`);

  // ==================================================
  // FIND EVERYTHING
  // ==================================================

  const files = getAllPhpFiles(SOURCE_DIR);

  console.log(`PHP files found: ${files.length}`);

  console.log("");

  if (!files.length) {
    throw new Error("No PHP files were found in the source directory.");
  }

  // ==================================================
  // CONNECT
  // ==================================================

  await mongoose.connect(MONGO_URI);

  console.log("✓ Connected to MongoDB");

  console.log("");

  // ==================================================
  // REPORT
  // ==================================================

  const report = {
    startedAt: new Date().toISOString(),

    parserVersion: PARSER_VERSION,

    sourceDirectory: SOURCE_DIR,

    totalFiles: files.length,

    processed: 0,

    imported: 0,

    updated: 0,

    failed: 0,

    warnings: 0,

    results: [],
  };

  // ==================================================
  // MIGRATE EVERY FILE
  // ==================================================

  console.log("----------------------------------------------");

  console.log("MIGRATING ALL COURSE PAGES");

  console.log("----------------------------------------------");

  for (const filePath of files) {
    await importCoursePage(filePath, report);
  }

  // ==================================================
  // FINAL VERIFICATION
  // ==================================================

  const mongoCount = await CoursePage.countDocuments({
    sourceFile: {
      $in: files.map((filePath) =>
        path.relative(SOURCE_DIR, filePath).split(path.sep).join("/"),
      ),
    },
  });

  report.mongoDocumentCount = mongoCount;

  report.sourceFileCount = files.length;

  report.countVerification = mongoCount === files.length;

  if (mongoCount !== files.length) {
    report.verificationError = `Expected ${files.length} CoursePage documents but found ${mongoCount}.`;
  }

  report.finishedAt = new Date().toISOString();

  // ==================================================
  // WRITE REPORT
  // ==================================================

  fs.writeFileSync(
    REPORT_FILE,

    JSON.stringify(report, null, 2),

    "utf8",
  );

  // ==================================================
  // SUMMARY
  // ==================================================

  console.log("");

  console.log("==============================================");

  console.log("          MIGRATION COMPLETE");

  console.log("==============================================");

  console.log("");

  console.log(`PHP files found:       ${report.totalFiles}`);

  console.log(`Pages processed:       ${report.processed}`);

  console.log(`Pages imported:        ${report.imported}`);

  console.log(`Pages updated:         ${report.updated}`);

  console.log(`Pages failed:          ${report.failed}`);

  console.log(`Warnings:              ${report.warnings}`);

  console.log("");

  console.log(`MongoDB documents:     ${report.mongoDocumentCount}`);

  console.log(
    `Count verification:    ${report.countVerification ? "PASS ✓" : "FAIL ❌"}`,
  );

  console.log("");

  console.log(`Report: ${REPORT_FILE}`);

  console.log("");

  await mongoose.disconnect();

  console.log("✓ MongoDB connection closed.");

  console.log("");
}

// ==================================================
// RUN
// ==================================================

runMigration().catch(async (error) => {
  console.error("");

  console.error("==============================================");

  console.error("          MIGRATION FAILED");

  console.error("==============================================");

  console.error("");

  console.error(error);

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(1);
});

// node migration/importCoursePagesToMongo.js
