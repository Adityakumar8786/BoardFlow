// src/components/Canvas.jsx
// Purpose: The drawing surface itself. Handles mouse events for all 5 tools, renders
// incoming strokes from other users, and exposes an imperative API (via ref) for
// undo/redo/clear/export so the parent (WhiteboardRoom) can orchestrate socket events.

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

const CURSOR_THROTTLE_MS = 40; // ~25 updates/sec — see socketHandler.js for rationale

const Canvas = forwardRef(function Canvas(
  { tool, color, size, onStrokeComplete, onCursorMove },
  ref
) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const currentPoints = useRef([]);
  const snapshotBeforeShape = useRef(null); // for live shape preview (rectangle/circle/line)
  const lastCursorEmit = useRef(0);
  const [, forceRerender] = useState(0);

  // All persisted strokes currently on the canvas, so we can fully redraw from scratch
  // (needed for undo/redo/clear/resize — canvases have no concept of "layers").
  const strokesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      const parent = canvas.parentElement;
      // Preserve existing drawing across a resize by redrawing from strokesRef.
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      const ctx = canvas.getContext("2d");
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctxRef.current = ctx;
      redrawAll();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drawStroke = (ctx, stroke) => {
    ctx.strokeStyle = stroke.tool === "eraser" ? "#FFFFFF" : stroke.color;
    ctx.lineWidth = stroke.size;

    if (stroke.tool === "pencil" || stroke.tool === "eraser") {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    } else if (stroke.tool === "line") {
      const [a, b] = stroke.points;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    } else if (stroke.tool === "rectangle") {
      const [a, b] = stroke.points;
      ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    } else if (stroke.tool === "circle") {
      const [a, b] = stroke.points;
      const radius = Math.hypot(b.x - a.x, b.y - a.y);
      ctx.beginPath();
      ctx.arc(a.x, a.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  const redrawAll = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    strokesRef.current.forEach((s) => drawStroke(ctx, s));
  };

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e) => {
    drawing.current = true;
    const pos = getPos(e);
    currentPoints.current = [pos];
    if (tool !== "pencil" && tool !== "eraser") {
      // Save a snapshot so shape tools can show a live preview without permanently
      // committing intermediate frames to strokesRef.
      snapshotBeforeShape.current = ctxRef.current.getImageData(
        0, 0, canvasRef.current.width, canvasRef.current.height
      );
    }
  };

  const handleMouseMove = (e) => {
    const pos = getPos(e);

    // Throttled live cursor broadcast (see rationale in socketHandler.js)
    const now = Date.now();
    if (now - lastCursorEmit.current > CURSOR_THROTTLE_MS) {
      onCursorMove(pos.x, pos.y);
      lastCursorEmit.current = now;
    }

    if (!drawing.current) return;
    const ctx = ctxRef.current;

    if (tool === "pencil" || tool === "eraser") {
      const prev = currentPoints.current[currentPoints.current.length - 1];
      currentPoints.current.push(pos);
      ctx.strokeStyle = tool === "eraser" ? "#FFFFFF" : color;
      ctx.lineWidth = size;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else {
      // Shape tools: restore snapshot, then draw the live preview from start->current.
      currentPoints.current = [currentPoints.current[0], pos];
      ctx.putImageData(snapshotBeforeShape.current, 0, 0);
      drawStroke(ctx, { tool, color, size, points: currentPoints.current });
    }
  };

  const handleMouseUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (currentPoints.current.length < 2 && (tool === "pencil" || tool === "eraser")) {
      // A single click with no drag — draw a dot so it's not silently lost.
      currentPoints.current.push(currentPoints.current[0]);
    }
    const stroke = {
      strokeId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      tool,
      color,
      size,
      points: currentPoints.current,
    };
    strokesRef.current.push(stroke);
    onStrokeComplete(stroke);
    currentPoints.current = [];
  };

  useImperativeHandle(ref, () => ({
    addRemoteStroke(stroke) {
      strokesRef.current.push(stroke);
      drawStroke(ctxRef.current, stroke);
    },
    removeStroke(strokeId) {
      strokesRef.current = strokesRef.current.filter((s) => s.strokeId !== strokeId);
      redrawAll();
    },
    loadHistory(strokes) {
      strokesRef.current = strokes;
      redrawAll();
    },
    clear() {
      strokesRef.current = [];
      redrawAll();
    },
    exportImage(format) {
      const mime = format === "jpg" ? "image/jpeg" : "image/png";
      // toDataURL() serializes the canvas's current pixel buffer into a base64-encoded
      // image string — no server round-trip needed since the canvas already holds the
      // fully-composited drawing.
      const dataUrl = canvasRef.current.toDataURL(mime, 0.95);
      const link = document.createElement("a");
      link.download = `whiteboard.${format}`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      className="drawing-canvas"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
});

export default Canvas;
