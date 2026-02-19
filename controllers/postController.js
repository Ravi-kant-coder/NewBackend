const {
  uploadFileToCloudinary,
  deleteMultipleFromCloudinary,
} = require("../config/cloudinary");

const Post = require("../model/Post");
const User = require("../model/User");
const response = require("../utils/responceHandler");

/* ---------------------------------- */
/* Helper: Populate + Normalize Shape */
/* ---------------------------------- */

const populatePost = async (postId) => {
  return await Post.findById(postId)
    .populate("user", "_id username profilePicture")
    .populate({
      path: "comments.user",
      select: "_id username profilePicture",
    })
    .populate({
      path: "likes",
      select: "_id username profilePicture",
    })
    .lean();
};

const buildPostResponse = (post, userId, savedPostIds) => {
  const isLiked = post.likes?.some(
    (user) => user._id.toString() === userId.toString(),
  );

  const isSaved = savedPostIds?.some(
    (id) => id.toString() === post._id.toString(),
  );

  return {
    ...post,
    isLiked,
    isSaved,
  };
};

/* ---------------------------------- */
/* Create Post */
/* ---------------------------------- */

const createPost = async (req, res) => {
  try {
    const uploadedMedia = [];
    const userId = req.user.userId;

    if (req.files?.length) {
      if (req.files.length > 4)
        return response(res, 400, "Maximum 4 files allowed");

      for (const file of req.files) {
        const result = await uploadFileToCloudinary(file);
        uploadedMedia.push({
          url: result.secure_url,
          publicId: result.public_id,
          type: file.mimetype.startsWith("video") ? "video" : "image",
        });
      }
    }

    const newPost = await Post.create({
      user: userId,
      content: req.body.content,
      uploadedMedia,
    });

    const populated = await populatePost(newPost._id);

    const user = await User.findById(userId).select("savedPosts").lean();

    const finalPost = buildPostResponse(populated, userId, user.savedPosts);

    return response(res, 201, "Post created successfully", finalPost);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

/* ---------------------------------- */
/* Update Post Content */
/* ---------------------------------- */

const updatePostContent = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) return response(res, 404, "Post not found");
    if (post.user.toString() !== req.user.userId)
      return response(res, 403, "Unauthorized");

    const ONE_HOUR = 60 * 60 * 1000;
    const now = Date.now();
    const createdTime = new Date(post.createdAt).getTime();

    if (now - createdTime > ONE_HOUR) {
      return response(res, 400, "Edit window expired");
    }

    post.content = req.body.content;
    post.contentUpdatedAt = new Date();
    await post.save();

    const populated = await populatePost(post._id);

    const user = await User.findById(req.user.userId)
      .select("savedPosts")
      .lean();

    const finalPost = buildPostResponse(
      populated,
      req.user.userId,
      user.savedPosts,
    );

    return response(res, 200, "Post updated", finalPost);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Server error");
  }
};

/* ---------------------------------- */
/* Delete Post */
/* ---------------------------------- */

const deletePost = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!post) return response(res, 404, "Post not found or unauthorized");

    if (post.uploadedMedia?.length)
      await deleteMultipleFromCloudinary(post.uploadedMedia);

    await post.deleteOne();

    return response(res, 200, "Post deleted successfully");
  } catch (error) {
    console.error(error);
    return response(res, 500, "Server error");
  }
};

/* ---------------------------------- */
/* Like Post */
/* ---------------------------------- */

const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    const post = await Post.findById(postId);
    if (!post) return response(res, 404, "Post not found");

    const alreadyLiked = post.likes.some(
      (id) => id.toString() === userId.toString(),
    );

    if (alreadyLiked) {
      const populated = await populatePost(postId);
      const user = await User.findById(userId).select("savedPosts").lean();
      const finalPost = buildPostResponse(populated, userId, user.savedPosts);

      return response(res, 200, "Already liked", finalPost);
    }

    post.likes.push(userId);
    post.likeCount += 1;

    await post.save();

    const populated = await populatePost(postId);

    const user = await User.findById(userId).select("savedPosts").lean();

    const finalPost = buildPostResponse(populated, userId, user.savedPosts);

    return response(res, 200, "Liked", finalPost);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Server error");
  }
};

/* ---------------------------------- */
/* Add Comment */
/* ---------------------------------- */

const addCommentToPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    const post = await Post.findById(postId);
    if (!post) return response(res, 404, "Post not found");

    post.comments.push({
      user: userId,
      text: req.body.text,
    });

    post.commentCount += 1;
    await post.save();

    const populated = await populatePost(postId);

    const user = await User.findById(userId).select("savedPosts").lean();

    const finalPost = buildPostResponse(populated, userId, user.savedPosts);

    return response(res, 201, "Comment added", finalPost);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Server error");
  }
};

/* ---------------------------------- */
/* Update Comment */
/* ---------------------------------- */

const updateComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.userId;

    const post = await Post.findById(postId);
    if (!post) return response(res, 404, "Post not found");

    const comment = post.comments.id(commentId);
    if (!comment) return response(res, 404, "Comment not found");

    comment.text = req.body.text;
    await post.save();

    const populated = await populatePost(postId);

    const user = await User.findById(userId).select("savedPosts").lean();

    const finalPost = buildPostResponse(populated, userId, user.savedPosts);

    return response(res, 200, "Comment updated", finalPost);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Server error");
  }
};

/* ---------------------------------- */
/* Delete Comment */
/* ---------------------------------- */

const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.userId;

    const post = await Post.findById(postId);
    if (!post) return response(res, 404, "Post not found");

    post.comments.pull(commentId);
    post.commentCount = Math.max(0, post.commentCount - 1);

    await post.save();

    const populated = await populatePost(postId);

    const user = await User.findById(userId).select("savedPosts").lean();

    const finalPost = buildPostResponse(populated, userId, user.savedPosts);

    return response(res, 200, "Comment deleted", finalPost);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Server error");
  }
};

/* ---------------------------------- */
/* Get All Posts (Paginated) */
/* ---------------------------------- */

const getAllPosts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId).select("savedPosts").lean();

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "_id username profilePicture")
      .populate({
        path: "comments.user",
        select: "_id username profilePicture",
      })
      .populate({
        path: "likes",
        select: "_id username profilePicture",
      })
      .lean();

    const finalPosts = posts.map((post) =>
      buildPostResponse(post, userId, user.savedPosts),
    );

    return response(res, 200, "Posts fetched", {
      posts: finalPosts,
      hasMore: posts.length === limit,
    });
  } catch (error) {
    console.error(error);
    return response(res, 500, "Server error");
  }
};

/* ---------------------------------- */
/* Get Posts By User */
/* ---------------------------------- */

const getPostByUserId = async (req, res) => {
  try {
    const loggedInUserId = req.user.userId;
    const { userId } = req.params;

    const user = await User.findById(loggedInUserId)
      .select("savedPosts")
      .lean();

    const posts = await Post.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("user", "_id username profilePicture")
      .populate({
        path: "comments.user",
        select: "_id username profilePicture",
      })
      .populate({
        path: "likes",
        select: "_id username profilePicture",
      })
      .lean();

    const finalPosts = posts.map((post) =>
      buildPostResponse(post, loggedInUserId, user.savedPosts),
    );

    return response(res, 200, "User posts fetched", finalPosts);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Server error");
  }
};

/* ---------------------------------- */
/* Get Posts For notes */
/* ---------------------------------- */
const getSavedPosts = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select("savedPosts").lean();

    const posts = await Post.find({
      _id: { $in: user.savedPosts },
    })
      .sort({ createdAt: -1 })
      .populate("user", "_id username profilePicture")
      .populate({
        path: "comments.user",
        select: "_id username profilePicture",
      })
      .populate({
        path: "likes",
        select: "_id username profilePicture",
      })
      .lean();

    const finalPosts = posts.map((post) =>
      buildPostResponse(post, userId, user.savedPosts),
    );

    return response(res, 200, "Saved posts fetched", finalPosts);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Server error");
  }
};

/* ---------------------------------- */
/* Toggle Save */
/* ---------------------------------- */
const toggleSavePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) return response(res, 404, "User not found");

    const alreadySaved = user.savedPosts.some(
      (id) => id.toString() === postId.toString(),
    );

    if (alreadySaved) {
      user.savedPosts.pull(postId);
    } else {
      user.savedPosts.push(postId);
    }

    await user.save();

    const populated = await populatePost(postId);
    const finalPost = buildPostResponse(populated, userId, user.savedPosts);

    return response(res, 200, "Save post toggled", finalPost);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Server error");
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
  toggleSavePost,
  getSavedPosts,
};
