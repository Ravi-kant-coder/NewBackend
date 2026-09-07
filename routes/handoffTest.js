const express = require("express");
const crypto = require("crypto");

const router = express.Router();

const User = require("../model/User");
const HandoffToken = require("../model/HandoffToken");

const { generateHandoffToken } = require("../utils/generateHandoffToken");

// TEMPORARY TEST USER
const TEST_USER_EMAIL = "kikiki@gmail.com";

router.get("/generate", async (req, res) => {
  try {
    // Find the test user
    const user = await User.findOne({ email: TEST_USER_EMAIL });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Test user not found",
      });
    }

    // Generate random handoff token
    const token = generateHandoffToken();

    // Hash token before storing it
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Token expires in 2 minutes
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    // Store token hash in MongoDB
    await HandoffToken.create({
      tokenHash: tokenHash,
      userId: user._id,
      expiresAt: expiresAt,
    });

    // Return original token for testing
    res.json({
      success: true,
      token: token,
      expiresAt: expiresAt,
      userId: user._id,
    });
  } catch (error) {
    console.error("Handoff token generation error:", error);

    res.status(500).json({
      success: false,
      message: "Could not generate handoff token",
    });
  }
});

module.exports = router;
