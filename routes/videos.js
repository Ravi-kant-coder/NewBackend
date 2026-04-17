const express = require("express");
const Video = require("../model/Videos");

const router = express.Router();

router.get("/videos", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const tag = req.query.tag;

    let query = { isPublished: true };

    if (tag && tag !== "All") {
      query.tags = { $regex: new RegExp(`^${tag}$`, "i") };
    }

    const total = await Video.countDocuments(query);

    const videos = await Video.find(query)
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      videos,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
