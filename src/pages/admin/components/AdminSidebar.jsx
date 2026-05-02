import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { getAllBlogsAdmin, saveAdminPanelSettings, getContactMessages, uploadAvatar, updateAdminProfile } from "../../../api/apiService";
import { useAdminSettings } from "./useAdminSettings";
import { usePortfolioData } from "../../../contexts/PortfolioDataContext";
import {
  ADMIN_SETTINGS_UPDATED_EVENT,
  applyAdminTheme,
  cacheAdminSettings,
  loadAdminSettings,
  normalizeAdminSettings,
} from "./adminSettingsConfig";

/* Top-bar primary nav tabs */
const NAV_TABS = [
  { to: "/admin/home",       label: "Dashboard", end: true },
  { to: "/admin/dashboard",  label: "Posts",     end: true },
  { to: "/admin/comments",   label: "Comments" },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/tags",       label: "Tags" },
  { to: "/admin/media",      label: "Media" },
  { to: "/admin/portfolio",  label: "Portfolio" },
  { to: "/admin/settings",   label: "Settings" },
];

/* Sidebar secondary nav — use divider:true for separator lines */
const NAV_ITEMS = [
  { to: "/admin/home",       icon: "fas fa-th-large",    label: "Dashboard",  end: true },
  { to: "/admin/dashboard",  icon: "fas fa-file-alt",    label: "All Posts",  end: true },
  { to: "/admin/post/new",   icon: "fas fa-plus-circle", label: "Add New" },
  { divider: true, key: "d1" },
  { to: "/admin/categories", icon: "fas fa-folder",      label: "Categories" },
  { to: "/admin/tags",       icon: "fas fa-tags",        label: "Tags" },
  { divider: true, key: "d2" },
  { to: "/admin/media",      icon: "fas fa-photo-video", label: "Media" },
  { to: "/admin/analytics",  icon: "fas fa-chart-bar",   label: "Analytics" },
  { to: "/admin/editorial-planner", icon: "far fa-calendar-alt", label: "Planner" },
  { to: "/admin/content-audit", icon: "fas fa-clipboard-check", label: "Content Audit" },
  { to: "/admin/seo",        icon: "fas fa-search-plus",  label: "SEO Manager" },
  { to: "/admin/redirects",  icon: "fas fa-directions",   label: "Redirects" },
  { divider: true, key: "d3" },
  { to: "/admin/portfolio",  icon: "fas fa-user-circle",   label: "Portfolio" },
  { divider: true, key: "d4" },
  { to: "/admin/inbox",       icon: "fas fa-inbox",         label: "Inbox" },
  { to: "/admin/moderation",  icon: "fas fa-gavel",          label: "Moderation" },
  { to: "/admin/subscribers", icon: "fas fa-users",          label: "Subscribers" },
  { to: "/admin/audit",       icon: "fas fa-history",        label: "Audit Logs" },
  { to: "/admin/import-export", icon: "fas fa-exchange-alt", label: "Import/Export" },
  { to: "/admin/database",    icon: "fas fa-database",       label: "Database" },
  { to: "/admin/system",      icon: "fas fa-server",         label: "System Status" },
  { to: "/admin/settings",    icon: "fas fa-cog",            label: "Settings" },
];

