// backend/models/Room.js
// Purpose: Defines a Room — an isolated whiteboard space.
// The `strokes` array IS the drawing history: when a new user joins,
// the server sends this array so their canvas replays exactly what exists.

const mongoose = require("mongoose");

const strokeSchema = new mongoose.Schema(
  {
    strokeId: { type: String, required: true }, // client-generated unique id (uuid)
    tool: {
      type: String,
      enum: ["pencil", "eraser", "rectangle", "circle", "line"],
      required: true,
    },
    color: { type: String, required: true },
    size: { type: Number, required: true, min: 1, max: 50 },
    points: {
      // For pencil/eraser: array of {x,y}. For shapes: [start, end] is enough.
      type: [{ x: Number, y: Number }],
      required: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    username: { type: String },
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } }
);

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Room name is required"],
      trim: true,
      maxlength: [50, "Room name cannot exceed 50 characters"],
    },
    code: {
      type: String,
      required: true,
      unique: true, // used to join a room, must be unique
      uppercase: true,
      trim: true,
      minlength: 6,
      maxlength: 6,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    strokes: {
      type: [strokeSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Index on `code` for fast room lookups on join (unique: true already creates one).
roomSchema.index({ owner: 1 }); // fast lookup of "my rooms"

module.exports = mongoose.model("Room", roomSchema);
