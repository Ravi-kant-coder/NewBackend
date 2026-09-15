const express = require("express");

const { getCoursePage } = require("../controllers/coursePageController");

const router = express.Router();

router.get("/:page", getCoursePage);

module.exports = router;
