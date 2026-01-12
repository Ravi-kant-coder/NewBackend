const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const Video = require("../model/Videos");

const router = express.Router();

router.get("/videos", authMiddleware, async (req, res) => {
  const videos = await Video.find({ isPublished: true }).sort({
    publishedAt: -1,
  });
  res.json(videos);
});

router.patch("/videos", authMiddleware, async (req, res) => {
  const { _id, tags } = req.body;
  await Video.findByIdAndUpdate(_id, { tags });
  res.json({ success: true });
});

module.exports = router;
