const express = require("express");
const { body } = require("express-validator");
const { summarizeRoom } = require("../controllers/aiController");
const { ensureAuthenticated } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(ensureAuthenticated);

router.post(
  "/summarize",
  [body("roomCode").trim().isLength({ min: 6, max: 6 }).withMessage("A valid room code is required")],
  summarizeRoom
);

module.exports = router;
