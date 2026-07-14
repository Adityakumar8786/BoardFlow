// src/pages/Register.jsx
// Purpose: Registration form. Backend hashes the password and auto-logs in the new user.

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Register() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      showToast("Account created!", "success");
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-brand">◈ Whiteboard</div>
        <h2>Create your account</h2>
        <p className="auth-subtitle">Start collaborating in seconds</p>

        {error && <div className="form-error">{error}</div>}

        <label className="form-label">Username</label>
        <input
          type="text" required className="form-input" value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          placeholder="janedoe"
        />

        <label className="form-label">Email</label>
        <input
          type="email" required className="form-input" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="you@example.com"
        />

        <label className="form-label">Password</label>
        <input
          type="password" required className="form-input" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="At least 6 characters"
        />

        <label className="form-label">Confirm Password</label>
        <input
          type="password" required className="form-input" value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          placeholder="••••••••"
        />

        <button type="submit" className="btn btn-primary full-width" disabled={loading}>
          {loading ? "Creating account..." : "Sign Up"}
        </button>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
