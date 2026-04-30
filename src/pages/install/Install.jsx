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
      .catch(() => setError("Could not reach the API. Make sure the backend files are uploaded to public_html/api/."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <h2 className="ins-card-title">System Requirements</h2>
      <p className="ins-card-sub">Checking your server environment before setup begins.</p>

      {error && <div className="ins-alert ins-alert--err">⚠ {error}</div>}

      {loading ? (
        <div className="ins-req-loading">
          <div className="ins-req-spinner" />
          Checking requirements…
        </div>
      ) : checks ? (
        <div className="ins-req-grid">
          {checks.map((c) => (
            <div key={c.label} className={`ins-req-item${!c.pass ? " ins-req-item--fail" : ""}`}>
              <div className="ins-req-icon">{c.pass ? "✅" : "❌"}</div>
              <div className="ins-req-body">
                <div className="ins-req-label">{c.label}</div>
                <div className="ins-req-value">{c.value}</div>
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
        <button
          className="ins-btn ins-btn--primary"
          disabled={!allPass || loading}
          onClick={onNext}
        >
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
  const [testResult, setTestResult] = useState(null); // null | "ok" | "err"
  const [testMsg, setTestMsg]       = useState("");

  function handleChange(e) {
    setTestResult(null);
    setDb((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res  = await fetch(`${API}/install.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_db", ...db }),
      });
      const data = await res.json();
      if (data.ok) { setTestResult("ok");  setTestMsg(data.message); }
      else          { setTestResult("err"); setTestMsg(data.error || "Connection failed"); }
    } catch {
      setTestResult("err");
      setTestMsg("Could not reach the API.");
    }
    setTesting(false);
  }

  return (
    <>
      <h2 className="ins-card-title">Database Configuration</h2>
      <p className="ins-card-sub">Enter your Hostinger MySQL connection details.</p>

      {/* 2-column grid: host + name, then user + password */}
      <div className="ins-fields-grid">
        <div className="ins-field">
          <label>Database Host <span className="ins-field-hint">usually localhost</span></label>
          <input className="ins-input" name="db_host" value={db.db_host} onChange={handleChange} placeholder="localhost" />
        </div>

        <div className="ins-field">
          <label>Database Name</label>
          <input className="ins-input" name="db_name" value={db.db_name} onChange={handleChange} placeholder="Enter database name" />
        </div>

        <div className="ins-field">
          <label>Database Username</label>
          <input className="ins-input" name="db_user" value={db.db_user} onChange={handleChange} placeholder="Enter database username" />
        </div>

        <div className="ins-field">
          <label>Database Password</label>
          <input
            className="ins-input" name="db_pass" type="password"
            value={db.db_pass} onChange={handleChange}
            placeholder="••••••••••" autoComplete="new-password"
          />
        </div>
      </div>

      <div className="ins-db-test-row">
        <button
          className="ins-btn ins-btn--ghost ins-btn--sm"
          onClick={testConnection}
          disabled={testing || !db.db_name || !db.db_user}
        >
          {testing ? "Testing…" : "🔌 Test Connection"}
        </button>
        {testResult === "ok"  && <span className="ins-badge ins-badge--ok" >✓ {testMsg}</span>}
        {testResult === "err" && <span className="ins-badge ins-badge--err">✗ {testMsg}</span>}
      </div>

      {testResult !== "ok" && (
        <div className="ins-alert ins-alert--info">
          Click <strong>Test Connection</strong> to verify your database credentials before continuing.
        </div>
      )}

      <div className="ins-btn-row">
        <button className="ins-btn ins-btn--ghost" onClick={onBack}>← Back</button>
        <button className="ins-btn ins-btn--primary" disabled={testResult !== "ok"} onClick={onNext}>
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
    if (account.admin_password.length < 8) errs.admin_password = "Password must be at least 8 characters";
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
      <h2 className="ins-card-title">Site & Admin Account</h2>
      <p className="ins-card-sub">Name your site and create the admin login you'll use to manage it.</p>

      {/* Site name — full width */}
      <p className="ins-section-heading">Site Information</p>
      <div className="ins-field">
        <label>Site Name</label>
        <input
          className={`ins-input${errors.site_name ? " ins-input--err" : ""}`}
          name="site_name" value={account.site_name}
          onChange={handleChange} placeholder="Deepak's Portfolio"
        />
        {errors.site_name && <div className="ins-field-error">⚠ {errors.site_name}</div>}
      </div>

      <div className="ins-divider" />

      {/* Admin credentials — 2-col on desktop */}
      <p className="ins-section-heading">Admin Credentials</p>
      <div className="ins-fields-grid">
        <div className="ins-field ins-field--full">
          <label>Admin Email</label>
          <input
            className={`ins-input${errors.admin_email ? " ins-input--err" : ""}`}
            name="admin_email" type="email" value={account.admin_email}
            onChange={handleChange} placeholder="you@example.com"
          />
          {errors.admin_email && <div className="ins-field-error">⚠ {errors.admin_email}</div>}
        </div>

        <div className="ins-field">
          <label>Password</label>
          <div className="ins-pw-wrap">
            <input
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
          <label>Confirm Password</label>
          <div className="ins-pw-wrap">
            <input
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
        <button className="ins-btn ins-btn--primary" onClick={handleNext}>Review & Install →</button>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Step 4 — Install
   ══════════════════════════════════════════════════════════════ */
const PROGRESS_STEPS = [
  "Connecting to database…",
  "Creating tables…",
  "Creating admin account…",
  "Writing config.php…",
  "Creating upload folders…",
  "Finalizing…",
];

function StepInstall({ db, account, onBack }) {
  const navigate = useNavigate();
  const [phase,    setPhase]    = useState("review"); // review | installing | done | error
  const [progress, setProgress] = useState(-1);
  const [error,    setError]    = useState("");

  async function runInstall() {
    setPhase("installing");
    setProgress(0);

    const ticker = setInterval(() => {
      setProgress((p) => (p < PROGRESS_STEPS.length - 2 ? p + 1 : p));
    }, 650);

    try {
      const res  = await fetch(`${API}/install.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:         "install",
          ...db,
          admin_email:    account.admin_email,
          admin_password: account.admin_password,
          site_name:      account.site_name,
        }),
      });
      const data = await res.json();
      clearInterval(ticker);

      if (data.success) {
        setProgress(PROGRESS_STEPS.length - 1);
        setTimeout(() => setPhase("done"), 700);
      } else {
        setError(data.error || "Installation failed.");
        setPhase("error");
      }
    } catch {
      clearInterval(ticker);
      setError("Network error — could not reach the API.");
      setPhase("error");
    }
  }

  /* ── Review ── */
  if (phase === "review") {
    return (
      <>
        <h2 className="ins-card-title">Ready to Install</h2>
        <p className="ins-card-sub">Review your settings below, then click Install to begin.</p>

        <p className="ins-section-heading">Database</p>
        <div className="ins-review-table">
          <ReviewRow label="Host"     value={db.db_host} />
          <ReviewRow label="Name"     value={db.db_name} />
          <ReviewRow label="Username" value={db.db_user} />
          <ReviewRow label="Password" value="••••••••" />
        </div>

        <p className="ins-section-heading">Site & Admin</p>
        <div className="ins-review-table">
          <ReviewRow label="Site Name" value={account.site_name}  />
          <ReviewRow label="Email"     value={account.admin_email} />
          <ReviewRow label="Password"  value="••••••••" />
        </div>

        <div className="ins-alert ins-alert--info">
          The installer will create all database tables, write <code>config.php</code>, and create
          the <code>uploads/</code> folder structure automatically.
        </div>

        <div className="ins-btn-row">
          <button className="ins-btn ins-btn--ghost" onClick={onBack}>← Back</button>
          <button className="ins-btn ins-btn--primary" onClick={runInstall}>
            🚀 Install Now
          </button>
        </div>
      </>
    );
  }

  /* ── Installing ── */
  if (phase === "installing") {
    return (
      <div className="ins-progress-wrap">
        <div className="ins-spinner-lg" />
        <h2 className="ins-card-title">Installing…</h2>
        <p className="ins-card-sub">Please wait — do not close this page.</p>
        <ul className="ins-progress-steps">
          {PROGRESS_STEPS.map((s, i) => (
            <li
              key={s}
              className={`ins-progress-step${
                i < progress  ? " ins-progress-step--done"
                : i === progress ? " ins-progress-step--active"
                : ""
              }`}
            >
              <span style={{ width: 20, display: "inline-block", textAlign: "center" }}>
                {i < progress ? "✓" : i === progress ? "›" : "○"}
              </span>
              {s}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  /* ── Error ── */
  if (phase === "error") {
    return (
      <>
        <h2 className="ins-card-title">Installation Failed</h2>
        <div className="ins-alert ins-alert--err">✗ {error}</div>
        <p style={{ fontSize: 13, color: "var(--atxt2)", marginBottom: 0 }}>
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
      <div className="ins-success-icon">🎉</div>
      <h2 className="ins-success-title">Installation Complete!</h2>
      <p className="ins-success-sub">
        Your portfolio site is ready to use.<br />
        Log in to the admin panel to start customising your content.
      </p>
      <div className="ins-success-links">
        <button className="ins-btn ins-btn--ok" onClick={() => navigate("/home")}>
          Visit Site →
        </button>
        <button className="ins-btn ins-btn--primary" onClick={() => navigate("/admin/login")}>
          Go to Admin Panel →
        </button>
      </div>
      <p style={{ fontSize: 12, color: "var(--amut)", marginTop: 24 }}>
        Admin login: <strong>{account.admin_email}</strong>
      </p>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="ins-review-row">
      <span className="ins-review-label">{label}</span>
      <span className="ins-review-value">{value}</span>
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
    site_name:        "Deepak's Portfolio",
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
          <div className="ins-logo">
            <div className="ins-logo-icon">&lt;/&gt;</div>
            <div>
              <div className="ins-logo-text">Portfolio CMS</div>
              <div className="ins-logo-sub">Setup Wizard</div>
            </div>
          </div>

          <nav className="ins-steps">
            {STEPS.map((s, i) => {
              const done   = i < step;
              const active = i === step;
              return (
                <div
                  key={s.id}
                  className={`ins-step${done ? " ins-step--done" : ""}${active ? " ins-step--active" : ""}`}
                >
                  <div className="ins-step-num">{done ? "✓" : i + 1}</div>
                  <div className="ins-step-info">
                    <div className="ins-step-label">{s.label}</div>
                    <div className="ins-step-sub">{s.sub}</div>
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="ins-sidebar-footer">
            Step {step + 1} of {STEPS.length}
            <div className="ins-progress-bar">
              <div className="ins-progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </aside>

        {/* ── Content ── */}
        <main className="ins-content">
          <div className="ins-card">
            {step === 0 && <StepRequirements onNext={next} />}
            {step === 1 && <StepDatabase db={db} setDb={setDb} onNext={next} onBack={back} />}
            {step === 2 && <StepAccount account={account} setAccount={setAccount} onNext={next} onBack={back} />}
            {step === 3 && <StepInstall db={db} account={account} onBack={back} />}
          </div>
        </main>

      </div>
    </div>
  );
}
