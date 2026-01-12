const Note = require("../model/Note");
const response = require("../utils/responceHandler");

const createNote = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { text } = req.body;
    console.log("Text from request body:", text);
    if (!text) {
      return response(res, 400, "Note required to create a note");
    }
    const newNote = new Note({
      user: userId,
      text,
    });
    await newNote.save();
    return response(res, 201, "Note created successfully", newNote);
  } catch (error) {
    console.log("Error creating note", error);
    return response(res, 500, "Internal server error", error.message);
  }
};

const getUserNotes = async (req, res) => {
  try {
    const loggedInUserId = req.user.userId;

    const notes = await Note.find({ user: loggedInUserId })
      .sort({ createdAt: -1 })
      .populate("user", "_id username profilePicture");

    return response(res, 200, "Fetched user notes successfully", notes);
  } catch (error) {
    console.error("Error getting notes:", error);
    return response(res, 500, "Internal server error", error.message);
  }
};

const deleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.noteId,
      user: req.user.userId,
    });
    if (!note) {
      return response(res, 404, "Note not found or not authorized");
    }
    return response(res, 200, "note deleted successfully");
  } catch (error) {
    console.error("Error deleting note:", error);
    return response(res, 500, error.message || "Something went wrong");
  }
};

const editNote = async (req, res) => {
  console.log("Controller me note id", req.params.noteId);
  console.log("Controller me note text", req.params.text);
  try {
    const note = await Note.findById(req.params.noteId);
    if (!note) {
      return response(res, 404, "Note nahi mila");
    }
    if (note.user.toString() !== req.user.userId) {
      return response(res, 403, "You do not own this note");
    }
    note.text = req.body.text || note.text;
    await note.save();
    return response(res, 200, "Note content updated", note);
  } catch (error) {
    console.error("Error updating note text in controller:", error);
    return response(res, 500, "Something went wrong in controller");
  }
};

module.exports = {
  createNote,
  getUserNotes,
  deleteNote,
  editNote,
};
