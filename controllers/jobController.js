const {
  uploadFileToCloudinary,
  deleteFileFromCloudinary,
} = require("../config/cloudinary");
const Job = require("../model/Job");
const response = require("../utils/responceHandler");

const normalizeNullableString = (value) =>
  value === undefined || value === "null" || value === "" ? null : value;

const createJob = async (req, res) => {
  try {
    const userId = req.user.userId;
    const file = req.file;
    let mediaUrl = null;
    let mediaType = null;

    if (file) {
      const uploadResult = await uploadFileToCloudinary(file);
      mediaUrl = uploadResult?.secure_url;
      mediaType = file.mimetype.startsWith("video") ? "video" : "image";
    }

    ["mobile", "homepage", "email"].forEach((key) => {
      req.body[key] = normalizeNullableString(req.body[key]);
    });

    const {
      company,
      title,
      requirements,
      location,
      salary,
      email,
      mobile,
      homepage,
      jobDescription,
    } = req.body;

    // Creating a new job with the logged-in user as owner
    const job = await Job.create({
      user: userId,
      company,
      mediaUrl,
      mediaType,
      title,
      requirements,
      location,
      salary,
      email,
      mobile,
      homepage,
      jobDescription,
    });
    return res.status(201).json({
      success: true,
      message: "Job created successfully",
      job,
    });
  } catch (error) {
    console.error("Error creating job:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create job",
      error: error.message,
    });
  }
};

const deleteJob = async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found or not authorized",
      });
    }

    if (job.mediaUrl) {
      try {
        const parts = job.mediaUrl.split("/");
        const filename = parts[parts.length - 1];
        const publicId = filename?.split(".")[0];

        if (publicId) {
          await deleteFileFromCloudinary(publicId);
        }
      } catch (err) {
        console.error("Cloudinary deletion failed:", err.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting job in controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete job",
      error: error.message,
    });
  }
};

const getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find()
      .sort({ createdAt: -1 })
      .populate("user", "_id username profilePicture");
    return response(res, 201, "Got Jobs successfully", jobs);
  } catch (error) {
    console.log("error getting jobs", error);
    return response(res, 500, "Internal server error", error.message);
  }
};

const updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return response(res, 404, "Job Not Found");
    }
    if (job.user.toString() !== req.user.userId) {
      return response(res, 403, "You do not own this job post");
    }
    job.title = req.body.content.title || job.title;
    job.requirements = req.body.content.requirements || job.requirements;
    job.location = req.body.content.location || job.location;
    job.salary = req.body.content.salary || job.salary;
    job.jobDescription = req.body.content.jobDescription || job.jobDescription;
    await job.save();
    return response(res, 200, "Job post updated", job);
  } catch (error) {
    console.error("Error updating job in controller:", error);
    return response(res, 500, "Something went wrong in controller");
  }
};

module.exports = {
  createJob,
  deleteJob,
  getAllJobs,
  updateJob,
};
