const express = require("express");
const crypto = require("crypto");

const router = express.Router();

const HandoffToken = require("../model/HandoffToken");
const Subscription = require("../model/Subscription");
const User = require("../model/User");

router.post("/redeem", async (req, res) => {
  try {
    // Check server-to-server secret
    const handoffSecret = req.headers["x-handoff-secret"];

    if (!handoffSecret || handoffSecret !== process.env.HANDOFF_SECRET) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized handoff request",
      });
    }

    // Get token from request body
    const token = req.body.token;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    // Hash the token
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Find handoff token
    const handoff = await HandoffToken.findOne({
      tokenHash: tokenHash,
    });

    if (!handoff) {
      return res.status(401).json({
        success: false,
        message: "Invalid handoff token",
      });
    }

    // Check whether token was already used
    if (handoff.consumed) {
      return res.status(401).json({
        success: false,
        message: "Handoff token already used",
      });
    }

    // Check expiry
    if (handoff.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        message: "Handoff token expired",
      });
    }

    // Find user
    const user = await User.findById(handoff.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Check active subscription
    const subscription = await Subscription.findOne({
      userId: handoff.userId,
      course: "all",
      status: "active",
      expiryDate: { $gt: new Date() },
    });

    if (!subscription) {
      return res.status(403).json({
        success: false,
        message: "No active subscription",
      });
    }

    // Atomically consume the token
    const consumedHandoff = await HandoffToken.findOneAndUpdate(
      {
        _id: handoff._id,
        consumed: false,
      },
      {
        $set: {
          consumed: true,
        },
      },
      {
        new: true,
      },
    );

    if (!consumedHandoff) {
      return res.status(401).json({
        success: false,
        message: "Handoff token already used",
      });
    }

    // Return only what PHP needs
    res.json({
      success: true,
      userId: user._id,
      username: user.username,
      message: "Handoff redeemed successfully",
    });
  } catch (error) {
    console.error("Handoff redemption error:", error);

    res.status(500).json({
      success: false,
      message: "Could not redeem handoff token",
    });
  }
});

module.exports = router;
