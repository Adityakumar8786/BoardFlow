const Room = require("../models/Room");


const presenceByRoom = {};



const getPresenceList = (roomCode) => {
  const room = presenceByRoom[roomCode] || {};
  return Object.values(room);
};

const initSocket = (io) => {
  io.on("connection", (socket) => {
    let currentRoom = null;
    let currentUser = null;

    // ---------- JOIN ROOM ----------
    socket.on("join-room", async ({ roomCode, user }) => {
      try {
        const room = await Room.findOne({ code: roomCode });
        if (!room) {
          socket.emit("error-message", "Room not found");
          return;
        }

        currentRoom = roomCode;
        currentUser = user;
        socket.join(roomCode);

        if (!presenceByRoom[roomCode]) presenceByRoom[roomCode] = {};
        presenceByRoom[roomCode][socket.id] = {
          userId: user.id,
          username: user.username,
          cursorColor: user.cursorColor,
          joinedAt: new Date().toISOString(),
        };

        // Send full drawing history to just this socket so their canvas replays existing strokes.
        socket.emit("room-history", room.strokes);

        // Tell everyone in the room (including the new user) who's online now.
        io.to(roomCode).emit("presence-update", getPresenceList(roomCode));
        socket.to(roomCode).emit("user-joined", { username: user.username });
      } catch (err) {
        socket.emit("error-message", "Failed to join room");
      }
    });

    // ---------- LEAVE ROOM ----------
    socket.on("leave-room", () => {
      handleLeave(socket, io, currentRoom, currentUser);
      currentRoom = null;
      currentUser = null;
    });

    // ---------- DRAW STROKE ----------
    socket.on("draw-stroke", async ({ roomCode, stroke }) => {
      try {
        await Room.updateOne({ code: roomCode }, { $push: { strokes: stroke } });
        socket.to(roomCode).emit("stroke-added", stroke);
      } catch (err) {
        socket.emit("error-message", "Failed to save stroke");
      }
    });

    // ---------- UNDO ----------
    // Removes the most recent stroke belonging to THIS user in this room (by strokeId sent
    // from the client, which maintains its own per-user undo stack — see WhiteboardRoom.jsx).
    socket.on("undo-stroke", async ({ roomCode, strokeId }) => {
      try {
        await Room.updateOne({ code: roomCode }, { $pull: { strokes: { strokeId } } });
        io.to(roomCode).emit("stroke-removed", strokeId);
      } catch (err) {
        socket.emit("error-message", "Failed to undo");
      }
    });

    
    socket.on("redo-stroke", async ({ roomCode, stroke }) => {
      try {
        await Room.updateOne({ code: roomCode }, { $push: { strokes: stroke } });
        io.to(roomCode).emit("stroke-added", stroke);
      } catch (err) {
        socket.emit("error-message", "Failed to redo");
      }
    });

    
    socket.on("clear-canvas", async ({ roomCode }) => {
      try {
        await Room.updateOne({ code: roomCode }, { $set: { strokes: [] } });
        io.to(roomCode).emit("canvas-cleared");
      } catch (err) {
        socket.emit("error-message", "Failed to clear canvas");
      }
    });

    
    socket.on("cursor-move", ({ roomCode, x, y }) => {
      if (!currentUser) return;
      socket.to(roomCode).emit("cursor-update", {
        socketId: socket.id,
        username: currentUser.username,
        cursorColor: currentUser.cursorColor,
        x,
        y,
      });
    });

    // ---------- DISCONNECT ----------
    socket.on("disconnect", () => {
      handleLeave(socket, io, currentRoom, currentUser);
    });
  });
};

function handleLeave(socket, io, roomCode, user) {
  if (!roomCode) return;
  socket.leave(roomCode);
  if (presenceByRoom[roomCode]) {
    delete presenceByRoom[roomCode][socket.id];
    if (Object.keys(presenceByRoom[roomCode]).length === 0) {
      delete presenceByRoom[roomCode];
    }
  }
  io.to(roomCode).emit("presence-update", getPresenceList(roomCode));
  io.to(roomCode).emit("cursor-remove", socket.id);
  if (user) {
    socket.to(roomCode).emit("user-left", { username: user.username });
  }
}

module.exports = initSocket;
