const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { multerMiddleware } = require("../config/cloudinary");

const {
  getAllBlogs,
  getSingleBlogBySlug,
  getSingleBlogById,
  createBlog,
  updateBlog,
  // deleteBlog,
} = require("../controllers/blogController");

// Blog list (For main page and sidebar)
router.get("/", getAllBlogs);

// For Admin to edit blog
router.get("/admin/:id", authMiddleware, getSingleBlogById);

// Create blog
router.post(
  "/admin",
  authMiddleware,
  multerMiddleware.single("featuredImage"),
  createBlog,
);

// Update blog (image optional)
router.put(
  "/admin/:id",
  authMiddleware,
  multerMiddleware.single("featuredImage"),
  updateBlog,
);

// Single blog (SSG page)
router.get("/:slug", getSingleBlogBySlug);

// Delete blog
/* router.delete("/admin/:id", authMiddleware, deleteBlog); */

module.exports = router;
