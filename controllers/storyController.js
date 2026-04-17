const {
  uploadFileToCloudinary,
  deleteMultipleFromCloudinary,
} = require("../config/cloudinary");
const Story = require("../model/story");
const response = require("../utils/responceHandler");

/* =========================
   CREATE STORY
========================= */

const createStory = async (req, res) => {
  try {
    const uploadedMedia = [];

    if (req.files?.length) {
      if (req.files.length > 4) {
        return res.status(400).json({
          message: "Maximum 4 files allowed",
        });
      }

      let captions = [];

      if (req.body.mediaCaptions) {
        try {
          captions = JSON.parse(req.body.mediaCaptions);
        } catch (err) {
          captions = [];
        }
      }

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const result = await uploadFileToCloudinary(file);

        uploadedMedia.push({
          url: result.secure_url,
          publicId: result.public_id,
          type: file.mimetype.startsWith("video") ? "video" : "image",
          caption: captions[i] || "",
        });
      }
    }

    const userId = req.user.userId;
    const { content } = req.body;

    const newStory = await Story.create({
      user: userId,
      content,
      uploadedMedia,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
    });

    const populatedStory = await Story.findById(newStory._id).populate(
      "user",
      "_id username profilePicture",
    );

    return response(res, 201, "Story created successfully", populatedStory);
  } catch (error) {
    console.log("error creating Story", error);
    return response(res, 500, "Internal server error", error.message);
  }
};

/* =========================
   AUTO CLEAN EXPIRED STORIES
========================= */

const deleteExpiredStories = async () => {
  const now = new Date();

  const expiredStories = await Story.find({
    expiresAt: { $lte: now },
  });

  for (const story of expiredStories) {
    if (story.uploadedMedia?.length > 0) {
      try {
        await deleteMultipleFromCloudinary(story.uploadedMedia);
      } catch (err) {
        console.error("Cloudinary deletion failed:", err);
      }
    }

    await story.deleteOne();
  }
};

/* =========================
   DELETE STORY (MANUAL)
========================= */

const deleteStory = async (req, res) => {
  try {
    const story = await Story.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found or not authorized",
      });
    }

    if (story.uploadedMedia?.length > 0) {
      try {
        await deleteMultipleFromCloudinary(story.uploadedMedia);
      } catch (err) {
        console.error("Cloudinary deletion failed:", err);
      }
    }

    await story.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Story deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting story:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete story",
      error: error.message,
    });
  }
};

/* =========================
   GET ALL STORIES
========================= */
const getAllStories = async (req, res) => {
  try {
    const userId = req.user?.userId || null;

    // 🔥 CLEAN EXPIRED STORIES FIRST
    await deleteExpiredStories();

    const stories = await Story.find()
      .sort({ createdAt: -1 })
      .populate("user", "_id username profilePicture")
      .lean();

    const updatedStories = stories.map((story) => {
      let isLiked = false;

      if (userId) {
        isLiked = story.likes?.some(
          (user) => user.toString() === userId.toString(),
        );
      }

      return {
        ...story,
        isLiked,
      };
    });

    return response(res, 200, "Stories fetched successfully", updatedStories);
  } catch (error) {
    return response(res, 500, "Error fetching stories", error.message);
  }
};

/* =========================
   LIKE STORY
========================= */

const likeStory = async (req, res) => {
  const { storyId } = req.params;
  const userId = req.user.userId;

  try {
    const likedStory = await Story.findOneAndUpdate(
      {
        _id: storyId,
        likes: { $ne: userId },
      },
      {
        $push: { likes: userId },
        $inc: { likeCount: 1 },
      },
      { new: true },
    );

    if (!likedStory) {
      return response(res, 409, "Story already liked or not found");
    }

    return response(res, 200, "Story liked successfully", likedStory);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error", error.message);
  }
};

module.exports = {
  createStory,
  deleteStory,
  getAllStories,
  likeStory,
};
