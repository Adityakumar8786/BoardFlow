const mongoose = require("mongoose");

const strokeSchema = new mongoose.Schema(
  {
    strokeId: { type: String, required: true },
    tool: {
      type: String,
      enum: ["pencil", "eraser", "rectangle", "circle", "line", "text"],
      required: true,
    },
    color: { type: String, required: true },

    size: { type: Number, required: true, min: 1, max: 50 },
    points: {

      type: [{ x: Number, y: Number }],
      required: true,
    },

    content: { type: String, maxlength: 500 },
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
      unique: true,
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

roomSchema.index({ owner: 1 });

module.exports = mongoose.model("Room", roomSchema);
