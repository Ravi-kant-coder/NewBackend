const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { fetchLatestVideos } = require("../utils/youtube");
const Video = require("../model/Videos");

const router = express.Router();

router.post("/sync", authMiddleware, async (req, res) => {
  try {
    console.log("▶ YouTube sync started");

    console.log("API KEY:", process.env.YOUTUBE_API_KEY);
    console.log("CHANNEL ID:", process.env.YOUTUBE_CHANNEL_ID);

    const videos = await fetchLatestVideos();

    console.log("Fetched videos count:", videos.length);

    for (const v of videos) {
      await Video.updateOne(
        { videoId: v.videoId },
        { $set: v },
        { upsert: true }
      );
    }

    console.log("✅ YouTube sync completed");

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
