const {
  uploadFileToCloudinary,
  deleteMultipleFromCloudinary,
} = require("../config/cloudinary");
const Post = require("../model/Post");
const response = require("../utils/responceHandler");

const createPost = async (req, res) => {
  try {
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
    const userId = req.user.userId;
    const { content } = req.body;

    const newPost = await Post.create({
      user: userId,
      content,
      uploadedMedia,
    });
    const populatedPost = await Post.findById(newPost._id)
      .populate("user", "_id username profilePicture")
      .populate({
        path: "comments.user",
        select: "username profilePicture",
      });

    return response(res, 201, "Post created successfully", populatedPost);
  } catch (error) {
    console.log("error creating post", error);
    return response(res, 500, "Internal server error", error.message);
  }
};

const updatePostContent = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return response(res, 404, "Post not found");
    }
    if (post.user.toString() !== req.user.userId) {
      return response(res, 403, "You do not own this post");
    }
    post.content = req.body.content || post.content;
    await post.save();
    return response(res, 200, "Post content updated", post);
  } catch (error) {
    console.error("Error updating post content in controller:", error);
    return response(res, 500, "Something went wrong in controller");
  }
};

const updateComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return response(res, 404, "Post not found");
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return response(res, 404, "Comment not found");
    }

    comment.text = req.body.text || comment.text;
    await post.save();

    return response(res, 200, "Comment updated", post);
  } catch (error) {
    console.error("Error updating comment:", error);
    return response(res, 500, "Something went wrong");
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found or not authorized",
      });
    }
    if (Array.isArray(post.uploadedMedia) && post.uploadedMedia.length > 0) {
      try {
        await deleteMultipleFromCloudinary(post.uploadedMedia);
      } catch (err) {
        console.error("Cloudinary deletion failed:", err);
      }
    }

    await post.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting Post in controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete Post",
      error: error.message,
    });
  }
};

const deleteComment = async (req, res) => {
  try {
    if (!req.user?.userId) {
      return response(res, 401, "Unauthorized");
    }
    const { postId, commentId } = req.params;
    const userId = req.user.userId;

    const post = await Post.findOneAndUpdate(
      {
        _id: postId,
        "comments._id": commentId,
        "comments.user": userId, // ownership check
      },
      {
        $pull: { comments: { _id: commentId } },
        $inc: { commentCount: -1 },
      },
      { new: true },
    );

    if (!post) {
      return response(res, 404, "Post or comment not found / unauthorized");
    }

    if (post.commentCount < 0) {
      post.commentCount = 0;
      await post.save();
    }

    return response(res, 200, "Comment deleted successfully");
  } catch (error) {
    console.error("Error deleting comment:", error);
    return response(res, 500, error.message || "Something went wrong");
  }
};

const getAllPosts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("user", "_id username profilePicture")
      .populate({
        path: "comments.user", // Why diff
        select: "username profilePicture",
      })
      .populate({
        path: "likes",
        select: "_id username profilePicture", // I need only last three liked users info
      })
      .lean();

    const updatedPosts = posts.map((post) => ({
      ...post,
      isLiked: post.likes?.some(
        (user) => user._id.toString() === userId.toString(),
      ),
    }));

    return response(res, 200, "Got all posts successfuly", updatedPosts);
  } catch (error) {
    console.log("error getting posts", error);
    return response(res, 500, "Internal server error", error.message);
  }
};

const getPostByUserId = async (req, res) => {
  try {
    const { userId } = req.params; // Owner of the post
    if (!userId) {
      return response(res, 400, "UserId is require to get user post");
    }
    const loggedInUserId = req.user.userId;
    const posts = await Post.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("user", "_id username profilePicture")
      .populate({
        path: "comments.user",
        select: "username profilePicture",
      })
      .populate({
        path: "likes",
        select: "_id username profilePicture",
      })
      .lean();
    const updatedPosts = posts.map((post) => ({
      ...post,
      isLiked: post.likes?.some(
        (user) => user._id.toString() === loggedInUserId.toString(), //String(loggedInUserId)
      ),
    }));
    return response(res, 200, "Got user post successfully", updatedPosts);
  } catch (error) {
    console.log("error getting posts", error);
    return response(res, 500, "Internal server error", error.message);
  }
};

const likePost = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.userId;

  try {
    const updatedPost = await Post.findOneAndUpdate(
      {
        _id: postId,
        likes: { $ne: userId },
      },
      {
        $push: { likes: userId },
        $inc: { likeCount: 1 },
      },
      { new: true },
    );

    if (!updatedPost) {
      return response(res, 409, "Post already liked or not found");
    }

    return response(res, 200, "Post liked successfully", updatedPost);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error", error.message);
  }
};

const addCommentToPost = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.userId;
  const { text } = req.body;
  try {
    const post = await Post.findById(postId);
    if (!post) {
      return response(res, 404, "post not found");
    }
    post.comments.push({ user: userId, text });
    post.commentCount = post.comments.length;
    await post.save();
    return response(res, 201, "comments added successfully", post);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error", error.message);
  }
};

module.exports = {
  createPost,
  deletePost,
  updatePostContent,
  getAllPosts,
  getPostByUserId,
  likePost,
  addCommentToPost,
  deleteComment,
  updateComment,
};