const SEARCH_LINKS = [
  { to: "/admin/home", label: "Dashboard", icon: "fas fa-th-large" },
  { to: "/admin/dashboard", label: "All Posts", icon: "fas fa-file-alt" },
  { to: "/admin/post/new", label: "Add New Post", icon: "fas fa-plus-circle" },
  { to: "/admin/comments", label: "Comments", icon: "fas fa-comment-dots" },
  { to: "/admin/categories", label: "Categories", icon: "fas fa-folder" },
  { to: "/admin/tags", label: "Tags", icon: "fas fa-tags" },
  { to: "/admin/media", label: "Media", icon: "fas fa-photo-video" },
  { to: "/admin/analytics", label: "Analytics", icon: "fas fa-chart-bar" },
  { to: "/admin/editorial-planner", label: "Editorial Planner", icon: "far fa-calendar-alt" },
  { to: "/admin/content-audit", label: "Content Audit", icon: "fas fa-clipboard-check" },
  { to: "/admin/seo",       label: "SEO Manager",       icon: "fas fa-search-plus" },
  { to: "/admin/redirects", label: "Redirect Manager",  icon: "fas fa-directions" },
  { to: "/admin/portfolio", label: "Portfolio Content", icon: "fas fa-user-circle" },
  { to: "/admin/subscribers", label: "Newsletter Subscribers", icon: "fas fa-users" },
  { to: "/admin/moderation",  label: "Comment Moderation",     icon: "fas fa-gavel" },
  { to: "/admin/import-export", label: "Import / Export",      icon: "fas fa-exchange-alt" },
  { to: "/admin/audit",       label: "Audit Logs",              icon: "fas fa-history" },
  { to: "/admin/database",  label: "Database",          icon: "fas fa-database" },
  { to: "/admin/system",    label: "System Status",     icon: "fas fa-server" },
  { to: "/admin/profile",   label: "My Profile",        icon: "fas fa-user-circle" },
  { to: "/admin/settings",  label: "Settings",          icon: "fas fa-cog" },
];

const ADMIN_NOTIF_LAST_READ_KEY = "adminNotifLastReadAt";

