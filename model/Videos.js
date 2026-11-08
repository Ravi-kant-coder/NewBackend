const mongoose = require("mongoose");

const VideoSchema = new mongoose.Schema(
  {
    videoId: { type: String, unique: true },
    title: String,
    publishedAt: Date,
    tags: { type: [String], default: [] },
    isPublished: { type: Boolean, default: true },
    isShort: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const Videos = mongoose.model("Videos", VideoSchema);
module.exports = Videos;
