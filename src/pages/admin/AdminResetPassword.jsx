import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { resetPassword } from "../../api/apiService";
import "./Admin.css";

export default function AdminResetPassword() {
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1); // 1: OTP, 2: New Password
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleVerifyOtp(e) {
    e.preventDefault();
    if (otp.length !== 6) { setError("Please enter a valid 6-digit OTP."); return; }
    setError("");
    setLoading(true);
    try {
      // We'll call a new api method or just use the reset endpoint with a dummy password to check
      const response = await fetch('/api/forgot_password.php?action=verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Invalid OTP");
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setError("");
    setLoading(true);
    try {
      await resetPassword(otp, password);
      setSuccess(true);
      setTimeout(() => navigate("/admin/login"), 3000);
    } catch (err) {
      setError(err?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="aLogin-page">
      <div className="aLogin-panel aLogin-panel--form" style={{ maxWidth: 500, margin: '0 auto', gridColumn: '1 / -1' }}>
        <div className="aLogin-form-inner">
          <h2 className="aLogin-form-title">{step === 1 ? "Verify OTP" : "Set New Password"}</h2>
          <p className="aLogin-form-sub">
            {step === 1 
              ? "Enter the 6-digit code sent to your email." 
              : "Great! Now enter your new secure password."}
          </p>

          {error && <div className="aLogin-error">{error}</div>}
          {success && (
            <div className="aLogin-reset-success">
              <div className="aLogin-reset-success-icon">
                <i className="fas fa-check-circle" />
              </div>
              <div className="aLogin-reset-success-txt">
                <strong>Password Updated!</strong>
                <p>Your password has been changed. Redirecting to login...</p>
              </div>
            </div>
          )}

          {!success && (
            <>
              {step === 1 ? (
                <form onSubmit={handleVerifyOtp} className="aLogin-form">
                  <div className="aLogin-field">
                    <label>6-Digit OTP Code</label>
                    <input 
                      type="text" 
                      value={otp} 
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                      required 
                      placeholder="000000"
                      style={{ letterSpacing: '8px', textAlign: 'center', fontSize: '20px', fontWeight: 'bold' }}
                    />
                  </div>
                  <button type="submit" className="aLogin-btn" disabled={loading}>
                    {loading ? "Verifying..." : "Continue"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="aLogin-form">
                  <div className="aLogin-field">
                    <label>New Password</label>
                    <div className="aLogin-pw-wrap">
                      <input 
                        type={showPw ? "text" : "password"} 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        required 
                        placeholder="••••••••"
                        autoFocus
                      />
                      <button
                        type="button"
                        className="aLogin-pw-toggle"
                        onClick={() => setShowPw(!showPw)}
                      >
                        <i className={showPw ? "fas fa-eye-slash" : "fas fa-eye"} />
                      </button>
                    </div>
                  </div>
                  <div className="aLogin-field">
                    <label>Confirm New Password</label>
                    <div className="aLogin-pw-wrap">
                      <input 
                        type={showConfirm ? "text" : "password"} 
                        value={confirm} 
                        onChange={e => setConfirm(e.target.value)} 
                        required 
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="aLogin-pw-toggle"
                        onClick={() => setShowConfirm(!showConfirm)}
                      >
                        <i className={showConfirm ? "fas fa-eye-slash" : "fas fa-eye"} />
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="aLogin-btn" disabled={loading}>
                    {loading ? "Updating..." : "Update Password"}
                  </button>
                </form>
              )}
            </>
          )}

          <p className="aLogin-back">
            <Link to="/admin/login">← Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
