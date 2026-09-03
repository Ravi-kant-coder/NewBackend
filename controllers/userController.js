const User = require("../model/User");
const Subscription = require("../model/Subscription");
const { deleteFileFromCloudinary } = require("../config/cloudinary");
const response = require("../utils/responceHandler");

const followUser = async (req, res) => {
  const { userIdToFollow } = req.body;
  const userId = req?.user?.userId;
  //prevent the user to follow itself
  if (userId === userIdToFollow) {
    return response(res, 400, "You are not allowed to follow yourself");
  }
  try {
    const userToFollow = await User.findById(userIdToFollow);
    const currentUser = await User.findById(userId);

    //check both users exist in database or not
    if (!userToFollow || !currentUser) {
      return response(res, 404, "User not found");
    }

    //check if current user is already following
    if (currentUser.following.includes(userIdToFollow)) {
      return response(res, 404, "User already following this user");
    }

    //add user to the current user in following list
    currentUser.following.push(userIdToFollow);

    //add current user id to the user to follow ke follower vale list mein
    userToFollow.followers.push(currentUser);

    //update the follower and following count
    currentUser.followingCount += 1;
    userToFollow.followerCount += 1;

    //save the update current user aur user to follow
    await currentUser.save();
    await userToFollow.save();

    return response(res, 200, "User followed successfully");
  } catch (error) {
    return response(res, 500, "Internal server error", error.message);
  }
};

const unfollowUser = async (req, res) => {
  const { userIdToUnFollow } = req.body;
  const userId = req?.user?.userId;

  //prevent the user to unfollow himself
  if (userId === userIdToUnFollow) {
    return response(res, 400, "You are not allowed to unfollow yourself");
  }
  try {
    const userToUnFollow = await User.findById(userIdToUnFollow);
    const currentUser = await User.findById(userId);

    //check both users exist in database or not
    if (!userToUnFollow || !currentUser) {
      return response(res, 404, "User not found");
    }

    //check if current user is already following
    if (!currentUser.following.includes(userIdToUnFollow)) {
      return response(res, 404, "You are not following this user");
    }

    //remove the user from the following list and update the follower count
    currentUser.following = currentUser.following.filter(
      (id) => id.toString() !== userIdToUnFollow,
    );
    userToUnFollow.followers = userToUnFollow.following.filter(
      (id) => id.toString() !== userId,
    );

    //update the follower and following count
    currentUser.followingCount -= 1;
    userToUnFollow.followerCount -= 1;

    //save the update current user aur user to follow
    await currentUser.save();
    await userToUnFollow.save();

    return response(res, 200, "User unfollowed successfully");
  } catch (error) {
    return response(res, 500, "Internal server error", error.message);
  }
};

const deleteUserFromRequest = async (req, res) => {
  try {
    const loggedInUserId = req.user.userId;
    const { requestSenderId } = req.body;

    const requestSender = await User.findById(requestSenderId);
    const loggedInUser = await User.findById(loggedInUserId);

    //check both user is exit in database or not
    if (!requestSender || !loggedInUser) {
      return response(res, 404, "User not found");
    }

    //check if the request sender is following to loggedin user or not
    const isRequestSend = requestSender.following.includes(loggedInUserId);

    if (!isRequestSend) {
      return response(res, 404, "No request found for this user");
    }

    //remove the loggedIn userId from the request sender following list
    requestSender.following = requestSender.following.filter(
      (user) => user.toString() !== loggedInUserId,
    );

    //remove the sender id from the loggedIn user followers list
    loggedInUser.followers = loggedInUser.followers.filter(
      (user) => user.toString() !== requestSenderId,
    );

    //update follower and following counts
    loggedInUser.followerCount = loggedInUser.followers.length;
    requestSender.followingCount = requestSender.following.length;

    //save both users
    await loggedInUser.save();
    await requestSender.save();

    return response(
      res,
      200,
      `Friends request from ${requestSender.username} deleted successfully `,
    );
  } catch (error) {
    return response(res, 500, "Internal server error", error.message);
  }
};

