const express = require("express");
const router = express.Router();
const {
  blockUser,
  unblockUser,
  getBlockedList,
} = require("../controllers/blockController");

// Block and Unblock
router.post("/:userIdToBlock", blockUser);
router.delete("/:userIdToUnblock", unblockUser);

// Get my blocked list
router.get("/", getBlockedList);

module.exports = router;
