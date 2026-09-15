const jwt = require("jsonwebtoken");
const User = require("../model/User");

async function optionalAuthMiddleware(req, res, next) {
  try {
    const token = req.cookies && req.cookies.auth_token;

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select(
      "_id username email sessionId",
    );

    if (!user) {
      req.user = null;
      return next();
    }

    /*
     * One-device-login protection.
     */
    if (decoded.sessionId && user.sessionId !== decoded.sessionId) {
      return res.status(401).json({
        success: false,
        code: "SESSION_REPLACED",
        message: "This session is no longer active.",
      });
    }

    req.user = {
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
    };

    next();
  } catch (error) {
    /*
     * An invalid/missing JWT should not prevent
     * free classes from being viewed.
     *
     * Paid classes will subsequently fail
     * the access check.
     */
    req.user = null;

    next();
  }
}

module.exports = optionalAuthMiddleware;