function isDarkThemeSetting(theme) {
  if (theme === "system") {
    return (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  }
  return theme === "dark";
}

function toMillis(raw) {
  if (!raw) return 0;
  if (typeof raw === "number") return raw;
  if (raw?.toDate) return raw.toDate().getTime();
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function latestPostTime(posts) {
  return posts.reduce(
    (max, post) => Math.max(max, toMillis(post.updatedAt), toMillis(post.createdAt)),
    0
  );
}

export default function AdminSidebar() {
  const { currentUser, logout, updateUser } = useAuth();
  const { profile, siteName } = usePortfolioData();
  const navigate = useNavigate();
  const adminSettings = useAdminSettings();
  const [loggingOut, setLoggingOut]     = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen]       = useState(false);
  const [searchOpen, setSearchOpen]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState("");
  const [searchPosts, setSearchPosts]   = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchLoaded, setSearchLoaded] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [unreadCount, setUnreadCount]   = useState(0);
  const [darkMode, setDarkMode]         = useState(
    () => isDarkThemeSetting(loadAdminSettings().theme)
  );
  const [navAvatarUploading, setNavAvatarUploading] = useState(false);
  const navAvatarInputRef = useRef(null);

  async function handleNavAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setNavAvatarUploading(true);
    try {
      const url = await uploadAvatar(file);
      await updateAdminProfile({ profile_image: url });
      updateUser({ profileImage: url });
    } catch (err) {
      console.error('Avatar upload failed:', err);
    } finally {
      setNavAvatarUploading(false);
      if (navAvatarInputRef.current) navAvatarInputRef.current.value = '';
    }
  }

  /* ── Dark mode effect ── */
  useEffect(() => {
    applyAdminTheme(darkMode ? "dark" : "light");
  }, [darkMode]);

  /* ── Sync sidebar state when admin settings are saved ── */
  useEffect(() => {
    function onSettingsUpdated() {
      setCollapsed(localStorage.getItem("adminSidebarCollapsed") === "true");
      setDarkMode(isDarkThemeSetting(loadAdminSettings().theme));
    }
    window.addEventListener(ADMIN_SETTINGS_UPDATED_EVENT, onSettingsUpdated);
    return () => window.removeEventListener(ADMIN_SETTINGS_UPDATED_EVENT, onSettingsUpdated);
  }, []);
  const userMenuRef = useRef(null);
  const notifRef    = useRef(null);
  const searchRef   = useRef(null);
  const searchInputRef = useRef(null);
  const [collapsed, setCollapsed]       = useState(
    () => localStorage.getItem("adminSidebarCollapsed") === "true"
  );

  /* ── Sync sidebar width CSS var ── */
  useEffect(() => {
    document.documentElement.style.setProperty("--as-w", collapsed ? "60px" : "220px");
    localStorage.setItem("adminSidebarCollapsed", String(collapsed));
  }, [collapsed]);

  /* ── Close dropdowns outside click / Escape ── */
  useEffect(() => {
    function onOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target))
        setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target))
        setNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target))
        setSearchOpen(false);
    }
    function onEsc(e) {
      if (e.key === "Escape") { setUserMenuOpen(false); setNotifOpen(false); setSearchOpen(false); }
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const t = setTimeout(() => searchInputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen || searchLoaded) return;
    let cancelled = false;

    async function loadSearchPosts() {
      setSearchLoading(true);
      try {
        const blogs = await getAllBlogsAdmin();
        if (cancelled) return;
        setSearchPosts(blogs);
        setSearchLoaded(true);
      } catch {
        if (cancelled) return;
        setSearchPosts([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }

    loadSearchPosts();
    return () => {
      cancelled = true;
    };
  }, [searchOpen, searchLoaded]);

  /* ── Notifications (live from blog data) ── */
  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      setNotifLoading(true);
      try {
        const [blogs, messages] = await Promise.all([
          getAllBlogsAdmin(),
          getContactMessages().catch(() => [])
        ]);
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;

        const pending = blogs.filter((b) => b.pendingReview && !b.published);
        const drafts = blogs.filter((b) => !b.published && !b.pendingReview && !b.scheduledAt);
        const scheduled = blogs.filter((b) => !b.published && Boolean(b.scheduledAt));
        const recent = blogs.filter((b) => toMillis(b.createdAt) >= oneDayAgo);

        const items = [];
        if (pending.length > 0 && adminSettings.notifyPendingReview) {
          items.push({
            id: "pending",
            icon: "fas fa-hourglass-half",
            text: `${pending.length} post${pending.length > 1 ? "s" : ""} pending review`,
            to: "/admin/dashboard",
            updatedAt: latestPostTime(pending),
          });
        }
        if (drafts.length > 0) {
          items.push({
            id: "drafts",
            icon: "fas fa-file-alt",
            text: `${drafts.length} draft post${drafts.length > 1 ? "s" : ""} waiting`,
            to: "/admin/dashboard",
            updatedAt: latestPostTime(drafts),
          });
        }
        if (scheduled.length > 0) {
          items.push({
            id: "scheduled",
            icon: "far fa-calendar-alt",
            text: `${scheduled.length} scheduled post${scheduled.length > 1 ? "s" : ""}`,
            to: "/admin/dashboard",
            updatedAt: latestPostTime(scheduled),
          });
        }
        const unreadMsgs = messages.filter(m => !m.is_read);
        if (unreadMsgs.length > 0) {
          items.push({
            id: "messages",
            icon: "fas fa-envelope",
            text: `${unreadMsgs.length} unread contact message${unreadMsgs.length > 1 ? "s" : ""}`,
            to: "/admin/inbox",
            updatedAt: Math.max(...unreadMsgs.map(m => new Date(m.created_at).getTime()))
          });
        }

        if (recent.length > 0) {
          items.push({
            id: "recent",
            icon: "fas fa-bolt",
            text: `${recent.length} new post${recent.length > 1 ? "s" : ""} in last 24h`,
            to: "/admin/dashboard",
            updatedAt: latestPostTime(recent),
          });
        }

        items.sort((a, b) => b.updatedAt - a.updatedAt);

        const lastRead = Number(localStorage.getItem(ADMIN_NOTIF_LAST_READ_KEY) || 0);
        const withUnread = items.map((item) => ({
          ...item,
          unread: item.updatedAt > lastRead,
        }));

        if (cancelled) return;
        setNotifications(withUnread);
        setUnreadCount(withUnread.filter((n) => n.unread).length);
      } catch {
        if (cancelled) return;
        setNotifications([]);
        setUnreadCount(0);
      } finally {
        if (!cancelled) setNotifLoading(false);
      }
    }

    loadNotifications();
    const t = setInterval(loadNotifications, 60000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    const now = Date.now();
    localStorage.setItem(ADMIN_NOTIF_LAST_READ_KEY, String(now));
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    setUnreadCount(0);
  }, [notifOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    setUserMenuOpen(false);
    await logout();
    navigate("/admin/login");
  }

  async function handleDarkModeToggle() {
    const next = !darkMode;
    const theme = next ? "dark" : "light";
    const normalized = cacheAdminSettings({ ...loadAdminSettings(), theme });
    applyAdminTheme(theme);
    setDarkMode(next);
    try {
      await saveAdminPanelSettings(normalized);
    } catch (error) {
      console.error("[AdminSidebar] Theme sync failed:", error);
    }
  }

  const query = searchQuery.trim().toLowerCase();
  const navMatches = (query
    ? SEARCH_LINKS.filter((item) => item.label.toLowerCase().includes(query))
    : SEARCH_LINKS).slice(0, 7);

  const postMatches = (query
    ? searchPosts.filter((post) => {
      const title = String(post.title || "").toLowerCase();
      const slug = String(post.slug || "").toLowerCase();
      return title.includes(query) || slug.includes(query);
    })
    : searchPosts).slice(0, 6);

  function openSearchResult(to) {
    setSearchOpen(false);
    setSearchQuery("");
    navigate(to);
  }

  function onSearchSubmit(e) {
    e.preventDefault();
    if (navMatches[0]) {
      openSearchResult(navMatches[0].to);
      return;
    }
    if (postMatches[0]) {
      openSearchResult(`/admin/post/${postMatches[0].id}/edit`);
    }
  }

  const initials = (() => {
    const name = currentUser?.display_name;
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    return currentUser?.email?.slice(0, 2).toUpperCase() ?? "AD";
  })();
  const profileImage = currentUser?.profileImage || "";

  return (
    <>
      {/* ══ FULL-WIDTH TOP HEADER ══════════════════════════════ */}
      <header className="aadminbar">

        {/* Brand — aligns with sidebar width */}
        <div className={`abar-brand${collapsed ? " abar-brand--collapsed" : ""}`}>
          <div className="abar-brand-icon">
            <i className="fas fa-pen-nib" />
          </div>
          <span className="abar-brand-name">MyBlog <span>Admin</span></span>
          <button
            type="button"
            className="abar-collapse-btn"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
          >
            <i className={`fas ${collapsed ? "fa-angle-right" : "fa-angle-left"}`} />
          </button>
        </div>

        {/* Primary nav tabs */}
        <nav className="abar-tabs">
          {NAV_TABS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `abar-tab${isActive ? " abar-tab--active" : ""}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right controls */}
        <div className="abar-right">
          {/* Maintenance Mode Toggle */}
          <div className="abar-maintenance-wrap">
             <button 
               className={`abar-maint-btn ${adminSettings.blogMaintenanceMode ? "is-active" : ""}`}
               title={adminSettings.blogMaintenanceMode ? "Blog is in Maintenance Mode (Publicly hidden)" : "Blog is Live (Publicly visible)"}
               onClick={() => {
                 const next = !adminSettings.blogMaintenanceMode;
                 saveAdminPanelSettings({ ...adminSettings, blogMaintenanceMode: next });
                 cacheAdminSettings({ ...adminSettings, blogMaintenanceMode: next });
               }}
             >
               <i className="fas fa-hammer" />
               <span className="abar-maint-status">
                 {adminSettings.blogMaintenanceMode ? "Maintenance" : "Live"}
               </span>
             </button>
          </div>

          {/* Search icon */}
          <div className="abar-search-wrap" ref={searchRef}>
            <button
              className="abar-icon-btn"
              title="Search"
              onClick={() => {
                setSearchOpen((v) => !v);
                setNotifOpen(false);
                setUserMenuOpen(false);
              }}
              aria-label="Search"
            >
              <i className="fas fa-search" />
            </button>

            {searchOpen && (
              <div className="abar-search-dropdown">
                <form className="abar-search-input-wrap" onSubmit={onSearchSubmit}>
                  <label htmlFor="abar-search-input" className="sr-only">Search</label>
                  <i className="fas fa-search" />
                  <input
                    id="abar-search-input"
                    name="search"
                    ref={searchInputRef}
                    className="abar-search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search posts, categories, pages..."
                    autoComplete="off"
                  />
                </form>

                {searchLoading ? (
                  <div className="abar-search-empty">Loading…</div>
                ) : (
                  <>
                    {navMatches.length > 0 && (
                      <div className="abar-search-section">
                        <div className="abar-search-title">Navigation</div>
                        {navMatches.map((item) => (
                          <button
                            key={item.to}
                            type="button"
                            className="abar-search-item"
                            onClick={() => openSearchResult(item.to)}
                          >
                            <i className={item.icon} />
                            <span>{item.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {postMatches.length > 0 && (
                      <div className="abar-search-section">
                        <div className="abar-search-title">Posts</div>
                        {postMatches.map((post) => (
                          <button
                            key={post.id}
                            type="button"
                            className="abar-search-item"
                            onClick={() => openSearchResult(`/admin/post/${post.id}/edit`)}
                          >
                            <i className="fas fa-file-alt" />
                            <span>{post.title || "Untitled Post"}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {navMatches.length === 0 && postMatches.length === 0 && (
                      <div className="abar-search-empty">No matching results.</div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Notification bell */}
          <div className="abar-notif-wrap" ref={notifRef}>
            <button
              className="abar-icon-btn"
              onClick={() => setNotifOpen((v) => !v)}
              aria-label="Notifications"
            >
              <i className="fas fa-bell" />
              {unreadCount > 0 && (
                <span className="abar-notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
              )}
            </button>
            {notifOpen && (
              <div className="abar-notif-dropdown">
                <div className="abar-notif-head">
                  <p className="abar-dropdown-title">Notifications</p>
                  <button
                    type="button"
                    className="abar-notif-markread"
                    onClick={() => {
                      const now = Date.now();
                      localStorage.setItem(ADMIN_NOTIF_LAST_READ_KEY, String(now));
                      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
                      setUnreadCount(0);
                    }}
                  >
                    Mark all read
                  </button>
                </div>

                {notifLoading ? (
                  <div className="abar-notif-empty">Loading notifications…</div>
                ) : notifications.length === 0 ? (
                  <div className="abar-notif-empty">You are all caught up.</div>
                ) : (
                  notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="abar-notif-item"
                      onClick={() => {
                        setNotifOpen(false);
                        navigate(item.to);
                      }}
                    >
                      <i className={item.icon} />
                      <span>{item.text}</span>
                      {item.unread && <span className="abar-notif-dot" />}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* User menu */}
          {currentUser && (
            <div className="abar-user-wrap" ref={userMenuRef}>
              {/* Hidden file input for navbar avatar upload */}
              <input
                type="file"
                accept="image/*"
                ref={navAvatarInputRef}
                onChange={handleNavAvatarUpload}
                style={{ display: 'none' }}
              />
              <button
                className={`abar-user-btn${userMenuOpen ? " is-open" : ""}`}
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <div
                  className="abar-av abar-av-upload"
                  onClick={(e) => { e.stopPropagation(); navAvatarInputRef.current?.click(); }}
                  title="Click to change profile picture"
                  style={{ cursor: 'pointer', position: 'relative' }}
                >
                  {navAvatarUploading ? (
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: 12 }} />
                  ) : profileImage ? (
                    <img src={profileImage} alt="Profile" className="abar-av-img" />
                  ) : (
                    initials
                  )}
                  {!navAvatarUploading && (
                    <span className="abar-av-cam"><i className="fas fa-camera" /></span>
                  )}
                </div>
                <span className="abar-uname">{currentUser?.display_name || 'Admin'}</span>
                <i className="fas fa-chevron-down abar-caret" />
              </button>

              {userMenuOpen && (
                <div className="abar-user-dropdown" role="menu">

                  {/* ── Header: avatar + name + email ── */}
                  <div className="abar-um-header">
                    <div className="abar-av abar-av-lg">
                      {profileImage ? (
                        <img src={profileImage} alt="Profile" className="abar-av-img" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="abar-um-info">
                      <span className="abar-um-name">{currentUser?.display_name || 'Admin'}</span>
                      <span className="abar-um-email">{currentUser.email}</span>
                    </div>
                  </div>

                  <div className="abar-um-divider" />

                  {/* Profile */}
                  <button
                    type="button"
                    className="abar-dropdown-item"
                    onClick={() => { setUserMenuOpen(false); navigate('/admin/profile'); }}
                  >
                    <i className="fas fa-user-circle abar-di-icon" />
                    <span>My Profile</span>
                  </button>

                  {/* Visit Site */}
                  <button
                    type="button"
                    className="abar-dropdown-item"
                    onClick={() => { setUserMenuOpen(false); window.open("/", "_blank", "noopener,noreferrer"); }}
                  >
                    <i className="fas fa-external-link-alt abar-di-icon" />
                    <span>Visit Site</span>
                  </button>

                  {/* Dark Mode toggle */}
                  <div className="abar-dropdown-item abar-dropdown-item--toggle">
                    <i className="fas fa-moon abar-di-icon" />
                    <span>Dark Mode</span>
                    <button
                      type="button"
                      className={`abar-toggle${darkMode ? " abar-toggle--on" : ""}`}
                      onClick={(e) => { e.stopPropagation(); handleDarkModeToggle(); }}
                      aria-label="Toggle dark mode"
                    >
                      <span className="abar-toggle-thumb" />
                    </button>
                  </div>

                  <div className="abar-um-divider" />

                  {/* Logout */}
                  <button
                    type="button"
                    className="abar-dropdown-item abar-dropdown-item--danger"
                    onClick={handleLogout}
                    disabled={loggingOut}
                  >
                    <i className="fas fa-power-off abar-di-icon" />
                    <span>{loggingOut ? "Signing out…" : "Logout"}</span>
                  </button>

                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ══ MOBILE TOGGLE ══════════════════════════════════════ */}
      <button
        className="asidebar-mobile-toggle"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        <i className={`fas ${mobileOpen ? "fa-times" : "fa-bars"}`} />
      </button>

      {mobileOpen && (
        <div className="asidebar-backdrop" onClick={() => setMobileOpen(false)} />
      )}

      {/* ══ SIDEBAR ════════════════════════════════════════════ */}
      <aside
        className={`asidebar${mobileOpen ? " asidebar--open" : ""}${collapsed ? " asidebar--collapsed" : ""}`}
      >
        {/* Navigation */}
        <nav className="asidebar-nav">
          {NAV_ITEMS.map((item) =>
            item.divider ? (
              <div key={item.key} className="anav-divider" />
            ) : (
              <NavLink
                key={`${item.to}-${item.label}`}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `anav-link${isActive ? " anav-link--active" : ""}`
                }
                onClick={() => setMobileOpen(false)}
              >
                <span className="anav-icon">
                  <i className={item.icon} />
                </span>
                <span className="anav-label">{item.label}</span>
              </NavLink>
            )
          )}
        </nav>

      </aside>
    </>
  );
}
