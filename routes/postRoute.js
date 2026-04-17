const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { multerMiddleware } = require("../config/cloudinary");
const {
  createPost,
  getAllPosts,
  deletePost,
  getPostByUserId,
  likePost,
  addCommentToPost,
  updatePostContent,
  deleteComment,
  updateComment,
  toggleSavePost,
  getSavedPosts,
} = require("../controllers/postController");

const router = express.Router();

router.post(
  "/posts",
  authMiddleware,
  multerMiddleware.array("media", 4),
  createPost,
);

router.patch("/posts/:postId/content", authMiddleware, updatePostContent);

router.patch(
  "/posts/:postId/comments/:commentId/text",
  authMiddleware,
  updateComment,
);

//delete post
router.delete("/posts/:id", authMiddleware, deletePost);

//delete comment
router.delete(
  "/posts/:postId/comments/:commentId",
  authMiddleware,
  deleteComment,
);

//get all posts
router.get("/posts", getAllPosts);

//get post by userid
router.get("/posts/user/:userId", authMiddleware, getPostByUserId);

//get post to save in notes page
router.get("/posts/saved", authMiddleware, getSavedPosts);

//user like post route
router.post("/posts/likes/:postId", authMiddleware, likePost);

//user comments post route
router.post("/posts/comments/:postId", authMiddleware, addCommentToPost);

//Toggle Save/Unsave Post
router.post("/posts/saved/:postId", authMiddleware, toggleSavePost);

module.exports = router;
