const { validationResult } = require("express-validator");
const Room = require("../models/Room");

const generateRoomCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

// @route  POST /api/rooms
const createRoom = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    let code = generateRoomCode();
    // Extremely unlikely, but guarantee uniqueness before insert.
    while (await Room.findOne({ code })) {
      code = generateRoomCode();
    }

    const room = await Room.create({
      name: req.body.name,
      code,
      owner: req.user._id,
    });

    res.status(201).json({ success: true, room });
  } catch (error) {
    next(error);
  }
};

// @route  GET /api/rooms/mine
const getMyRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({ owner: req.user._id })
      .select("name code createdAt")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, rooms });
  } catch (error) {
    next(error);
  }
};

const getRoomByCode = async (req, res, next) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found. Check the code and try again." });
    }
    res.status(200).json({ success: true, room });
  } catch (error) {
    next(error);
  }
};

const deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }
    if (String(room.owner) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only the room owner can delete this room" });
    }
    await room.deleteOne();
    res.status(200).json({ success: true, message: "Room deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = { createRoom, getMyRooms, getRoomByCode, deleteRoom };
