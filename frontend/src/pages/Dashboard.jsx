// src/pages/Dashboard.jsx
// Purpose: Lists rooms owned by the user, lets them create a new room, or join an
// existing one by code. This is the landing page after login.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../context/ToastContext";

export default function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRoomName, setNewRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadRooms = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/rooms/mine");
      setRooms(data.rooms);
    } catch {
      showToast("Failed to load rooms", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post("/rooms", { name: newRoomName.trim() });
      showToast(`Room created! Code: ${data.room.code}`, "success");
      setNewRoomName("");
      navigate(`/room/${data.room.code}`);
    } catch (err) {
      showToast(err.response?.data?.message || "Could not create room", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      await api.get(`/rooms/${joinCode.trim().toUpperCase()}`);
      navigate(`/room/${joinCode.trim().toUpperCase()}`);
    } catch (err) {
      showToast(err.response?.data?.message || "Room not found", "error");
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/rooms/${deleteTarget.code}`);
      showToast("Room deleted", "success");
      setDeleteTarget(null);
      loadRooms();
    } catch (err) {
      showToast(err.response?.data?.message || "Could not delete room", "error");
    }
  };

  return (
    <div>
      <Navbar />
      <main className="page-container">
        <section className="dashboard-actions">
          <form className="card action-card" onSubmit={handleCreate}>
            <h3>Create a Room</h3>
            <p className="muted">Start a fresh whiteboard and invite others with a code.</p>
            <input
              className="form-input" placeholder="Room name (e.g. Sprint Planning)"
              value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)}
            />
            <button className="btn btn-primary full-width" disabled={creating}>
              {creating ? "Creating..." : "+ Create Room"}
            </button>
          </form>

          <form className="card action-card" onSubmit={handleJoin}>
            <h3>Join a Room</h3>
            <p className="muted">Enter a 6-character code shared with you.</p>
            <input
              className="form-input" placeholder="e.g. A3F9K2" maxLength={6}
              value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            />
            <button className="btn btn-secondary full-width">→ Join Room</button>
          </form>
        </section>

        <section>
          <h3 className="section-title">Your Rooms</h3>
          {loading ? (
            <div className="empty-state">Loading rooms...</div>
          ) : rooms.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🖌️</span>
              <p>No rooms yet. Create one above to get started.</p>
            </div>
          ) : (
            <div className="room-grid">
              {rooms.map((r) => (
                <div className="card room-card" key={r._id}>
                  <div className="room-card-top">
                    <h4>{r.name}</h4>
                    <button className="icon-btn-small" onClick={() => setDeleteTarget(r)} title="Delete room">✕</button>
                  </div>
                  <span className="room-code-badge">{r.code}</span>
                  <span className="muted small">Created {new Date(r.createdAt).toLocaleDateString()}</span>
                  <button className="btn btn-primary full-width" onClick={() => navigate(`/room/${r.code}`)}>
                    Open Whiteboard
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Room"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
