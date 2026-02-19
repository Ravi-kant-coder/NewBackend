const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String },
    contentUpdatedAt: { type: Date },
    uploadedMedia: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, required: true },
          type: { type: String, enum: ["image", "video"], required: true },
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
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date },
      },
    ],
    commentCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);
postSchema.index({ createdAt: -1 });
postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ likes: 1 });

const Post = mongoose.model("Post", postSchema);
module.exports = Post;