const getAllFriendsRequest = async (req, res) => {
  try {
    const loggedInUserId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const loggedInUser = await User.findById(loggedInUserId).select(
      "followers following",
    );

    if (!loggedInUser) {
      return response(res, 404, "User not found");
    }

    const query = {
      _id: {
        $in: loggedInUser.followers,
        $nin: loggedInUser.following,
      },
    };

    const total = await User.countDocuments(query);

    const users = await User.find(query)
      .select("username profilePicture email followerCount")
      .skip((page - 1) * limit)
      .limit(limit);

    return response(res, 200, "Friend requests fetched", {
      users,
      hasMore: page * limit < total,
    });
  } catch (error) {
    return response(res, 500, "Internal server error", error.message);
  }
};

const getAllUserForRequest = async (req, res) => {
  try {
    const loggedInUserId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const loggedInUser = await User.findById(loggedInUserId).select(
      "followers following",
    );

    if (!loggedInUser) {
      return response(res, 404, "User not found");
    }

    const query = {
      _id: {
        $ne: loggedInUserId,
        $nin: [...loggedInUser.following, ...loggedInUser.followers],
      },
    };

    const total = await User.countDocuments(query);

    const users = await User.find(query)
      .select("username profilePicture email followerCount")
      .skip((page - 1) * limit)
      .limit(limit);

    return response(res, 200, "Friend suggestions fetched", {
      users,
      hasMore: page * limit < total,
    });
  } catch (error) {
    return response(res, 500, "Internal server error", error.message);
  }
};

const getAllMutualFriends = async (req, res) => {
  try {
    const ProfileUserId = req.params.userId;

    //find the logged in user and retrive their followers and following
    const loggedInUser = await User.findById(ProfileUserId)
      .select("followers following")
      .populate(
        "following",
        "username profilePicture email followerCount followingCount",
      )
      .populate(
        "followers",
        "username profilePicture email followerCount followingCount",
      );

    if (!loggedInUser) {
      return response(res, 404, "User not found");
    }

    //create a set of user id that logged in user is following
    const followingUserId = new Set(
      loggedInUser.following.map((user) => user._id.toString()),
    );

    //filter followers to get only those who are also following you and followed by loggin user
    const mutualFriends = loggedInUser.followers.filter((follower) =>
      followingUserId.has(follower._id.toString()),
    );

    return response(res, 200, "Mutual friends get successfully", mutualFriends);
  } catch (error) {
    return response(res, 500, "Internal server error", error.message);
  }
};

const getAllUser = async (req, res) => {
  try {
    const users = await User.find().select(
      "username email profilePicture followerCount followingCount savedPosts",
    );
    return response(res, 200, "got users successfully", users);
  } catch (error) {
    return response(res, 500, "Internal server error", error.message);
  }
};

//check if user is authenticated or not
const checkUserAuth = async (req, res) => {
  try {
    const userId = req?.user?.userId;
    if (!userId)
      return response(res, 401, "Unauthenticated! Please login first");

    //fetch the user details and exclude sensitive information
    const user = await User.findById(userId).select("-password");

    if (!user) return response(res, 404, "User not found");
    return response(res, 200, "User retrieved", user);
  } catch (error) {
    return response(res, 500, "Internal server error", error.message);
  }
};

const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const loggedInUserId = req?.user?.userId;

    //fetch the user details and excude sensitive information
    const userProfile = await User.findById(userId)
      .select("-password")
      .populate("bio")
      .exec();

    if (!userProfile) return response(res, 403, "User not found");

    const isOwner = loggedInUserId === userId;

    return response(res, 201, "user profile successfully loaded", {
      profile: userProfile,
      isOwner,
    });
  } catch (error) {
    return response(res, 500, "Internal server error", error.message);
  }
};

const deleteUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.dpPublicId) {
      try {
        await deleteFileFromCloudinary({
          publicId: user.dpPublicId,
          type: user.dpType,
        });
      } catch (err) {
        console.error("Cloudinary deletion failed:", err.message);
      }

      user.profilePicture = null;
      user.dpPublicId = null;
      user.dpType = null;
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: "Profile picture removed.",
    });
  } catch (error) {
    console.error("Error deleting DP in controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete DP",
      error: error.message,
    });
  }
};

