import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { subscribeToBlogs, deleteBlog, updateBlog, getCategories, getTags, approvePendingPost, rejectPendingPost, publishScheduledPosts } from "../../firebase/blogService";
import AdminSidebar from "./components/AdminSidebar";
import { useToast } from "./components/AdminToast";
import { useAdminSettings } from "./components/useAdminSettings";
import "./Admin.css";

function slugify(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function toDateValue(ts) {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function toTimeValue(ts) {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ─── Skeleton row ─────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <tr>
      <td><div className="askel askel-line" style={{ width: 18 }} /></td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="askel askel-thumb" />
          <div>
            <div className="askel askel-line" style={{ width: 180, marginBottom: 6 }} />
            <div className="askel askel-line" style={{ width: 110 }} />
          </div>
        </div>
      </td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="askel askel-av" />
          <div className="askel askel-line" style={{ width: 64 }} />
        </div>
      </td>
      <td><div className="askel askel-line" style={{ width: 84 }} /></td>
      <td><div className="askel askel-line" style={{ width: 32 }} /></td>
      <td><div className="askel askel-line" style={{ width: 48 }} /></td>
      <td><div className="askel askel-line" style={{ width: 80 }} /></td>
      <td><div className="askel askel-line" style={{ width: 100 }} /></td>
    </tr>
  );
}

/* ─── Sort indicator ───────────────────────────────────────── */
function SortIcon({ field, sort }) {
  if (sort.field !== field) return <span className="ath-sort-neu">⇅</span>;
  return sort.dir === "asc"
    ? <span className="ath-sort-act">↑</span>
    : <span className="ath-sort-act">↓</span>;
}

/* ─── Author avatar ────────────────────────────────────────── */
function AuthorCell({ name }) {
  const initials = (name || "A").slice(0, 2).toUpperCase();
  return (
    <div className="atable-author">
      <div className="atable-author-av">{initials}</div>
      <span className="atable-author-name">{name || "Admin"}</span>
    </div>
  );
}

/* ─── Status badge ─────────────────────────────────────────── */
function StatusBadge({ blog }) {
  if (blog.published)       return <span className="abadge abadge-pub">Published</span>;
  if (blog.pendingReview)   return <span className="abadge abadge-pending">Pending Review</span>;
  if (blog.scheduledAt)     return <span className="abadge abadge-scheduled">Scheduled</span>;
  return                           <span className="abadge abadge-draft">Draft</span>;
}

export default function AdminDashboard() {
  const toast = useToast();
  const adminSettings = useAdminSettings();
  const { postsPerPage } = adminSettings;
  const defaultVisibleCols = {
    author:   adminSettings.dashboardShowAuthorColumn,
    comments: adminSettings.dashboardShowCommentsColumn,
    views:    adminSettings.dashboardShowViewsColumn,
    date:     adminSettings.dashboardShowDateColumn,
  };

  const [page, setPage]               = useState(1);
  const [blogs, setBlogs]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState(adminSettings.dashboardDefaultFilter || "all");   // all | published | draft | pending
  const [sort, setSort]               = useState({ field: "createdAt", dir: "desc" });
  const [selected, setSelected]       = useState(new Set());
  const [modal, setModal]             = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null); // blog.id | null
  const [quickEditId, setQuickEditId] = useState(null);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickCategoryOpen, setQuickCategoryOpen] = useState(false);
  const [quickTagOpen, setQuickTagOpen] = useState(false);
  const [quickNewTag, setQuickNewTag] = useState("");
  const [quickForm, setQuickForm] = useState({
    title: "",
    slug: "",
    categoryIds: [],
    status: "draft",
    date: "",
    time: "",
    tags: [],
  });
  const [allCategories, setAllCategories] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [visibleCols, setVisibleCols] = useState(defaultVisibleCols);
  const [colToggleOpen, setColToggleOpen] = useState(false);
  const dropdownRef = useRef(null);
  const quickCategoryRef = useRef(null);
  const quickTagRef = useRef(null);
  const colToggleRef = useRef(null);

  useEffect(() => {
    setFilter(adminSettings.dashboardDefaultFilter || "all");
    setVisibleCols(defaultVisibleCols);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    adminSettings.dashboardDefaultFilter,
    adminSettings.dashboardShowAuthorColumn,
    adminSettings.dashboardShowCommentsColumn,
    adminSettings.dashboardShowViewsColumn,
    adminSettings.dashboardShowDateColumn,
  ]);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    function onClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    }
    if (openDropdown !== null) {
      document.addEventListener("mousedown", onClickOutside);
    }
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openDropdown]);

  /* ── Real-time blog subscription ── */
  const loadBlogs = useCallback(() => {
    // manual refresh — just reconnect by toggling loading state
    setLoading(true);
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToBlogs((data) => {
      setBlogs(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    publishScheduledPosts().catch(console.error);
    const timer = setInterval(() => {
      publishScheduledPosts().catch(console.error);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    getCategories().then(setAllCategories).catch(() => {});
  }, []);

  useEffect(() => {
    getTags().then(setAllTags).catch(() => {});
  }, []);

  useEffect(() => {
    if (!quickCategoryOpen) return;
    function onOutside(e) {
      if (quickCategoryRef.current && !quickCategoryRef.current.contains(e.target)) {
        setQuickCategoryOpen(false);
      }
    }
    function onEsc(e) {
      if (e.key === "Escape") setQuickCategoryOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [quickCategoryOpen]);

  useEffect(() => {
    if (!quickTagOpen) return;
    function onOutside(e) {
      if (quickTagRef.current && !quickTagRef.current.contains(e.target)) {
        setQuickTagOpen(false);
      }
    }
    function onEsc(e) {
      if (e.key === "Escape") setQuickTagOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [quickTagOpen]);

  useEffect(() => {
    if (!colToggleOpen) return;
    function onOutside(e) {
      if (colToggleRef.current && !colToggleRef.current.contains(e.target)) setColToggleOpen(false);
    }
    function onEsc(e) { if (e.key === "Escape") setColToggleOpen(false); }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [colToggleOpen]);

  /* ── Derived data ── */
  const filtered = useMemo(() => {
    let list = blogs;
    if (filter === "published") list = list.filter((b) => b.published);
    if (filter === "draft")     list = list.filter((b) => !b.published && !b.pendingReview && !b.scheduledAt);
    if (filter === "pending")   list = list.filter((b) => b.pendingReview && !b.published);
    if (filter === "scheduled") list = list.filter((b) => !b.published && !b.pendingReview && b.scheduledAt);
    if (categoryFilter) {
      list = list.filter((b) =>
        (Array.isArray(b.categoryIds) && b.categoryIds.includes(categoryFilter)) ||
        b.categoryId === categoryFilter
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((b) =>
        (b.title || "").toLowerCase().includes(q) ||
        (b.subtitle || "").toLowerCase().includes(q) ||
        (b.author || "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      let va = a[sort.field], vb = b[sort.field];
      if (sort.field === "createdAt") {
        va = va?.toDate ? va.toDate() : new Date(va ?? 0);
        vb = vb?.toDate ? vb.toDate() : new Date(vb ?? 0);
      }
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sort.dir === "asc" ? -1 : 1;
      if (va > vb) return sort.dir === "asc" ?  1 : -1;
      return 0;
    });
  }, [blogs, filter, sort, categoryFilter, searchQuery]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / postsPerPage));
  const paginated   = filtered.slice((page - 1) * postsPerPage, page * postsPerPage);

  // Reset to page 1 whenever the filtered list changes
  useEffect(() => { setPage(1); }, [filter, sort, categoryFilter, searchQuery]);

  const stats = useMemo(() => ({
    total:     blogs.length,
    published: blogs.filter((b) => b.published).length,
    drafts:    blogs.filter((b) => !b.published && !b.pendingReview && !b.scheduledAt).length,
    pending:   blogs.filter((b) => b.pendingReview && !b.published).length,
    scheduled: blogs.filter((b) => !b.published && !b.pendingReview && b.scheduledAt).length,
  }), [blogs]);

  /* ── Sort toggle ── */
  function toggleSort(field) {
    setSort((s) =>
      s.field === field
        ? { field, dir: s.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "desc" }
    );
  }

  /* ── Select ── */
  const allSelected = filtered.length > 0 && filtered.every((b) => selected.has(b.id));
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(filtered.map((b) => b.id)));
  }
  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  /* ── Delete ── */
  async function confirmDelete() {
    if (!modal) return;
    if (modal.mode === "single") {
      try {
        await deleteBlog(modal.id);
        setBlogs((prev) => prev.filter((b) => b.id !== modal.id));
        setSelected((prev) => { const n = new Set(prev); n.delete(modal.id); return n; });
        toast?.addToast(`"${modal.title}" deleted.`, "success");
      } catch {
        toast?.addToast("Delete failed. Please try again.", "error");
      }
    } else {
      const ids = [...selected];
      try {
        await Promise.all(ids.map((id) => deleteBlog(id)));
        setBlogs((prev) => prev.filter((b) => !ids.includes(b.id)));
        setSelected(new Set());
        toast?.addToast(`${ids.length} post${ids.length > 1 ? "s" : ""} deleted.`, "success");
      } catch {
        toast?.addToast("Bulk delete failed.", "error");
      }
    }
    setModal(null);
  }

  async function handleBulkPublish() {
    const ids = [...selected];
    if (!ids.length) return;
    try {
      await Promise.all(ids.map((id) => updateBlog(id, { published: true, pendingReview: false, scheduledAt: null })));
      setBlogs((prev) => prev.map((b) => ids.includes(b.id) ? { ...b, published: true, pendingReview: false, scheduledAt: null } : b));
      setSelected(new Set());
      toast?.addToast(`${ids.length} post${ids.length > 1 ? "s" : ""} published.`, "success");
    } catch {
      toast?.addToast("Bulk publish failed.", "error");
    }
  }

  async function handleBulkDraft() {
    const ids = [...selected];
    if (!ids.length) return;
    try {
      await Promise.all(ids.map((id) => updateBlog(id, { published: false, pendingReview: false, scheduledAt: null })));
      setBlogs((prev) => prev.map((b) => ids.includes(b.id) ? { ...b, published: false, pendingReview: false, scheduledAt: null } : b));
      setSelected(new Set());
      toast?.addToast(`${ids.length} post${ids.length > 1 ? "s" : ""} moved to draft.`, "success");
    } catch {
      toast?.addToast("Bulk draft failed.", "error");
    }
  }

  async function handleApprove(blog) {
    setOpenDropdown(null);
    try {
      await approvePendingPost(blog.id);
      setBlogs((prev) =>
        prev.map((b) => b.id === blog.id ? { ...b, published: true, pendingReview: false, scheduledAt: null } : b)
      );
      toast?.addToast(`"${blog.title}" approved and published.`, "success");
    } catch {
      toast?.addToast("Approve failed. Please try again.", "error");
    }
  }

  async function handleReject(blog) {
    setOpenDropdown(null);
    try {
      await rejectPendingPost(blog.id);
      setBlogs((prev) =>
        prev.map((b) => b.id === blog.id ? { ...b, published: false, pendingReview: false, scheduledAt: null } : b)
      );
      toast?.addToast(`"${blog.title}" rejected and moved to draft.`, "success");
    } catch {
      toast?.addToast("Reject failed. Please try again.", "error");
    }
  }

  function formatDate(ts) {
    if (!ts) return "—";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  }

  function getCategoryLabel(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return "None";
    const names = ids
      .map((id) => allCategories.find((c) => c.id === id)?.name)
      .filter(Boolean);
    if (names.length === 0) return "None";
    if (names.length <= 2) return names.join(", ");
    return `${names[0]}, ${names[1]} +${names.length - 2}`;
  }

  function toggleQuickCategory(categoryId) {
    setQuickForm((f) => {
      const has = Array.isArray(f.categoryIds) && f.categoryIds.includes(categoryId);
      const nextIds = has
        ? f.categoryIds.filter((id) => id !== categoryId)
        : [...(f.categoryIds || []), categoryId];
      return { ...f, categoryIds: nextIds };
    });
  }

  function normalizeTagName(name) {
    return String(name || "").trim().toLowerCase();
  }

  function getTagLabel(tags) {
    if (!Array.isArray(tags) || tags.length === 0) return "None";
    if (tags.length <= 2) return tags.join(", ");
    return `${tags[0]}, ${tags[1]} +${tags.length - 2}`;
  }

  function toggleQuickTag(tagName) {
    const normalized = normalizeTagName(tagName);
    if (!normalized) return;
    setQuickForm((f) => {
      const current = Array.isArray(f.tags) ? f.tags : [];
      const has = current.some((t) => normalizeTagName(t) === normalized);
      const next = has
        ? current.filter((t) => normalizeTagName(t) !== normalized)
        : [...current, tagName];
      return { ...f, tags: next };
    });
  }

  function handleQuickAddTag() {
    const name = String(quickNewTag || "").trim();
    if (!name) return;

    const existing = allTags.find((t) => normalizeTagName(t.name) === normalizeTagName(name));
    const pick = existing?.name || name;

    setQuickForm((f) => {
      const has = (f.tags || []).some((t) => normalizeTagName(t) === normalizeTagName(pick));
      if (has) return f;
      return { ...f, tags: [...(f.tags || []), pick] };
    });
    setQuickNewTag("");
  }

  function openQuickEdit(blog) {
    setQuickCategoryOpen(false);
    setQuickTagOpen(false);
    setQuickNewTag("");
    const normalizedTags = Array.from(new Set([
      ...(Array.isArray(blog.tags)
        ? blog.tags
            .map((t) => (typeof t === "string" ? t : t?.name || ""))
            .map((t) => t.trim())
            .filter(Boolean)
        : []),
      ...(typeof blog.tags === "string"
        ? blog.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : []),
    ]));
    setQuickEditId(blog.id);
    setQuickForm({
      title: blog.title || "",
      slug: blog.slug || slugify(blog.title || ""),
      categoryIds: Array.isArray(blog.categoryIds)
        ? blog.categoryIds
        : blog.categoryId
          ? [blog.categoryId]
          : [],
      status: blog.published ? "published" : blog.pendingReview ? "pending" : blog.scheduledAt ? "scheduled" : "draft",
      date: toDateValue(blog.scheduledAt || blog.createdAt),
      time: toTimeValue(blog.scheduledAt || blog.createdAt),
      tags: normalizedTags,
    });
  }

  async function saveQuickEdit(blog) {
    if (!quickForm.title.trim()) {
      toast?.addToast("Title is required.", "error");
      return;
    }

    setQuickSaving(true);
    try {
      let scheduledAt = null;
      if (quickForm.date) {
        const dt = new Date(`${quickForm.date}T${quickForm.time || "00:00"}`);
        if (!Number.isNaN(dt.getTime())) scheduledAt = dt;
      }
      if (quickForm.status === "scheduled" && !scheduledAt) {
        toast?.addToast("Choose a date and time before scheduling.", "error");
        setQuickSaving(false);
        return;
      }

      await updateBlog(blog.id, {
        ...blog,
        title: quickForm.title.trim(),
        slug: quickForm.slug.trim() || slugify(quickForm.title),
        categoryIds: Array.isArray(quickForm.categoryIds) ? quickForm.categoryIds : [],
        tagIds: allTags
          .filter((t) => (quickForm.tags || []).some((name) => normalizeTagName(name) === normalizeTagName(t.name)))
          .map((t) => t.id),
        tags: Array.isArray(quickForm.tags) ? quickForm.tags.join(", ") : "",
        published: quickForm.status === "published",
        pendingReview: quickForm.status === "pending",
        scheduledAt: quickForm.status === "scheduled" ? scheduledAt : null,
      });
      if (quickForm.status === "scheduled") await publishScheduledPosts();

      toast?.addToast("Post updated.", "success");
      setQuickCategoryOpen(false);
      setQuickTagOpen(false);
      setQuickNewTag("");
      setQuickEditId(null);
      // onSnapshot listener auto-refreshes the table
    } catch {
      toast?.addToast("Quick update failed.", "error");
    } finally {
      setQuickSaving(false);
    }
  }

  const STAT_CARDS = [
    { key: "total",     label: "Total Posts",    icon: "fas fa-file-alt",     mod: "total",   value: stats.total },
    { key: "published", label: "Published Posts", icon: "fas fa-check-circle", mod: "pub",     value: stats.published },
    { key: "drafts",    label: "Drafts",          icon: "fas fa-edit",         mod: "draft",   value: stats.drafts },
    { key: "pending",   label: "Pending Review",  icon: "fas fa-clock",        mod: "pending", value: stats.pending },
    { key: "scheduled", label: "Scheduled",       icon: "far fa-calendar-alt", mod: "info",    value: stats.scheduled },
  ];

  const FILTER_TABS = [
    { key: "all",       label: "All Posts" },
    { key: "published", label: "Published" },
    { key: "draft",     label: "Drafts" },
    { key: "pending",   label: "Pending" },
    { key: "scheduled", label: "Scheduled" },
  ];

  const COLS = [
    { key: "author",   label: "Author" },
    { key: "comments", label: "Comments" },
    { key: "views",    label: "Views" },
    { key: "date",     label: "Date" },
  ];

  // fixed cols: checkbox + title + status + actions = 4
  const colCount = 4 + COLS.filter((c) => visibleCols[c.key]).length;

  const hasActiveFilters = searchQuery.trim() || categoryFilter;

  return (
    <div className="alayout">
      <AdminSidebar />

      <main className="amain">
        <div className="amain-inner">

          {/* ── Page header ── */}
          <div className="apage-topbar">
            <div>
              <h1 className="apage-title">Manage Blog Posts</h1>
              <p className="apage-subtitle">Create, edit, and manage all your articles</p>
            </div>
            <Link to="/admin/post/new" className="abtn abtn-primary">
              <i className="fas fa-plus" /> Add New Post
            </Link>
          </div>

          {/* ── Stat strip ── */}
          <div className="astat-strip">
            {STAT_CARDS.map((c, i) => (
              <div key={c.key} className={`astat-strip-item astat-strip-item--${c.mod}`}>
                <span className="astat-strip-value">
                  {loading
                    ? <span className="askel askel-line" style={{ width: 36, height: 26, display: "block" }} />
                    : c.value}
                </span>
                <span className="astat-strip-label">{c.label}</span>
                {i < STAT_CARDS.length - 1 && <div className="astat-strip-divider" />}
              </div>
            ))}
          </div>

          {/* ── Filter toolbar ── */}
          <div className="afilter-toolbar">
            <div className="afilter-toolbar-left">
              {/* Status tabs */}
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`afilter-tab${filter === tab.key ? " afilter-tab--active" : ""}`}
                  onClick={() => setFilter(tab.key)}
                >
                  {tab.label}
                  {tab.key !== "all" && (
                    <span className="afilter-tab-count">
                      {tab.key === "published" ? stats.published
                        : tab.key === "draft" ? stats.drafts
                        : stats.pending}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="afilter-toolbar-right">
              {/* Search */}
              <div className="afilter-search-wrap">
                <i className="fas fa-search afilter-search-icon" />
                <input
                  type="text"
                  className="afilter-search-input"
                  placeholder="Search posts…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="afilter-search-clear"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                  >
                    <i className="fas fa-times" />
                  </button>
                )}
              </div>

              {/* Category filter */}
              <div className="afilter-native-wrap">
                <select
                  className="afilter-native-select"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {allCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <i className="fas fa-chevron-down afilter-native-caret" />
              </div>

              {/* Bulk actions */}
              <div className="afilter-native-wrap">
                <select
                  className="afilter-native-select"
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    if (v === "publish")  handleBulkPublish();
                    if (v === "draft")    handleBulkDraft();
                    if (v === "delete" && selected.size > 0) setModal({ mode: "bulk" });
                  }}
                  disabled={selected.size === 0}
                  title={selected.size === 0 ? "Select posts first" : `${selected.size} post${selected.size > 1 ? "s" : ""} selected`}
                >
                  <option value="">Bulk Actions</option>
                  <option value="publish">Publish Selected</option>
                  <option value="draft">Move to Draft</option>
                  <option value="delete">Delete Selected</option>
                </select>
                <i className="fas fa-chevron-down afilter-native-caret" />
              </div>

              {/* Live indicator */}
              <span className="alive-badge" title="Data updates in real time">
                <span className="alive-dot" />
                Live
              </span>

              {/* Refresh */}
              <button className="abtn abtn-ghost abtn-sm" title="Refresh" onClick={loadBlogs}>
                <i className="fas fa-sync-alt" />
              </button>

              {/* Column toggle */}
              <div className="acol-toggle-wrap" ref={colToggleRef}>
                <button
                  className={`abtn abtn-ghost abtn-sm${colToggleOpen ? " is-active" : ""}`}
                  title="Toggle columns"
                  onClick={() => setColToggleOpen((v) => !v)}
                >
                  <i className="fas fa-columns" />
                </button>
                {colToggleOpen && (
                  <div className="acol-toggle-panel">
                    <div className="acol-toggle-title">Visible Columns</div>
                    {COLS.map((col) => (
                      <label key={col.key} className="acol-toggle-item">
                        <input
                          type="checkbox"
                          checked={visibleCols[col.key]}
                          onChange={() => setVisibleCols((prev) => ({ ...prev, [col.key]: !prev[col.key] }))}
                        />
                        <span>{col.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Active filter indicators ── */}
          {hasActiveFilters && (
            <div className="afilter-active-bar">
              {searchQuery.trim() && (
                <span className="afilter-chip">
                  <i className="fas fa-search" />
                  "{searchQuery.trim()}"
                  <button type="button" onClick={() => setSearchQuery("")}><i className="fas fa-times" /></button>
                </span>
              )}
              {categoryFilter && (
                <span className="afilter-chip">
                  <i className="fas fa-tag" />
                  {allCategories.find((c) => c.id === categoryFilter)?.name || "Category"}
                  <button type="button" onClick={() => setCategoryFilter("")}><i className="fas fa-times" /></button>
                </span>
              )}
              <button type="button" className="afilter-chip-clear" onClick={() => { setSearchQuery(""); setCategoryFilter(""); }}>
                Clear all filters
              </button>
            </div>
          )}

          {/* ── Bulk bar ── */}
          {selected.size > 0 && (
            <div className="abulk-bar">
              <span className="abulk-count">
                <i className="fas fa-check-square" style={{ marginRight: 6 }} />
                {selected.size} post{selected.size > 1 ? "s" : ""} selected
              </span>
              <div className="abulk-actions">
                <button className="abtn abtn-sm abtn-ghost" onClick={handleBulkPublish}>
                  <i className="fas fa-globe" /> Publish
                </button>
                <button className="abtn abtn-sm abtn-ghost" onClick={handleBulkDraft}>
                  <i className="fas fa-file" /> Move to Draft
                </button>
                <button className="abtn abtn-sm abtn-danger" onClick={() => setModal({ mode: "bulk" })}>
                  <i className="fas fa-trash" /> Delete
                </button>
                <button className="abtn abtn-sm abtn-ghost" onClick={() => setSelected(new Set())}>
                  <i className="fas fa-times" /> Deselect
                </button>
              </div>
            </div>
          )}

          {/* ── Table ── */}
          <div className="atable-card">
            {loading ? (
              <table className="atable">
                <thead>
                  <tr>
                    <th style={{ width: 40 }} />
                    <th>Title</th>
                    <th>Author</th>
                    <th>Status</th>
                    <th>Comments</th>
                    <th>Views</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
                </tbody>
              </table>
            ) : filtered.length === 0 ? (
              <div className="aempty">
                <div className="aempty-icon">📭</div>
                <div className="aempty-title">
                  {filter !== "all" ? "No posts match your filters" : "No posts yet"}
                </div>
                <div className="aempty-sub">
                  {filter !== "all"
                    ? "Try changing your filter."
                    : "Create your first blog post to get started."}
                </div>
                {filter === "all" && (
                  <Link to="/admin/post/new" className="abtn abtn-primary">
                    Create First Post
                  </Link>
                )}
              </div>
            ) : (
              <table className="atable">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        className="achk"
                        checked={allSelected}
                        onChange={toggleAll}
                      />
                    </th>
                    <th className="sortable" onClick={() => toggleSort("title")}>
                      Title <SortIcon field="title" sort={sort} />
                    </th>
                    {visibleCols.author && <th>Author</th>}
                    <th className="sortable" onClick={() => toggleSort("published")}>
                      Status <SortIcon field="published" sort={sort} />
                    </th>
                    {visibleCols.comments && <th>Comments</th>}
                    {visibleCols.views && <th>Views</th>}
                    {visibleCols.date && (
                      <th className="sortable" onClick={() => toggleSort("createdAt")}>
                        Date <SortIcon field="createdAt" sort={sort} />
                      </th>
                    )}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((blog) => (
                    <Fragment key={blog.id}>
                      <tr key={blog.id} className={selected.has(blog.id) ? "selected" : ""}>
                        <td>
                          <input
                            type="checkbox"
                            className="achk"
                            checked={selected.has(blog.id)}
                            onChange={() => toggleOne(blog.id)}
                          />
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {blog.image ? (
                              <img src={blog.image} alt="" className="atable-thumb" />
                            ) : (
                              <div className="atable-thumb-placeholder">
                                <i className="fas fa-image" />
                              </div>
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div className="atable-title">{blog.title}</div>
                              {blog.subtitle && (
                                <div className="atable-sub">{blog.subtitle}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        {visibleCols.author && (
                          <td><AuthorCell name={blog.author} /></td>
                        )}
                        <td>
                          <StatusBadge blog={blog} />
                        </td>
                        {visibleCols.comments && (
                          <td className="atable-num">{blog.commentCount ?? 0}</td>
                        )}
                        {visibleCols.views && (
                          <td className="atable-num">
                            {blog.views != null
                              ? blog.views >= 1000
                                ? `${(blog.views / 1000).toFixed(1)}k`
                                : blog.views
                              : 0}
                          </td>
                        )}
                        {visibleCols.date && (
                          <td style={{ fontSize: 13, color: "var(--atxt2)", whiteSpace: "nowrap" }}>
                            {formatDate(blog.createdAt)}
                          </td>
                        )}
                        <td>
                          <div
                            className="atable-actions"
                            ref={openDropdown === blog.id ? dropdownRef : null}
                            style={{ position: "relative" }}
                          >
                            {/* Split Edit button */}
                            <div className="asplit-btn">
                              <Link
                                to={`/admin/post/${blog.id}/edit`}
                                className="asplit-btn__main"
                              >
                                Edit
                              </Link>
                              <button
                                className="asplit-btn__caret"
                                title="More actions"
                                onClick={() =>
                                  setOpenDropdown((prev) => prev === blog.id ? null : blog.id)
                                }
                              >
                                <i className="fas fa-chevron-down" />
                              </button>
                            </div>

                            {/* Dropdown menu */}
                            {openDropdown === blog.id && (
                              <div className="arow-dropdown">
                                <Link
                                  to={`/admin/post/${blog.id}/edit`}
                                  className="arow-dropdown__item"
                                  onClick={() => setOpenDropdown(null)}
                                >
                                  <i className="fas fa-pen arow-dropdown__icon" />
                                  Edit
                                </Link>
                                <button
                                  className="arow-dropdown__item"
                                  onClick={() => {
                                    setOpenDropdown(null);
                                    openQuickEdit(blog);
                                  }}
                                >
                                  <i className="far fa-edit arow-dropdown__icon" />
                                  Quick Edit
                                </button>
                                {blog.published && blog.slug ? (
                                  <a
                                    href={`/#/blogs/${blog.slug}`}
                                    className="arow-dropdown__item"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setOpenDropdown(null)}
                                  >
                                    <i className="fas fa-eye arow-dropdown__icon" />
                                    View
                                  </a>
                                ) : (
                                  <span className="arow-dropdown__item arow-dropdown__item--disabled">
                                    <i className="fas fa-eye arow-dropdown__icon" />
                                    View
                                  </span>
                                )}
                                {blog.pendingReview && !blog.published && (
                                  <>
                                    <button
                                      className="arow-dropdown__item arow-dropdown__item--approve"
                                      onClick={() => handleApprove(blog)}
                                    >
                                      <i className="fas fa-check arow-dropdown__icon" />
                                      Approve
                                    </button>
                                    <button
                                      className="arow-dropdown__item arow-dropdown__item--reject"
                                      onClick={() => handleReject(blog)}
                                    >
                                      <i className="fas fa-times arow-dropdown__icon" />
                                      Reject
                                    </button>
                                  </>
                                )}
                                <button
                                  className="arow-dropdown__item arow-dropdown__item--danger"
                                  onClick={() => {
                                    setOpenDropdown(null);
                                    setModal({ mode: "single", id: blog.id, title: blog.title });
                                  }}
                                >
                                  <i className="fas fa-trash arow-dropdown__icon" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>

                      {quickEditId === blog.id && (
                        <tr className="aquick-row">
                          <td colSpan={colCount}>
                            <div className="aquick-panel">
                              <div className="aquick-grid">
                                <label className="aquick-field">
                                  <span>Title</span>
                                  <input
                                    className="ainput"
                                    value={quickForm.title}
                                    onChange={(e) => setQuickForm((f) => ({ ...f, title: e.target.value }))}
                                  />
                                </label>

                                <label className="aquick-field">
                                  <span>Slug</span>
                                  <input
                                    className="ainput"
                                    value={quickForm.slug}
                                    onChange={(e) => setQuickForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                                  />
                                </label>

                                <label className="aquick-field">
                                  <span>Category</span>
                                  <div className="aquick-cat-select" ref={quickCategoryRef}>
                                    <button
                                      type="button"
                                      className={`ainput aquick-cat-trigger${quickCategoryOpen ? " is-open" : ""}`}
                                      onClick={() => setQuickCategoryOpen((v) => !v)}
                                    >
                                      <span>{getCategoryLabel(quickForm.categoryIds)}</span>
                                      <i className={`fas fa-chevron-${quickCategoryOpen ? "up" : "down"}`} />
                                    </button>

                                    {quickCategoryOpen && (
                                      <div className="aquick-cat-menu">
                                        <button
                                          type="button"
                                          className={`aquick-cat-option aquick-cat-option--clear${!quickForm.categoryIds?.length ? " is-active" : ""}`}
                                          onClick={() => {
                                            setQuickForm((f) => ({ ...f, categoryIds: [] }));
                                          }}
                                        >
                                          <span className="aquick-cat-option-main">
                                            <i className="fas fa-times-circle" aria-hidden="true" />
                                            <span>Clear all categories</span>
                                          </span>
                                          {!quickForm.categoryIds?.length && (
                                            <span className="aquick-cat-selected-mark">
                                              <i className="fas fa-check" />
                                              Active
                                            </span>
                                          )}
                                        </button>
                                        {allCategories.map((cat) => (
                                          <button
                                            key={cat.id}
                                            type="button"
                                            className={`aquick-cat-option${quickForm.categoryIds?.includes(cat.id) ? " is-active" : ""}`}
                                            onClick={() => {
                                              toggleQuickCategory(cat.id);
                                            }}
                                          >
                                            <span className="aquick-cat-option-main">
                                              <input
                                                type="checkbox"
                                                className="aquick-cat-checkbox"
                                                checked={quickForm.categoryIds?.includes(cat.id)}
                                                readOnly
                                                tabIndex={-1}
                                              />
                                              <span>{cat.name}</span>
                                            </span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </label>

                                <label className="aquick-field">
                                  <span>Status</span>
                                  <select
                                    className="ainput"
                                    value={quickForm.status}
                                    onChange={(e) => setQuickForm((f) => ({ ...f, status: e.target.value }))}
                                  >
                                    <option value="published">Published</option>
                                    <option value="scheduled">Scheduled</option>
                                    <option value="draft">Draft</option>
                                    <option value="pending">Pending Review</option>
                                  </select>
                                </label>

                                <label className="aquick-field">
                                  <span>Date</span>
                                  <input
                                    type="date"
                                    className="ainput"
                                    value={quickForm.date}
                                    onChange={(e) => setQuickForm((f) => ({ ...f, date: e.target.value }))}
                                  />
                                </label>

                                <label className="aquick-field">
                                  <span>Time</span>
                                  <input
                                    type="time"
                                    className="ainput"
                                    value={quickForm.time}
                                    onChange={(e) => setQuickForm((f) => ({ ...f, time: e.target.value }))}
                                  />
                                </label>

                                <label className="aquick-field aquick-field--wide">
                                  <span>Tags</span>
                                  <div className="aquick-cat-select aquick-tag-select" ref={quickTagRef}>
                                    <button
                                      type="button"
                                      className={`ainput aquick-cat-trigger${quickTagOpen ? " is-open" : ""}`}
                                      onClick={() => setQuickTagOpen((v) => !v)}
                                    >
                                      <span>{getTagLabel(quickForm.tags)}</span>
                                      <i className={`fas fa-chevron-${quickTagOpen ? "up" : "down"}`} />
                                    </button>

                                    {quickTagOpen && (
                                      <div className="aquick-cat-menu">
                                        <button
                                          type="button"
                                          className={`aquick-cat-option aquick-cat-option--clear${!quickForm.tags?.length ? " is-active" : ""}`}
                                          onClick={() => setQuickForm((f) => ({ ...f, tags: [] }))}
                                        >
                                          <span className="aquick-cat-option-main">
                                            <i className="fas fa-times-circle" aria-hidden="true" />
                                            <span>Clear all tags</span>
                                          </span>
                                          {!quickForm.tags?.length && (
                                            <span className="aquick-cat-selected-mark">
                                              <i className="fas fa-check" />
                                              Active
                                            </span>
                                          )}
                                        </button>
                                        {allTags.map((tag) => (
                                          <button
                                            key={tag.id}
                                            type="button"
                                            className={`aquick-cat-option${quickForm.tags?.some((t) => normalizeTagName(t) === normalizeTagName(tag.name)) ? " is-active" : ""}`}
                                            onClick={() => toggleQuickTag(tag.name)}
                                          >
                                            <span className="aquick-cat-option-main">
                                              <input
                                                type="checkbox"
                                                className="aquick-cat-checkbox"
                                                checked={quickForm.tags?.some((t) => normalizeTagName(t) === normalizeTagName(tag.name))}
                                                readOnly
                                                tabIndex={-1}
                                              />
                                              <span>{tag.name}</span>
                                            </span>
                                          </button>
                                        ))}

                                        <div className="aquick-tag-add-row">
                                          <input
                                            className="ainput"
                                            placeholder="Add new tag"
                                            value={quickNewTag}
                                            onChange={(e) => setQuickNewTag(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleQuickAddTag();
                                              }
                                            }}
                                          />
                                          <button
                                            type="button"
                                            className="abtn abtn-primary abtn-sm"
                                            onClick={handleQuickAddTag}
                                            disabled={!quickNewTag.trim()}
                                          >
                                            Add
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </label>
                              </div>

                              <div className="aquick-actions">
                                <button
                                  type="button"
                                  className="abtn abtn-primary"
                                  onClick={() => saveQuickEdit(blog)}
                                  disabled={quickSaving}
                                >
                                  {quickSaving
                                    ? <><span className="aspin" style={{ borderTopColor: "#fff" }} /> Updating…</>
                                    : "Update"}
                                </button>
                                <button
                                  type="button"
                                  className="abtn abtn-ghost"
                                  onClick={() => {
                                    setQuickCategoryOpen(false);
                                    setQuickTagOpen(false);
                                    setQuickNewTag("");
                                    setQuickEditId(null);
                                  }}
                                  disabled={quickSaving}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Footer hint ── */}
          {!loading && (
            <p className="atable-footer-hint">
              {filtered.length === 0
                ? "No posts match your filters."
                : <>
                    Showing {Math.min((page - 1) * postsPerPage + 1, filtered.length)}–{Math.min(page * postsPerPage, filtered.length)} of {filtered.length} post{filtered.length === 1 ? "" : "s"}
                    {(filter !== "all" || hasActiveFilters) && (
                      <> · <button type="button" className="atable-footer-clear" onClick={() => { setFilter("all"); setSearchQuery(""); setCategoryFilter(""); }}>Clear filters</button></>
                    )}
                  </>
              }
            </p>
          )}

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="atable-pagination">
              <button
                className="apag-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <i className="fas fa-chevron-left" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`apag-btn${p === page ? " apag-btn--active" : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="apag-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <i className="fas fa-chevron-right" />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ── Confirm modal ── */}
      {modal && (
        <div className="adel-overlay" onClick={() => setModal(null)}>
          <div className="adel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adel-icon-wrap">
              <div className="adel-icon-ring" />
              <div className="adel-icon"><i className="fas fa-trash-alt" /></div>
            </div>
            <h3 className="adel-title">
              {modal.mode === "bulk" ? `Delete ${selected.size} posts?` : `Delete "${modal.title}"?`}
            </h3>
            <p className="adel-msg">
              {modal.mode === "bulk"
                ? `This will permanently delete ${selected.size} selected post${selected.size > 1 ? "s" : ""}. This cannot be undone.`
                : "This post will be permanently deleted. This cannot be undone."}
            </p>
            <div className="adel-actions">
              <button className="adel-btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className="adel-btn-confirm" onClick={confirmDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
