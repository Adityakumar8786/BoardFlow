// src/pages/WhiteboardRoom.jsx
// Purpose: The main whiteboard screen. Owns the Socket.IO connection for this room,
// wires Canvas events to the server, tracks presence + remote cursors, and implements
// the undo/redo stacks.
//
// UNDO/REDO DATA STRUCTURE — WHY A STACK:
// Each user keeps two LOCAL stacks: `undoStack` (their own completed strokes, most-recent
// on top) and `redoStack` (strokes they just undid). A stack is the natural fit because
// undo/redo is strictly last-in-first-out: you always undo the most recent action first,
// and redo always restores the most recently undone one. Using an array with push/pop
// gives O(1) operations.
//   - Undo: pop from undoStack -> tell server to remove that stroke -> push it onto redoStack
//   - Redo: pop from redoStack -> tell server to re-add that stroke -> push it onto undoStack
// MEMORY IMPLICATIONS: stacks are kept in React state, capped implicitly by session length.
// For a very long-running session this could grow unbounded; a production hardening step
// would cap stack size (e.g. last 100 actions) and drop the oldest silently.
// EDGE CASES:
//   - Drawing a NEW stroke after undoing clears the redoStack (standard editor behavior —
//     otherwise "redo" could reattach a stroke whose canvas state no longer makes sense).
//   - Undo/redo only affects strokes made by the CURRENT user, not collaborators' strokes —
//     this avoids the confusing UX of one person's undo erasing someone else's work.
//   - If the socket disconnects mid-stack, stacks reset on reconnect (history re-syncs from
//     the server via 'room-history', which is always the source of truth).

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Navbar from "../components/Navbar";
import Canvas from "../components/Canvas";
import Toolbar from "../components/Toolbar";
import OnlineUsers from "../components/OnlineUsers";
import RemoteCursors from "../components/RemoteCursors";
import ConfirmDialog from "../components/ConfirmDialog";

export default function WhiteboardRoom() {
  const { code } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [tool, setTool] = useState("pencil");
  const [color, setColor] = useState("#1E1E1E");
  const [size, setSize] = useState(4);
  const [users, setUsers] = useState([]);
  const [cursors, setCursors] = useState({});
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [connected, setConnected] = useState(false);

  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const [, forceRerender] = useState(0);
  const bump = () => forceRerender((n) => n + 1);

  // ---------- Load room metadata + connect socket ----------
  useEffect(() => {
    let isMounted = true;

    const setup = async () => {
      try {
        const { data } = await api.get(`/rooms/${code}`);
        if (!isMounted) return;
        setRoom(data.room);
      } catch (err) {
        showToast("Room not found", "error");
        navigate("/dashboard");
        return;
      }

      const socket = io("/", { withCredentials: true });
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        socket.emit("join-room", {
          roomCode: code,
          user: { id: user.id, username: user.username, cursorColor: user.cursorColor },
        });
      });

      socket.on("disconnect", () => setConnected(false));

      socket.on("room-history", (strokes) => {
        canvasRef.current?.loadHistory(strokes);
      });

      socket.on("stroke-added", (stroke) => {
        canvasRef.current?.addRemoteStroke(stroke);
      });

      socket.on("stroke-removed", (strokeId) => {
        canvasRef.current?.removeStroke(strokeId);
      });

      socket.on("canvas-cleared", () => {
        canvasRef.current?.clear();
      });

      socket.on("presence-update", (list) => setUsers(list));

      socket.on("user-joined", ({ username }) => showToast(`${username} joined the room`, "info"));
      socket.on("user-left", ({ username }) => showToast(`${username} left the room`, "info"));

      socket.on("cursor-update", (data) => {
        setCursors((prev) => ({ ...prev, [data.socketId]: data }));
      });

      socket.on("cursor-remove", (socketId) => {
        setCursors((prev) => {
          const next = { ...prev };
          delete next[socketId];
          return next;
        });
      });

      socket.on("error-message", (msg) => showToast(msg, "error"));
    };

    setup();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.emit("leave-room");
        socketRef.current.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // ---------- Stroke completed locally ----------
  const handleStrokeComplete = useCallback((stroke) => {
    stroke.userId = user.id;
    stroke.username = user.username;
    socketRef.current?.emit("draw-stroke", { roomCode: code, stroke });
    undoStack.current.push(stroke);
    redoStack.current = []; // new action invalidates the redo history (standard editor behavior)
    bump();
  }, [code, user]);

  const handleCursorMove = useCallback((x, y) => {
    socketRef.current?.emit("cursor-move", { roomCode: code, x, y });
  }, [code]);

  // ---------- Undo / Redo ----------
  const handleUndo = () => {
    const stroke = undoStack.current.pop();
    if (!stroke) return;
    canvasRef.current?.removeStroke(stroke.strokeId);
    socketRef.current?.emit("undo-stroke", { roomCode: code, strokeId: stroke.strokeId });
    redoStack.current.push(stroke);
    bump();
  };

  const handleRedo = () => {
    const stroke = redoStack.current.pop();
    if (!stroke) return;
    canvasRef.current?.addRemoteStroke(stroke);
    socketRef.current?.emit("redo-stroke", { roomCode: code, stroke });
    undoStack.current.push(stroke);
    bump();
  };

  // ---------- Clear ----------
  const handleClear = () => {
    canvasRef.current?.clear();
    socketRef.current?.emit("clear-canvas", { roomCode: code });
    undoStack.current = [];
    redoStack.current = [];
    setClearConfirmOpen(false);
    bump();
  };

  const handleLeave = () => navigate("/dashboard");

  if (!room) return null;

  return (
    <div className="whiteboard-page">
      <Navbar />
      <div className="whiteboard-toprow">
        <button className="btn btn-ghost" onClick={handleLeave}>← Leave Room</button>
        <span className={`connection-badge ${connected ? "online" : "offline"}`}>
          {connected ? "● Live" : "○ Reconnecting..."}
        </span>
      </div>
      <div className="whiteboard-layout">
        <Toolbar
          tool={tool} setTool={setTool}
          color={color} setColor={setColor}
          size={size} setSize={setSize}
          onUndo={handleUndo} onRedo={handleRedo}
          canUndo={undoStack.current.length > 0}
          canRedo={redoStack.current.length > 0}
          onClear={() => setClearConfirmOpen(true)}
          onExportPNG={() => canvasRef.current?.exportImage("png")}
          onExportJPG={() => canvasRef.current?.exportImage("jpg")}
        />

        <div className="canvas-wrapper">
          <Canvas
            ref={canvasRef}
            tool={tool} color={color} size={size}
            onStrokeComplete={handleStrokeComplete}
            onCursorMove={handleCursorMove}
          />
          <RemoteCursors cursors={cursors} />
        </div>

        <OnlineUsers users={users} roomName={room.name} roomCode={room.code} />
      </div>

      <ConfirmDialog
        open={clearConfirmOpen}
        title="Clear Canvas"
        message="This will erase the whiteboard for everyone in this room. Continue?"
        onConfirm={handleClear}
        onCancel={() => setClearConfirmOpen(false)}
      />
    </div>
  );
}
