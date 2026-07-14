// backend/routes/roomRoutes.js
// Purpose: Defines REST endpoints for room management. All routes require authentication.

const express = require("express");
const { body } = require("express-validator");
const { createRoom, getMyRooms, getRoomByCode, deleteRoom } = require("../controllers/roomController");
const { ensureAuthenticated } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(ensureAuthenticated); // every route below requires a logged-in user

router.post(
  "/",
  [body("name").trim().isLength({ min: 1, max: 50 }).withMessage("Room name must be 1-50 characters")],
  createRoom
);

router.get("/mine", getMyRooms);
router.get("/:code", getRoomByCode);
router.delete("/:code", deleteRoom);

module.exports = router;
