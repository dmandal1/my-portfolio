import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import pkg from "../../../package.json";
import { useAuth } from "../../contexts/AuthContext";
import { saveAdminPanelSettings } from "../../firebase/blogService";
import AdminSidebar from "./components/AdminSidebar";
import {
  applyAdminTheme,
  DEFAULT_SETTINGS,
  loadAdminSettings,
  normalizeAdminSettings,
  SETTINGS_KEY,
  TIMEZONES,
} from "./components/adminSettingsConfig";
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
    <label className={`asettings-field${span ? " asettings-field--span" : ""}`}>
      <span className="asettings-label">{label}</span>
      {children}
      {hint && <span className="asettings-hint">{hint}</span>}
    </label>
  );
}

function formatDateTimePreview(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";

  return date.toLocaleString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ── Main component ── */
export default function AdminSettings() {
  const toast                       = useToast();
  const { currentUser }             = useAuth();
  const [settings, setSettings]     = useState(loadAdminSettings);
  const [activeTab, setActiveTab]   = useState("general");
  const [dirty, setDirty]           = useState(false);
  const [savedAt, setSavedAt]       = useState("");
  const [importJson, setImportJson] = useState("");
  const [importErr, setImportErr]   = useState("");
  const [showImport, setShowImport] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const importRef = useRef(null);

  /* Apply theme on load */
  useEffect(() => { applyAdminTheme(settings.theme); }, []); // eslint-disable-line

  const tabs = useMemo(() => [
    { id: "general",       label: "General",       icon: "fas fa-user-circle" },
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
    const normalized = normalizeAdminSettings({ ...settings, theme: value });
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
    setSettings(normalized);
    setDirty(true);
    applyAdminTheme(value);
    window.dispatchEvent(new Event("adminSettingsUpdated"));
  }

  async function persistSettings(normalized) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
    applyAdminTheme(normalized.theme);
    localStorage.setItem("adminSidebarCollapsed", String(normalized.sidebarCollapsed));
    window.dispatchEvent(new Event("adminSettingsUpdated"));
    try {
      await saveAdminPanelSettings(normalized);
    } catch (error) {
      console.error("[AdminSettings] Firestore settings save failed:", error);
    }
  }

  async function saveSettings() {
    const normalized = normalizeAdminSettings(settings);
    setSettings(normalized);
    await persistSettings(normalized);
    const time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    setSavedAt(time);
    setDirty(false);
    toast?.addToast("Settings saved.", "success");
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
  const maintenanceBackOnlineLabel = formatDateTimePreview(settings.blogMaintenanceEndsAt);
  const portfolioBackOnlineLabel   = formatDateTimePreview(settings.portfolioMaintenanceEndsAt);

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
                      <input className="ainput" value={settings.siteName}
                        onChange={e => update("siteName", e.target.value)} />
                    </Field>
                    <Field label="Site Tagline">
                      <input className="ainput" value={settings.siteTagline}
                        onChange={e => update("siteTagline", e.target.value)} />
                    </Field>
                    <Field label="Default Author">
                      <input className="ainput" value={settings.defaultAuthor}
                        onChange={e => update("defaultAuthor", e.target.value)} />
                    </Field>
                    <Field label="Timezone">
                      <select className="ainput" value={settings.timezone}
                        onChange={e => update("timezone", e.target.value)}>
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
                      <select className="ainput" value={settings.dashboardDefaultFilter}
                        onChange={e => update("dashboardDefaultFilter", e.target.value)}>
                        <option value="all">All Posts</option>
                        <option value="published">Published</option>
                        <option value="draft">Drafts</option>
                        <option value="pending">Pending Review</option>
                        <option value="scheduled">Scheduled</option>
                      </select>
                    </Field>
                    <Field label="Recent Posts Count" hint="Rows shown in the admin home recent-posts table (3–12).">
                      <input className="ainput" type="number" min="3" max="12" step="1"
                        value={settings.dashboardRecentPostsCount}
                        onChange={e => update("dashboardRecentPostsCount", Number(e.target.value))} />
                    </Field>
                    <Field label="Recent Comments Count" hint="Comments shown on admin home when enabled (3–20).">
                      <input className="ainput" type="number" min="3" max="20" step="1"
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
                      <input className="ainput" type="number" min="6" max="48" step="6"
                        value={settings.postsPerPage}
                        onChange={e => update("postsPerPage", Number(e.target.value))} />
                    </Field>
                    <Field label="Default Difficulty">
                      <select className="ainput" value={settings.defaultDifficulty}
                        onChange={e => update("defaultDifficulty", e.target.value)}>
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
                      <input className="ainput" type="number" min="3" max="60" step="1"
                        value={settings.autosaveIntervalSec}
                        onChange={e => update("autosaveIntervalSec", Number(e.target.value))} />
                    </Field>
                    <Field label="Reading Speed" hint="Words per minute used for post reading time (120–320).">
                      <input className="ainput" type="number" min="120" max="320" step="10"
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
                      <input className="ainput" type="number" min="1" max="25" step="1"
                        value={settings.maxUploadSizeMb}
                        onChange={e => update("maxUploadSizeMb", Number(e.target.value))} />
                    </Field>
                    <Field label="Allowed Image Formats" hint="The current uploader accepts these formats.">
                      <input className="ainput" value="JPEG, PNG, WebP, GIF, AVIF" readOnly />
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
                      <input className="ainput" type="number" min="1" max="8" step="1"
                        value={settings.publicBlogFeaturedCount}
                        onChange={e => update("publicBlogFeaturedCount", Number(e.target.value))} />
                    </Field>
                    <Field label="Posts Per Row" hint="Preferred cards per row in the main blog grid below the Featured slider (2–4). If needed, the grid can expand to fit the total posts you choose.">
                      <select className="ainput" value={settings.publicBlogColumnsPerRow}
                        onChange={e => update("publicBlogColumnsPerRow", Number(e.target.value))}>
                        <option value={2}>2 posts per row</option>
                        <option value={3}>3 posts per row</option>
                        <option value={4}>4 posts per row</option>
                      </select>
                    </Field>
                    <Field label="Rows Per Page" hint="How many rows the main blog grid should try to use on each page (1–6).">
                      <select className="ainput" value={settings.publicBlogRowsPerPage}
                        onChange={e => update("publicBlogRowsPerPage", Number(e.target.value))}>
                        {[1,2,3,4,5,6].map(r => <option key={r} value={r}>{r} {r === 1 ? "row" : "rows"}</option>)}
                      </select>
                    </Field>
                    <Field label="Total Posts Per Page" hint="Actual number of posts to show on each page (1–24). This is independent, so if you choose 1 row, that row can show however many posts you set here.">
                      <input className="ainput" type="number" min="1" max="24" step="1"
                        value={settings.publicBlogPostsPerPage || 6}
                        onChange={e => update("publicBlogPostsPerPage", Number(e.target.value))} />
                    </Field>
                    <Field label="Listing Recent Posts" hint="Recent posts shown in /blogs right sidebar (3–15).">
                      <input className="ainput" type="number" min="3" max="15" step="1"
                        value={settings.publicBlogRecentPostsCount}
                        onChange={e => update("publicBlogRecentPostsCount", Number(e.target.value))} />
                    </Field>
                    <Field label="Post Page Recent Posts" hint="Recent posts shown on individual post sidebars (2–10).">
                      <input className="ainput" type="number" min="2" max="10" step="1"
                        value={settings.publicBlogPostRecentCount}
                        onChange={e => update("publicBlogPostRecentCount", Number(e.target.value))} />
                    </Field>
                    <Field label="Post Page Categories" hint="Categories shown on individual post sidebars (3–12).">
                      <input className="ainput" type="number" min="3" max="12" step="1"
                        value={settings.publicBlogCategoryCount}
                        onChange={e => update("publicBlogCategoryCount", Number(e.target.value))} />
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
                      <input className="ainput" value={settings.defaultCanonicalHost}
                        placeholder="https://yourdomain.com"
                        onChange={e => update("defaultCanonicalHost", e.target.value)} />
                    </Field>
                    <Field label="Twitter / X Handle" hint="e.g. @deepakmandal — added to OG cards.">
                      <input className="ainput" value={settings.twitterHandle}
                        placeholder="@handle"
                        onChange={e => update("twitterHandle", e.target.value)} />
                    </Field>
                    <Field label="Default OG Image URL" hint="Fallback when a post has no cover image." span>
                      <input className="ainput" value={settings.ogImageDefault}
                        placeholder="https://yourdomain.com/og-default.png"
                        onChange={e => update("ogImageDefault", e.target.value)} />
                    </Field>
                    <Field label="Default Meta Description Template" hint="Use {title} as a placeholder." span>
                      <textarea className="ainput ast-textarea" rows={3}
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
                      <input className="ainput" value={settings.portfolioMaintenanceTitle}
                        onChange={e => update("portfolioMaintenanceTitle", e.target.value)} />
                    </Field>
                    <Field label="Expected Back Online" hint="Used for the live countdown on the maintenance page.">
                      <span className="ast-datetime-control">
                        <span className="ast-datetime-icon"><i className="far fa-calendar-alt" /></span>
                        <input
                          className="ast-datetime-input"
                          type="datetime-local"
                          value={settings.portfolioMaintenanceEndsAt}
                          onChange={e => update("portfolioMaintenanceEndsAt", e.target.value)}
                        />
                      </span>
                      {portfolioBackOnlineLabel && (
                        <span className="ast-datetime-preview">
                          <i className="fas fa-bolt" />
                          Countdown target <strong>{portfolioBackOnlineLabel}</strong>
                        </span>
                      )}
                    </Field>
                    <Field label="Contact URL" hint="Optional link for urgent visitors. Use /#/contact or a full URL.">
                      <input className="ainput" value={settings.portfolioMaintenanceContactUrl}
                        placeholder="/#/contact"
                        onChange={e => update("portfolioMaintenanceContactUrl", e.target.value)} />
                    </Field>
                    <Field label="Maintenance Message" span>
                      <textarea className="ainput ast-textarea" rows={3}
                        value={settings.portfolioMaintenanceMessage}
                        onChange={e => update("portfolioMaintenanceMessage", e.target.value)} />
                    </Field>
                    <Field label="What's Coming" hint="One item per line. Shown as a bullet list on the maintenance page." span>
                      <textarea className="ainput ast-textarea" rows={4}
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
                      <input className="ainput" value={settings.blogMaintenanceTitle}
                        onChange={e => update("blogMaintenanceTitle", e.target.value)} />
                    </Field>
                    <Field label="Expected Back Online" hint="Used for the live countdown on the maintenance page.">
                      <span className="ast-datetime-control">
                        <span className="ast-datetime-icon"><i className="far fa-calendar-alt" /></span>
                        <input
                          className="ast-datetime-input"
                          type="datetime-local"
                          value={settings.blogMaintenanceEndsAt}
                          onChange={e => update("blogMaintenanceEndsAt", e.target.value)}
                        />
                      </span>
                      {maintenanceBackOnlineLabel && (
                        <span className="ast-datetime-preview">
                          <i className="fas fa-bolt" />
                          Countdown target <strong>{maintenanceBackOnlineLabel}</strong>
                        </span>
                      )}
                    </Field>
                    <Field label="Contact URL" hint="Optional link for urgent visitors. Use /#/contact or a full URL.">
                      <input className="ainput" value={settings.blogMaintenanceContactUrl}
                        placeholder="/#/contact"
                        onChange={e => update("blogMaintenanceContactUrl", e.target.value)} />
                    </Field>
                    <Field label="Maintenance Message" span>
                      <textarea className="ainput ast-textarea" rows={3}
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
                      <label className="asettings-label">Paste Settings JSON</label>
                      <textarea
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
