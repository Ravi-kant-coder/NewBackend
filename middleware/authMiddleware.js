const jwt = require("jsonwebtoken");
const response = require("../utils/responceHandler");
const User = require("../model/User");

const authMiddleware = async (req, res, next) => {
  const authToken = req?.cookies?.auth_token;

  if (!authToken) {
    return response(res, 401, "Token not provided or invalid");
  }

  try {
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);

    if (!decoded.userId || !decoded.sessionId) {
      return response(res, 401, "Invalid token. Please log in again");
    }

    // Get the current session ID stored for this user
    const user = await User.findById(decoded.userId).select("sessionId");

    if (!user || user.sessionId !== decoded.sessionId) {
      return response(
        res,
        401,
        "Your account was logged in on another device. Please log in again.",
        {
          code: "SESSION_REPLACED",
        },
      );
    }

    req.user = { userId: decoded.userId };

    next();
  } catch (error) {
    console.error("Token verification failed:", error);

    return response(res, 401, "Invalid or expired token. Please log in again");
  }
};

module.exports = authMiddleware;
