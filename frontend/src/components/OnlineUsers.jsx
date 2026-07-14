// src/components/OnlineUsers.jsx
// Purpose: Sidebar panel listing everyone currently connected to this room,
// with join time and a colored dot matching their live cursor color.

export default function OnlineUsers({ users, roomName, roomCode }) {
  const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <aside className="online-users-panel">
      <div className="room-info">
        <h4>{roomName}</h4>
        <span className="room-code-badge">Code: {roomCode}</span>
      </div>
      <div className="toolbar-label">Users Online: {users.length}</div>
      <ul className="user-list">
        {users.map((u) => (
          <li key={u.userId + u.joinedAt} className="user-list-item">
            <span className="user-dot" style={{ backgroundColor: u.cursorColor }} />
            <div className="user-list-text">
              <span className="user-list-name">{u.username}</span>
              <span className="user-list-meta">Joined {formatTime(u.joinedAt)}</span>
            </div>
          </li>
        ))}
        {users.length === 0 && <li className="empty-state-small">No one else is here yet</li>}
      </ul>
    </aside>
  );
}
