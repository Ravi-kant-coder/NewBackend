const express = require("express");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");
const { getCoursePage } = require("../controllers/coursePageController");

const router = express.Router();

router.get("/:page", optionalAuthMiddleware, getCoursePage);

module.exports = router;
