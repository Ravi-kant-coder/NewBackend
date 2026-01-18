const multer = require("multer");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const multerMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit
  },
});

const uploadFileToCloudinary = (file) => {
  const isVideo = file.mimetype.startsWith("video");

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: isVideo ? "video" : "image",
          folder: "app_uploads",
          timeout: 120000,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      )
      .end(file.buffer);
  });
};

const deleteFileFromCloudinary = async ({ publicId, resourceType }) => {
  if (!publicId) return;

  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType || "image",
  });
};

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
