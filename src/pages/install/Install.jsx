import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Install.css";

const API = import.meta.env.VITE_API_URL || "/api";

const STEPS = [
  { id: "requirements", label: "Requirements", sub: "System checks"      },
  { id: "database",     label: "Database",      sub: "Connection details" },
  { id: "email",        label: "Email",         sub: "SMTP configuration" },
  { id: "account",      label: "Admin Account", sub: "Login credentials"  },
  { id: "install",      label: "Install",        sub: "Set up your site"  },
];

const STEP_META = [
  {
    title: "System Requirements",
    sub:   "Checking your server environment before setup begins.",
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
              stroke="white" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: "Database Configuration",
    sub:   "Enter your MySQL connection details to continue.",
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
        <ellipse cx="12" cy="5" rx="9" ry="3" stroke="white" strokeWidth="2"/>
        <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" stroke="white" strokeWidth="2"/>
        <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"   stroke="white" strokeWidth="2"/>
      </svg>
    ),
  },
  {
    title: "Email Service",
    sub:   "Choose between standard PHP mail() or reliable SMTP.",
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: "Site & Admin Account",
    sub:   "Name your site and create your admin login credentials.",
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="white" strokeWidth="2"/>
        <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: "Ready to Install",
    sub:   "Review your settings, then launch the installer.",
    icon: (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"
              stroke="white" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"
              stroke="white" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"   stroke="white" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"  stroke="white" strokeWidth="2" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

/* ══════════════════════════════════════════════════════════════
   Step 1 — Requirements
   ══════════════════════════════════════════════════════════════ */
function StepRequirements({ onNext }) {
  const [checks, setChecks]   = useState(null);
  const [allPass, setAllPass] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    fetch(`${API}/requirements.php`)
      .then((r) => r.json())
      .then((d) => { setChecks(d.checks); setAllPass(d.allPass); })
      .catch(() => setError(`Could not reach the API. Make sure the backend files are uploaded to public_html${import.meta.env.VITE_API_URL || '/api'}/.`))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {error && <div className="ins-alert ins-alert--err">⚠ {error}</div>}

      {loading ? (
        <div className="ins-req-loading">
          <div className="ins-ring-wrap" style={{ width: 48, height: 48, marginBottom: 0 }}>
            <div className="ins-ring-bg" />
            <div className="ins-ring-fill" />
          </div>
          Checking requirements…
        </div>
      ) : checks ? (
        <div className="ins-req-grid">
          {checks.map((c) => (
            <div key={c.label} className={`ins-req-card${!c.pass ? " ins-req-card--fail" : ""}`}>
              <div className="ins-req-status">{c.pass ? "✓" : "✗"}</div>
              <div className="ins-req-body">
                <div className="ins-req-name">{c.label}</div>
                <div className="ins-req-val">{c.value}</div>
                <div className="ins-req-note">{c.note}</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!allPass && !loading && checks && (
        <div className="ins-alert ins-alert--err">
          ⚠ One or more requirements are not met. Fix them and refresh this page.
        </div>
      )}

      <div className="ins-btn-row">
        <button className="ins-btn ins-btn--primary" disabled={!allPass || loading} onClick={onNext}>
          Continue →
        </button>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Step 2 — Database
   ══════════════════════════════════════════════════════════════ */
function StepDatabase({ db, setDb, onNext, onBack }) {
  const [testing, setTesting]       = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testMsg, setTestMsg]       = useState("");
  const [showDbPw, setShowDbPw]     = useState(false);

  function handleChange(e) {
    setTestResult(null);
    setDb((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    const start = Date.now();
    try {
      const res  = await fetch(`${API}/install.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_db", ...db }),
      });
      const data = await res.json();
      
      // Ensure at least 1.5s delay for "premium feel" processing
      const elapsed = Date.now() - start;
      if (elapsed < 1500) await new Promise(r => setTimeout(r, 1500 - elapsed));

      if (data.ok) { setTestResult("ok");  setTestMsg(data.message); }
      else          { setTestResult("err"); setTestMsg(data.error || "Connection failed"); }
    } catch {
      const elapsed = Date.now() - start;
      if (elapsed < 1500) await new Promise(r => setTimeout(r, 1500 - elapsed));
      setTestResult("err");
      setTestMsg("Could not reach the API.");
    }
    setTesting(false);
  }

  return (
    <>
      <div className="ins-fields-grid">
        <div className="ins-field">
          <label htmlFor="ins-db-host" className="ins-field-label">
            Database Host
            <span className="ins-field-hint">usually localhost</span>
          </label>
          <input
            id="ins-db-host"
            className="ins-input" name="db_host"
            value={db.db_host} onChange={handleChange}
            placeholder="localhost"
          />
        </div>

        <div className="ins-field">
          <label htmlFor="ins-db-name" className="ins-field-label">Database Name</label>
          <input
            id="ins-db-name"
            className="ins-input" name="db_name"
            value={db.db_name} onChange={handleChange}
            placeholder="e.g. my_database"
          />
        </div>

        <div className="ins-field">
          <label htmlFor="ins-db-user" className="ins-field-label">Database Username</label>
          <input
            id="ins-db-user"
            className="ins-input" name="db_user"
            value={db.db_user} onChange={handleChange}
            placeholder="e.g. my_db_user"
          />
        </div>

        <div className="ins-field">
          <label htmlFor="ins-db-pass" className="ins-field-label">Database Password</label>
          <div className="ins-pw-wrap">
            <input
              id="ins-db-pass"
              className="ins-input" name="db_pass" type={showDbPw ? "text" : "password"}
              value={db.db_pass} onChange={handleChange}
              placeholder="••••••••••" autoComplete="new-password"
            />
            <button type="button" className="ins-pw-toggle" onClick={() => setShowDbPw((v) => !v)}>
              {showDbPw ? "Hide" : "Show"}
            </button>
          </div>
        </div>
      </div>

      <div className="ins-test-row">
        <button
          className="ins-btn ins-btn--ghost ins-btn--sm"
          onClick={testConnection}
          disabled={testing || !db.db_name || !db.db_user}
          style={{ transition: 'all 0.3s ease' }}
        >
          {testing
            ? <><span className="ins-spin-sm ins-spin-sm--blue" /> Verifying Credentials...</>
            : <><i className="fas fa-bolt" style={{ marginRight: 6 }} /> Test Connection</>}
        </button>
        
        {testResult === "ok"  && (
          <div className="ins-badge ins-badge--ok" style={{ animation: 'ins-popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
            <i className="fas fa-check-circle" style={{ marginRight: 6 }} />
            {testMsg}
          </div>
        )}
        
        {testResult === "err" && (
          <span style={{ fontSize: 13, color: "var(--err)", fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, animation: 'ins-shake 0.4s ease' }}>
            <i className="fas fa-exclamation-triangle" /> Connection failed
          </span>
        )}
        
        {testResult === null  && !testing && (
          <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="fas fa-info-circle" style={{ opacity: 0.6 }} />
            Test your credentials before continuing
          </span>
        )}
      </div>

      {testResult === "err" && (
        <div className="ins-premium-alert" style={{ animation: 'ins-popIn 0.3s ease-out both' }}>
          <div className="ins-premium-alert-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="ins-premium-alert-content">
            <h4>Connection Unsuccessful</h4>
            <p>
              We couldn't reach your database. This usually means the <strong>username</strong> or <strong>password</strong> doesn't match your hosting panel, or the database hasn't been created yet.
            </p>
            <details>
              <summary>View technical error details</summary>
              <div>{testMsg.replace('Database connection failed: ', '')}</div>
            </details>
          </div>
        </div>
      )}

      <div className="ins-btn-row">
        <button className="ins-btn ins-btn--ghost" onClick={onBack}>← Back</button>
        <button
          className="ins-btn ins-btn--primary"
          disabled={testResult !== "ok"}
          onClick={onNext}
        >
          Continue →
        </button>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Step 3 — Email Configuration
   ══════════════════════════════════════════════════════════════ */
function StepEmail({ data, onChange, onNext, onBack }) {
  const [showPass, setShowPass]   = useState(false);
  const [testing, setTesting]       = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testMsg, setTestMsg]       = useState("");

  async function testSmtp() {
    setTesting(true);
    setTestResult(null);
    const start = Date.now();
    try {
      const res = await fetch(`${API}/install.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "test_email", 
          email_driver: data.driver,
          smtp_host: data.host,
          smtp_port: data.port,
          smtp_user: data.user,
          smtp_pass: data.pass,
          smtp_enc: data.encryption
        }),
      });
      const resData = await res.json();
      
      const elapsed = Date.now() - start;
      if (elapsed < 1500) await new Promise(r => setTimeout(r, 1500 - elapsed));

      if (resData.ok) {
        setTestResult("ok");
        setTestMsg(resData.message);
      } else {
        setTestResult("err");
        setTestMsg(resData.error || "SMTP connection failed");
      }
    } catch {
      setTestResult("err");
      setTestMsg("Could not reach the API.");
    }
    setTesting(false);
  }

  return (
    <>
      <div className="ins-fields-grid">
        <div className="ins-field" style={{ gridColumn: 'span 2' }}>
          <label className="ins-field-label">Email Driver</label>
          <select 
            className="ins-input"
            value={data.driver} 
            onChange={(e) => {
              setTestResult(null);
              onChange({ ...data, driver: e.target.value });
            }}
          >
            <option value="mail">PHP mail() (Built-in)</option>
            <option value="smtp">SMTP (Professional / External)</option>
          </select>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8 }}>
            SMTP is highly recommended for Gmail, Outlook, or Hostinger email to ensure OTP delivery.
          </p>
        </div>

        {data.driver === "smtp" && (
          <>
            <div className="ins-field" style={{ gridColumn: 'span 2' }}>
              <label className="ins-field-label">SMTP Host</label>
              <input 
                className="ins-input" type="text"
                value={data.host} 
                onChange={(e) => { setTestResult(null); onChange({ ...data, host: e.target.value }); }} 
                placeholder="e.g. smtp.gmail.com"
              />
            </div>
            <div className="ins-field">
              <label className="ins-field-label">SMTP Port</label>
              <input 
                className="ins-input" type="text"
                value={data.port} 
                onChange={(e) => { setTestResult(null); onChange({ ...data, port: e.target.value }); }} 
                placeholder="587"
              />
            </div>
            <div className="ins-field">
              <label className="ins-field-label">Encryption</label>
              <select 
                className="ins-input"
                value={data.encryption} 
                onChange={(e) => { setTestResult(null); onChange({ ...data, encryption: e.target.value }); }}
              >
                <option value="tls">TLS (Standard)</option>
                <option value="ssl">SSL</option>
                <option value="none">None</option>
              </select>
            </div>
            <div className="ins-field">
              <label className="ins-field-label">Username</label>
              <input 
                className="ins-input" type="text"
                value={data.user} 
                onChange={(e) => { setTestResult(null); onChange({ ...data, user: e.target.value }); }} 
                placeholder="you@domain.com"
              />
            </div>
            <div className="ins-field">
              <label className="ins-field-label">App Password</label>
              <div className="ins-pw-wrap">
                <input 
                  className="ins-input" 
                  type={showPass ? "text" : "password"}
                  value={data.pass} 
                  onChange={(e) => { setTestResult(null); onChange({ ...data, pass: e.target.value }); }} 
                  placeholder="••••••••••••••••"
                  autoComplete="new-password"
                />
                <button 
                  type="button" 
                  className="ins-pw-toggle" 
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {data.driver === "smtp" && (
        <div className="ins-test-row">
          <button
            className="ins-btn ins-btn--ghost ins-btn--sm"
            onClick={testSmtp}
            disabled={testing || !data.host || !data.user || !data.pass}
          >
            {testing
              ? <><span className="ins-spin-sm ins-spin-sm--blue" /> Connecting to SMTP...</>
              : <><i className="fas fa-paper-plane" style={{ marginRight: 6 }} /> Test SMTP Connection</>}
          </button>
          
          {testResult === "ok" && (
            <div className="ins-badge ins-badge--ok" style={{ animation: 'ins-popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              <i className="fas fa-check-circle" style={{ marginRight: 6 }} />
              Success! Test mail sent.
            </div>
          )}
          
          {testResult === "err" && (
            <span style={{ fontSize: 13, color: "var(--err)", fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, animation: 'ins-shake 0.4s ease' }}>
              <i className="fas fa-exclamation-triangle" /> {testMsg.includes("Authentication Denied") ? "Login Failed" : "Connection failed"}
            </span>
          )}
        </div>
      )}

      {testResult === "err" && (
        <div className="ins-premium-alert" style={{ animation: 'ins-popIn 0.3s ease-out both', marginTop: 20 }}>
          <div className="ins-premium-alert-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="ins-premium-alert-content">
            <h4>Mail Configuration Error</h4>
            <p>
              {testMsg.includes("Authentication Denied") 
                ? "Gmail and Outlook require an 'App Password' if you have 2FA enabled. Using your normal login password will fail."
                : "The server couldn't connect to the SMTP host. This often happens if your hosting provider blocks Port 587. Try using Port 465 with SSL encryption instead."}
            </p>
            {testMsg.includes("Authentication Denied") ? (
              <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: 'var(--ap)', fontSize: 13, fontWeight: 700 }}>
                Get a Google App Password →
              </a>
            ) : (
              <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                 <button 
                   className="ins-btn ins-btn--ghost ins-btn--sm" 
                   style={{ fontSize: 11, padding: '4px 10px' }}
                   onClick={() => onChange({ ...data, port: "465", encryption: "ssl" })}
                 >
                   Switch to Port 465 / SSL
                 </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="ins-btn-row">
        <button className="ins-btn ins-btn--ghost" onClick={onBack}>← Back</button>
        <button 
          className="ins-btn ins-btn--primary" 
          onClick={onNext}
          disabled={data.driver === "smtp" && testResult !== "ok"}
        >
          Continue →
        </button>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Step 3 — Admin Account
   ══════════════════════════════════════════════════════════════ */
function StepAccount({ account, setAccount, onNext, onBack }) {
  const [showPw,  setShowPw]  = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [errors,  setErrors]  = useState({});

  function handleChange(e) {
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
    setAccount((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function validate() {
    const errs = {};
    if (!account.site_name.trim())   errs.site_name   = "Site name is required";
    if (!account.admin_email.trim()) errs.admin_email  = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(account.admin_email)) errs.admin_email = "Invalid email address";
    if (account.admin_password.length < 8) errs.admin_password = "Minimum 8 characters";
    if (account.admin_password !== account.confirm_password) errs.confirm_password = "Passwords do not match";
    return errs;
  }

  function handleNext() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onNext();
  }

  return (
    <>
      <p className="ins-section-label">Site Information</p>
      <div className="ins-field ins-field--full">
        <label htmlFor="ins-site-name" className="ins-field-label">Site Name</label>
        <input
          id="ins-site-name"
          className={`ins-input${errors.site_name ? " ins-input--err" : ""}`}
          name="site_name" value={account.site_name}
          onChange={handleChange} placeholder="My Portfolio"
        />
        {errors.site_name && <div className="ins-field-error">⚠ {errors.site_name}</div>}
      </div>

      <div className="ins-divider" />

      <p className="ins-section-label">Admin Credentials</p>
      <div className="ins-fields-grid">
        <div className="ins-field ins-field--full">
          <label htmlFor="ins-admin-email" className="ins-field-label">Admin Email</label>
          <input
            id="ins-admin-email"
            className={`ins-input${errors.admin_email ? " ins-input--err" : ""}`}
            name="admin_email" type="email" value={account.admin_email}
            onChange={handleChange} placeholder="you@example.com"
          />
          {errors.admin_email && <div className="ins-field-error">⚠ {errors.admin_email}</div>}
        </div>

        <div className="ins-field">
          <label htmlFor="ins-admin-password" className="ins-field-label">Password</label>
          <div className="ins-pw-wrap">
            <input
              id="ins-admin-password"
              className={`ins-input${errors.admin_password ? " ins-input--err" : ""}`}
              name="admin_password" type={showPw ? "text" : "password"}
              value={account.admin_password} onChange={handleChange}
              placeholder="Min. 8 characters" autoComplete="new-password"
            />
            <button type="button" className="ins-pw-toggle" onClick={() => setShowPw((v) => !v)}>
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
          {errors.admin_password && <div className="ins-field-error">⚠ {errors.admin_password}</div>}
        </div>

        <div className="ins-field">
          <label htmlFor="ins-confirm-password" className="ins-field-label">Confirm Password</label>
          <div className="ins-pw-wrap">
            <input
              id="ins-confirm-password"
              className={`ins-input${errors.confirm_password ? " ins-input--err" : ""}`}
              name="confirm_password" type={showPw2 ? "text" : "password"}
              value={account.confirm_password} onChange={handleChange}
              placeholder="Re-enter password" autoComplete="new-password"
            />
            <button type="button" className="ins-pw-toggle" onClick={() => setShowPw2((v) => !v)}>
              {showPw2 ? "Hide" : "Show"}
            </button>
          </div>
          {errors.confirm_password && <div className="ins-field-error">⚠ {errors.confirm_password}</div>}
        </div>
      </div>

      <div className="ins-btn-row">
        <button className="ins-btn ins-btn--ghost" onClick={onBack}>← Back</button>
        <button className="ins-btn ins-btn--primary" onClick={handleNext}>Review &amp; Install →</button>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Step 4 — Install
   ══════════════════════════════════════════════════════════════ */
const PROG_STEPS = [
  "Connecting to database",
  "Creating tables",
  "Creating admin account",
  "Writing config.php",
  "Creating upload folders",
  "Finalizing",
];

function StepInstall({ db, email, account, onBack }) {
  const navigate = useNavigate();
  const [phase,    setPhase]    = useState("review");
  const [progress, setProgress] = useState(-1);
  const [error,    setError]    = useState("");

  async function runInstall() {
    setPhase("installing");
    setProgress(0);
    setError("");

    let apiDone = false;
    let apiResult = null;

    // Start backend call concurrently
    const apiTask = fetch(`${API}/install.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action:         "install",
        ...db,
        admin_email:    account.admin_email,
        admin_password: account.admin_password,
        site_name:      account.site_name,
        email_driver:   email.driver,
        smtp_host:      email.host,
        smtp_port:      email.port,
        smtp_user:      email.user,
        smtp_pass:      email.pass,
        smtp_enc:       email.encryption,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        apiDone = true;
        apiResult = d;
        return d;
      })
      .catch(() => {
        apiDone = true;
        apiResult = { error: "Network error — could not reach the API." };
        return apiResult;
      });

    // Animate progress smoothly (at least 1 second per step)
    for (let i = 0; i < PROG_STEPS.length - 1; i++) {
      setProgress(i);
      await new Promise((r) => setTimeout(r, 1000));
      
      // Stop animating early if the API failed
      if (apiDone && !apiResult.success) {
        break;
      }
    }

    // Wait for API to finish if it's still running
    if (!apiDone) {
      await apiTask;
    }

    if (apiResult && apiResult.success) {
      setProgress(PROG_STEPS.length - 1);
      await new Promise((r) => setTimeout(r, 1000)); // Show final checkmark
      setPhase("done");
    } else {
      setError(apiResult?.error || "Installation failed.");
      setPhase("error");
    }
  }

  /* ── Review ── */
  if (phase === "review") {
    return (
      <>
        <div className="ins-review-grid">
          {/* Database Card */}
          <div className="ins-premium-card">
            <div className="ins-premium-card-header">
              <div className="ins-pcard-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m-16 0v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7m-16 0c0 2.21 3.582 4 8 4s8-1.79 8-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="ins-pcard-title">Database</h3>
            </div>
            <div className="ins-pcard-list">
              <PremiumRow label="Host" value={db.db_host} />
              <PremiumRow label="Name" value={db.db_name} />
              <PremiumRow label="User" value={db.db_user} />
            </div>
          </div>

          {/* Email Card */}
          <div className="ins-premium-card">
            <div className="ins-premium-card-header">
              <div className="ins-pcard-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="ins-pcard-title">Email</h3>
            </div>
            <div className="ins-pcard-list">
              <PremiumRow label="Driver" value={email.driver.toUpperCase()} />
              {email.driver === 'smtp' ? (
                <>
                  <PremiumRow label="Host" value={email.host} />
                  <PremiumRow label="User" value={email.user} />
                </>
              ) : (
                <div className="ins-pcard-footer-note">Standard PHP mail() enabled.</div>
              )}
            </div>
          </div>

          {/* Account Card */}
          <div className="ins-premium-card">
            <div className="ins-premium-card-header">
              <div className="ins-pcard-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 7a4 4 0 100-8 4 4 0 000 8zm10 0h4m-2-2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="ins-pcard-title">Admin</h3>
            </div>
            <div className="ins-pcard-list">
              <PremiumRow label="Site" value={account.site_name} />
              <PremiumRow label="Email" value={account.admin_email} />
              <PremiumRow label="Pass" value="••••••••" />
            </div>
          </div>
        </div>

        <div className="ins-btn-row">
          <button className="ins-btn ins-btn--ghost" onClick={onBack}>← Back</button>
          <button className="ins-btn ins-btn--primary ins-btn--lg" onClick={runInstall}>
            🚀 Start Installation
          </button>
        </div>
      </>
    );
  }

  /* ── Installing ── */
  if (phase === "installing") {
    return (
      <div className="ins-installing">
        <div className="ins-ring-wrap">
          <div className="ins-ring-bg" />
          <div className="ins-ring-fill" />
        </div>
        <h2 className="ins-card-title">Installing…</h2>
        <p className="ins-card-sub" style={{ marginBottom: 0 }}>
          Please wait — do not close this page.
        </p>
        <ul className="ins-prog-list">
          {PROG_STEPS.map((s, i) => {
            const done   = i < progress;
            const active = i === progress;
            return (
              <li key={s} className={`ins-prog-item${done ? " ins-prog-item--done" : active ? " ins-prog-item--active" : ""}`}>
                <div className="ins-prog-icon">
                  {done ? "✓" : active ? "›" : i + 1}
                </div>
                {s}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  /* ── Error ── */
  if (phase === "error") {
    return (
      <>
        <div className="ins-alert ins-alert--err">✗ {error}</div>
        <p style={{ fontSize: 13, color: "var(--text2)" }}>
          Fix the issue above and try again, or go back to change your settings.
        </p>
        <div className="ins-btn-row">
          <button className="ins-btn ins-btn--ghost" onClick={onBack}>← Back</button>
          <button className="ins-btn ins-btn--primary" onClick={runInstall}>Retry</button>
        </div>
      </>
    );
  }

  /* ── Done ── */
  return (
    <div className="ins-success">
      <div className="ins-success-ring">🎉</div>
      <h2 className="ins-success-title">Installation Complete!</h2>
      <p className="ins-success-sub">
        Your portfolio site is ready to use.<br />
        Log in to the admin panel to start customising your content.
      </p>
      <div className="ins-success-btns">
        <button className="ins-btn ins-btn--success ins-btn--lg" onClick={() => navigate("/home")}>
          Visit Site →
        </button>
        <button className="ins-btn ins-btn--primary ins-btn--lg" onClick={() => navigate("/admin/login")}>
          Go to Admin Panel →
        </button>
      </div>
      <p className="ins-success-note">
        Admin login: <strong>{account.admin_email}</strong>
      </p>
    </div>
  );
}

function PremiumRow({ label, value }) {
  return (
    <div className="ins-pcard-row">
      <span className="ins-pcard-label">{label}</span>
      <span className="ins-pcard-value">{value}</span>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="ins-review-row">
      <span className="ins-review-key">{label}</span>
      <span className="ins-review-val">{value}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Root Installer
   ══════════════════════════════════════════════════════════════ */
export default function Install() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const [db, setDb] = useState({
    db_host: "localhost",
    db_name: "",
    db_user: "",
    db_pass: "",
  });

  const [email, setEmail] = useState({
    driver: "mail",
    host: "",
    port: "587",
    user: "",
    pass: "",
    encryption: "tls"
  });

  const [account, setAccount] = useState({
    site_name:        "My Portfolio",
    admin_email:      "",
    admin_password:   "",
    confirm_password: "",
  });

  useEffect(() => {
    fetch(`${API}/status.php`)
      .then((r) => r.json())
      .then((d) => { if (d.installed) navigate("/home", { replace: true }); })
      .catch(() => {});
  }, [navigate]);

  const next = useCallback(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), []);
  const back = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  const pct = Math.round((step / (STEPS.length - 1)) * 100);

  return (
    <div className="ins-root">
      <div className="ins-layout">

        {/* ── Sidebar ── */}
        <aside className="ins-sidebar">

          {/* Logo */}
          <div className="ins-logo">
            <div className="ins-logo-mark">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M7 8L3 12L7 16"   stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 8L21 12L17 16" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 4L10 20"        stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className="ins-logo-name">Portfolio CMS</div>
              <div className="ins-logo-tagline">Setup Wizard</div>
            </div>
          </div>

          {/* Steps */}
          <nav className="ins-steps">
            {STEPS.map((s, i) => {
              const done   = i < step;
              const active = i === step;
              return (
                <React.Fragment key={s.id}>
                  <div className={`ins-step${done ? " ins-step--done" : ""}${active ? " ins-step--active" : ""}`}>
                    <div className="ins-step-bubble">
                      {done
                        ? <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5L5.5 10L11 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        : i + 1}
                    </div>
                    <div>
                      <div className="ins-step-label">{s.label}</div>
                      <div className="ins-step-sub">{s.sub}</div>
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`ins-step-connector${done ? " ins-step-connector--done" : ""}`} />
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="ins-sidebar-footer">
            <div className="ins-footer-meta">
              <span className="ins-footer-label">Progress</span>
              <span className="ins-footer-pct">{pct}%</span>
            </div>
            <div className="ins-footer-bar">
              <div className="ins-footer-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>

        </aside>

        {/* ── Content ── */}
        <main className="ins-content">
          <div className="ins-card">

            {/* Hero header — changes per step */}
            <div className="ins-card-hero" key={`hero-${step}`}>
              <div className="ins-card-hero-icon">{STEP_META[step].icon}</div>
              <div className="ins-card-hero-text">
                <div className="ins-card-hero-badge">
                  <span className="ins-card-hero-badge-dot" />
                  Step {step + 1} of {STEPS.length}
                </div>
                <h2 className="ins-card-title">{STEP_META[step].title}</h2>
                <p className="ins-card-sub">{STEP_META[step].sub}</p>
              </div>
            </div>

            {/* Step content */}
            <div className="ins-step-panel" key={step}>
              {step === 0 && <StepRequirements onNext={next} />}
              {step === 1 && <StepDatabase db={db} setDb={setDb} onNext={next} onBack={back} />}
              {step === 2 && <StepEmail    data={email} onChange={setEmail} onNext={next} onBack={back} />}
              {step === 3 && <StepAccount  account={account} setAccount={setAccount} onNext={next} onBack={back} />}
              {step === 4 && <StepInstall  db={db} email={email} account={account} onBack={back} />}
            </div>

          </div>
        </main>

      </div>
    </div>
  );
}
