const crypto = require("crypto");

const generateHandoffToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

module.exports = { generateHandoffToken };
