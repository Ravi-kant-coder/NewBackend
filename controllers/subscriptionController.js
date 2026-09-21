const crypto = require("crypto");
const Subscription = require("../model/Subscription");
const response = require("../utils/responceHandler");
const razorpay = require("../config/razorpay");

const plans = {
  "3_months": {
    amount: 269900, // ₹2,699 in paise
    durationMonths: 3,
  },

  "6_months": {
    amount: 469900, // ₹4,699 in paise
    durationMonths: 6,
  },

  "12_months": {
    amount: 769900, // ₹7,699 in paise
    durationMonths: 12,
  },
};

const getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user.userId;

    const subscription = await Subscription.findOne({
      userId,
    });

    if (!subscription) {
      return response(res, 200, "No subscription found", {
        isSubscribed: false,
      });
    }

    // If the subscription has passed its expiry date,
    // keep the document but update its current status.
    if (
      subscription.status === "active" &&
      subscription.expiryDate &&
      subscription.expiryDate <= new Date()
    ) {
      subscription.status = "expired";
      await subscription.save();
    }

    const isSubscribed =
      subscription.status === "active" &&
      subscription.expiryDate &&
      subscription.expiryDate > new Date();

    if (!isSubscribed) {
      return response(res, 200, "No active subscription", {
        isSubscribed: false,
        status: subscription.status,
      });
    }

    return response(res, 200, "Active subscription found", {
      isSubscribed: true,
      course: subscription.course,
      plan: subscription.plan,
      startDate: subscription.startDate,
      expiryDate: subscription.expiryDate,
    });
  } catch (error) {
    console.error("Error checking subscription:", error);

    return response(res, 500, "Failed to check subscription", error.message);
  }
};

const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { plan } = req.body;

    // Check that the requested plan actually exists
    const selectedPlan = plans[plan];

    if (!selectedPlan) {
      return response(res, 400, "Invalid subscription plan");
    }

    const order = await razorpay.orders.create({
      amount: selectedPlan.amount,
      currency: "INR",
      receipt: `sub_${Date.now()}`,
      notes: {
        userId: userId.toString(),
        plan,
      },
    });

    return response(res, 200, "Razorpay order created successfully", {
      order,
      plan,
      amount: selectedPlan.amount,
      durationMonths: selectedPlan.durationMonths,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);

    return response(res, 500, "Failed to create Razorpay order", error.message);
  }
};

const verifyRazorpayPayment = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    // Make sure all payment details were received
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return response(res, 400, "Missing Razorpay payment details");
    }

    // Create the signature that Razorpay expects
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    // Compare Razorpay's signature with our generated signature
    if (generatedSignature !== razorpay_signature) {
      return response(res, 400, "Payment verification failed");
    }

    // Get the payment details directly from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    // Payment must actually be captured
    if (payment.status !== "captured") {
      return response(
        res,
        400,
        `Payment is not captured. Current status: ${payment.status}`,
      );
    }

    // Make sure this payment belongs to the order we created
    if (payment.order_id !== razorpay_order_id) {
      return response(res, 400, "Payment does not belong to this order");
    }

    // Get the original Razorpay order
    const order = await razorpay.orders.fetch(razorpay_order_id);

    // Make sure this order belongs to the logged-in user
    if (order.notes?.userId !== userId.toString()) {
      return response(res, 400, "Order does not belong to this user");
    }

    // Get the plan from the original order
    const plan = order.notes?.plan;
    const selectedPlan = plans[plan];

    if (!selectedPlan) {
      return response(res, 400, "Invalid subscription plan");
    }

    // Make sure the payment amount matches our official price
    if (payment.amount !== selectedPlan.amount) {
      return response(
        res,
        400,
        "Payment amount does not match the subscription plan",
      );
    }

    // Prevent the same payment from being processed twice
    const existingPayment = await Subscription.findOne({
      razorpayPaymentId: razorpay_payment_id,
    });

    if (existingPayment) {
      return response(res, 200, "Payment already verified", existingPayment);
    }

    const startDate = new Date();

    const expiryDate = new Date(startDate);
    expiryDate.setMonth(expiryDate.getMonth() + selectedPlan.durationMonths);

    const subscription = await Subscription.findOneAndUpdate(
      { userId },
      {
        $set: {
          course: "all",
          plan,
          status: "active",
          startDate,
          expiryDate,
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    return response(
      res,
      200,
      "Payment verified and subscription activated",
      subscription,
    );
  } catch (error) {
    console.error("Error verifying Razorpay payment:", error);

    return response(
      res,
      500,
      "Failed to verify Razorpay payment",
      error.message,
    );
  }
};

module.exports = {
  getSubscriptionStatus,
  createRazorpayOrder,
  verifyRazorpayPayment,
};
