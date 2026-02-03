const mongoose = require("mongoose");

const storySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    content: {
      type: String,
      trim: true,
    },

    uploadedMedia: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, required: true },
          type: {
            type: String,
            enum: ["image", "video"],
            required: true,
          },

          caption: {
            type: String,
            trim: true,
            maxlength: 300,
          },
        },
      ],
      validate: [
        {
          validator: function (v) {
            return (
              Array.isArray(v) &&
              v.length <= 4 &&
              v.every(
                (item) =>
                  item.publicId &&
                  item.url &&
                  ["image", "video"].includes(item.type),
              )
            );
          },
          message: "You can upload a maximum of 4 valid media files.",
        },
      ],
      default: [],
    },

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    likeCount: { type: Number, default: 0 },

    share: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    shareCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Story", storySchema);
