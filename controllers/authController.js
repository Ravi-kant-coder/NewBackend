const { uploadFileToCloudinary } = require("../config/cloudinary");
const User = require("../model/User");
const { generateToken } = require("../utils/generateToken");
const response = require("../utils/responceHandler");
const bcrypt = require("bcryptjs");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        status: "success",
        message: "This email doest not exist in our records.",
      });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash token before saving
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 mins

    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const message = `
      You requested a password reset for nihongomax.com.
      Click the link below to reset your password: (Expires in 10 minutes)
      ${resetUrl}
      
    `;

    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      text: message,
    });

    res.status(200).json({
      status: "success",
      message: "Reset link sent to your Email, which will expire in 10 mins.",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Email could not be sent please try again later.",
    });
  }
};

const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return response(res, 400, "This email already exists");
    }

    let profilePicture = null;
    let dpPublicId = null;
    let dpType = null;

    // if user Uploads DP while registering, upload to cloudinary
    if (req.file) {
      const uploadResult = await uploadFileToCloudinary(req.file);
      profilePicture = uploadResult?.secure_url;
      dpPublicId = uploadResult?.public_id;
      dpType = req.file.mimetype.startsWith("video") ? "video" : "image";
    }

    // create new user
    const newUser = new User({
      username,
      email,
      password, // password will be hashed in usermodel
      profilePicture,
      dpPublicId,
      dpType,
    });

    await newUser.save();

    // generate JWT
    const accessToken = generateToken(newUser);

    res.cookie("auth_token", accessToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
    });

    return response(res, 201, "Account created successfully", {
      username: newUser.username,
      email: newUser.email,
      profilePicture: profilePicture,
    });
  } catch (error) {
    console.error("Register error:", error);
    return response(res, 500, "Internal Server Error", error.message);
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    //  check the existing user with email
    const user = await User.findOne({ email });
    if (!user) {
      return response(res, 404, "User not found with this email");
    }

    const matchPassword = await bcrypt.compare(password, user.password);
    if (!matchPassword) {
      return response(res, 404, "Invalid Password");
    }

    // Create a new session ID for every login
    const sessionId = crypto.randomUUID();

    // Save the new session ID in MongoDB
    user.sessionId = sessionId;
    await user.save();

    // Generate JWT containing the new session ID
    const accessToken = generateToken(user);

    res.cookie("auth_token", accessToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
    });

    return response(res, 201, "Logged in successfully", {
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal Server Error", error.message);
  }
};

const logout = (req, res) => {
  try {
    res.cookie("auth_token", "", {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      expires: new Date(0),
    });
    return response(res, 200, "Logged out successfully");
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal Server Error", error.message);
  }
};

const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "Password must be at least 6 characters",
      });
    }

    // 1️⃣ Hash token from URL
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    // 2️⃣ Find user by token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "Token is invalid or expired",
      });
    }

    // 3️⃣ IMPORTANT: assign new password (bcrypt runs in model)
    user.password = password;

    // 4️⃣ Clear reset fields (single-use token)
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    // 5️⃣ MUST use save() (not update)
    await user.save();

    res.status(200).json({
      status: "success",
      message: "Password reset successful",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Password reset failed",
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "username email profilePicture",
    );

    if (!user) {
      return response(res, 404, "User not found");
    }

    return response(res, 200, "User fetched successfully", user);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal Server Error", error.message);
  }
};

module.exports = {
  registerUser,
  loginUser,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
};
