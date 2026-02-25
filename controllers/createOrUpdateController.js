const {
  uploadFileToCloudinary,
  deleteFileFromCloudinary,
} = require("../config/cloudinary");
const User = require("../model/User");
const Bio = require("../model/UserBio");
const response = require("../utils/responceHandler");

const createOrUpdateUserBio = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      bioText,
      liveIn,
      relationship,
      workplace,
      education,
      nationality,
      hometown,
      birthday,
      address,
    } = req.body;

    // if bio already exists, update it
    let bio = await Bio.findOneAndUpdate(
      { user: userId },
      {
        bioText,
        liveIn,
        relationship,
        workplace,
        education,
        nationality,
        hometown,
        birthday,
        address,
      },
      { new: true, runValidators: true },
    );

    // if bio does not exist, create new one
    if (!bio) {
      bio = new Bio({
        user: userId,
        bioText,
        liveIn,
        relationship,
        workplace,
        education,
        nationality,
        hometown,
        birthday,
        address,
      });
      await bio.save();
      await User.findByIdAndUpdate(userId, { bio: bio._id });
    }
    return response(res, 201, "Bio create or update successfully", bio);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error", error.message);
  }
};

const updateCoverPhoto = async (req, res) => {
  try {
    const { userId } = req.params;
    const file = req.file;

    if (!file) {
      return response(res, 400, "No file provided");
    }

    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return response(res, 404, "User not found");
    }
    if (existingUser.coverPhotoPublicId) {
      try {
        await deleteFileFromCloudinary({
          publicId: existingUser.coverPhotoPublicId,
          type: existingUser.coverPhotoType,
        });
      } catch (err) {
        console.error("Cloudinary deletion failed:", err.message);
      }
    }
    const uploadResult = await uploadFileToCloudinary(file);

    const coverPhoto = uploadResult.secure_url;
    const coverPhotoPublicId = uploadResult.public_id;
    const coverPhotoType = file.mimetype.startsWith("video")
      ? "video"
      : "image";

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          coverPhoto,
          coverPhotoPublicId,
          coverPhotoType,
        },
      },
      { new: true }, // return updated document
    ).select("-password");

    return response(res, 200, "Cover photo updated successfully", updatedUser);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error", error.message);
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const file = req.file;
    const { username } = req.body;

    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return response(res, 404, "User not found");
    }

    const updateFields = {};

    // update username if provided
    if (username) {
      updateFields.username = username;
    }

    // only handle DP replacement if a new file is sent
    if (file) {
      // delete old dp first
      if (existingUser.dpPublicId) {
        try {
          await deleteFileFromCloudinary({
            publicId: existingUser.dpPublicId,
            type: existingUser.dpType,
          });
        } catch (err) {
          console.error("Cloudinary deletion failed:", err.message);
        }
      }

      const uploadResult = await uploadFileToCloudinary(file);

      updateFields.profilePicture = uploadResult.secure_url;
      updateFields.dpPublicId = uploadResult.public_id;
      updateFields.dpType = file.mimetype.startsWith("video")
        ? "video"
        : "image";
    }

    // if nothing to update
    if (Object.keys(updateFields).length === 0) {
      return response(res, 400, "Nothing to update");
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true },
    ).select("-password");

    return response(res, 200, "Updated successfully", updatedUser);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error", error.message);
  }
};

module.exports = {
  createOrUpdateUserBio,
  updateCoverPhoto,
  updateUserProfile,
};
