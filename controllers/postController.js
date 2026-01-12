const {
  uploadFileToCloudinary,
  deleteFileFromCloudinary,
} = require("../config/cloudinary");
const Post = require("../model/Post");
const Story = require("../model/story");
const response = require("../utils/responceHandler");

const createPost = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { content } = req.body;
    const file = req.file;
    let mediaUrl = null;
    let mediaType = null;

    if (file) {
      const uploadResult = await uploadFileToCloudinary(file);
      mediaUrl = uploadResult?.secure_url;
      mediaType = file.mimetype.startsWith("video") ? "video" : "image";
    }
    if (!content && !mediaUrl) {
      return response(
        res,
        400,
        "Content or media is required to create a post"
      );
    }
    const newPost = new Post({
      user: userId,
      content,
      mediaUrl,
      mediaType,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
    });
    await newPost.save();
    return response(res, 201, "Post created successfully", newPost);
  } catch (error) {
    console.log("error creating post", error);
    return response(res, 500, "Internal server error", error.message);
  }
};

const updatePostContent = async (req, res) => {
  console.log("PATCH /users/posts/:postId/content mil gaya", req.params.postId);
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return response(res, 404, "Post nahi mili");
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
    const post = await Post.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });
    if (!post) {
      return response(res, 404, "Post not found or not authorized");
    }
    if (post.mediaUrl) {
      try {
        const parts = post.mediaUrl.split("/");
        const filename = parts[parts.length - 1];
        const publicId = filename?.split(".")[0];

        if (publicId) {
          await deleteFileFromCloudinary(publicId);
        }
      } catch (cloudErr) {
        console.error("Cloudinary post media deletion failed:", cloudErr);
      }
    }
    return response(res, 200, "Post deleted successfully");
  } catch (error) {
    console.error("Error deleting post:", error);
    return response(res, 500, error.message || "Something went wrong");
  }
};

const deleteStory = async (req, res) => {
  try {
    const story = await Story.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });
    if (!story) {
      return response(res, 404, "Story not found or not authorized");
    }
    if (story.mediaUrl) {
      try {
        const parts = story.mediaUrl.split("/");
        const filename = parts[parts.length - 1];
        const publicId = filename?.split(".")[0];

        if (publicId) {
          await deleteFileFromCloudinary(publicId);
        }
      } catch (cloudErr) {
        console.error("Cloudinary story media deletion failed:", cloudErr);
      }
    }
    return response(res, 200, "Story deleted successfully");
  } catch (error) {
    console.error("Error deleting story:", error);
    return response(res, 500, error.message || "Something went wrong");
  }
};

const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const post = await Post.findById(postId);
    if (!post) {
      return response(res, 404, "Controller me post not found");
    }
    const comment = post.comments.id(commentId);
    if (!comment) {
      return response(res, 404, "Controller me comment nai mila");
    }
    if (comment.user.toString() !== req.user.userId) {
      return response(res, 403, "Unauthorized: You do not own this comment");
    }
    comment.deleteOne();
    post.commentCount = post.comments.length;
    post.commentCount = Math.max(0, post.commentCount - 1);
    await post.save();
    return response(res, 200, "Comment deleted successfully");
  } catch (error) {
    console.error("Error deleting comment:", error);
    return response(res, 500, error.message || "Something went wrong");
  }
};

const createStory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const file = req.file;

    if (!file) {
      return response(res, 400, "file is required to create a story");
    }
    let mediaUrl = null;
    let mediaType = null;

    if (file) {
      const uploadResult = await uploadFileToCloudinary(file);
      mediaUrl = uploadResult?.secure_url;
      mediaType = file.mimetype.startsWith("video") ? "video" : "image";
    }
    const newStory = await new Story({
      user: userId,
      mediaUrl,
      mediaType,
    });
    await newStory.save();
    return response(res, 201, "Story created successfully", newStory);
  } catch (error) {
    console.log("error creating story", error);
    return response(res, 500, "Internal server error", error.message);
  }
};

const getAllStory = async (req, res) => {
  try {
    const story = await Story.find()
      .sort({ createdAt: -1 })
      .populate("user", "_id username profilePicture email");

    return response(res, 201, "Get all story successfully", story);
  } catch (error) {
    console.log("error getting story", error);
    return response(res, 500, "Internal server error", error.message);
  }
};

const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("user", "_id username profilePicture email")
      .populate({
        path: "comments.user",
        select: "username profilePicture",
      });
    return response(res, 201, "Get all posts successfully", posts);
  } catch (error) {
    console.log("error getting posts", error);
    return response(res, 500, "Internal server error", error.message);
  }
};

const getPostByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    if (!userId) {
      return response(res, 400, "UserId is require to get user post");
    }

    const posts = await Post.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("user", "_id username profilePicture email")
      .populate({
        path: "comments.user",
        select: "username profilePicture",
      });
    return response(res, 201, "Get user post successfully", posts);
  } catch (error) {
    console.log("error getting posts", error);
    return response(res, 500, "Internal server error", error.message);
  }
};

const likePost = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.userId;
  try {
    const post = await Post.findById(postId);
    if (!post) {
      return response(res, 404, "post not found");
    }
    const hasLiked = post.likes.includes(userId);
    if (hasLiked) {
      post.likes = post.likes.filter(
        (id) => id.toString() !== userId.toString()
      );
      post.likeCount = Math.max(0, post.likeCount - 1);
    } else {
      post.likes.push(userId);
      post.likeCount += 1;
    }

    //save the like in updated post
    const updatedpost = await post.save();
    return response(
      res,
      201,
      hasLiked ? "Post cant be liked again" : "post liked successfully",
      updatedpost
    );
  } catch (error) {
    console.log(error);
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

const sharePost = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.userId;
  try {
    const post = await Post.findById(postId);
    if (!post) {
      return response(res, 404, "post not found");
    }
    const hasUserShared = post.share.includes(userId);
    if (!hasUserShared) {
      post.share.push(userId);
    }
    post.shareCount += 1;
    await post.save();
    return response(res, 201, "post share successfully", post);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error", error.message);
  }
};

module.exports = {
  createPost,
  deletePost,
  deleteStory,
  createStory,
  getAllStory,
  updatePostContent,
  getAllPosts,
  getPostByUserId,
  likePost,
  addCommentToPost,
  sharePost,
  deleteComment,
  updateComment,
};
