const mongoose = require("mongoose");

const schoolSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    schoolName: {
      type: String,
      required: true,
    },

    // 🔽 Media: up to 4 images or videos
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
            return v.length <= 4;
          },
          message: "You can upload a maximum of 4 photos or videos.",
        },
      ],
      default: [],
    },

    intakes: {
      type: String,
      required: true,
    },

    intro: {
      type: String,
    },

    location: {
      type: String,
      required: true,
    },

    homepage: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
    },

    mobile: {
      type: String,
      required: true,
    },

    schoolDescription: {
      type: String,
      required: true,
      maxlength: 5000,
      minlength: 10,
    },
  },
  { timestamps: true }
);

const School = mongoose.model("School", schoolSchema);
module.exports = School;
