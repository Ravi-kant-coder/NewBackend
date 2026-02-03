const {
  uploadFileToCloudinary,
  deleteMultipleFromCloudinary,
} = require("../config/cloudinary");
const Story = require("../model/Story");
const response = require("../utils/responceHandler");

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
    if (Array.isArray(story.uploadedMedia) && story.uploadedMedia.length > 0) {
      try {
        await deleteMultipleFromCloudinary(story.uploadedMedia);
      } catch (err) {
        console.error("Cloudinary deletion failed:", err);
      }
    }

    await story.deleteOne();

    return res.status(200).json({
      success: true,
      message: "story deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting story in controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete story",
      error: error.message,
    });
  }
};

const getAllStories = async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stories = await Story.find({
      createdAt: { $gte: twentyFourHoursAgo },
    })
      .populate("user", "_id username profilePicture")
      .sort({ createdAt: -1 });

    return response(res, 200, "Stories fetched", stories);
  } catch (error) {
    return response(res, 500, "Error fetching stories", error.message);
  }
};

const likeStory = async (req, res) => {
  const { storyId } = req.params;
  const userId = req.user.userId;

  try {
    const updatedStory = await Post.findOneAndUpdate(
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

    if (!updatedStory) {
      return response(res, 409, "story already liked or not found");
    }

    return response(res, 200, "story liked successfully", updatedStory);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error", error.message);
  }
};

const shareStory = async (req, res) => {
  const { storyId } = req.params;
  const userId = req.user.userId;
  try {
    const story = await Story.findById(storyId);
    if (!story) {
      return response(res, 404, "story not found");
    }
    const hasUserShared = story.share.includes(userId);
    if (!hasUserShared) {
      story.share.push(userId);
    }
    story.shareCount += 1;
    await story.save();
    return response(res, 201, "story shared successfully", story);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error", error.message);
  }
};

module.exports = {
  createStory,
  deleteStory,
  getAllStories,
  likeStory,
  shareStory,
};
