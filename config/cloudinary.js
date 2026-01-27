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
    fileSize: 50 * 1024 * 1024, // allow bigger videos/audio
  },
});

const uploadFileToCloudinary = (file) => {
  const isImage = file.mimetype.startsWith("image");
  const isAudio =
    file.mimetype.startsWith("audio") ||
    file.mimetype.includes("ogg") ||
    file.mimetype.includes("wma");
  const isVideo = file.mimetype.startsWith("video");

  let uploadOptions = {
    folder: "app_uploads",
    timeout: 180000,
  };

  /* ================= IMAGE ================= */
  if (isImage) {
    uploadOptions.resource_type = "image";
    uploadOptions.transformation = [
      { width: 720, crop: "limit" }, // 🔥 fixed to 720
      { quality: 75 },
      { fetch_format: "auto" },
    ];
  } else if (isAudio) {
    /* ================= AUDIO ================= */
    uploadOptions.resource_type = "video"; // Cloudinary audio rule

    uploadOptions.transformation = [
      { audio_codec: "aac" },
      { bit_rate: "96k" }, // 🔥 standard bitrate
      { audio_frequency: 44100 },
      { format: "mp3" }, // 🔥 FORCE MP3 OUTPUT
    ];
  } else if (isVideo) {
    /* ================= VIDEO ================= */
    uploadOptions.resource_type = "video";

    uploadOptions.transformation = [
      { width: 1280, crop: "limit" }, // safe resize
      { quality: "auto" }, // smart compression
      { fetch_format: "auto" },
    ];
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(uploadOptions, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      })
      .end(file.buffer);
  });
};

const deleteFileFromCloudinary = async ({ publicId, type }) => {
  if (!publicId) return;

  const resourceType = type === "video" ? "video" : "image";

  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
  });
};

const deleteMultipleFromCloudinary = async (files = []) => {
  if (!Array.isArray(files)) return;

  await Promise.all(
    files.map((file) =>
      file?.publicId
        ? deleteFileFromCloudinary({
            publicId: file.publicId,
            type: file.type,
          })
        : null,
    ),
  );
};

module.exports = {
  multerMiddleware,
  uploadFileToCloudinary,
  deleteFileFromCloudinary,
  deleteMultipleFromCloudinary,
};
