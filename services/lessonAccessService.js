const Subscription = require("../model/Subscription");

const FREE_PAGES = new Set([
  // JLPT
  "aboutjlpt",

  "classN1",
  "classN2",
  "classN3",
  "classN4",
  "classN5",

  "n5howtostudy",
  "n5overview",
  "n5class1",
  "n5class2",

  "n4howtostudy",
  "n4overview",
  "n4class1",
  "n4c1getans",

  "n3howtostudy",
  "n3overview",
  "n3class1",
  "n3c1getans",

  "n2howtostudy",
  "n2overview",
  "n2class1",
  "n2c1getans",

  "n1howtostudy",
  "n1overview",
  "n1class1",
  "n1c1getans",

  "hiragana",

  // Business Japanese
  "aboutbj",

  "bjfunda",
  "bjBasic",
  "bjBasicInt",
  "bjInt",
  "bjIntAdv",
  "bjAdv",
  "bjAdvsup",
  "howtostudybj",

  "funda_overview",
  "basic_overview",
  "basic_inter_overview",
  "inter_overview",
  "inter_adv_overview",
  "adv_overview",
  "super_adv_overview",

  "bjclass1",
  "bjclass11",
  "bjclass21",
  "bjclass31",
  "bjclass41",
  "bjclass51",
  "bjclass61",

  // Kaiwa
  "kaiwa-classes",
  "kaiwa_overview",
  "howtostudykaiwa",
  "kaiwac1",

  // Eigo
  "aboutbe",

  "business-english-basic-classes",
  "business-english-inter-classes",
  "business-english-adv-classes",
  "hwtostdyeikawa",
  "hwtostdybe",

  "be_sho_overview",
  "be_chu_overview",
  "be_jou_overview",

  "bizengc1",
  "bizengc2",
  "bizengc21",
  "bizengc22",
  "bizengc41",
  "bizengc42",

  "eikaiwa-classes",
  "eikaiwa_overview",
  "eikaiwac1",
  "eikaiwac2",

  "linkbundle",
  "linkbundlejap",
]);

async function checkLessonAccess({ pageName, user }) {
  // Normalize the page name so accidental whitespace
  // doesn't cause an unexpected access result.
  const page = String(pageName || "").trim();

  // Explicitly free pages are accessible to everyone.
  if (FREE_PAGES.has(page)) {
    return {
      allowed: true,
      reason: "FREE",
    };
  }

  // Every page not explicitly listed as free requires login.
  if (!user) {
    return {
      allowed: false,
      reason: "LOGIN_REQUIRED",
    };
  }

  // Logged-in users need an active, non-expired subscription.
  const subscription = await Subscription.findOne({
    userId: user.userId,
    course: "all",
    status: "active",
    expiryDate: { $gt: new Date() },
  }).lean();

  if (!subscription) {
    return {
      allowed: false,
      reason: "SUBSCRIPTION_REQUIRED",
    };
  }

  return {
    allowed: true,
    reason: "SUBSCRIBER",
  };
}

module.exports = {
  checkLessonAccess,
  FREE_PAGES,
};
