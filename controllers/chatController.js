const ChatDelete = require("../model/ChatDelete");

const deleteChatForUser = async (req, res) => {
  try {
    const userId = req.user?._id || req.body.userId;
    const { peerId } = req.params;

    await ChatDelete.updateOne(
      { user: userId, peer: peerId },
      { $set: { user: userId, peer: peerId, deletedAt: new Date() } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("deleteChatForUser error", err);
    res.status(500).json({ error: "Failed to delete chat" });
  }
};

module.exports = { deleteChatForUser };
