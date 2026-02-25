const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { fetchLatestVideos } = require("../utils/youtube");
const Video = require("../model/Videos");

const router = express.Router();

router.post("/sync", authMiddleware, async (req, res) => {
  try {
    const videos = await fetchLatestVideos();
    for (const v of videos) {
      await Video.updateOne(
        { videoId: v.videoId },
        { $set: v },
        { upsert: true },
      );
    }
    res.json({ success: true, count: videos.length });
  } catch (error) {
    console.error("❌ YOUTUBE SYNC ERROR ↓↓↓");
    console.error(error.message);
    console.error(error.stack);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
