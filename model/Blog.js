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

    excerpt: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    /* ===================== MARKDOWN CONTENT ===================== */

    content: {
      type: String,
      required: true,
      trim: true,
    },

    /* ===================== FEATURED IMAGE ===================== */

    featuredImage: {
      url: {
        type: String,
        required: true,
      },
      publicId: {
        type: String,
        required: true,
      },
    },

    /* ===================== PUBLISH CONTROL ===================== */

    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

/* ===================== TEXT INDEX ===================== */

blogSchema.index({
  title: "text",
  content: "text",
  excerpt: "text",
});

/* ===================== EXPORT ===================== */

const Blog = mongoose.models.Blog || mongoose.model("Blog", blogSchema);

module.exports = Blog;
