import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Install.css";

const API = import.meta.env.VITE_API_URL || "/api";

const STEPS = [
  { id: "requirements", label: "Requirements", sub: "System checks"      },
  { id: "database",     label: "Database",      sub: "Connection details" },
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
        <div className="ins-alert ins-alert--err" style={{ animation: 'ins-shake 0.4s ease' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Oops! {testMsg}</div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>
            We couldn't reach your database. Please double-check your <strong>Host</strong>, <strong>Name</strong>, <strong>Username</strong>, and <strong>Password</strong>. 
            Commonly, host should be <code>localhost</code> unless specified by your provider.
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

function StepInstall({ db, account, onBack }) {
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
          <div>
            <p className="ins-section-label">Database</p>
            <div className="ins-review-box">
              <div className="ins-review-box-header">Connection</div>
              <ReviewRow label="Host"     value={db.db_host} />
              <ReviewRow label="Name"     value={db.db_name} />
              <ReviewRow label="Username" value={db.db_user} />
              <ReviewRow label="Password" value="••••••••" />
            </div>
          </div>
          <div>
            <p className="ins-section-label">Site &amp; Admin</p>
            <div className="ins-review-box">
              <div className="ins-review-box-header">Account</div>
              <ReviewRow label="Site"     value={account.site_name} />
              <ReviewRow label="Email"    value={account.admin_email} />
              <ReviewRow label="Password" value="••••••••" />
            </div>
          </div>
        </div>

        <div className="ins-alert ins-alert--info">
          The installer will create all tables, write <code>config.php</code>, and set up
          the <code>uploads/</code> folder structure automatically.
        </div>

        <div className="ins-btn-row">
          <button className="ins-btn ins-btn--ghost" onClick={onBack}>← Back</button>
          <button className="ins-btn ins-btn--primary ins-btn--lg" onClick={runInstall}>
            🚀 Install Now
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
              {step === 2 && <StepAccount   account={account} setAccount={setAccount} onNext={next} onBack={back} />}
              {step === 3 && <StepInstall   db={db} account={account} onBack={back} />}
            </div>

          </div>
        </main>

      </div>
    </div>
  );
}
