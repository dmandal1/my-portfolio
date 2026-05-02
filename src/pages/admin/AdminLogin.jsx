import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { subscribeToAdminPanelSettings, requestPasswordReset } from "../../api/apiService";
import "./Admin.css";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [step, setStep] = useState("login"); // 'login', '2fa', or 'forgot'
  const [twoFactorCode, setTwoFactorCode] = useState("");
  
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [resetSent, setResetSent] = useState(false);
  const [resetOtp, setResetOtp] = useState("");
  const [otpArray, setOtpArray] = useState(["", "", "", "", "", ""]);
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [showSentSuccess, setShowSentSuccess] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { login, verify2FA } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setInterval(() => setResendTimer(t => t - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

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
      const res = await login(email, password);
      if (res.requires_2fa) {
        setStep("2fa");
        setLoading(false);
      } else {
        // Premium transition effect
        setIsRedirecting(true);
        setTimeout(() => {
          navigate("/admin/home");
        }, 1500);
      }
    } catch (err) {
      setError(err?.message || "Invalid email or password. Please try again.");
      setLoading(false);
    }
  }

  async function handle2FAVerify(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await verify2FA(twoFactorCode);
      setIsRedirecting(true);
      setTimeout(() => {
        navigate("/admin/home");
      }, 1500);
    } catch (err) {
      setError(err?.message || "Invalid verification code.");
      setLoading(false);
    }
  }

  async function handleForgotSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setShowSentSuccess(false);
    try {
      await requestPasswordReset(email);
      // Brief delay for professional "Processing" feel
      setTimeout(() => {
        setForgotStep(2);
        setShowSentSuccess(true);
        // Hide success message after 5 seconds
        setTimeout(() => setShowSentSuccess(false), 5000);
      }, 800);
    } catch (err) {
      setError(err?.message || "Failed to send reset email.");
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }

  async function handleResendOTP() {
    if (resendTimer > 0) return;
    setError("");
    setLoading(true);
    try {
      if (step === '2fa') {
        // Re-login to trigger 2FA email
        await login(email, password);
      } else {
        await requestPasswordReset(email);
      }
      setShowSentSuccess(true);
      setResendTimer(60);
      setTimeout(() => setShowSentSuccess(false), 5000);
    } catch (err) {
      setError(err?.message || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    if (resetOtp.length !== 6) { setError("Please enter 6-digit OTP."); return; }
    setError("");
    setLoading(true);
    const start = Date.now();
    try {
      const response = await fetch('/api/forgot_password.php?action=verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: resetOtp })
      });
      const data = await response.json();
      
      // Artificial delay for premium "Validating..." feel
      const elapsed = Date.now() - start;
      if (elapsed < 1200) await new Promise(r => setTimeout(r, 1200 - elapsed));

      if (!response.ok) throw new Error(data.error || "Invalid OTP");
      setForgotStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetFinal(e) {
    e.preventDefault();
    
    // Comprehensive Validation
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    const isLongEnough = newPassword.length >= 8;

    if (!isLongEnough) { setError("Password must be at least 8 characters."); return; }
    if (!hasUpper || !hasLower) { setError("Password must contain both uppercase and lowercase letters."); return; }
    if (!hasNumber) { setError("Password must contain at least one number."); return; }
    if (!hasSpecial) { setError("Password must contain at least one special character."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match. Please verify your entries."); return; }

    setError("");
    setLoading(true);
    try {
      const response = await fetch('/api/forgot_password.php?action=reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: resetOtp, password: newPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to reset");
      setResetSent(true);
      setTimeout(() => {
        setStep('login');
        setForgotStep(1);
        setResetSent(false);
        setEmail("");
        setResetOtp("");
        setNewPassword("");
        setConfirmPassword("");
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle segmented OTP input
  const handleOtpChange = (val, idx) => {
    if (isNaN(val)) return;
    const newOtp = [...otpArray];
    newOtp[idx] = val.slice(-1);
    setOtpArray(newOtp);
    setResetOtp(newOtp.join(""));

    if (val && idx < 5) {
      otpRefs[idx + 1].current.focus();
    }
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === "Backspace" && !otpArray[idx] && idx > 0) {
      otpRefs[idx - 1].current.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const data = e.clipboardData.getData("text").slice(0, 6).split("");
    const newOtp = [...otpArray];
    data.forEach((char, i) => {
      if (!isNaN(char)) newOtp[i] = char;
    });
    setOtpArray(newOtp);
    setResetOtp(newOtp.join(""));
    const nextIdx = Math.min(data.length, 5);
    otpRefs[nextIdx].current.focus();
  };

  return (
    <div className={`aLogin-page ${isRedirecting ? 'is-redirecting' : ''}`}>
      
      {isRedirecting && (
        <div className="aLogin-success-overlay">
          <div className="aLogin-success-content">
            <div className="aLogin-success-icon">
              <i className="fas fa-check-circle" />
            </div>
            <h2 className="aLogin-success-title">Welcome Back!</h2>
            <p className="aLogin-success-sub">Securely redirecting to your dashboard...</p>
            <div className="aLogin-success-loader">
              <div className="aLogin-success-loader-fill" />
            </div>
          </div>
        </div>
      )}

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
      <div className={`aLogin-panel aLogin-panel--form ${loading ? 'is-processing' : ''}`}>
        <div className="aLogin-form-inner">

          <h2 className="aLogin-form-title">
            {step === 'login' ? "Welcome back" : step === '2fa' ? "Two-Step Verification" : "Reset Password"}
          </h2>
          <p className="aLogin-form-sub">
            {step === 'login' ? "Access your admin dashboard" : 
             step === '2fa' ? "Enter the 6-digit code sent to your email" : 
             "We'll send you a 6-digit OTP to recover your account"}
          </p>

          {error && (
            <div className="aLogin-error-wrap" key={error}>
              <div className="aLogin-error-icon">
                <i className="fas fa-exclamation-circle" />
              </div>
              <div className="aLogin-error-content">
                <div className="aLogin-error-title">Login Failed</div>
                <div className="aLogin-error-text">{error}</div>
              </div>
            </div>
          )}

          <div className="aLogin-step-wrapper" key={step}>
            {step === 'login' ? (
              <form onSubmit={handleSubmit} className="aLogin-form">
                <div className="aLogin-field">
                  <label htmlFor="admin-email">Email Address</label>
                  <input
                    id="admin-email"
                    name="admin-email"
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
                      name="admin-password"
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
                  <div style={{ textAlign: 'right', marginTop: 8 }}>
                    <button type="button" className="aLogin-link-btn" onClick={() => setStep('forgot')}>
                      Forgot Password?
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
            ) : step === '2fa' ? (
              <form onSubmit={handle2FAVerify} className="aLogin-form">
                <p style={{ fontSize: '13px', color: '#4a6fa5', marginBottom: '16px', textAlign: 'center' }}>
                  A 6-digit verification code has been sent to your email.
                </p>
                <div className="aLogin-field">
                  <label htmlFor="2fa-code">Verification Code</label>
                  <input
                    id="2fa-code"
                    name="2fa-code"
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                    maxLength={6}
                    autoComplete="one-time-code"
                    autoFocus
                    required
                    placeholder="000000"
                    style={{ textAlign: 'center', fontSize: 28, letterSpacing: 8, height: 64, fontWeight: 800 }}
                  />
                </div>

                <button type="submit" className="aLogin-btn" disabled={loading || twoFactorCode.length !== 6}>
                  {loading ? (
                    <><span className="aLogin-spinner" /> Verifying…</>
                  ) : (
                    "Verify & Sign In"
                  )}
                </button>

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <button 
                    type="button" 
                    className="aLogin-link-btn" 
                    onClick={handleResendOTP}
                    disabled={resendTimer > 0}
                  >
                    {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend Verification Code"}
                  </button>
                </div>

                <button 
                  type="button" 
                  className="aLogin-pw-toggle" 
                  style={{ position: 'static', background: 'none', border: 'none', color: 'var(--ap)', fontWeight: 600, marginTop: 16, width: '100%', cursor: 'pointer' }}
                  onClick={() => setStep('login')}
                >
                  ← Back to Login
                </button>
              </form>
            ) : (
              <div className="aLogin-form">
                {/* Premium Step Indicator */}
                <div className="aLogin-forgot-steps">
                  <div className={`aLogin-fstep ${forgotStep >= 1 ? 'aLogin-fstep--active' : ''}`}>
                    <div className="aLogin-fstep-num">{forgotStep > 1 ? <i className="fas fa-check" /> : "1"}</div>
                    <span>Identity</span>
                  </div>
                  <div className="aLogin-fstep-line" />
                  <div className={`aLogin-fstep ${forgotStep >= 2 ? 'aLogin-fstep--active' : ''}`}>
                    <div className="aLogin-fstep-num">{forgotStep > 2 ? <i className="fas fa-check" /> : "2"}</div>
                    <span>Verify</span>
                  </div>
                  <div className="aLogin-fstep-line" />
                  <div className={`aLogin-fstep ${forgotStep >= 3 ? 'aLogin-fstep--active' : ''}`}>
                    <div className="aLogin-fstep-num">{forgotStep > 3 ? <i className="fas fa-check" /> : "3"}</div>
                    <span>Reset</span>
                  </div>
                </div>

                <div className="aLogin-forgot-wrapper" key={forgotStep}>
                   {resetSent ? (
                     <div className="aLogin-reset-success">
                       <div className="aLogin-reset-success-icon">
                         <i className="fas fa-check-circle" />
                       </div>
                       <div className="aLogin-reset-success-txt">
                         <strong>Password Updated!</strong>
                         <p>Your password has been changed successfully. Redirecting to login...</p>
                       </div>
                     </div>
                   ) : forgotStep === 1 ? (
                     <form onSubmit={handleForgotSubmit}>
                       <div className="aLogin-field">
                         <label htmlFor="forgot-email">Email Address</label>
                         <input
                           id="forgot-email"
                           type="email"
                           value={email}
                           onChange={(e) => setEmail(e.target.value)}
                           required
                           placeholder="you@example.com"
                           autoFocus
                         />
                       </div>
                       <button type="submit" className="aLogin-btn" disabled={loading}>
                         {loading ? (
                           <><span className="aLogin-spinner" /> Sending OTP…</>
                         ) : (
                           "Send OTP"
                         )}
                       </button>
                     </form>
                   ) : forgotStep === 2 ? (
                     <form onSubmit={handleVerifyOtp} className="otp-form-container">
                       {showSentSuccess && (
                         <div className="aLogin-toast-success">
                           <i className="fas fa-paper-plane" /> OTP has been sent to your email!
                         </div>
                       )}
                       
                       <div className="aLogin-field" style={{ textAlign: 'center' }}>
                         <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.05em' }}>
                           VERIFICATION CODE
                         </label>
                         
                         <div className="otp-input-group" onPaste={handleOtpPaste}>
                           {otpArray.map((digit, idx) => (
                             <input
                               key={idx}
                               ref={otpRefs[idx]}
                               type="text"
                               inputMode="numeric"
                               className={`otp-digit ${digit ? 'otp-digit--filled' : ''}`}
                               value={digit}
                               onChange={(e) => handleOtpChange(e.target.value, idx)}
                               onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                               maxLength={1}
                               autoFocus={idx === 0}
                             />
                           ))}
                         </div>
                       </div>

                       <button 
                         type="submit" 
                         className={`aLogin-btn otp-loading-btn ${loading ? 'otp-loading-btn--active' : ''}`} 
                         disabled={loading || resetOtp.length !== 6}
                       >
                         {loading ? (
                           <><span className="aLogin-spinner" /> Validating OTP…</>
                         ) : (
                           "Verify OTP"
                         )}
                       </button>

                       <div style={{ textAlign: 'center' }}>
                         <span 
                           className={`otp-resend-link ${resendTimer > 0 ? 'otp-resend-link--disabled' : ''}`}
                           onClick={() => resendTimer === 0 && handleResendOTP()}
                         >
                           {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Didn't receive code? Resend"}
                         </span>
                       </div>
                     </form>
                   ) : (
                     <form onSubmit={handleResetFinal}>
                       <div className="aLogin-field">
                         <label>New Password</label>
                         <div className="aLogin-pw-wrap">
                            <input
                              type={showNewPw ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                              required
                              placeholder="••••••••"
                              autoFocus
                            />
                            <button
                              type="button"
                              className="aLogin-pw-toggle"
                              onClick={() => setShowNewPw((v) => !v)}
                            >
                              {showNewPw ? "Hide" : "Show"}
                            </button>
                          </div>
                       </div>

                       {/* Premium Password Requirements Checklist */}
                       <div className="aLogin-pw-requirements">
                         <div className={`aLogin-req-item ${newPassword.length >= 8 ? 'aLogin-req-item--met' : ''}`}>
                           <i className={`fas fa-${newPassword.length >= 8 ? 'check-circle' : 'circle'}`} /> 8+ Characters
                         </div>
                         <div className={`aLogin-req-item ${(/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) ? 'aLogin-req-item--met' : ''}`}>
                           <i className={`fas fa-${(/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) ? 'check-circle' : 'circle'}`} /> Uppercase & Lowercase
                         </div>
                         <div className={`aLogin-req-item ${/\d/.test(newPassword) ? 'aLogin-req-item--met' : ''}`}>
                           <i className={`fas fa-${/\d/.test(newPassword) ? 'check-circle' : 'circle'}`} /> At least one number
                         </div>
                         <div className={`aLogin-req-item ${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'aLogin-req-item--met' : ''}`}>
                           <i className={`fas fa-${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'check-circle' : 'circle'}`} /> Special Character
                         </div>
                       </div>

                       <div className="aLogin-field" style={{ marginTop: 20 }}>
                         <label>Confirm Password</label>
                         <div className="aLogin-pw-wrap">
                            <input
                              type={showConfirmPw ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                              required
                              placeholder="••••••••"
                            />
                            <button
                              type="button"
                              className="aLogin-pw-toggle"
                              onClick={() => setShowConfirmPw((v) => !v)}
                            >
                              {showConfirmPw ? "Hide" : "Show"}
                            </button>
                          </div>
                          {confirmPassword && newPassword !== confirmPassword && (
                            <p style={{ color: '#ef4444', fontSize: 12, marginTop: 6, fontWeight: 600 }}>
                              <i className="fas fa-times-circle" /> Passwords do not match
                            </p>
                          )}
                          {confirmPassword && newPassword === confirmPassword && (
                            <p style={{ color: '#10b981', fontSize: 12, marginTop: 6, fontWeight: 600 }}>
                              <i className="fas fa-check-circle" /> Passwords match
                            </p>
                          )}
                       </div>

                       <button 
                         type="submit" 
                         className="aLogin-btn" 
                         disabled={
                           loading || 
                           newPassword.length < 8 || 
                           !/[A-Z]/.test(newPassword) || 
                           !/[a-z]/.test(newPassword) || 
                           !/\d/.test(newPassword) || 
                           !/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ||
                           newPassword !== confirmPassword
                         }
                       >
                         {loading ? "Updating..." : "Update Password"}
                       </button>
                     </form>
                   )}
                </div>
                 
                 {!resetSent && (
                   <button 
                     type="button" 
                     className="aLogin-pw-toggle" 
                     style={{ position: 'static', background: 'none', border: 'none', color: 'var(--atxt2)', fontWeight: 600, marginTop: 16, width: '100%', cursor: 'pointer' }}
                     onClick={() => { setStep('login'); setForgotStep(1); setResetOtp(""); setError(""); }}
                   >
                     ← Back to Login
                   </button>
                  )}
              </div>
            )}
          </div>

          <p className="aLogin-back">
            <a href="/">← Back to {siteName || "My Portfolio"}</a>
          </p>
        </div>
      </div>

    </div>
  );
}
