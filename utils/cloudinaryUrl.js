const cloudinary = require("cloudinary").v2;

const getOptimizedMediaUrl = ({ publicId, resourceType = "image", width }) => {
  if (!publicId) return "";

  /* ---------- IMAGE ---------- */
  if (resourceType === "image") {
    return cloudinary.url(publicId, {
      resource_type: "image",
      quality: "auto",
      fetch_format: "auto",
      width,
      crop: width ? "limit" : undefined,
    });
  }

  /* ---------- VIDEO ---------- */
  if (resourceType === "video") {
    return cloudinary.url(publicId, {
      resource_type: "video",
      quality: "auto:good",
      fetch_format: "auto",
    });
  }

  return "";
};

module.exports = { getOptimizedMediaUrl };
