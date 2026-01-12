const Block = require("../model/Block");

const blockUser = async (req, res) => {
  try {
    const userId = req.user?._id || req.body.userId;
    const { userIdToBlock } = req.params;
    if (String(userId) === String(userIdToBlock)) {
      return res.status(400).json({ error: "Cannot block yourself" });
    }
    await Block.updateOne(
      { blocker: userId, blocked: userIdToBlock },
      { $set: { blocker: userId, blocked: userIdToBlock } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("blockUser error", err);
    res.status(500).json({ error: "Failed to block user" });
  }
};

const unblockUser = async (req, res) => {
  try {
    const userId = req.user?._id || req.body.userId;
    const { userIdToUnblock } = req.params;
    await Block.deleteOne({ blocker: userId, blocked: userIdToUnblock });
    res.json({ success: true });
  } catch (err) {
    console.error("unblockUser error", err);
    res.status(500).json({ error: "Failed to unblock user" });
  }
};

const getBlockedList = async (req, res) => {
  try {
    const userId = req.user?._id || req.query.userId;
    const list = await Block.find({ blocker: userId }).lean();
    res.json(list);
  } catch (err) {
    console.error("getBlockedList error", err);
    res.status(500).json({ error: "Failed to fetch blocked users" });
  }
};

module.exports = { blockUser, unblockUser, getBlockedList };
