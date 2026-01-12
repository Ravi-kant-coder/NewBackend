const jwt = require("jsonwebtoken");
const response = require("../utils/responceHandler");

const authMiddleware = (req, res, next) => {
  const authToken = req?.cookies?.auth_token;

  if (!authToken) {
    return response(
      res,
      401,
      "AuthMiddleware said:Token not provided or invalid"
    );
  }

  try {
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    console.log("Decoded Hua token:", decoded);

    if (!decoded.userId) {
      return response(res, 401, "Invalid token. Please log in again");
    }

    req.user = { userId: decoded.userId };
    console.log("User Jo authenticated hai:", req.user);

    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return response(res, 401, "Invalid or expired token. Please log in again");
  }
};

module.exports = authMiddleware;
