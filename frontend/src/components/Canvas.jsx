import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

const CURSOR_THROTTLE_MS = 40;
const RESIZE_DEBOUNCE_MS = 120;

const Canvas = forwardRef(function Canvas(
  { tool, color, size, onStrokeComplete, onStrokeUpdate, onCursorMove },
  ref
) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const currentPoints = useRef([]);
  const snapshotBeforeShape = useRef(null);
  const lastCursorEmit = useRef(0);
  const resizeTimer = useRef(null);

  const strokesRef = useRef([]);

  const [textEditor, setTextEditor] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      const parent = canvas.parentElement;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      const ctx = canvas.getContext("2d");
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctxRef.current = ctx;
      redrawAll();
    };

    const debouncedResize = () => {
      clearTimeout(resizeTimer.current);
      resizeTimer.current = setTimeout(resize, RESIZE_DEBOUNCE_MS);
    };

    resize();
    window.addEventListener("resize", debouncedResize);
    window.addEventListener("orientationchange", debouncedResize);
    return () => {
      window.removeEventListener("resize", debouncedResize);
      window.removeEventListener("orientationchange", debouncedResize);
      clearTimeout(resizeTimer.current);
    };

  }, []);

  const toNormalized = (pos) => ({
    x: pos.x / canvasRef.current.width,
    y: pos.y / canvasRef.current.height,
  });
  const toPixels = (pt) => ({
    x: pt.x * canvasRef.current.width,
    y: pt.y * canvasRef.current.height,
  });

  const getPointerPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const drawStroke = (ctx, stroke) => {
    if (stroke.tool === "text") {
      const p = toPixels(stroke.points[0]);
      ctx.fillStyle = stroke.color;
      ctx.font = `${stroke.size * 4}px 'Inter', sans-serif`;
      ctx.textBaseline = "top";

      (stroke.content || "").split("\n").forEach((line, i) => {
        ctx.fillText(line, p.x, p.y + i * stroke.size * 4.5);
      });
      return;
    }

    ctx.strokeStyle = stroke.tool === "eraser" ? "#FFFFFF" : stroke.color;
    ctx.lineWidth = stroke.size;

    if (stroke.tool === "pencil" || stroke.tool === "eraser") {
      if (stroke.points.length < 2) return;
      const pts = stroke.points.map(toPixels);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    } else if (stroke.tool === "line") {
      const [a, b] = stroke.points.map(toPixels);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    } else if (stroke.tool === "rectangle") {
      const [a, b] = stroke.points.map(toPixels);
      ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    } else if (stroke.tool === "circle") {
      const [a, b] = stroke.points.map(toPixels);
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

  const findTextStrokeAt = (pos) => {
    const ctx = ctxRef.current;
    for (let i = strokesRef.current.length - 1; i >= 0; i--) {
      const s = strokesRef.current[i];
      if (s.tool !== "text") continue;
      const p = toPixels(s.points[0]);
      const lines = (s.content || "").split("\n");
      ctx.font = `${s.size * 4}px 'Inter', sans-serif`;
      const width = Math.max(...lines.map((l) => ctx.measureText(l).width), 20);
      const height = lines.length * s.size * 4.5 + 6;
      if (pos.x >= p.x && pos.x <= p.x + width && pos.y >= p.y && pos.y <= p.y + height) {
        return s;
      }
    }
    return null;
  };

  const handlePointerDown = (e) => {
    canvasRef.current.setPointerCapture?.(e.pointerId);
    const pos = getPointerPos(e);

    if (tool === "text") {

      setTextEditor({ strokeId: null, x: pos.x, y: pos.y, value: "" });
      return;
    }

    drawing.current = true;
    currentPoints.current = [toNormalized(pos)];
    if (tool !== "pencil" && tool !== "eraser") {
      snapshotBeforeShape.current = ctxRef.current.getImageData(
        0, 0, canvasRef.current.width, canvasRef.current.height
      );
    }
  };

  const handlePointerMove = (e) => {
    const pos = getPointerPos(e);

    const now = Date.now();
    if (now - lastCursorEmit.current > CURSOR_THROTTLE_MS) {
      const n = toNormalized(pos);
      onCursorMove(n.x, n.y);
      lastCursorEmit.current = now;
    }

    if (!drawing.current) return;
    const ctx = ctxRef.current;
    const norm = toNormalized(pos);

    if (tool === "pencil" || tool === "eraser") {
      const prevPx = toPixels(currentPoints.current[currentPoints.current.length - 1]);
      currentPoints.current.push(norm);
      ctx.strokeStyle = tool === "eraser" ? "#FFFFFF" : color;
      ctx.lineWidth = size;
      ctx.beginPath();
      ctx.moveTo(prevPx.x, prevPx.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else {
      currentPoints.current = [currentPoints.current[0], norm];
      ctx.putImageData(snapshotBeforeShape.current, 0, 0);
      drawStroke(ctx, { tool, color, size, points: currentPoints.current });
    }
  };

  const handlePointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (currentPoints.current.length < 2 && (tool === "pencil" || tool === "eraser")) {
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

  const handleDoubleClick = (e) => {
    const pos = getPointerPos(e);
    const hit = findTextStrokeAt(pos);
    if (hit) {
      const p = toPixels(hit.points[0]);
      setTextEditor({ strokeId: hit.strokeId, x: p.x, y: p.y, value: hit.content, color: hit.color, size: hit.size });
    }
  };

  const commitTextEditor = () => {
    if (!textEditor) return;
    const trimmed = textEditor.value;
    if (trimmed.trim().length === 0) {

      if (textEditor.strokeId) {
        strokesRef.current = strokesRef.current.filter((s) => s.strokeId !== textEditor.strokeId);
        redrawAll();
      }
      setTextEditor(null);
      return;
    }

    if (textEditor.strokeId) {

      const idx = strokesRef.current.findIndex((s) => s.strokeId === textEditor.strokeId);
      if (idx !== -1) {
        strokesRef.current[idx] = { ...strokesRef.current[idx], content: trimmed };
        onStrokeUpdate(strokesRef.current[idx]);
      }
    } else {

      const stroke = {
        strokeId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        tool: "text",
        color,
        size,
        points: [toNormalized({ x: textEditor.x, y: textEditor.y })],
        content: trimmed,
      };
      strokesRef.current.push(stroke);
      onStrokeComplete(stroke);
    }
    redrawAll();
    setTextEditor(null);
  };

  const cancelTextEditor = () => setTextEditor(null);

  useImperativeHandle(ref, () => ({
    addRemoteStroke(stroke) {
      strokesRef.current.push(stroke);
      drawStroke(ctxRef.current, stroke);
    },
    updateStroke(stroke) {
      const idx = strokesRef.current.findIndex((s) => s.strokeId === stroke.strokeId);
      if (idx !== -1) {
        strokesRef.current[idx] = stroke;
        redrawAll();
      }
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
    <div className="canvas-inner-wrapper" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        style={{ touchAction: "none" }}         onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      />
      {textEditor && (
        <textarea
          autoFocus
          className="text-tool-input"
          style={{
            left: textEditor.x,
            top: textEditor.y,
            color: textEditor.color || color,
            fontSize: (textEditor.size || size) * 4,
          }}
          value={textEditor.value}
          onChange={(e) => setTextEditor({ ...textEditor, value: e.target.value })}
          onBlur={commitTextEditor}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commitTextEditor();
            } else if (e.key === "Escape") {
              cancelTextEditor();
            }
          }}
        />
      )}
    </div>
  );
});

export default Canvas;