const deleteUserCover = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.coverPhotoPublicId) {
      try {
        await deleteFileFromCloudinary({
          publicId: user.coverPhotoPublicId,
          type: user.coverPhotoType,
        });
      } catch (err) {
        console.error("Cloudinary deletion failed:", err.message);
      }

      user.coverPhoto = null;
      user.coverPhotoPublicId = null;
      user.coverPhotoType = null;
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: "Cover Photo removed.",
    });
  } catch (error) {
    console.error("Error deleting Cover Photo in controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete Cover Photo",
      error: error.message,
    });
  }
};
const getSavedPosts = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId)
      .populate({
        path: "savedPosts",
        populate: [
          { path: "user", select: "_id username profilePicture" },
          { path: "comments.user", select: "_id username profilePicture" },
        ],
      })
      .lean();

    return response(res, 200, "Saved posts fetched", user.savedPosts);
  } catch (error) {
    return response(res, 500, "Server error");
  }
};

const getAdminUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("username email profilePicture")
      .lean();

    // const Subscription = require("../model/Subscription");

    const usersWithSubscription = await Promise.all(
      users.map(async (user) => {
        const subscription = await Subscription.findOne({
          userId: user._id,
        })
          .sort({ expiryDate: -1 })
          .select("plan status startDate expiryDate")
          .lean();

        return {
          ...user,
          subscription: subscription || null,
        };
      }),
    );

    return response(
      res,
      200,
      "Admin users fetched successfully",
      usersWithSubscription,
    );
  } catch (error) {
    console.error("Error getting admin users:", error);

    return response(res, 500, "Internal server error", error.message);
  }
};

const giveUserAccess = async (req, res) => {
  try {
    const { userId, plan } = req.body;

    const durationMonths = {
      "3_months": 3,
      "6_months": 6,
      "12_months": 12,
    };

    if (!userId || !durationMonths[plan]) {
      return response(res, 400, "Invalid user or plan");
    }

    const startDate = new Date();

    const expiryDate = new Date(startDate);
    expiryDate.setMonth(expiryDate.getMonth() + durationMonths[plan]);

    // Remove any currently active subscription first
    await Subscription.updateMany(
      {
        userId,
        status: "active",
      },
      {
        $set: {
          status: "cancelled",
        },
      },
    );

    const subscription = await Subscription.create({
      userId,
      course: "all",
      plan,
      status: "active",
      startDate,
      expiryDate,
    });

    return response(res, 200, "Course access given successfully", subscription);
  } catch (error) {
    console.error("Error giving user access:", error);

    return response(res, 500, "Failed to give course access", error.message);
  }
};

const removeUserAccess = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return response(res, 400, "User ID is required");
    }

    const result = await Subscription.updateMany(
      {
        userId,
        status: "active",
        expiryDate: { $gt: new Date() },
      },
      {
        $set: {
          status: "cancelled",
        },
      },
    );

    return response(res, 200, "Course access removed successfully", result);
  } catch (error) {
    console.error("Error removing user access:", error);

    return response(res, 500, "Failed to remove course access", error.message);
  }
};

const verifySpecialPagePassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return response(res, 400, "Password is required");
    }

    if (password !== process.env.SPECIAL_PAGE_PASSWORD) {
      return response(res, 401, "Incorrect password");
    }

    return response(res, 200, "Password verified", {
      success: true,
    });
  } catch (error) {
    console.error("Error verifying special page password:", error);

    return response(res, 500, "Internal server error", error.message);
  }
};

module.exports = {
  followUser,
  unfollowUser,
  deleteUserFromRequest,
  getAllFriendsRequest,
  getAllUserForRequest,
  getAllMutualFriends,
  getAllUser,
  checkUserAuth,
  getUserProfile,
  deleteUserProfile,
  deleteUserCover,
  getSavedPosts,
  getAdminUsers,
  giveUserAccess,
  removeUserAccess,
  verifySpecialPagePassword,
};
