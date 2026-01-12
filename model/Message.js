const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, default: "" },
    editedAt: { type: Date, default: null },
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // hard-hide for specific users
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
