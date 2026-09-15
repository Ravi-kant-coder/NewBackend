const CoursePage = require("../model/CoursePage");

async function getCoursePage(req, res) {
  try {
    const page = req.params.page;

    if (!page) {
      return res.status(400).json({
        success: false,
        message: "Page name is required.",
      });
    }

    // The public URL intentionally does not expose .php.
    //
    // Example:
    // /course/n1class3
    //
    // becomes:
    // n1class3.php
    //
    // MongoDB continues using the original PHP filename
    // as its stable identity.

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
