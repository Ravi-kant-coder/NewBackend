const {
  uploadFileToCloudinary,
  deleteMultipleFromCloudinary,
} = require("../config/cloudinary");
const School = require("../model/School");
const response = require("../utils/responceHandler");

const normalizeNullableString = (value) =>
  value === undefined || value === "null" || value === "" ? null : value;

const createSchool = async (req, res) => {
  try {
    const userId = req.user.userId;
    const uploadedMedia = [];
    if (req.files?.length) {
      if (req.files.length > 4) {
        return res.status(400).json({
          message: "Maximum 4 files allowed",
        });
      }
      for (const file of req.files || []) {
        const result = await uploadFileToCloudinary(file);
        uploadedMedia.push({
          url: result.secure_url,
          publicId: result.public_id,
          type: file.mimetype.startsWith("video") ? "video" : "image",
        });
      }
    }

    ["mobile", "homepage", "email"].forEach((key) => {
      req.body[key] = normalizeNullableString(req.body[key]);
    });

    const {
      schoolName,
      intakes,
      intro,
      location,
      homepage,
      email,
      mobile,
      schoolDescription,
    } = req.body;

    const school = await School.create({
      user: userId,
      schoolName,
      uploadedMedia,
      intakes,
      intro,
      location,
      homepage,
      email,
      mobile,
      schoolDescription,
    });
    return res.status(201).json({
      success: true,
      message: "School created successfully",
      school,
    });
  } catch (error) {
    console.error("Error creating School:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create School",
      error: error.message,
    });
  }
};

const deleteSchool = async (req, res) => {
  try {
    const school = await School.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found or not authorized",
      });
    }
    if (
      Array.isArray(school.uploadedMedia) &&
      school.uploadedMedia.length > 0
    ) {
      try {
        await deleteMultipleFromCloudinary(school.uploadedMedia);
      } catch (err) {
        console.error("Cloudinary deletion failed:", err);
      }
    }

    await school.deleteOne();

    return res.status(200).json({
      success: true,
      message: "School deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting School in controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete School",
      error: error.message,
    });
  }
};

const getAllSchools = async (req, res) => {
  try {
    const schools = await School.find()
      .sort({ createdAt: -1 })
      .populate("user", "_id username profilePicture");
    return response(res, 201, "Got Schools successfully", schools);
  } catch (error) {
    console.log("error getting Schools", error);
    return response(res, 500, "Internal server error", error.message);
  }
};

const updateSchool = async (req, res) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) {
      return response(res, 404, "School nahi mila");
    }
    if (school.user.toString() !== req.user.userId) {
      return response(res, 403, "You do not own this School post");
    }
    school.intakes = req.body.content.intakes || school.intakes;
    school.intro = req.body.content.intro || school.intro;
    school.location = req.body.content.location || school.location;
    school.schoolDescription =
      req.body.content.schoolDescription || school.schoolDescription;
    await school.save();
    return response(res, 200, "School post updated", school);
  } catch (error) {
    console.error("Error updating school in controller:", error);
    return response(res, 500, "Something went wrong in controller");
  }
};

module.exports = {
  createSchool,
  deleteSchool,
  getAllSchools,
  updateSchool,
};
