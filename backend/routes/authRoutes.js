const express = require("express");
const { body } = require("express-validator");
const { register, login, logout, getCurrentUser } = require("../controllers/authController");

const router = express.Router();

router.post(
  "/register",
  [
    body("username")
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage("Username must be 3-20 characters")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage("Username can only contain letters, numbers, and underscores"),
    body("email").trim().isEmail().withMessage("Please provide a valid email").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  register
);

router.post(
  "/login",
  [
    body("email").trim().isEmail().withMessage("Please provide a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  login
);

router.post("/logout", logout);
router.get("/me", getCurrentUser);

module.exports = router;
