export default function RemoteCursors({ cursors }) {
  return (
    <>
      {Object.values(cursors).map((c) => (
        <div
          key={c.socketId}
          className="remote-cursor"
          style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%`, color: c.cursorColor }}
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
