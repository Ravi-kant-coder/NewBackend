const express = require("express");
const router = express.Router();
const { deleteChatForUser } = require("../controllers/chatController");

// Delete chat for current user against a saathi
router.post("/:peerId/delete", deleteChatForUser);

module.exports = router;
