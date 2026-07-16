// backend/controllers/authController.js
// Purpose: Handles registration, login, logout, and "who am I" checks.
// This is the Controller layer in MVC — it talks to the Model (User) and returns
// clean JSON responses; it never contains raw DB queries beyond what's needed here.

const bcrypt = require("bcryptjs");
const passport = require("passport");
const { validationResult } = require("express-validator");
const User = require("../models/User");

// @route  POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Username or email already in use" });
    }

    // Hash the password with a salt round of 12 — a strong, industry-standard balance
    // between security and login speed.
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    // Automatically log the user in after registration by establishing a session.
    req.login(user, (err) => {
      if (err) return next(err);
      return res.status(201).json({
        success: true,
        user: { id: user._id, username: user.username, email: user.email, role: user.role, cursorColor: user.cursorColor },
      });
    });
  } catch (error) {
    next(error);
  }
};

// @route  POST /api/auth/login
const login = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ success: false, message: info?.message || "Login failed" });
    }

    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);

      // "Remember Me" — extend session cookie lifetime if requested.
      if (req.body.rememberMe) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      } else {
        req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 1 day
      }

      return res.status(200).json({
        success: true,
        user: { id: user._id, username: user.username, email: user.email, role: user.role, cursorColor: user.cursorColor },
      });
    });
  })(req, res, next);
};

// @route  POST /api/auth/logout
const logout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((destroyErr) => {
      if (destroyErr) return next(destroyErr);
      res.clearCookie("connect.sid");
      return res.status(200).json({ success: true, message: "Logged out successfully" });
    });
  });
};

// @route  GET /api/auth/me
const getCurrentUser = (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    const { _id, username, email, role, cursorColor } = req.user;
    return res.status(200).json({ success: true, user: { id: _id, username, email, role, cursorColor } });
  }
  return res.status(200).json({ success: true, user: null });
};

module.exports = { register, login, logout, getCurrentUser };
