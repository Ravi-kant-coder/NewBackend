const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { multerMiddleware } = require("../config/cloudinary");
const {
  registerUser,
  loginUser,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
} = require("../controllers/authController");
const passport = require("passport");
const { generateToken } = require("../utils/generateToken");
const router = express.Router();

router.get("/me", authMiddleware, getMe);

router.post(
  "/register",
  multerMiddleware.single("profilePicture"),
  registerUser,
);
router.post("/login", loginUser);
router.get("/logout", logout);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

//google oauth routes
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email "],
  }),
);

//google callback routes
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/user-login`,
    session: false,
  }),
  (req, res) => {
    const accessToken = generateToken(req?.user);
    res.cookie("auth_token", accessToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });
    res.redirect(`${process.env.FRONTEND_URL}`);
  },
);

module.exports = router;
