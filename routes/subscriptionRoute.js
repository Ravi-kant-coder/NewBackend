const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");

const {
  getSubscriptionStatus,
  createRazorpayOrder,
  verifyRazorpayPayment,
} = require("../controllers/subscriptionController");

const router = express.Router();

router.get("/status", authMiddleware, getSubscriptionStatus);
router.post("/create-order", authMiddleware, createRazorpayOrder);
router.post("/verify-payment", authMiddleware, verifyRazorpayPayment);

module.exports = router;
