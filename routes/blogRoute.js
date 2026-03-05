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

// 🔥 Blog listing (Lightweight for SSG + Sidebar)
router.get("/", getAllBlogs);

// 🔥 Single blog by slug (Full content for SSG page)
router.get("/:slug", getSingleBlog);

/* ===================== PROTECTED ROUTES ===================== */

// 🔒 Create blog (Single featured image upload)
router.post(
  "/admin",
  authMiddleware,
  multerMiddleware.single("featuredImage"),
  createBlog,
);

// 🔒 Update blog (Optional image replacement)
router.put("/admin/:id", authMiddleware, updateBlog);

// 🔒 Delete blog
router.delete("/admin/:id", authMiddleware, deleteBlog);

module.exports = router;
