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
import AiSummaryModal from "../components/AiSummaryModal";

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
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [aiHasContent, setAiHasContent] = useState(true);

  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const [, forceRerender] = useState(0);
  const bump = () => forceRerender((n) => n + 1);

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

      socket.on("stroke-updated", (stroke) => {
        canvasRef.current?.updateStroke(stroke);
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

  }, [code]);

  const handleStrokeComplete = useCallback((stroke) => {
    stroke.userId = user.id;
    stroke.username = user.username;
    socketRef.current?.emit("draw-stroke", { roomCode: code, stroke });
    undoStack.current.push(stroke);
    redoStack.current = [];
    bump();
  }, [code, user]);

  const handleCursorMove = useCallback((x, y) => {
    socketRef.current?.emit("cursor-move", { roomCode: code, x, y });
  }, [code]);

  const handleStrokeUpdate = useCallback((stroke) => {
    socketRef.current?.emit("update-stroke", { roomCode: code, stroke });
  }, [code]);

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

  const handleClear = () => {
    canvasRef.current?.clear();
    socketRef.current?.emit("clear-canvas", { roomCode: code });
    undoStack.current = [];
    redoStack.current = [];
    setClearConfirmOpen(false);
    bump();
  };

  const handleLeave = () => navigate("/dashboard");

  const handleGenerateSummary = async () => {
    setAiOpen(true);
    setAiLoading(true);
    setAiError("");
    try {
      const { data } = await api.post("/ai/summarize", { roomCode: code });
      setAiSummary(data.summary);
      setAiHasContent(data.hasContent);
    } catch (err) {
      setAiError(err.response?.data?.message || "Failed to generate summary");
    } finally {
      setAiLoading(false);
    }
  };

  if (!room) return null;

  return (
    <div className="whiteboard-page">
      <Navbar />
      <div className="whiteboard-toprow">
        <button className="btn btn-ghost" onClick={handleLeave}>← Leave Room</button>
        <div className="whiteboard-toprow-right">
          <button className="btn btn-primary" onClick={handleGenerateSummary}>✨ Generate AI Summary</button>
          <span className={`connection-badge ${connected ? "online" : "offline"}`}>
            {connected ? "● Live" : "○ Reconnecting..."}
          </span>
        </div>
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
            onStrokeUpdate={handleStrokeUpdate}
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

      <AiSummaryModal
        open={aiOpen}
        loading={aiLoading}
        error={aiError}
        summary={aiSummary}
        hasContent={aiHasContent}
        onRegenerate={handleGenerateSummary}
        onClose={() => setAiOpen(false)}
      />
    </div>
  );
}
