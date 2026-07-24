const TOOLS = [
  { id: "pencil", label: "Pencil", icon: "✏️" },
  { id: "eraser", label: "Eraser", icon: "🧹" },
  { id: "line", label: "Line", icon: "／" },
  { id: "rectangle", label: "Rectangle", icon: "▭" },
  { id: "circle", label: "Circle", icon: "◯" },
  { id: "text", label: "Text", icon: "𝐓" },
];

const COLORS = ["#1E1E1E", "#E03131", "#2F9E44", "#1971C2", "#F08C00", "#9C36B5", "#0CA678", "#FFFFFF"];

export default function Toolbar({
  tool, setTool, color, setColor, size, setSize,
  onUndo, onRedo, canUndo, canRedo,
  onClear, onExportPNG, onExportJPG,
}) {
  return (
    <aside className="toolbar">
      <div className="toolbar-section">
        <span className="toolbar-label">Tools</span>
        <div className="tool-grid">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              className={`tool-btn ${tool === t.id ? "active" : ""}`}
              title={t.label}
              onClick={() => setTool(t.id)}
            >
              {t.icon}
            </button>
          ))}
        </div>
        {tool === "text" && (
          <p className="toolbar-hint">Click the canvas to type. Double-click any text to edit it.</p>
        )}
      </div>

      <div className="toolbar-section">
        <span className="toolbar-label">Color</span>
        <div className="color-grid">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`color-swatch ${color === c ? "active" : ""}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="color-picker-input"
            title="Custom color"
          />
        </div>
      </div>

      <div className="toolbar-section">
        <span className="toolbar-label">Brush Size: {size}px</span>
        <input
          type="range" min="1" max="40" value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="size-slider"
        />
      </div>

      <div className="toolbar-section toolbar-row">
        <button className="btn btn-ghost" disabled={!canUndo} onClick={onUndo}>↩ Undo</button>
        <button className="btn btn-ghost" disabled={!canRedo} onClick={onRedo}>↪ Redo</button>
      </div>

      <div className="toolbar-section">
        <button className="btn btn-danger-outline full-width" onClick={onClear}>🗑 Clear Canvas</button>
      </div>

      <div className="toolbar-section toolbar-row">
        <button className="btn btn-secondary" onClick={onExportPNG}>Export PNG</button>
        <button className="btn btn-secondary" onClick={onExportJPG}>Export JPG</button>
      </div>
    </aside>
  );
}
