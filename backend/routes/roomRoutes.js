const express = require("express");
const { body } = require("express-validator");
const { createRoom, getMyRooms, getRoomByCode, deleteRoom } = require("../controllers/roomController");
const { ensureAuthenticated } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(ensureAuthenticated);

router.post(
  "/",
  [body("name").trim().isLength({ min: 1, max: 50 }).withMessage("Room name must be 1-50 characters")],
  createRoom
);

router.get("/mine", getMyRooms);
router.get("/:code", getRoomByCode);
router.delete("/:code", deleteRoom);

module.exports = router;
