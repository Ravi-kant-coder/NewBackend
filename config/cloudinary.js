const multer = require("multer");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * 1️⃣ Multer with safe size limit (5MB)
 */
const multerMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

const uploadFileToCloudinary = (file) => {
  const isVideo = file.mimetype.startsWith("video");
  const resourceType = isVideo ? "video" : "image";

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: resourceType,

          // 🔹 IMAGE COMPRESSION (only for images)
          ...(!isVideo && {
            quality: "auto", // auto compression
            fetch_format: "auto", // webp / optimized format
          }),

          // Optional but recommended
          timeout: 120000, // 2 minutes
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      )
      .end(file.buffer);
  });
};

/**
 * ✅ CENTRAL DELETE FUNCTION (IMAGE / VIDEO)
 */
const deleteFileFromCloudinary = async ({ publicId, resourceType }) => {
  if (!publicId) return;

  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType || "image",
  });
};

/**
 * ✅ DELETE MULTIPLE FILES (array-safe)
 */
const deleteMultipleFromCloudinary = async (files = []) => {
  if (!Array.isArray(files)) return;

  for (const file of files) {
    if (file?.publicId) {
      await deleteFileFromCloudinary(file);
    }
  }
};

module.exports = {
  multerMiddleware,
  uploadFileToCloudinary,
  deleteFileFromCloudinary,
  deleteMultipleFromCloudinary,
};
