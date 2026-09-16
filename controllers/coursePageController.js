const CoursePage = require("../model/CoursePage");
const { checkLessonAccess } = require("../services/lessonAccessService");

async function getCoursePage(req, res) {
  try {
    const page = String(req.params.page || "").trim();

    if (!page) {
      return res.status(400).json({
        success: false,
        message: "Page name is required.",
      });
    }

    // Check access before returning the actual lesson content.
    const access = await checkLessonAccess({
      pageName: page,
      user: req.user,
    });

    if (!access.allowed) {
      if (access.reason === "LOGIN_REQUIRED") {
        return res.status(401).json({
          success: false,
          code: "LOGIN_REQUIRED",
          message: "Please log in to access this course.",
        });
      }

      if (access.reason === "SUBSCRIPTION_REQUIRED") {
        return res.status(403).json({
          success: false,
          code: "SUBSCRIPTION_REQUIRED",
          message: "An active subscription is required to access this course.",
        });
      }

      return res.status(403).json({
        success: false,
        message: "You do not have access to this course.",
      });
    }

    const sourceFile = `${page}.php`;

    const coursePage = await CoursePage.findOne({
      sourceFile,
    }).lean();

    if (!coursePage) {
      return res.status(404).json({
        success: false,
        message: "Course page not found.",
      });
    }

    return res.status(200).json({
      success: true,
      page: coursePage,
    });
  } catch (error) {
    console.error("Get course page error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load course page.",
    });
  }
}

module.exports = {
  getCoursePage,
};
