const express = require("express");
const crypto = require("crypto");

const router = express.Router();

const HandoffToken = require("../model/HandoffToken");

const { generateHandoffToken } = require("../utils/generateHandoffToken");

router.post("/create", async (req, res) => {
  try {
    // User comes from authMiddleware
    const userId = req.user.userId;

    // Generate random token
    const token = generateHandoffToken();

    // Hash token before storing it
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Token expires in 2 minutes
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    // Store handoff record
    await HandoffToken.create({
      tokenHash: tokenHash,
      userId: userId,
      expiresAt: expiresAt,
      consumed: false,
    });

    res.json({
      success: true,
      token: token,
      expiresAt: expiresAt,
    });
  } catch (error) {
    console.error("Handoff creation error:", error);

    res.status(500).json({
      success: false,
      message: "Could not create handoff token",
    });
  }
});

module.exports = router;
