const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, default: null },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Note = mongoose.model("Note", noteSchema);
module.exports = Note;
