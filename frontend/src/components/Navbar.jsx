// src/components/Navbar.jsx
// Purpose: Top navigation bar with branding, theme toggle, and profile dropdown.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    showToast("Logged out successfully", "success");
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate("/dashboard")}>
        <span className="brand-icon">◈</span>
        <span>Whiteboard</span>
      </div>
      <div className="navbar-actions">
        <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        {user && (
          <div className="profile-dropdown">
            <button className="profile-btn" onClick={() => setMenuOpen((o) => !o)}>
              <span className="avatar" style={{ backgroundColor: user.cursorColor }}>
                {user.username.charAt(0).toUpperCase()}
              </span>
              <span>{user.username}</span>
            </button>
            {menuOpen && (
              <div className="dropdown-menu" onMouseLeave={() => setMenuOpen(false)}>
                <div className="dropdown-item-static">{user.email}</div>
                <button className="dropdown-item" onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
