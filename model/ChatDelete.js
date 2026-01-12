const mongoose = require("mongoose");

// per-user chat delete marker: after this time, that user won't see older messages with that peer
const chatDeleteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    peer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    deletedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

chatDeleteSchema.index({ user: 1, peer: 1 }, { unique: true });

module.exports = mongoose.model("ChatDelete", chatDeleteSchema);
