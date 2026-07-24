import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Login() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", rememberMe: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password, form.rememberMe);
      showToast("Welcome back!", "success");
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-brand">◈ Whiteboard</div>
        <h2>Welcome back</h2>
        <p className="auth-subtitle">Log in to continue to your rooms</p>

        {error && <div className="form-error">{error}</div>}

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
          placeholder="••••••••"
        />

        <label className="checkbox-row">
          <input
            type="checkbox" checked={form.rememberMe}
            onChange={(e) => setForm({ ...form, rememberMe: e.target.checked })}
          />
          Remember me for 30 days
        </label>

        <button type="submit" className="btn btn-primary full-width" disabled={loading}>
          {loading ? "Logging in..." : "Log In"}
        </button>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </form>
    </div>
  );
}
