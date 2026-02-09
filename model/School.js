const mongoose = require("mongoose");

const schoolSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    visibility: {
      type: Boolean,
      default: false,
    },
    schoolName: {
      type: String,
      required: true,
    },

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

    intro: {
      type: String,
      required: true,
      maxlength: 5000,
      minlength: 10,
    },

    intakes: {
      type: String,
      required: true,
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
      default: null,
    },

    schoolDescription: {
      type: String,
    },
  },
  { timestamps: true },
);

const School = mongoose.model("School", schoolSchema);
module.exports = School;
