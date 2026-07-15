// src/components/RemoteCursors.jsx
// Purpose: Renders every other connected user's mouse pointer as a small labeled
// triangle positioned absolutely over the canvas, updated via the 'cursor-update' socket event.

export default function RemoteCursors({ cursors }) {
  return (
    <>
      {Object.values(cursors).map((c) => (
        <div
          key={c.socketId}
          className="remote-cursor"
          style={{ transform: `translate(${c.x}px, ${c.y}px)`, color: c.cursorColor }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20">
            <path d="M2 2 L18 8 L10 10 L8 18 Z" fill={c.cursorColor} stroke="white" strokeWidth="1" />
          </svg>
          <span className="cursor-label" style={{ backgroundColor: c.cursorColor }}>{c.username}</span>
        </div>
      ))}
    </>
  );
}
