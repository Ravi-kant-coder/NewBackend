const express = require("express");
const crypto = require("crypto");

const router = express.Router();

const HandoffToken = require("../model/HandoffToken");

router.get("/verify", async (req, res) => {
  try {
    const token = req.query.token || "";

    if (token === "") {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    // Hash the token received from PHP
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Find matching token in MongoDB
    const handoff = await HandoffToken.findOne({
      tokenHash: tokenHash,
    });

    if (!handoff) {
      return res.status(401).json({
        success: false,
        message: "Invalid handoff token",
      });
    }

    // Check whether token has already been used
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

    // Everything looks good
    res.json({
      success: true,
      userId: handoff.userId,
      message: "Handoff token is valid",
    });
  } catch (error) {
    console.error("Handoff token verification error:", error);

    res.status(500).json({
      success: false,
      message: "Could not verify handoff token",
    });
  }
});

module.exports = router;
