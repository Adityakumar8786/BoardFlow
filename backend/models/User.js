// backend/models/User.js
// Purpose: Defines the User schema — stores credentials and profile info.
// Password is stored as a bcrypt hash, never plain text.

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [20, "Username cannot exceed 20 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // never returned in queries by default
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    cursorColor: {
      type: String,
      default: function () {
        // Assign a random hex color at creation so each user has a stable cursor color.
        const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7B267", "#9B5DE5", "#00BBF9"];
        return colors[Math.floor(Math.random() * colors.length)];
      },
    },
  },
  { timestamps: true }
);

// Index on email/username already created via `unique: true`.
// Compound text index could be added later for search — not needed at current scale.

module.exports = mongoose.model("User", userSchema);
