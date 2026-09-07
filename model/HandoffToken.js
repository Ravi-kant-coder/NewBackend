const mongoose = require("mongoose");

const handoffTokenSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    consumed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const HandoffToken = mongoose.model("HandoffToken", handoffTokenSchema);

module.exports = HandoffToken;
