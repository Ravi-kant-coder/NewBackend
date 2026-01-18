// -----------------------------------------------------------------------------------------------------------

import { Cloudinary } from "@cloudinary/url-gen";

const cld = new Cloudinary({
  cloud: {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_NAME,
  },
});

export const getOptimizedMediaUrl = ({ publicId, type = "image", width }) => {
  if (!publicId) return "";

  if (type === "video") {
    return cld
      .video(publicId)
      .quality("auto:good")
      .format("auto")
      .resize(width ? `w_${width},c_limit` : "")
      .toURL();
  }

  return cld
    .image(publicId)
    .quality("auto")
    .format("auto")
    .resize(width ? `w_${width},c_limit` : "")
    .toURL();
};
