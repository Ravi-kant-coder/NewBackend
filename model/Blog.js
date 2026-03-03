const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    /* ===================== BASIC INFO ===================== */

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /* ===================== SEO META ===================== */

    metaTitle: {
      type: String,
      trim: true,
      maxlength: 60,
    },

    metaDescription: {
      type: String,
      trim: true,
      maxlength: 160,
    },

    keywords: {
      type: String,
      trim: true,
    },

    /* ===================== CONTENT SEGMENTS ===================== */

    segment1Heading: {
      type: String,
      required: true,
      trim: true,
    },

    segment1Text: {
      type: String,
      required: true,
      trim: true,
    },

    segment2Heading: {
      type: String,
      required: true,
      trim: true,
    },

    segment2Text: {
      type: String,
      required: true,
      trim: true,
    },

    segment3Heading: {
      type: String,
      required: true,
      trim: true,
    },

    segment3Text: {
      type: String,
      required: true,
      trim: true,
    },

    /* ===================== MEDIA ===================== */

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
        },
      ],
      validate: {
        validator: function (v) {
          return (
            Array.isArray(v) &&
            v.length <= 3 && // aligned with multer limit
            v.every(
              (item) =>
                item.publicId &&
                item.url &&
                ["image", "video"].includes(item.type),
            )
          );
        },
        message: "You can upload a maximum of 3 valid media files.",
      },
      default: [],
    },
  },
  { timestamps: true },
);

// Text index for future search capability
blogSchema.index({
  title: "text",
  segment1Text: "text",
  segment2Text: "text",
  segment3Text: "text",
});

const Blog = mongoose.models.Blog || mongoose.model("Blog", blogSchema);

module.exports = Blog;
