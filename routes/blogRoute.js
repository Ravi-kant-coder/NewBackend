const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { multerMiddleware } = require("../config/cloudinary");

const {
  getAllBlogs,
  getSingleBlog,
  createBlog,
  updateBlog,
  deleteBlog,
} = require("../controllers/blogController");

/* ===================== PUBLIC ROUTES ===================== */

// 🔥 For SSG blog listing
router.get("/", getAllBlogs);

// 🔥 For SSG individual blog page
router.get("/:slug", getSingleBlog);

/* ===================== PROTECTED ROUTES ===================== */

// Create blog
router.post(
  "/",
  authMiddleware,
  multerMiddleware.array("media", 3),
  createBlog,
);

// Update blog
router.put("/:id", authMiddleware, updateBlog);

// Delete blog
router.delete("/:id", authMiddleware, deleteBlog);

module.exports = router;
