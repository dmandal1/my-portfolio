import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { subscribeToAdminPanelSettings } from "../../api/apiService";
import "./Admin.css";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [siteName, setSiteName] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = subscribeToAdminPanelSettings(
      (data) => { if (data?.siteName) setSiteName(data.siteName); },
      () => {}
    );
    return unsub;
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/admin/home");
    } catch {
      setError("Invalid email or password. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="aLogin-page">

      {/* ── Left: Branded panel ───────────────────────────────── */}
      <div className="aLogin-panel aLogin-panel--brand">
        <div className="aLogin-brand-orb aLogin-brand-orb--1" />
        <div className="aLogin-brand-orb aLogin-brand-orb--2" />
        <div className="aLogin-brand-orb aLogin-brand-orb--3" />

        <div className="aLogin-brand-inner">
          <div className="aLogin-brand-logo">
            <span className="aLogin-logo-lt">&lt;</span>
            <span className="aLogin-logo-sl">/</span>
            <span className="aLogin-logo-gt">&gt;</span>
          </div>
          <h1 className="aLogin-brand-title">{siteName || "My Portfolio"}</h1>
          <p className="aLogin-brand-sub">Admin Dashboard · Portfolio CMS</p>
          <div className="aLogin-brand-divider" />
          <p className="aLogin-brand-quote">
            Manage your blog posts, projects, and portfolio content — all in one place.
          </p>
          <div className="aLogin-brand-features">
            <div className="aLogin-brand-feature">
              <span className="aLogin-brand-feature-dot" />
              Write and publish blog posts
            </div>
            <div className="aLogin-brand-feature">
              <span className="aLogin-brand-feature-dot" />
              Manage cover images and tags
            </div>
            <div className="aLogin-brand-feature">
              <span className="aLogin-brand-feature-dot" />
              Real-time preview before publishing
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Form panel ────────────────────────────────── */}
      <div className="aLogin-panel aLogin-panel--form">
        <div className="aLogin-form-inner">

          <h2 className="aLogin-form-title">Welcome back</h2>
          <p className="aLogin-form-sub">Sign in to your admin dashboard</p>

          {error && (
            <div className="aLogin-error" key={error}>{error}</div>
          )}

          <form onSubmit={handleSubmit} className="aLogin-form">
            <div className="aLogin-field">
              <label htmlFor="admin-email">Email Address</label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                required
                placeholder="you@example.com"
              />
            </div>

            <div className="aLogin-field">
              <label htmlFor="admin-password">Password</label>
              <div className="aLogin-pw-wrap">
                <input
                  id="admin-password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="aLogin-pw-toggle"
                  onClick={() => setShowPw((v) => !v)}
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button type="submit" className="aLogin-btn" disabled={loading}>
              {loading ? (
                <><span className="aLogin-spinner" /> Signing in…</>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="aLogin-back">
            <a href="/">← Back to {siteName || "My Portfolio"}</a>
          </p>
        </div>
      </div>

    </div>
  );
}
