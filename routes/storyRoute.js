const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { multerMiddleware } = require("../config/cloudinary");
const {
  deleteStory,
  likeStory,
  shareStory,
  getAllStories,
  createStory,
} = require("../controllers/storyController");

const router = express.Router();

router.post(
  "/story",
  authMiddleware,
  multerMiddleware.array("media", 4),
  createStory,
);

router.delete("/story/:id", authMiddleware, deleteStory);

router.post("/stories/likes/:storyId", authMiddleware, likeStory);

router.post("/stories/share/:postId", authMiddleware, shareStory);

router.get("/story", authMiddleware, getAllStories);

module.exports = router;
