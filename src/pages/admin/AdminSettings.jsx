import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import pkg from "../../../package.json";
import { useAuth } from "../../contexts/AuthContext";
import { saveAdminPanelSettings, changeAdminPassword, getMenuLinks, saveMenuLinks } from "../../api/apiService";
import AdminSidebar from "./components/AdminSidebar";
import {
  applyAdminTheme,
  cacheAdminSettings,
  DEFAULT_SETTINGS,
  loadAdminSettings,
  normalizeAdminSettings,
  TIMEZONES,
} from "./components/adminSettingsConfig";
import { useAdminSettings } from "./components/useAdminSettings";
import { useToast } from "./components/AdminToast";
import "./Admin.css";

/* ── Reusable primitives ── */
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`asettings-switch${checked ? " is-on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

function ToggleRow({ icon, label, hint, checked, onChange, danger }) {
  return (
    <div className={`ast-row${danger ? " ast-row--danger" : ""}`}>
      {icon && <i className={`${icon} ast-row-icon`} />}
      <div className="ast-row-body">
        <span className="ast-row-label">{label}</span>
        {hint && <span className="ast-row-hint">{hint}</span>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function SectionHeader({ icon, title, desc }) {
  return (
    <div className="ast-section-head">
      <span className="ast-section-icon"><i className={icon} /></span>
      <div>
        <h2 className="ast-section-title">{title}</h2>
        {desc && <p className="ast-section-desc">{desc}</p>}
      </div>
    </div>
  );
}

function Field({ label, hint, children, span }) {
  return (
    <div className={`asettings-field${span ? " asettings-field--span" : ""}`}>
      <span className="asettings-label">{label}</span>
      {children}
      {hint && <span className="asettings-hint">{hint}</span>}
    </div>
  );
}

// ── Custom DateTimePicker ────────────────────────────────────────────────────
const DTP_MONTHS   = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DTP_DOW      = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const DTP_HOURS    = [1,2,3,4,5,6,7,8,9,10,11,12];
const DTP_MINUTES  = Array.from({ length: 60 }, (_, i) => i);
const DTP_PRESETS  = [
  { label: "+1h", mins: 60 },
  { label: "+6h", mins: 360 },
  { label: "+1d", mins: 1440 },
  { label: "+3d", mins: 4320 },
  { label: "+1w", mins: 10080 },
];
const DTP_ITEM_H = 44;

function dtpToISO(d) {
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function dtpCalGrid(year, month) {
  const first = new Date(year, month, 1).getDay();
  const days  = new Date(year, month + 1, 0).getDate();
  const cells = Array(first).fill(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  return cells;
}

function DateTimePicker({ value, onChange }) {
  const pad = n => String(n).padStart(2, "0");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("date");

  const today = useMemo(() => new Date(), []);
  const sel   = useMemo(() => value ? new Date(value) : null, [value]);

  const [nav, setNav] = useState(() => {
    const d = sel || today;
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const rootRef = useRef(null);
  const hrRef   = useRef(null);
  const minRef  = useRef(null);

  const selH    = sel ? (sel.getHours() % 12 || 12) : 12;
  const selMin  = sel ? sel.getMinutes() : 0;
  const selAmpm = sel ? (sel.getHours() >= 12 ? "PM" : "AM") : "AM";

  const relative = useMemo(() => {
    if (!sel) return null;
    const diff = sel.getTime() - Date.now();
    const abs  = Math.abs(diff);
    const tm   = Math.floor(abs / 60000);
    const hrs  = Math.floor(tm / 60);
    const days = Math.floor(hrs / 24);
    const text = days > 0 ? `${days}d ${hrs % 24}h` : hrs > 0 ? `${hrs}h ${tm % 60}m` : `${tm}m`;
    return { text, past: diff < 0 };
  }, [sel]);

  const displayText = sel
    ? sel.toLocaleString("en-IN", { weekday:"short", day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })
    : null;

  // Sync calendar nav to selected date whenever picker opens
  useEffect(() => {
    if (!open) return;
    if (sel) setNav({ year: sel.getFullYear(), month: sel.getMonth() });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = e => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  // Scroll time columns to selected position when time view opens
  useEffect(() => {
    if (!open || view !== "time") return;
    const scrollTo = (ref, idx) => {
      if (ref.current) ref.current.scrollTop = idx * DTP_ITEM_H;
    };
    // small delay so the DOM is rendered
    const t = setTimeout(() => {
      scrollTo(hrRef,  DTP_HOURS.indexOf(selH));
      scrollTo(minRef, selMin);
    }, 30);
    return () => clearTimeout(t);
  }, [open, view]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickDay = (day) => {
    const ds = `${nav.year}-${pad(nav.month+1)}-${pad(day)}`;
    const ts = sel ? `${pad(sel.getHours())}:${pad(sel.getMinutes())}` : "12:00";
    onChange(`${ds}T${ts}`);
    setView("time");
  };

  const pickHour = (h) => {
    if (!sel) return;
    const d = new Date(sel);
    d.setHours(selAmpm === "AM" ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12));
    onChange(dtpToISO(d));
    setTimeout(() => { if (hrRef.current) hrRef.current.scrollTop = DTP_HOURS.indexOf(h) * DTP_ITEM_H; }, 0);
  };

  const pickMin = (m) => {
    if (!sel) return;
    const d = new Date(sel);
    d.setMinutes(m);
    onChange(dtpToISO(d));
    setTimeout(() => { if (minRef.current) minRef.current.scrollTop = m * DTP_ITEM_H; }, 0);
  };

  const pickAmpm = (ap) => {
    if (!sel) return;
    const d = new Date(sel), h = d.getHours();
    if (ap === "AM" && h >= 12) d.setHours(h - 12);
    if (ap === "PM" && h < 12)  d.setHours(h + 12);
    onChange(dtpToISO(d));
  };

  const applyPreset = (mins) => {
    const d = new Date(Date.now() + mins * 60000);
    onChange(dtpToISO(d));
    setNav({ year: d.getFullYear(), month: d.getMonth() });
  };

  const cells = useMemo(() => dtpCalGrid(nav.year, nav.month), [nav.year, nav.month]);

  return (
    <div className="adtp-root" ref={rootRef}>

      {/* ── Trigger ── */}
      <div
        role="button"
        tabIndex={0}
        className={`adtp-trigger${open ? " adtp-trigger--open" : ""}`}
        onMouseDown={e => { e.preventDefault(); setOpen(o => !o); if (!open) setView("date"); }}
        onKeyDown={e => e.key === "Enter" && setOpen(o => !o)}
      >
        <span className="adtp-trigger-icon"><i className="far fa-calendar-alt" /></span>
        <span className={`adtp-trigger-text${!displayText ? " adtp-trigger-text--empty" : ""}`}>
          {displayText || "Pick date & time…"}
        </span>
        <span className="adtp-trigger-chevron">
          <i className={`fas fa-chevron-${open ? "up" : "down"}`} />
        </span>
      </div>

      {/* ── Relative preview (always visible when date is set) ── */}
      {relative && (
        <div className={`adtp-preview adtp-preview--${relative.past ? "past" : "future"}`}>
          <span className="adtp-preview-icon">
            <i className={relative.past ? "fas fa-exclamation-triangle" : "fas fa-hourglass-half"} />
          </span>
          <span className="adtp-preview-status">{relative.past ? "Overdue by" : "Goes live in"}</span>
          <strong className="adtp-preview-time">{relative.text}</strong>
          <span className="adtp-preview-divider" />
          <span className="adtp-preview-date">{displayText}</span>
        </div>
      )}

      {/* ── Popup ── */}
      {open && (
        <div className="adtp-popup">

          {/* Tab bar */}
          <div className="adtp-tabs">
            <button type="button"
              className={`adtp-tab${view === "date" ? " adtp-tab--active" : ""}`}
              onClick={() => setView("date")}>
              <i className="far fa-calendar-alt" />
              {sel ? `${pad(sel.getDate())} ${DTP_MONTHS[sel.getMonth()].slice(0,3)} ${sel.getFullYear()}` : "Date"}
            </button>
            <button type="button"
              className={`adtp-tab${view === "time" ? " adtp-tab--active" : ""}${!sel ? " adtp-tab--disabled" : ""}`}
              onClick={() => sel && setView("time")}>
              <i className="far fa-clock" />
              {sel ? `${selH}:${pad(selMin)} ${selAmpm}` : "Time"}
            </button>
          </div>

          {/* ── Calendar ── */}
          {view === "date" && (
            <div className="adtp-cal">
              <div className="adtp-cal-hd">
                <button type="button" className="adtp-cal-nav" onClick={() => setNav(n => {
                  let m = n.month - 1, y = n.year;
                  if (m < 0) { m = 11; y--; }
                  return { year: y, month: m };
                })}><i className="fas fa-chevron-left" /></button>
                <span className="adtp-cal-title">{DTP_MONTHS[nav.month]} {nav.year}</span>
                <button type="button" className="adtp-cal-nav" onClick={() => setNav(n => {
                  let m = n.month + 1, y = n.year;
                  if (m > 11) { m = 0; y++; }
                  return { year: y, month: m };
                })}><i className="fas fa-chevron-right" /></button>
              </div>
              <div className="adtp-cal-grid">
                {DTP_DOW.map(d => <span key={d} className="adtp-cal-dow">{d}</span>)}
                {cells.map((day, i) => {
                  if (!day) return <span key={`_${i}`} />;
                  const isToday = day === today.getDate() && nav.month === today.getMonth() && nav.year === today.getFullYear();
                  const isSel   = sel && day === sel.getDate() && nav.month === sel.getMonth() && nav.year === sel.getFullYear();
                  return (
                    <button key={i} type="button"
                      className={`adtp-cal-day${isToday ? " adtp-cal-day--today" : ""}${isSel ? " adtp-cal-day--sel" : ""}`}
                      onClick={() => pickDay(day)}>
                      {day}
                    </button>
                  );
                })}
              </div>
              <div className="adtp-cal-ft">
                <button type="button" className="adtp-cal-ft-btn" onClick={() => { onChange(""); setOpen(false); }}>Clear</button>
                <button type="button" className="adtp-cal-ft-btn adtp-cal-ft-today" onClick={() => {
                  const d = new Date();
                  const ds = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
                  const ts = sel ? `${pad(sel.getHours())}:${pad(sel.getMinutes())}` : "12:00";
                  onChange(`${ds}T${ts}`);
                  setNav({ year: d.getFullYear(), month: d.getMonth() });
                  setView("time");
                }}>Today</button>
              </div>
            </div>
          )}

          {/* ── Time picker ── */}
          {view === "time" && (
            <div className="adtp-time">
              <div className="adtp-time-cols">
                {/* Hours */}
                <div className="adtp-time-col-wrap">
                  <span className="adtp-time-col-lbl">Hour</span>
                  <div className="adtp-time-col" ref={hrRef}>
                    <div className="adtp-time-spacer" />
                    {DTP_HOURS.map(h => (
                      <button key={h} type="button"
                        className={`adtp-time-item${selH === h ? " adtp-time-item--sel" : ""}`}
                        onClick={() => pickHour(h)}>
                        {pad(h)}
                      </button>
                    ))}
                    <div className="adtp-time-spacer" />
                  </div>
                </div>
                <span className="adtp-time-colon">:</span>
                {/* Minutes */}
                <div className="adtp-time-col-wrap adtp-time-col-wrap--min">
                  <span className="adtp-time-col-lbl">Min</span>
                  <div className="adtp-time-col" ref={minRef}>
                    <div className="adtp-time-spacer" />
                    {DTP_MINUTES.map(m => (
                      <button key={m} type="button"
                        className={`adtp-time-item${selMin === m ? " adtp-time-item--sel" : ""}`}
                        onClick={() => pickMin(m)}>
                        {pad(m)}
                      </button>
                    ))}
                    <div className="adtp-time-spacer" />
                  </div>
                </div>
                {/* AM / PM */}
                <div className="adtp-time-ampm">
                  {["AM", "PM"].map(ap => (
                    <button key={ap} type="button"
                      className={`adtp-time-ampm-btn${selAmpm === ap ? " adtp-time-ampm-btn--sel" : ""}`}
                      onClick={() => pickAmpm(ap)}>
                      {ap}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" className="adtp-time-done" onClick={() => setOpen(false)}>
                <i className="fas fa-check-circle" /> Confirm &amp; Close
              </button>
            </div>
          )}

          {/* Quick presets — at bottom so they can't be accidentally triggered on open */}
          <div className="adtp-presets">
            <span className="adtp-presets-label">Quick set:</span>
            {DTP_PRESETS.map(p => (
              <button key={p.label} type="button" className="adtp-preset-btn" onClick={() => applyPreset(p.mins)}>
                {p.label}
              </button>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}
// ── End DateTimePicker ────────────────────────────────────────────────────────

/* ── Main component ── */
export default function AdminSettings() {
  const toast                       = useToast();
  const { currentUser }             = useAuth();
  const sharedSettings              = useAdminSettings();
  const [settings, setSettings]     = useState(loadAdminSettings);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get("tab") || "general";

  const setActiveTab = (tabId) => {
    navigate(`?tab=${tabId}`, { replace: true });
  };
  const [dirty, setDirty]           = useState(false);
  const [savedAt, setSavedAt]       = useState("");
  const [importJson, setImportJson] = useState("");
  const [importErr, setImportErr]   = useState("");
  const [showImport, setShowImport] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  
  // Security Tab State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const importRef = useRef(null);

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      return toast?.addToast("All password fields are required.", "error");
    }
    if (newPassword !== confirmPassword) {
      return toast?.addToast("New passwords do not match.", "error");
    }
    if (newPassword.length < 8) {
      return toast?.addToast("New password must be at least 8 characters.", "error");
    }

    setPasswordLoading(true);
    try {
      await changeAdminPassword(oldPassword, newPassword);
      toast?.addToast("Password changed successfully.", "success");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast?.addToast(error.message || "Failed to change password.", "error");
    } finally {
      setPasswordLoading(false);
    }
  }

  // Navigation Tab State
  const [menuLinks, setMenuLinks] = useState([]);
  const [menuLinksLoading, setMenuLinksLoading] = useState(false);
  const [menuLinksDirty, setMenuLinksDirty] = useState(false);

  useEffect(() => {
    async function loadMenu() {
      try {
        const links = await getMenuLinks();
        if (links && links.length > 0) {
          setMenuLinks(links);
        } else {
          setMenuLinks([
            { to: "/home",       label: "Home" },
            { to: "/education",  label: "Education" },
            { to: "/experience", label: "Experience" },
            { to: "/projects",   label: "Projects" },
            { to: "/blogs",      label: "Blogs" },
            { to: "/opensource", label: "Open Source" },
            { to: "/contact",    label: "Contact Me" },
          ]);
        }
      } catch (e) {
        console.error("Failed to load menu links", e);
      }
    }
    loadMenu();
  }, []);

  async function handleMenuSave() {
    setMenuLinksLoading(true);
    try {
      await saveMenuLinks(menuLinks);
      toast?.addToast("Navigation menu saved successfully.", "success");
      setMenuLinksDirty(false);
    } catch (e) {
      toast?.addToast("Failed to save menu links.", "error");
    } finally {
      setMenuLinksLoading(false);
    }
  }

  function handleMenuChange(index, field, value) {
    const next = [...menuLinks];
    next[index] = { ...next[index], [field]: value };
    setMenuLinks(next);
    setMenuLinksDirty(true);
  }

  function handleMenuMoveUp(index) {
    if (index === 0) return;
    const next = [...menuLinks];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setMenuLinks(next);
    setMenuLinksDirty(true);
  }

  function handleMenuMoveDown(index) {
    if (index === menuLinks.length - 1) return;
    const next = [...menuLinks];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    setMenuLinks(next);
    setMenuLinksDirty(true);
  }

  function handleMenuDelete(index) {
    const next = menuLinks.filter((_, i) => i !== index);
    setMenuLinks(next);
    setMenuLinksDirty(true);
  }

  function handleMenuAdd() {
    setMenuLinks([...menuLinks, { to: "/", label: "New Link" }]);
    setMenuLinksDirty(true);
  }

  /* Apply theme on load */
  useEffect(() => { applyAdminTheme(settings.theme); }, []); // eslint-disable-line

  useEffect(() => {
    if (!dirty) {
      setSettings(normalizeAdminSettings(sharedSettings));
    }
  }, [dirty, sharedSettings]);

  const tabs = useMemo(() => [
    { id: "general",       label: "General",       icon: "fas fa-user-circle" },
    { id: "navigation",    label: "Navigation",    icon: "fas fa-compass" },
    { id: "security",      label: "Security",      icon: "fas fa-shield-alt" },
    { id: "appearance",    label: "Appearance",    icon: "fas fa-palette" },
    { id: "dashboard",     label: "Dashboard",     icon: "fas fa-chart-line" },
    { id: "content",       label: "Content",       icon: "fas fa-file-alt" },
    { id: "editor",        label: "Editor",        icon: "fas fa-pen-nib" },
    { id: "media",         label: "Media",         icon: "fas fa-images" },
    { id: "publicBlog",    label: "Public Blog",   icon: "fas fa-globe" },
    { id: "seo",           label: "SEO",           icon: "fas fa-search" },
    { id: "notifications", label: "Notifications", icon: "fas fa-bell" },
    { id: "maintenance",   label: "Maintenance",   icon: "fas fa-toolbox" },
  ], []);

  function update(key, value) {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      if (key === "publicBlogPostsPerPage") {
        next.publicBlogPostsPerPage = Math.max(1, Math.min(Number(value) || 1, 24));
      }
      return next;
    });
    setDirty(true);
  }

  function updateTheme(value) {
    const normalized = cacheAdminSettings({ ...settings, theme: value });
    setSettings(normalized);
    setDirty(true);
    applyAdminTheme(value);
  }

  async function persistSettings(normalized) {
    cacheAdminSettings(normalized);
    applyAdminTheme(normalized.theme);
    await saveAdminPanelSettings(normalized);
  }

  async function saveSettings() {
    const normalized = normalizeAdminSettings(settings);
    setSettings(normalized);
    try {
      const writeReport = await saveAdminPanelSettings(normalized);
      cacheAdminSettings(normalized);
      applyAdminTheme(normalized.theme);
      const time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      setSavedAt(time);
      setDirty(false);
      const cloudTargets = Object.entries(writeReport || {})
        .filter(([, status]) => status === "ok")
        .map(([name]) => name)
        .join(", ");
      toast?.addToast(
        cloudTargets
          ? `Settings saved successfully: ${cloudTargets}.`
          : "Settings saved and synced successfully.",
        "success",
      );
    } catch (error) {
      console.error("[AdminSettings] Cloud save failed:", error);
      const time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      setSavedAt(time);
      setDirty(false);
      const details =
        error?.writeReport
          ? Object.entries(error.writeReport)
              .map(([name, status]) => `${name}: ${status}`)
              .join(" | ")
          : error?.code || error?.message || "unknown error";
      toast?.addToast(
        `Settings saved locally but cloud sync failed. ${details}`,
        "error",
      );
    }
  }

  async function resetSettings() {
    setSettings({ ...DEFAULT_SETTINGS });
    await persistSettings(DEFAULT_SETTINGS);
    setSavedAt("");
    setDirty(false);
    setResetConfirm(false);
    toast?.addToast("Settings reset to defaults.", "success");
  }

  function exportSettings() {
    const json = JSON.stringify(settings, null, 2);
    navigator.clipboard?.writeText(json).then(
      () => toast?.addToast("Settings JSON copied to clipboard.", "success"),
      () => toast?.addToast("Copy failed — check browser permissions.", "error"),
    );
  }

  async function importSettings() {
    setImportErr("");
    try {
      const parsed = JSON.parse(importJson);
      if (typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid JSON object.");
      const merged = normalizeAdminSettings(parsed);
      setSettings(merged);
      await persistSettings(merged);
      setImportJson("");
      setShowImport(false);
      setDirty(false);
      toast?.addToast("Settings imported.", "success");
    } catch (e) {
      setImportErr(e.message || "Invalid JSON.");
    }
  }

  const user = {
    name: currentUser?.displayName || settings.defaultAuthor || settings.siteName,
    email: currentUser?.email || "Signed in administrator",
  };

  return (
    <div className="alayout">
      <AdminSidebar />
      <main className="amain">
        <div className="amain-inner">

          {/* ── Top bar ── */}
          <div className="apage-topbar">
            <div>
              <div className="apage-crumb">
                <Link to="/admin/home" className="apage-crumb-link">Admin</Link>
                <span className="apage-crumb-sep">/</span>
                <span className="apage-crumb-cur">Settings</span>
              </div>
              <h1 className="apage-title">Settings</h1>
            </div>
            <div className="asettings-actions">
              {dirty && <span className="ast-unsaved"><i className="fas fa-circle" /> Unsaved changes</span>}
              {savedAt && !dirty && <span className="asettings-saved"><i className="fas fa-check-circle" /> Saved {savedAt}</span>}
              <button type="button" className="abtn abtn-ghost" onClick={() => setResetConfirm(true)}>Reset</button>
              <button type="button" className="abtn abtn-primary" onClick={saveSettings}>
                <i className="fas fa-save" style={{ marginRight: 6 }} />Save Settings
              </button>
            </div>
          </div>

          {/* ── Profile banner ── */}
          <div className="ast-banner">
            <div className="ast-banner-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="ast-banner-info">
              <strong>{user.name}</strong>
              <span>{user.email}</span>
              <span className="ast-badge ast-badge--green"><i className="fas fa-circle" /> Administrator</span>
            </div>
            <div className="ast-banner-stats">
              <div className="ast-banner-stat"><strong>v{pkg.version}</strong><span>Admin Panel</span></div>
              <div className="ast-banner-stat"><strong>{tabs.length}</strong><span>Setting groups</span></div>
              <div className="ast-banner-stat">
                <strong>{Object.keys(settings).length}</strong>
                <span>Preferences</span>
              </div>
            </div>
          </div>

          {/* ── Shell ── */}
          <div className="asettings-shell">

            {/* Sidebar nav */}
            <aside className="asettings-tabs">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  className={`asettings-tab${activeTab === tab.id ? " asettings-tab--active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <i className={tab.icon} />
                  <span>{tab.label}</span>
                  {tab.id === "maintenance" && (
                    <span className="ast-tab-badge">4</span>
                  )}
                </button>
              ))}
              <div className="ast-tabs-footer">
                <button type="button" className="ast-export-btn" onClick={exportSettings}>
                  <i className="fas fa-download" /> Export JSON
                </button>
              </div>
            </aside>

            {/* Content card */}
            <div className="asettings-card">

              {/* ── GENERAL ── */}
              {activeTab === "general" && (
                <div className="asettings-section">
                  <SectionHeader
                    icon="fas fa-user-circle"
                    title="General"
                    desc="Your site identity and author defaults used across the admin panel."
                  />
                  <div className="asettings-grid">
                    <Field label="Site Name">
                      <input 
                        id="setting-siteName"
                        name="siteName"
                        className="ainput" 
                        value={settings.siteName}
                        onChange={e => update("siteName", e.target.value)} 
                      />
                    </Field>
                    <Field label="Site Tagline">
                      <input 
                        id="setting-siteTagline"
                        name="siteTagline"
                        className="ainput" 
                        value={settings.siteTagline}
                        onChange={e => update("siteTagline", e.target.value)} 
                      />
                    </Field>
                    <Field label="Default Author">
                      <input 
                        id="setting-defaultAuthor"
                        name="defaultAuthor"
                        className="ainput" 
                        value={settings.defaultAuthor}
                        onChange={e => update("defaultAuthor", e.target.value)} 
                      />
                    </Field>
                    <Field label="Timezone">
                      <select 
                        id="setting-timezone"
                        name="timezone"
                        className="ainput" 
                        value={settings.timezone}
                        onChange={e => update("timezone", e.target.value)}
                      >
                        {TIMEZONES.map(tz => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="ast-divider" />

                  <h3 className="ast-sub-title">Preview</h3>
                  <div className="ast-preview-card">
                    <div className="ast-preview-site">
                      <span className="ast-preview-name">{settings.siteName || "Site Name"}</span>
                      <span className="ast-preview-tag">{settings.siteTagline || "Tagline"}</span>
                    </div>
                    <div className="ast-preview-meta">
                      <span><i className="fas fa-user" /> {settings.defaultAuthor}</span>
                      <span><i className="fas fa-clock" /> {settings.timezone}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── NAVIGATION ── */}
              {activeTab === "navigation" && (
                <div className="asettings-section">
                  <SectionHeader
                    icon="fas fa-compass"
                    title="Menu Builder"
                    desc="Manage the links that appear in your public website's header navigation. Reorder, add, or rename links to customize your portfolio's flow."
                  />
                  <div className="asettings-stack" style={{ gap: 16 }}>
                    {menuLinks.map((link, idx) => (
                      <div key={idx} className="anav-item-card">
                        <div className="anav-drag-handle">
                          <i className="fas fa-grip-vertical" />
                        </div>
                        <div className="anav-inputs-row">
                          <div className="anav-input-group">
                            <label htmlFor={`menu-label-${idx}`}>Label</label>
                            <input 
                              id={`menu-label-${idx}`}
                              name={`menu-label-${idx}`}
                              type="text" 
                              className="ainput" 
                              value={link.label} 
                              onChange={(e) => handleMenuChange(idx, "label", e.target.value)} 
                              placeholder="e.g. Home" 
                            />
                          </div>
                          <div className="anav-input-group">
                            <label htmlFor={`menu-route-${idx}`}>Route or URL</label>
                            <input 
                              id={`menu-route-${idx}`}
                              name={`menu-route-${idx}`}
                              type="text" 
                              className="ainput" 
                              value={link.to} 
                              onChange={(e) => handleMenuChange(idx, "to", e.target.value)} 
                              placeholder="e.g. /home" 
                            />
                          </div>
                        </div>
                        <div className="anav-actions">
                          <button 
                            type="button" 
                            className="abtn abtn-ghost" 
                            onClick={() => handleMenuMoveUp(idx)} 
                            disabled={idx === 0}
                            title="Move Up"
                            style={{ padding: "8px 12px" }}
                          >
                            <i className="fas fa-arrow-up" />
                          </button>
                          <button 
                            type="button" 
                            className="abtn abtn-ghost" 
                            onClick={() => handleMenuMoveDown(idx)} 
                            disabled={idx === menuLinks.length - 1}
                            title="Move Down"
                            style={{ padding: "8px 12px" }}
                          >
                            <i className="fas fa-arrow-down" />
                          </button>
                          <button 
                            type="button" 
                            className="abtn abtn-danger" 
                            onClick={() => handleMenuDelete(idx)}
                            title="Delete Link"
                            style={{ padding: "8px 12px" }}
                          >
                            <i className="fas fa-trash-alt" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    <button 
                      type="button" 
                      className="abtn abtn-secondary asettings-add-btn" 
                      onClick={handleMenuAdd}
                    >
                      <i className="fas fa-plus" /> Add New Link
                    </button>
                  </div>

                  {menuLinksDirty && (
                    <div className="asettings-dirty-banner">
                      <div className="ast-dirty-info">
                        <i className="fas fa-info-circle" />
                        <span>You have unsaved changes to your menu layout.</span>
                      </div>
                      <button 
                        type="button" 
                        className="abtn abtn-primary" 
                        onClick={handleMenuSave}
                        disabled={menuLinksLoading}
                      >
                        {menuLinksLoading ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} /> Saving...</> : "Save Menu Layout"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── SECURITY ── */}
              {activeTab === "security" && (
                <div className="asettings-section">
                  <div className="asecurity-hero">
                    <div className="asecurity-hero-icon">
                      <i className="fas fa-shield-alt" />
                    </div>
                    <div className="asecurity-hero-text">
                      <h3>Administrator Security</h3>
                      <p>Update your master password to keep your portfolio and CMS secure. Use a strong password containing numbers and special characters.</p>
                    </div>
                  </div>

                  <div className="asecurity-card">
                    <form className="asecurity-form" onSubmit={handlePasswordChange}>
                      
                      <div className="asecurity-input-group">
                        <label htmlFor="security-old-password">Current Password</label>
                        <div className="asecurity-input-wrapper">
                          <i className="fas fa-unlock-alt asecurity-input-icon"></i>
                          <input 
                            id="security-old-password"
                            name="security-old-password"
                            type={showOldPw ? "text" : "password"} 
                            className="ainput asecurity-input" 
                            value={oldPassword}
                            onChange={e => setOldPassword(e.target.value)} 
                            placeholder="Enter current password"
                            autoComplete="current-password"
                            style={{ paddingRight: 40 }}
                          />
                          <button
                            type="button"
                            className="aLogin-pw-toggle"
                            onClick={() => setShowOldPw(!showOldPw)}
                          >
                            <i className={showOldPw ? "fas fa-eye-slash" : "fas fa-eye"} />
                          </button>
                        </div>
                      </div>

                      <div className="asecurity-divider" />

                      <div className="asecurity-row">
                        <div className="asecurity-input-group">
                          <label htmlFor="security-new-password">New Password</label>
                          <div className="asecurity-input-wrapper">
                            <i className="fas fa-lock asecurity-input-icon"></i>
                            <input 
                              id="security-new-password"
                              name="security-new-password"
                              type={showNewPw ? "text" : "password"} 
                              className="ainput asecurity-input" 
                              value={newPassword}
                              onChange={e => setNewPassword(e.target.value)} 
                              placeholder="At least 8 characters"
                              autoComplete="new-password"
                              style={{ paddingRight: 40 }}
                            />
                            <button
                              type="button"
                              className="aLogin-pw-toggle"
                              onClick={() => setShowNewPw(!showNewPw)}
                            >
                              <i className={showNewPw ? "fas fa-eye-slash" : "fas fa-eye"} />
                            </button>
                          </div>
                          {newPassword.length > 0 && (
                            <div className="asecurity-strength">
                              <div className={`asecurity-strength-bar ${newPassword.length >= 8 ? 'is-strong' : newPassword.length >= 5 ? 'is-medium' : 'is-weak'}`}></div>
                              <span>{newPassword.length >= 8 ? 'Strong' : newPassword.length >= 5 ? 'Fair' : 'Weak'}</span>
                            </div>
                          )}
                        </div>

                        <div className="asecurity-input-group">
                          <label htmlFor="security-confirm-password">Confirm New Password</label>
                          <div className="asecurity-input-wrapper">
                            <i className="fas fa-check-circle asecurity-input-icon"></i>
                            <input 
                              id="security-confirm-password"
                              name="security-confirm-password"
                              type={showConfirmPw ? "text" : "password"} 
                              className="ainput asecurity-input" 
                              value={confirmPassword}
                              onChange={e => setConfirmPassword(e.target.value)} 
                              placeholder="Retype new password"
                              autoComplete="new-password"
                              style={{ paddingRight: 40 }}
                            />
                            <button
                              type="button"
                              className="aLogin-pw-toggle"
                              onClick={() => setShowConfirmPw(!showConfirmPw)}
                            >
                              <i className={showConfirmPw ? "fas fa-eye-slash" : "fas fa-eye"} />
                            </button>
                          </div>
                          {confirmPassword.length > 0 && (
                            <div className={`asecurity-match-hint ${newPassword === confirmPassword ? 'is-match' : 'is-mismatch'}`}>
                              {newPassword === confirmPassword ? (
                                <><i className="fas fa-check"></i> Passwords match</>
                              ) : (
                                <><i className="fas fa-times"></i> Passwords do not match</>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="asecurity-actions">
                        <button 
                          type="submit" 
                          className="abtn abtn-primary asecurity-submit-btn" 
                          disabled={passwordLoading || !oldPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                        >
                          {passwordLoading ? (
                            <><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} /> Updating...</>
                          ) : (
                            <><i className="fas fa-key" style={{ marginRight: 8 }} /> Update Password</>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* ── APPEARANCE ── */}
              {activeTab === "appearance" && (
                <div className="asettings-section">
                  <SectionHeader
                    icon="fas fa-palette"
                    title="Appearance"
                    desc="Control how the admin panel looks. Changes apply immediately on save."
                  />

                  <h3 className="ast-sub-title">Theme</h3>
                  <div className="ast-theme-grid">
                    {[
                      { value: "light",  icon: "fas fa-sun",    label: "Light" },
                      { value: "dark",   icon: "fas fa-moon",   label: "Dark" },
                      { value: "system", icon: "fas fa-laptop", label: "System" },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`ast-theme-card${settings.theme === opt.value ? " is-active" : ""}`}
                        onClick={() => updateTheme(opt.value)}
                      >
                        <i className={opt.icon} />
                        <span>{opt.label}</span>
                        {settings.theme === opt.value && (
                          <span className="ast-theme-check"><i className="fas fa-check" /></span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="ast-divider" />

                  <h3 className="ast-sub-title">Layout</h3>
                  <div className="asettings-stack">
                    <ToggleRow
                      icon="fas fa-bars"
                      label="Collapse Sidebar by Default"
                      hint="Start every session with the sidebar in icon-only mode."
                      checked={settings.sidebarCollapsed}
                      onChange={v => update("sidebarCollapsed", v)}
                    />
                  </div>
                </div>
              )}

              {/* ── DASHBOARD ── */}
              {activeTab === "dashboard" && (
                <div className="asettings-section">
                  <SectionHeader
                    icon="fas fa-chart-line"
                    title="Dashboard"
                    desc="Choose how the admin home and all-posts dashboard open by default."
                  />
                  <div className="asettings-grid">
                    <Field label="Default Posts Filter" hint="Initial filter on the Manage Blog Posts page.">
                      <select
                        id="setting-dashboardDefaultFilter"
                        name="dashboardDefaultFilter"
                        className="ainput"
                        value={settings.dashboardDefaultFilter}
                        onChange={e => update("dashboardDefaultFilter", e.target.value)}
                      >
                        <option value="all">All Posts</option>
                        <option value="published">Published</option>
                        <option value="draft">Drafts</option>
                        <option value="pending">Pending Review</option>
                        <option value="scheduled">Scheduled</option>
                      </select>
                    </Field>
                    <Field label="Recent Posts Count" hint="Rows shown in the admin home recent-posts table (3–12).">
                      <input id="setting-dashboardRecentPostsCount" name="dashboardRecentPostsCount" className="ainput" type="number" min="3" max="12" step="1"
                        value={settings.dashboardRecentPostsCount}
                        onChange={e => update("dashboardRecentPostsCount", Number(e.target.value))} />
                    </Field>
                    <Field label="Recent Comments Count" hint="Comments shown on admin home when enabled (3–20).">
                      <input id="setting-dashboardRecentCommentsCount" name="dashboardRecentCommentsCount" className="ainput" type="number" min="3" max="20" step="1"
                        value={settings.dashboardRecentCommentsCount}
                        onChange={e => update("dashboardRecentCommentsCount", Number(e.target.value))} />
                    </Field>
                  </div>

                  <div className="ast-divider" />

                  <h3 className="ast-sub-title">Home Widgets</h3>
                  <div className="asettings-stack">
                    <ToggleRow
                      icon="fas fa-comments"
                      label="Show Recent Comments"
                      hint="Show or hide the recent-comments widget on the admin home page."
                      checked={settings.dashboardShowRecentComments}
                      onChange={v => update("dashboardShowRecentComments", v)}
                    />
                  </div>

                  <div className="ast-divider" />

                  <h3 className="ast-sub-title">Default Table Columns</h3>
                  <div className="asettings-stack">
                    <ToggleRow
                      icon="fas fa-user"
                      label="Author Column"
                      hint="Show author by default on the Manage Blog Posts table."
                      checked={settings.dashboardShowAuthorColumn}
                      onChange={v => update("dashboardShowAuthorColumn", v)}
                    />
                    <ToggleRow
                      icon="fas fa-comment-dots"
                      label="Comments Column"
                      hint="Show comment counts by default on the Manage Blog Posts table."
                      checked={settings.dashboardShowCommentsColumn}
                      onChange={v => update("dashboardShowCommentsColumn", v)}
                    />
                    <ToggleRow
                      icon="fas fa-eye"
                      label="Views Column"
                      hint="Show view counts by default on the Manage Blog Posts table."
                      checked={settings.dashboardShowViewsColumn}
                      onChange={v => update("dashboardShowViewsColumn", v)}
                    />
                    <ToggleRow
                      icon="fas fa-calendar-alt"
                      label="Date Column"
                      hint="Show created date by default on the Manage Blog Posts table."
                      checked={settings.dashboardShowDateColumn}
                      onChange={v => update("dashboardShowDateColumn", v)}
                    />
                  </div>
                </div>
              )}

              {/* ── CONTENT ── */}
              {activeTab === "content" && (
                <div className="asettings-section">
                  <SectionHeader
                    icon="fas fa-file-alt"
                    title="Content Defaults"
                    desc="Default values pre-filled when creating a new post."
                  />
                  <div className="asettings-grid">
                    <Field label="Posts Per Page" hint="How many posts to show per page in lists (6–48).">
                      <input id="setting-postsPerPage" name="postsPerPage" className="ainput" type="number" min="6" max="48" step="6"
                        value={settings.postsPerPage}
                        onChange={e => update("postsPerPage", Number(e.target.value))} />
                    </Field>
                    <Field label="Default Difficulty">
                      <select
                        id="setting-defaultDifficulty"
                        name="defaultDifficulty"
                        className="ainput"
                        value={settings.defaultDifficulty}
                        onChange={e => update("defaultDifficulty", e.target.value)}
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </Field>
                  </div>

                  <div className="ast-divider" />

                  <div className="asettings-stack">
                    <ToggleRow
                      icon="fas fa-comment-dots"
                      label="Allow Comments by Default"
                      hint="New posts start with comments enabled."
                      checked={settings.defaultComments}
                      onChange={v => update("defaultComments", v)}
                    />
                    <ToggleRow
                      icon="fas fa-star"
                      label="Feature New Posts by Default"
                      hint="Keep this off to curate the featured section manually."
                      checked={settings.defaultFeatured}
                      onChange={v => update("defaultFeatured", v)}
                    />
                  </div>

                  <div className="ast-divider" />

                  <h3 className="ast-sub-title">Publishing Guardrails</h3>
                  <div className="asettings-stack">
                    <ToggleRow
                      icon="fas fa-image"
                      label="Require Cover Image"
                      hint="Block publish and schedule actions until a post has a cover image."
                      checked={settings.requireCoverBeforePublish}
                      onChange={v => update("requireCoverBeforePublish", v)}
                    />
                    <ToggleRow
                      icon="fas fa-folder-open"
                      label="Require Category"
                      hint="Block publish and schedule actions until at least one category is selected."
                      checked={settings.requireCategoryBeforePublish}
                      onChange={v => update("requireCategoryBeforePublish", v)}
                    />
                    <ToggleRow
                      icon="fas fa-tags"
                      label="Require Tags"
                      hint="Block publish and schedule actions until the post has at least one tag."
                      checked={settings.requireTagsBeforePublish}
                      onChange={v => update("requireTagsBeforePublish", v)}
                    />
                  </div>
                </div>
              )}

              {/* ── EDITOR ── */}
              {activeTab === "editor" && (
                <div className="asettings-section">
                  <SectionHeader
                    icon="fas fa-pen-nib"
                    title="Editor Experience"
                    desc="Fine-tune the WYSIWYG editor behavior while writing posts."
                  />
                  <div className="asettings-grid">
                    <Field label="Autosave Interval" hint="Seconds between draft saves while writing (3–60).">
                      <input id="setting-autosaveIntervalSec" name="autosaveIntervalSec" className="ainput" type="number" min="3" max="60" step="1"
                        value={settings.autosaveIntervalSec}
                        onChange={e => update("autosaveIntervalSec", Number(e.target.value))} />
                    </Field>
                    <Field label="Reading Speed" hint="Words per minute used for post reading time (120–320).">
                      <input id="setting-readingSpeedWpm" name="readingSpeedWpm" className="ainput" type="number" min="120" max="320" step="10"
                        value={settings.readingSpeedWpm}
                        onChange={e => update("readingSpeedWpm", Number(e.target.value))} />
                    </Field>
                  </div>
                  <div className="ast-divider" />
                  <div className="asettings-stack">
                    <ToggleRow
                      icon="fas fa-save"
                      label="Autosave Drafts"
                      hint={`Automatically save a draft every ${settings.autosaveIntervalSec || 5} seconds while writing.`}
                      checked={settings.autosave}
                      onChange={v => update("autosave", v)}
                    />
                    <ToggleRow
                      icon="fas fa-clipboard-check"
                      label="Editor Readiness Panel"
                      hint="Show the SEO, headings, and technical evidence checklist."
                      checked={settings.editorReadiness}
                      onChange={v => update("editorReadiness", v)}
                    />
                    <ToggleRow
                      icon="fas fa-file-word"
                      label="Show Word Count in Toolbar"
                      hint="Display live words, reading time, and document stats."
                      checked={settings.showWordCount}
                      onChange={v => update("showWordCount", v)}
                    />
                    <ToggleRow
                      icon="fas fa-spell-check"
                      label="Browser Spellcheck"
                      hint="Enable native browser spellcheck in the editor area."
                      checked={settings.spellcheck}
                      onChange={v => update("spellcheck", v)}
                    />
                    <ToggleRow
                      icon="fas fa-cubes"
                      label="Technical Blocks"
                      hint="Show the technical blocks menu for API, terminal, checklist, FAQ, benchmarks, and more."
                      checked={settings.enableTechnicalBlocks}
                      onChange={v => update("enableTechnicalBlocks", v)}
                    />
                    <ToggleRow
                      icon="fas fa-smile"
                      label="Emoji Picker"
                      hint="Show the emoji picker in the editor toolbar."
                      checked={settings.enableEmojiPicker}
                      onChange={v => update("enableEmojiPicker", v)}
                    />
                    <ToggleRow
                      icon="fas fa-lock"
                      label="Require SEO Before Publish"
                      hint="Block publish and schedule actions until meta title and description are filled."
                      checked={settings.requireSeoBeforePublish}
                      onChange={v => update("requireSeoBeforePublish", v)}
                    />
                  </div>
                </div>
              )}

              {/* ── MEDIA ── */}
              {activeTab === "media" && (
                <div className="asettings-section">
                  <SectionHeader
                    icon="fas fa-images"
                    title="Media"
                    desc="Control image upload rules for cover photos, editor images, and the media library."
                  />
                  <div className="asettings-grid">
                    <Field label="Max Upload Size" hint="Maximum image size in MB for admin uploads (1–25).">
                      <input id="setting-maxUploadSizeMb" name="maxUploadSizeMb" className="ainput" type="number" min="1" max="25" step="1"
                        value={settings.maxUploadSizeMb}
                        onChange={e => update("maxUploadSizeMb", Number(e.target.value))} />
                    </Field>
                    <Field label="Allowed Image Formats" hint="The current uploader accepts these formats.">
                      <input id="setting-allowedFormats" name="allowedFormats" className="ainput" value="JPEG, PNG, WebP, GIF, AVIF" readOnly />
                    </Field>
                  </div>
                  <div className="ast-divider" />
                  <div className="ast-preview-card">
                    <div className="ast-preview-site">
                      <span className="ast-preview-name">{settings.maxUploadSizeMb || 5} MB upload limit</span>
                      <span className="ast-preview-tag">Applies to cover images, post body images, and media library uploads.</span>
                    </div>
                    <div className="ast-preview-meta">
                      <span><i className="fas fa-check-circle" /> Responsive image previews</span>
                      <span><i className="fas fa-shield-alt" /> Type validation enabled</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── PUBLIC BLOG ── */}
              {activeTab === "publicBlog" && (
                <div className="asettings-section">
                  <SectionHeader
                    icon="fas fa-globe"
                    title="Public Blog"
                    desc="Control how blog listing and blog post sidebars appear to visitors."
                  />
                  <div className="asettings-grid">
                    <Field label="Featured Posts Count" hint="How many featured post cards to show at once in the top featured row on desktop (1–8). The row stays single-line; remaining featured posts appear by sliding left or right.">
                      <input id="setting-publicBlogFeaturedCount" name="publicBlogFeaturedCount" className="ainput" type="number" min="1" max="8" step="1"
                        value={settings.publicBlogFeaturedCount}
                        onChange={e => update("publicBlogFeaturedCount", Number(e.target.value))} />
                    </Field>
                    <Field label="Article Schema Type" hint="Schema.org type for SEO.">
                      <select
                        id="setting-seoArticleType"
                        name="seoArticleType"
                        className="ainput"
                        value={settings.seoArticleType}
                        onChange={e => update("seoArticleType", e.target.value)}
                      >
                        <option value="Article">Standard Article</option>
                        <option value="BlogPosting">Blog Post</option>
                        <option value="TechArticle">Technical Article</option>
                      </select>
                    </Field>
                    <Field label="Posts Per Row" hint="Preferred cards per row in the main blog grid below the Featured slider (2–4). If needed, the grid can expand to fit the total posts you choose.">
                      <select id="setting-blog-cols" name="blog_cols" className="ainput" value={settings.publicBlogColumnsPerRow}
                        onChange={e => update("publicBlogColumnsPerRow", Number(e.target.value))}>
                        <option value={2}>2 posts per row</option>
                        <option value={3}>3 posts per row</option>
                        <option value={4}>4 posts per row</option>
                      </select>
                    </Field>
                    <Field label="Rows Per Page" hint="How many rows the main blog grid should try to use on each page (1–6).">
                      <select id="setting-blog-rows" name="blog_rows" className="ainput" value={settings.publicBlogRowsPerPage}
                        onChange={e => update("publicBlogRowsPerPage", Number(e.target.value))}>
                        {[1,2,3,4,5,6].map(r => <option key={r} value={r}>{r} {r === 1 ? "row" : "rows"}</option>)}
                      </select>
                    </Field>
                    <Field label="Total Posts Per Page" hint="Actual number of posts to show on each page (1–24). This is independent, so if you choose 1 row, that row can show however many posts you set here.">
                      <input id="setting-publicBlogPostsPerPage" name="publicBlogPostsPerPage" className="ainput" type="number" min="1" max="24" step="1"
                        value={settings.publicBlogPostsPerPage || 6}
                        onChange={e => update("publicBlogPostsPerPage", Number(e.target.value))} />
                    </Field>
                    <Field label="Listing Recent Posts" hint="Recent posts shown in /blogs right sidebar (3–15).">
                      <input id="setting-publicBlogRecentPostsCount" name="publicBlogRecentPostsCount" className="ainput" type="number" min="3" max="15" step="1"
                        value={settings.publicBlogRecentPostsCount}
                        onChange={e => update("publicBlogRecentPostsCount", Number(e.target.value))} />
                    </Field>
                    <Field label="Post Page Recent Posts" hint="Recent posts shown on individual post sidebars (2–10).">
                      <input id="setting-publicBlogPostRecentCount" name="publicBlogPostRecentCount" className="ainput" type="number" min="2" max="10" step="1"
                        value={settings.publicBlogPostRecentCount}
                        onChange={e => update("publicBlogPostRecentCount", Number(e.target.value))} />
                    </Field>
                    <Field label="Post Page Categories" hint="Categories shown on individual post sidebars (3–12).">
                      <input id="setting-publicBlogCategoryCount" name="publicBlogCategoryCount" className="ainput" type="number" min="3" max="12" step="1"
                        value={settings.publicBlogCategoryCount}
                        onChange={e => update("publicBlogCategoryCount", Number(e.target.value))} />
                    </Field>
                    <Field label="Reading Progress" hint="Show reading progress bar at the top of the post.">
                      <select
                        id="setting-publicBlogReadingProgress"
                        name="publicBlogReadingProgress"
                        className="ainput"
                        value={settings.publicBlogReadingProgress}
                        onChange={e => update("publicBlogReadingProgress", e.target.value)}
                      >
                        <option value="none">None</option>
                        <option value="top">Top (Fixed)</option>
                        <option value="bottom">Bottom (Fixed)</option>
                      </select>
                    </Field>
                    <Field label="Date Format" hint="How dates are displayed on the public blog.">
                      <select
                        id="setting-publicBlogDateFormat"
                        name="publicBlogDateFormat"
                        className="ainput"
                        value={settings.publicBlogDateFormat}
                        onChange={e => update("publicBlogDateFormat", e.target.value)}
                      >
                        <option value="MMM D, YYYY">Oct 1, 2023</option>
                        <option value="D MMM YYYY">1 Oct 2023</option>
                        <option value="YYYY-MM-DD">2023-10-01</option>
                        <option value="relative">Relative (2 days ago)</option>
                      </select>
                    </Field>
                  </div>

                  <div className="ast-divider" />

                  <div className="asettings-stack">
                    <ToggleRow
                      icon="fas fa-star"
                      label="Show Featured Section"
                      hint="Display curated featured posts above the main blog grid."
                      checked={settings.publicBlogShowFeatured}
                      onChange={v => update("publicBlogShowFeatured", v)}
                    />
                    <ToggleRow
                      icon="fas fa-chart-bar"
                      label="Show Post Stats Widget"
                      hint="Display views and comments widget on individual blog post sidebars."
                      checked={settings.publicBlogShowStatsWidget}
                      onChange={v => update("publicBlogShowStatsWidget", v)}
                    />
                    <ToggleRow
                      icon="fas fa-comments"
                      label="Enable Public Comments"
                      hint="Globally allow comment forms on blog posts that also allow comments."
                      checked={settings.publicBlogCommentsEnabled}
                      onChange={v => update("publicBlogCommentsEnabled", v)}
                    />
                    <ToggleRow
                      icon="fas fa-search"
                      label="Show Search Widget"
                      hint="Display the search box in the /blogs sidebar."
                      checked={settings.publicBlogShowSearchWidget}
                      onChange={v => update("publicBlogShowSearchWidget", v)}
                    />
                    <ToggleRow
                      icon="fas fa-folder-open"
                      label="Show Category Widgets"
                      hint="Display category widgets on blog listing and post sidebars."
                      checked={settings.publicBlogShowCategoryWidget}
                      onChange={v => update("publicBlogShowCategoryWidget", v)}
                    />
                    <ToggleRow
                      icon="fas fa-clock"
                      label="Show Recent Posts Widgets"
                      hint="Display recent posts widgets on blog listing and post sidebars."
                      checked={settings.publicBlogShowRecentWidget}
                      onChange={v => update("publicBlogShowRecentWidget", v)}
                    />
                    <ToggleRow
                      icon="fas fa-sliders-h"
                      label="Show Article Tools"
                      hint="Display table of contents, gallery, print, and share tools on post pages."
                      checked={settings.publicBlogShowArticleTools}
                      onChange={v => update("publicBlogShowArticleTools", v)}
                    />
                  </div>
                </div>
              )}

              {/* ── SEO ── */}
              {activeTab === "seo" && (
                <div className="asettings-section">
                  <SectionHeader
                    icon="fas fa-search"
                    title="SEO"
                    desc="Default meta, Open Graph, and canonical settings for your posts."
                  />
                  <div className="asettings-grid">
                    <Field label="Canonical Host" hint="Used when cross-posting to other platforms.">
                      <input id="setting-defaultCanonicalHost" name="defaultCanonicalHost" className="ainput" value={settings.defaultCanonicalHost}
                        placeholder="https://yourdomain.com"
                        onChange={e => update("defaultCanonicalHost", e.target.value)} />
                    </Field>
                    <Field label="Twitter / X Handle" hint="e.g. @deepakmandal — added to OG cards.">
                      <input id="setting-twitterHandle" name="twitterHandle" className="ainput" value={settings.twitterHandle}
                        placeholder="@handle"
                        onChange={e => update("twitterHandle", e.target.value)} />
                    </Field>
                    <Field label="Default OG Image URL" hint="Fallback when a post has no cover image." span>
                      <input id="setting-ogImageDefault" name="ogImageDefault" className="ainput" value={settings.ogImageDefault}
                        placeholder="https://yourdomain.com/og-default.png"
                        onChange={e => update("ogImageDefault", e.target.value)} />
                    </Field>
                    <Field label="Default Meta Description Template" hint="Use {title} as a placeholder." span>
                      <textarea id="setting-defaultMetaDesc" name="defaultMetaDesc" className="ainput ast-textarea" rows={3}
                        value={settings.defaultMetaDesc}
                        placeholder="e.g. Learn {title} with practical examples and code."
                        onChange={e => update("defaultMetaDesc", e.target.value)} />
                    </Field>
                  </div>

                  <div className="ast-divider" />

                  <div className="ast-seo-checklist">
                    {[
                      { ok: Boolean(settings.defaultCanonicalHost), label: "Canonical host configured" },
                      { ok: Boolean(settings.twitterHandle),        label: "Twitter handle set" },
                      { ok: Boolean(settings.ogImageDefault),       label: "Default OG image set" },
                      { ok: Boolean(settings.defaultMetaDesc),      label: "Meta description template set" },
                    ].map(({ ok, label }) => (
                      <div key={label} className={`ast-seo-item${ok ? " ast-seo-item--ok" : ""}`}>
                        <i className={`fas ${ok ? "fa-check-circle" : "fa-circle"}`} />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── NOTIFICATIONS ── */}
              {activeTab === "notifications" && (
                <div className="asettings-section">
                  <SectionHeader
                    icon="fas fa-bell"
                    title="Notifications"
                    desc="Control which events surface alerts in the admin notification menu."
                  />
                  <div className="asettings-stack">
                    <ToggleRow
                      icon="fas fa-comment-dots"
                      label="Comment Notifications"
                      hint="Show recent comment activity in the top-bar notification bell."
                      checked={settings.notifyComments}
                      onChange={v => update("notifyComments", v)}
                    />
                    <ToggleRow
                      icon="fas fa-hourglass-half"
                      label="Pending Review Alerts"
                      hint="Highlight posts waiting for review in the dashboard."
                      checked={settings.notifyPendingReview}
                      onChange={v => update("notifyPendingReview", v)}
                    />
                    <ToggleRow
                      icon="fas fa-desktop"
                      label="Browser Notifications"
                      hint="Request permission to show OS-level push notifications."
                      checked={settings.notifyBrowser}
                      onChange={v => {
                        if (v && "Notification" in window) {
                          Notification.requestPermission().then(p => {
                            if (p === "granted") update("notifyBrowser", true);
                            else toast?.addToast("Browser notifications denied.", "error");
                          });
                        } else {
                          update("notifyBrowser", false);
                        }
                      }}
                    />
                  </div>

                  <div className="ast-divider" />

                  <div className="ast-notif-actions">
                    <button type="button" className="ast-action-btn"
                      onClick={() => { localStorage.removeItem("adminNotifLastReadAt"); toast?.addToast("Notification read state cleared.", "success"); }}>
                      <i className="fas fa-redo" />
                      <span>Reset Read State</span>
                      <small>Mark all current notifications as unread.</small>
                    </button>
                  </div>
                </div>
              )}

              {/* ── MAINTENANCE ── */}
              {activeTab === "maintenance" && (
                <div className="asettings-section">
                  <SectionHeader
                    icon="fas fa-toolbox"
                    title="Maintenance"
                    desc="Control portfolio and blog maintenance modes, export settings, and clean up browser data."
                  />

                  <h3 className="ast-sub-title">Portfolio Maintenance</h3>
                  <div className="asettings-stack">
                    <ToggleRow
                      icon="fas fa-tools"
                      label="Enable Portfolio Maintenance Mode"
                      hint="Show a maintenance page for all portfolio routes (/, /home, /experience, etc.)."
                      checked={settings.portfolioMaintenanceMode}
                      onChange={v => update("portfolioMaintenanceMode", v)}
                    />
                    <ToggleRow
                      icon="fab fa-github"
                      label="Show Social & Resume Links"
                      hint="Display GitHub, LinkedIn, Twitter, and resume links on the maintenance page."
                      checked={settings.portfolioMaintenanceShowSocials}
                      onChange={v => update("portfolioMaintenanceShowSocials", v)}
                    />
                    <ToggleRow
                      icon="fas fa-file-pdf"
                      label="Show Resume Button"
                      hint="Add a prominent 'View Resume' button to the maintenance page actions."
                      checked={settings.portfolioMaintenanceShowResume}
                      onChange={v => update("portfolioMaintenanceShowResume", v)}
                    />
                  </div>
                  <div className="asettings-grid" style={{ marginTop: 14 }}>
                    <Field label="Maintenance Title">
                      <input id="setting-portfolioMaintenanceTitle" name="portfolioMaintenanceTitle" className="ainput" value={settings.portfolioMaintenanceTitle}
                        onChange={e => update("portfolioMaintenanceTitle", e.target.value)} />
                    </Field>
                    <Field label="Expected Back Online" hint="Used for the live countdown on the maintenance page.">
                      <DateTimePicker
                        value={settings.portfolioMaintenanceEndsAt}
                        onChange={v => update("portfolioMaintenanceEndsAt", v)}
                      />
                    </Field>
                    <Field label="Contact URL" hint="Optional link for urgent visitors. Use /#/contact or a full URL.">
                      <input id="setting-portfolioMaintenanceContactUrl" name="portfolioMaintenanceContactUrl" className="ainput" value={settings.portfolioMaintenanceContactUrl}
                        placeholder="/#/contact"
                        onChange={e => update("portfolioMaintenanceContactUrl", e.target.value)} />
                    </Field>
                    <Field label="Maintenance Message" span>
                      <textarea id="setting-portfolioMaintenanceMessage" name="portfolioMaintenanceMessage" className="ainput ast-textarea" rows={3}
                        value={settings.portfolioMaintenanceMessage}
                        onChange={e => update("portfolioMaintenanceMessage", e.target.value)} />
                    </Field>
                    <Field label="What's Coming" hint="One item per line. Shown as a bullet list on the maintenance page." span>
                      <textarea id="setting-portfolioMaintenanceWhatsComing" name="portfolioMaintenanceWhatsComing" className="ainput ast-textarea" rows={4}
                        value={settings.portfolioMaintenanceWhatsComing}
                        placeholder={"Refreshed project showcase\nPerformance improvements\nNew blog integration"}
                        onChange={e => update("portfolioMaintenanceWhatsComing", e.target.value)} />
                    </Field>
                  </div>
                  <div className="ast-preview-card" style={{ marginTop: 16 }}>
                    <div className="ast-preview-site">
                      <span className="ast-preview-name">{settings.portfolioMaintenanceTitle || "Portfolio is under maintenance"}</span>
                      <span className="ast-preview-tag">{settings.portfolioMaintenanceMessage || "Maintenance message preview"}</span>
                    </div>
                    <div className="ast-preview-meta">
                      <span><i className={`fas ${settings.portfolioMaintenanceMode ? "fa-toggle-on" : "fa-toggle-off"}`} /> {settings.portfolioMaintenanceMode ? "Visible to visitors" : "Disabled"}</span>
                      {settings.portfolioMaintenanceEndsAt && <span><i className="far fa-clock" /> {new Date(settings.portfolioMaintenanceEndsAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
                      <span><i className={`fas ${settings.portfolioMaintenanceShowSocials ? "fa-check-circle" : "fa-times-circle"}`} /> Socials {settings.portfolioMaintenanceShowSocials ? "shown" : "hidden"}</span>
                    </div>
                  </div>

                  <div className="ast-divider" />

                  <h3 className="ast-sub-title">Public Blog Maintenance</h3>
                  <div className="asettings-stack">
                    <ToggleRow
                      icon="fas fa-tools"
                      label="Enable Blog Maintenance Mode"
                      hint="Show a maintenance page on /blogs and all blog-post pages."
                      checked={settings.blogMaintenanceMode}
                      onChange={v => update("blogMaintenanceMode", v)}
                    />
                    <ToggleRow
                      icon="fas fa-home"
                      label="Show Home Link"
                      hint="Show a button that lets visitors return to the portfolio home page."
                      checked={settings.blogMaintenanceShowHomeLink}
                      onChange={v => update("blogMaintenanceShowHomeLink", v)}
                    />
                  </div>
                  <div className="asettings-grid" style={{ marginTop: 14 }}>
                    <Field label="Maintenance Title">
                      <input id="setting-blogMaintenanceTitle" name="blogMaintenanceTitle" className="ainput" value={settings.blogMaintenanceTitle}
                        onChange={e => update("blogMaintenanceTitle", e.target.value)} />
                    </Field>
                    <Field label="Expected Back Online" hint="Used for the live countdown on the maintenance page.">
                      <DateTimePicker
                        value={settings.blogMaintenanceEndsAt}
                        onChange={v => update("blogMaintenanceEndsAt", v)}
                      />
                    </Field>
                    <Field label="Contact URL" hint="Optional link for urgent visitors. Use /#/contact or a full URL.">
                      <input id="setting-blogMaintenanceContactUrl" name="blogMaintenanceContactUrl" className="ainput" value={settings.blogMaintenanceContactUrl}
                        placeholder="/#/contact"
                        onChange={e => update("blogMaintenanceContactUrl", e.target.value)} />
                    </Field>
                    <Field label="Maintenance Message" span>
                      <textarea id="setting-blogMaintenanceMessage" name="blogMaintenanceMessage" className="ainput ast-textarea" rows={3}
                        value={settings.blogMaintenanceMessage}
                        onChange={e => update("blogMaintenanceMessage", e.target.value)} />
                    </Field>
                  </div>
                  <div className="ast-preview-card" style={{ marginTop: 16 }}>
                    <div className="ast-preview-site">
                      <span className="ast-preview-name">{settings.blogMaintenanceTitle || "Blogs are under maintenance"}</span>
                      <span className="ast-preview-tag">{settings.blogMaintenanceMessage || "Maintenance message preview"}</span>
                    </div>
                    <div className="ast-preview-meta">
                      <span><i className={`fas ${settings.blogMaintenanceMode ? "fa-toggle-on" : "fa-toggle-off"}`} /> {settings.blogMaintenanceMode ? "Visible to visitors" : "Disabled"}</span>
                      {settings.blogMaintenanceEndsAt && <span><i className="far fa-clock" /> {new Date(settings.blogMaintenanceEndsAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
                    </div>
                  </div>

                  <div className="ast-divider" />

                  <div className="asettings-maintenance">
                    <button type="button" className="asettings-maint-card" onClick={exportSettings}>
                      <span className="asettings-maint-icon"><i className="fas fa-file-export" /></span>
                      <strong>Export Settings</strong>
                      <span>Copy the current settings as a JSON string to clipboard.</span>
                    </button>
                    <button type="button" className="asettings-maint-card"
                      onClick={() => { setShowImport(o => !o); setImportErr(""); }}>
                      <span className="asettings-maint-icon"><i className="fas fa-file-import" /></span>
                      <strong>Import Settings</strong>
                      <span>Paste a settings JSON blob to restore preferences.</span>
                    </button>
                    <button type="button" className="asettings-maint-card"
                      onClick={() => { localStorage.removeItem("adminNotifLastReadAt"); toast?.addToast("Notification state cleared.", "success"); }}>
                      <span className="asettings-maint-icon"><i className="fas fa-bell-slash" /></span>
                      <strong>Reset Notifications</strong>
                      <span>Clear the read state so all notifications appear fresh.</span>
                    </button>
                    <button type="button" className="asettings-maint-card"
                      onClick={() => { localStorage.removeItem("bp_bookmarks"); toast?.addToast("Local bookmarks cleared.", "success"); }}>
                      <span className="asettings-maint-icon"><i className="fas fa-bookmark" /></span>
                      <strong>Clear Bookmarks</strong>
                      <span>Remove locally stored bookmarks for public blog posts.</span>
                    </button>
                    <button type="button" className="asettings-maint-card"
                      onClick={() => { localStorage.removeItem("adminSidebarCollapsed"); toast?.addToast("Sidebar state reset.", "success"); }}>
                      <span className="asettings-maint-icon"><i className="fas fa-columns" /></span>
                      <strong>Reset Sidebar</strong>
                      <span>Restore sidebar to its default expanded position.</span>
                    </button>
                    <button type="button" className="asettings-maint-card"
                      onClick={() => { const keys = Object.keys(localStorage).filter(k => k.startsWith("awp-draft-")); keys.forEach(k => localStorage.removeItem(k)); toast?.addToast(`${keys.length} draft cache(s) cleared.`, "success"); }}>
                      <span className="asettings-maint-icon"><i className="fas fa-eraser" /></span>
                      <strong>Clear Draft Cache</strong>
                      <span>Remove any locally cached editor draft content.</span>
                    </button>
                  </div>

                  {/* Import panel */}
                  {showImport && (
                    <div className="ast-import-panel" ref={importRef}>
                      <label htmlFor="import-settings-json" className="asettings-label">Paste Settings JSON</label>
                      <textarea
                        id="import-settings-json"
                        name="import_settings_json"
                        className="ainput ast-textarea ast-import-area"
                        rows={6}
                        value={importJson}
                        placeholder={'{\n  "siteName": "...",\n  "theme": "dark"\n}'}
                        onChange={e => { setImportJson(e.target.value); setImportErr(""); }}
                      />
                      {importErr && <p className="ast-import-err"><i className="fas fa-exclamation-circle" /> {importErr}</p>}
                      <div className="ast-import-actions">
                        <button type="button" className="abtn abtn-primary abtn-sm" onClick={importSettings}>Apply Import</button>
                        <button type="button" className="abtn abtn-ghost abtn-sm" onClick={() => { setShowImport(false); setImportJson(""); setImportErr(""); }}>Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="ast-divider" />

                  {/* Danger zone */}
                  <div className="ast-danger-zone">
                    <div className="ast-danger-head">
                      <i className="fas fa-exclamation-triangle" />
                      <div>
                        <strong>Danger Zone</strong>
                        <span>These actions are irreversible. Proceed with caution.</span>
                      </div>
                    </div>
                    {resetConfirm ? (
                      <div className="ast-danger-confirm">
                        <span>Reset all settings to factory defaults?</span>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="button" className="abtn abtn-danger abtn-sm" onClick={resetSettings}>Yes, Reset</button>
                          <button type="button" className="abtn abtn-ghost abtn-sm" onClick={() => setResetConfirm(false)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" className="ast-danger-btn" onClick={() => setResetConfirm(true)}>
                        <i className="fas fa-undo-alt" /> Reset All Settings to Default
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>{/* end asettings-card */}
          </div>{/* end asettings-shell */}

        </div>
      </main>
    </div>
  );
}
