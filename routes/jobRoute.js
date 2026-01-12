const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  createJob,
  deleteJob,
  getAllJobs,
  updateJob,
} = require("../controllers/jobController");
const { multerMiddleware } = require("../config/cloudinary");

const router = express.Router();

router.post(
  "/jobs",
  authMiddleware,
  multerMiddleware.single("media"),
  createJob
);
router.get("/jobs", authMiddleware, getAllJobs);
router.delete("/jobs/:id", authMiddleware, deleteJob);
router.patch("/jobs/:id/content", authMiddleware, updateJob);

module.exports = router;
