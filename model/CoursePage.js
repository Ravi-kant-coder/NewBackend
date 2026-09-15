const mongoose = require("mongoose");

// ==================================================
// COURSE PAGE CONTENT ITEM
// ==================================================
//
// We intentionally keep this generic.
// During migration we DO NOT try to decide whether
// a page is a lesson, overview, list, test, etc.
//
// Every PHP page gets one CoursePage document.
//
// "html" is the safety-net type. If a piece of legacy
// HTML doesn't fit our structured formats, we preserve
// it instead of throwing it away.
//

const coursePageItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "image",
        "audio",
        "image-audio",
        "link-image",
        "link-text",
        "html",
      ],
    },

    // Image URL
    src: {
      type: String,
      default: null,
    },

    // Image associated with an audio item
    image: {
      type: String,
      default: null,
    },

    // Audio URL
    audio: {
      type: String,
      default: null,
    },

    // Final/current link
    href: {
      type: String,
      default: null,
    },

    // Visible text for text links
    text: {
      type: String,
      default: null,
    },

    // Original href exactly as found in the PHP page.
    // Useful later when converting old PHP links to
    // new Next.js routes.
    legacyHref: {
      type: String,
      default: null,
    },

    // Safety-net for unusual legacy HTML.
    //
    // We don't want the migration to lose content merely
    // because one old page has a structure we didn't expect.
    html: {
      type: String,
      default: null,
    },
  },
  {
    _id: false,
  },
);

// ==================================================
// COURSE PAGE
// ==================================================

const coursePageSchema = new mongoose.Schema(
  {
    // Original PHP filename.
    //
    // This is our primary identity during migration.
    // Example:
    // n1class3.php
    // n2overview.php
    // bjclass12.php
    // linkbundle.php
    //
    sourceFile: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Original legacy URL.
    sourceUrl: {
      type: String,
      required: true,
    },

    // Everything extracted from the page.
    content: {
      type: [coursePageItemSchema],
      default: [],
    },

    // Migration/debug information.
    migration: {
      migratedAt: {
        type: Date,
        default: Date.now,
      },

      parserVersion: {
        type: String,
        default: "3.0",
      },

      warnings: {
        type: [String],
        default: [],
      },

      // Number of content units detected in the
      // original page before structured conversion.
      originalItemCount: {
        type: Number,
        default: 0,
      },

      // Helpful later when manually mapping old pages
      // to new Next.js routes.
      mapping: {
        mapped: {
          type: Boolean,
          default: false,
        },

        nextRoute: {
          type: String,
          default: null,
        },
      },
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("CoursePage", coursePageSchema);
