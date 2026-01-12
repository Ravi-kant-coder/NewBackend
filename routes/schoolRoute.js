const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  createSchool,
  deleteSchool,
  getAllSchools,
  updateSchool,
} = require("../controllers/schoolController");
const { multerMiddleware } = require("../config/cloudinary");

const router = express.Router();

router.post(
  "/schools",
  authMiddleware,
  multerMiddleware.array("media", 4),
  createSchool
);
router.get("/schools", authMiddleware, getAllSchools);
router.delete("/schools/:id", authMiddleware, deleteSchool);
router.patch("/schools/:id/content", authMiddleware, updateSchool);

module.exports = router;
