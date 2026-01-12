const express = require("express");
const router = express.Router();
const {
  getMessages,
  editMessage,
  deleteMessage,
} = require("../controllers/messageController");

// GET messages between logged-in user & receiver
router.get("/:receiverId", getMessages);

// Edit a message (only sender)
router.patch("/:messageId", editMessage);

// Delete a message (only sender)
router.delete("/:messageId", deleteMessage);

module.exports = router;
