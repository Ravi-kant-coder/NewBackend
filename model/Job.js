const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    company: { type: String, required: true },
    mediaUrl: { type: String },
    mediaType: { type: String, enum: ["image", "video"] },
    title: { type: String, required: true },
    requirements: { type: String },
    location: { type: String },
    salary: { type: String },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    jobDescription: {
      type: String,
      required: true,
      maxlength: 5000,
      minlength: 10,
    },
  },
  { timestamps: true }
);

const Job = mongoose.model("Job", jobSchema);
module.exports = Job;
