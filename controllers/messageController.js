const Message = require("../model/Message");
const Block = require("../model/Block");
const ChatDelete = require("../model/ChatDelete");

// helper: check if either side blocked
const isEitherBlocked = async (a, b) => {
  const block = await Block.findOne({
    $or: [
      { blocker: a, blocked: b },
      { blocker: b, blocked: a },
    ],
  }).lean();
  return !!block;
};

// Save message (called from socket and can be reused)
const saveMessage = async ({ sender, receiver, text }) => {
  if (!sender || !receiver) throw new Error("sender/receiver required");

  // block check
  const blocked = await isEitherBlocked(sender, receiver);
  if (blocked) {
    const err = new Error("Messaging is blocked between these users.");
    err.code = "BLOCKED";
    throw err;
  }

  const msg = await Message.create({ sender, receiver, text });
  return msg;
};

// Fetch messages with delete-chat filter + per-message deletedFor filtering
const getMessages = async (req, res) => {
  try {
    const userId = req.user?._id || req.query.userId; // adapt if you pass via query
    const { receiverId } = req.params;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // find chat delete marker
    const marker = await ChatDelete.findOne({
      user: userId,
      peer: receiverId,
    }).lean();
    const after = marker?.deletedAt;

    const criteria = {
      $or: [
        { sender: userId, receiver: receiverId },
        { sender: receiverId, receiver: userId },
      ],
      // hide messages specifically deleted for this user
      deletedFor: { $ne: userId },
    };
    if (after) criteria.createdAt = { $gt: after };

    const messages = await Message.find(criteria).sort({ createdAt: 1 }).lean();
    res.json(messages);
  } catch (err) {
    console.error("getMessages error", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

// Edit message (only sender)
const editMessage = async (req, res) => {
  try {
    const userId = req.user?._id || req.body.userId; // adapt if needed
    const { messageId } = req.params;
    const { text } = req.body;

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ error: "Message not found" });
    if (String(msg.sender) !== String(userId)) {
      return res.status(403).json({ error: "Not allowed" });
    }
    msg.text = text || "";
    msg.editedAt = new Date();
    await msg.save();
    res.json(msg);
  } catch (err) {
    console.error("editMessage error", err);
    res.status(500).json({ error: "Failed to edit message" });
  }
};

// Delete message (only sender): marks deletedFor for both (true deletion UX)
const deleteMessage = async (req, res) => {
  try {
    const userId = req.user?._id || req.body.userId;
    const { messageId } = req.params;

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ error: "Message not found" });
    if (String(msg.sender) !== String(userId)) {
      return res.status(403).json({ error: "Not allowed" });
    }

    // Option A (simple): hard delete
    // await msg.deleteOne();

    // Option B (WhatsApp-like "Delete for everyone" feel):
    // mark as deleted for both parties so neither sees it
    msg.deletedFor = Array.from(
      new Set([...(msg.deletedFor || []), msg.sender, msg.receiver])
    );
    await msg.save();

    res.json({ success: true, messageId });
  } catch (err) {
    console.error("deleteMessage error", err);
    res.status(500).json({ error: "Failed to delete message" });
  }
};

module.exports = {
  saveMessage,
  getMessages,
  editMessage,
  deleteMessage,
  isEitherBlocked,
};
