const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { multerMiddleware } = require("../config/cloudinary");
const {
  createPost,
  getAllPosts,
  deletePost,
  getPostByUserId,
  deleteStory,
  likePost,
  sharePost,
  addCommentToPost,
  getAllStory,
  createStory,
  updatePostContent,
  deleteComment,
  updateComment,
} = require("../controllers/postController");

const router = express.Router();

//create post
router.post(
  "/posts",
  authMiddleware,
  multerMiddleware.single("media"),
  createPost
);

router.patch("/posts/:postId/content", authMiddleware, updatePostContent);

router.patch(
  "/posts/:postId/comments/:commentId/text",
  authMiddleware,
  updateComment
);

//delete post
router.delete("/posts/:id", authMiddleware, deletePost);

//delete comment
router.delete(
  "/posts/:postId/comments/:commentId",
  authMiddleware,
  deleteComment
);

//delete story
router.delete("/story/:id", authMiddleware, deleteStory);

//get all posts
router.get("/posts", authMiddleware, getAllPosts);

//get post by userid
router.get("/posts/user/:userId", authMiddleware, getPostByUserId);

//user like post route
router.post("/posts/likes/:postId", authMiddleware, likePost);

//user share post route
router.post("/posts/share/:postId", authMiddleware, sharePost);

//user comments post route
router.post("/posts/comments/:postId", authMiddleware, addCommentToPost);

//create story
router.post(
  "/story",
  authMiddleware,
  multerMiddleware.single("media"),
  createStory
);

//get all story
router.get("/story", authMiddleware, getAllStory);

module.exports = router;
