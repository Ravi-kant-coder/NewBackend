const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  followUser,
  unfollowUser,
  deleteUserFromRequest,
  getAllFriendsRequest,
  getAllUserForRequest,
  getAllMutualFriends,
  getAllUser,
  getUserProfile,
  checkUserAuth,
  deleteUserProfile,
  deleteUserCover,
} = require("../controllers/userController");

const {
  createOrUpdateUserBio,
  updateUserProfile,
  updateCoverPhoto,
} = require("../controllers/createOrUpdateController");

const {
  createNote,
  getUserNotes,
  deleteNote,
  editNote,
} = require("../controllers/noteController");

const { multerMiddleware } = require("../config/cloudinary");
const { NotBeforeError } = require("jsonwebtoken");

const router = express.Router();

//user follow
router.post("/follow", authMiddleware, followUser);

//user unfollow
router.post("/unfollow", authMiddleware, unfollowUser);

//remove user from request
router.post("/friend-request/remove", authMiddleware, deleteUserFromRequest);

//Create note
router.post("/notes", authMiddleware, createNote);

//Fetch notes
router.get("/notes", authMiddleware, getUserNotes);

//Delete note
router.delete("/notes/:noteId", authMiddleware, deleteNote);

//Edit note
router.patch("/notes/:noteId/text", authMiddleware, editNote);

//get all friends request
router.get("/friend-request", authMiddleware, getAllFriendsRequest);

//get all friends for request
router.get("/user-to-request", authMiddleware, getAllUserForRequest);

//get all mutual friends
router.get("/mutual-friends/:userId", authMiddleware, getAllMutualFriends);

//get all users from search
router.get("/", authMiddleware, getAllUser);

//get user profile page
router.get("/profile/:userId", authMiddleware, getUserProfile);

//get auth
router.get("/check-auth", authMiddleware, checkUserAuth);

// Delete user dp
router.delete(
  "/:userId/profilePicture",
  authMiddleware,
  multerMiddleware.single("profilePicture"),
  deleteUserProfile
);

// Delete user cover photo
router.delete(
  "/:userId/coverPhoto",
  authMiddleware,
  multerMiddleware.single("coverPhoto"),
  deleteUserCover
);

//create or update user bio
router.put("/bio/:userId", authMiddleware, createOrUpdateUserBio);

// update user profile
router.put(
  "/profile/:userId",
  authMiddleware,
  multerMiddleware.single("profilePicture"),
  updateUserProfile
);

// update user cover
router.put(
  "/profile/cover-photo/:userId",
  authMiddleware,
  multerMiddleware.single("coverPhoto"),
  updateCoverPhoto
);

module.exports = router;
