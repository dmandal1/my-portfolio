import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { subscribeToBlogs, deleteBlog, publishScheduledPosts, updateBlog, getCategories, getTags, subscribeToRecentComments, deleteComment, addComment } from "../../firebase/blogService";
import { greeting } from "../../portfolio";
import AdminSidebar from "./components/AdminSidebar";
import { useAdminSettings } from "./components/AdminSettingsContext";
import { useToast } from "./components/AdminToast";
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

/* ── Avatar color — deterministic per author name ───────────── */
const AV_PALETTE = [
  "#e53935","#8e24aa","#1e88e5","#43a047",
  "#fb8c00","#00acc1","#f4511e","#6d4c41",
];
function avatarColor(name) {
  if (!name) return "#1565c0";
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AV_PALETTE[Math.abs(h) % AV_PALETTE.length];
}


/* ── Status badge ───────────────────────────────────────────── */
function StatusBadge({ blog }) {
  if (blog.published)     return <span className="abadge abadge-pub">Published</span>;
  if (blog.pendingReview) return <span className="abadge abadge-pending">Pending Review</span>;
  if (blog.scheduledAt)   return <span className="abadge abadge-scheduled">Scheduled</span>;
  return                         <span className="abadge abadge-draft">Draft</span>;
}

/* ── Skeleton row ───────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <tr>
      <td><div className="askel askel-line" style={{ width: 200 }} /></td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="askel askel-av" />
          <div className="askel askel-line" style={{ width: 64 }} />
        </div>
      </td>
      <td><div className="askel askel-line" style={{ width: 76 }} /></td>
      <td><div className="askel askel-line" style={{ width: 24 }} /></td>
      <td><div className="askel askel-line" style={{ width: 44 }} /></td>
      <td><div className="askel askel-line" style={{ width: 80 }} /></td>
      <td><div className="askel askel-line" style={{ width: 28 }} /></td>
    </tr>
  );
}

/* ── Edit actions cell ──────────────────────────────────────── */
function EditActions({ blog, onDelete, onQuickEdit }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  return (
    <div className="ahome-edit-actions" ref={ref}>
      {/* Split Edit button */}
      <div className="ahome-edit-split">
        <Link to={`/admin/post/${blog.id}/edit`} className="ahome-edit-btn">
          Edit
        </Link>
        <button
          type="button"
          className="ahome-edit-caret"
          onClick={() => setOpen((v) => !v)}
          aria-label="More edit options"
        >
          <i className="fas fa-chevron-down" />
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="ahome-edit-dropdown">
          <button
            className="ahome-edit-dd-item"
            onClick={() => { navigate(`/admin/post/${blog.id}/edit`); setOpen(false); }}
          >
            <i className="fas fa-pen" /> Edit
          </button>
          <button
            className="ahome-edit-dd-item"
            onClick={() => { onQuickEdit(blog); setOpen(false); }}
          >
            <i className="far fa-edit" /> Quick Edit
          </button>
          {blog.published && blog.slug ? (
            <a
              href={`/#/blogs/${blog.slug}`}
              className="ahome-edit-dd-item"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              <i className="fas fa-eye" /> View
            </a>
          ) : (
            <span className="ahome-edit-dd-item ahome-edit-dd-item--disabled">
              <i className="fas fa-eye" /> View
            </span>
          )}
          <div className="ahome-edit-dd-divider" />
          <button
            className="ahome-edit-dd-item ahome-edit-dd-item--danger"
            onClick={() => { setOpen(false); onDelete(blog); }}
          >
            <i className="fas fa-trash" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminHome() {
  const toast = useToast();
  const adminSettings = useAdminSettings();
  const [blogs, setBlogs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // { id, title }
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
  const quickCategoryRef = useRef(null);
  const quickTagRef = useRef(null);

  const [recentComments, setRecentComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentDeleteModal, setCommentDeleteModal] = useState(null); // { blogId, commentId, name }
  const [replyModal, setReplyModal] = useState(null); // { blogId, commentId, name }
  const [replyText, setReplyText] = useState("");
  const [replyPosting, setReplyPosting] = useState(false);

  const authorName = greeting.logo_name || "Author";


  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToBlogs((data) => {
      setBlogs(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    getCategories().then(setAllCategories).catch(() => {});
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

  /* ── Auto-publish any scheduled posts that are now due ── */
  useEffect(() => {
    publishScheduledPosts().catch(console.error);
    const timer = setInterval(() => {
      publishScheduledPosts().catch(console.error);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  /* ── Real-time recent comments ── */
  useEffect(() => {
    if (!adminSettings.dashboardShowRecentComments) {
      setRecentComments([]);
      setCommentsLoading(false);
      return undefined;
    }
    setCommentsLoading(true);
    const unsub = subscribeToRecentComments(
      (data) => {
        setRecentComments(data);
        setCommentsLoading(false);
      },
      () => {
        // index still building or permissions error — fall back to empty
        setRecentComments([]);
        setCommentsLoading(false);
      },
      adminSettings.dashboardRecentCommentsCount
    );
    return () => unsub();
  }, [adminSettings.dashboardRecentCommentsCount, adminSettings.dashboardShowRecentComments]);

  async function confirmDeleteComment() {
    if (!commentDeleteModal) return;
    try {
      await deleteComment(commentDeleteModal.blogId, commentDeleteModal.commentId);
      toast?.addToast("Comment deleted.", "success");
    } catch {
      toast?.addToast("Failed to delete comment.", "error");
    } finally {
      setCommentDeleteModal(null);
    }
  }

  async function handleReply(e) {
    e.preventDefault();
    if (!replyText.trim() || !replyModal) return;
    setReplyPosting(true);
    try {
      await addComment(replyModal.blogId, {
        name: authorName,
        message: replyText.trim(),
        parentId: replyModal.commentId,
        isAuthorReply: true,
      });
      setReplyText("");
      setReplyModal(null);
      toast?.addToast("Reply posted!", "success");
    } catch {
      toast?.addToast("Failed to post reply.", "error");
    } finally {
      setReplyPosting(false);
    }
  }

  async function confirmDelete() {
    if (!modal) return;
    try {
      await deleteBlog(modal.id);
      setBlogs((prev) => prev.filter((b) => b.id !== modal.id));
      toast?.addToast(`"${modal.title}" deleted.`, "success");
    } catch {
      toast?.addToast("Delete failed. Please try again.", "error");
    }
    setModal(null);
  }

  const stats = useMemo(() => ({
    totalPosts:  blogs.length,
    published:   blogs.filter((b) => b.published).length,
    draft:       blogs.filter((b) => !b.published && !b.pendingReview && !b.scheduledAt).length,
    pending:     blogs.filter((b) => b.pendingReview && !b.published).length,
    scheduled:   blogs.filter((b) => !b.published && !b.pendingReview && b.scheduledAt).length,
    totalViews:  blogs.reduce((sum, b) => sum + (b.views ?? 0), 0),
    comments:    recentComments.length,
  }), [blogs, recentComments]);

  const recentPosts = useMemo(
    () => blogs.slice(0, adminSettings.dashboardRecentPostsCount),
    [blogs, adminSettings.dashboardRecentPostsCount],
  );

  function formatDate(ts) {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
      // onSnapshot listener auto-refreshes
    } catch {
      toast?.addToast("Quick update failed.", "error");
    } finally {
      setQuickSaving(false);
    }
  }

  return (
    <div className="alayout">
      <AdminSidebar />

      <main className="amain">
        <div className="amain-inner">

          {/* ── Page heading ── */}
          <h1 className="ahome-page-title">Dashboard</h1>

          {/* ══ Stat bar ══════════════════════════════════════════ */}
          <div className="ahome-statbar">
            {[
              { label: "Total Posts",    value: stats.totalPosts,  live: true, tone: "default" },
              { label: "Published",      value: stats.published,   live: true, tone: "success" },
              { label: "Draft",          value: stats.draft,       live: true, tone: "warning" },
              { label: "Pending Review", value: stats.pending,     live: true, tone: "pending" },
              { label: "Scheduled",      value: stats.scheduled,   live: true, tone: "accent" },
              { label: "Total Views",    value: Number(stats.totalViews).toLocaleString("en-IN"), live: true, tone: "accent" },
              { label: "Comments",       value: stats.comments,    tone: "default" },
            ].map((s) => (
              <div key={s.label} className="ahome-statbar-item">
                <span className="ahome-statbar-label">{s.label}</span>
                <span className={`ahome-statbar-value ahome-statbar-value--${s.tone}`}>
                  {s.live && loading
                    ? <span className="askel askel-line" style={{ width: 40, height: 28, display: "block" }} />
                    : s.value}
                </span>
              </div>
            ))}
          </div>

          {/* ══ Recent Posts ══════════════════════════════════════ */}
          <div className="ahome-widget">
            <div className="ahome-widget-header">
              <h2 className="ahome-widget-title">Recent Posts</h2>
              <Link to="/admin/post/new" className="abtn abtn-primary">
                <i className="fas fa-plus" /> Add New Post
              </Link>
            </div>

            <table className="atable ahome-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Status</th>
                  <th>Comments</th>
                  <th>Views</th>
                  <th>Date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading
                  ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                  : recentPosts.length === 0
                    ? (
                      <tr>
                        <td colSpan={7}>
                          <div className="aempty" style={{ padding: "28px 24px" }}>
                            <div className="aempty-icon">📭</div>
                            <div className="aempty-title">No posts yet</div>
                          </div>
                        </td>
                      </tr>
                    )
                    : recentPosts.map((blog) => {
                      const authorName  = blog.author || "Admin";
                      const authorColor = avatarColor(authorName);
                      return (
                        <Fragment key={blog.id}>
                          <tr>
                            <td>
                              <span className="ahome-post-title">{blog.title}</span>
                            </td>
                            <td>
                              <div className="atable-author">
                                <div
                                  className="atable-author-av"
                                  style={{ background: authorColor }}
                                >
                                  {authorName.slice(0, 1).toUpperCase()}
                                </div>
                                <span className="atable-author-name">{authorName}</span>
                              </div>
                            </td>
                            <td><StatusBadge blog={blog} /></td>
                            <td className="atable-num">{blog.commentCount ?? 0}</td>
                            <td className="atable-num">
                              {blog.views != null
                                ? blog.views >= 1000
                                  ? `${(blog.views / 1000).toFixed(1)}k`
                                  : blog.views
                                : 0}
                            </td>
                            <td className="ahome-cell-date">{formatDate(blog.createdAt)}</td>
                            <td>
                              <EditActions
                                blog={blog}
                                onQuickEdit={openQuickEdit}
                                onDelete={(b) => setModal({ id: b.id, title: b.title })}
                              />
                            </td>
                          </tr>

                          {quickEditId === blog.id && (
                            <tr className="aquick-row">
                              <td colSpan={7}>
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
                      );
                    })}
              </tbody>
            </table>
          </div>

          {/* ══ Bottom row ════════════════════════════════════════ */}
          {adminSettings.dashboardShowRecentComments && (
          <div className="ahome-bottom-row">

            {/* Recent Comments */}
            <div className="ahome-widget ahome-widget--comments">
              <div className="ahome-widget-header">
                <h2 className="ahome-widget-title">Recent Comments</h2>
              </div>

              <div className="ahome-comments">
                {commentsLoading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="ahome-comment">
                      <div className="askel askel-av" />
                      <div className="ahome-comment-body" style={{ flex: 1 }}>
                        <div className="askel askel-line" style={{ width: "60%", marginBottom: 6 }} />
                        <div className="askel askel-line" style={{ width: "90%" }} />
                      </div>
                    </div>
                  ))
                ) : recentComments.length === 0 ? (
                  <p className="ahome-comments-empty">No comments yet.</p>
                ) : (
                  recentComments.map((c) => {
                    const blog = blogs.find((b) => b.id === c.blogId);
                    const blogTitle = blog?.title || "a post";
                    const blogSlug = blog?.slug || c.blogId;
                    const initials = (c.name || "A").slice(0, 2).toUpperCase();
                    const color = avatarColor(c.name);
                    const date = c.createdAt
                      ? (c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt))
                          .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "—";
                    return (
                      <div key={c.id} className="ahome-comment">
                        <div className="ahome-comment-av" style={{ background: color }}>
                          {initials}
                        </div>
                        <div className="ahome-comment-body">
                          <p className="ahome-comment-meta">
                            <span className="ahome-comment-name">{c.name || "Anonymous"}</span>
                            {" "}
                            <span className="ahome-comment-action">commented on</span>
                            {" "}
                            <span className="ahome-comment-postlink">{blogTitle}</span>
                          </p>
                          <p className="ahome-comment-text">{c.message}</p>
                        </div>
                        <div className="ahome-comment-right">
                          <span className="ahome-comment-date">{date}</span>
                          <div className="ahome-comment-actions">
                            <button
                              className="ahome-cact-btn ahome-cact-reply"
                              title="Reply to comment"
                              onClick={() => { setReplyModal({ blogId: c.blogId, commentId: c.id, name: c.name, message: c.message }); setReplyText(""); }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                            </button>
                            <button
                              className="ahome-cact-btn ahome-cact-view"
                              title="View post"
                              onClick={() => {
                                const base = window.location.href.replace(/#.*$/, "");
                                window.open(`${base}#/blogs/${blogSlug}`, "_blank", "noopener");
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                            <button
                              className="ahome-cact-btn ahome-cact-delete"
                              title="Delete comment"
                              onClick={() => setCommentDeleteModal({ blogId: c.blogId, commentId: c.id, name: c.name })}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
          )}
        </div>
      </main>

      {/* ── Confirm delete post modal ── */}
      {modal && (
        <div className="adel-overlay" onClick={() => setModal(null)}>
          <div className="adel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adel-icon-wrap">
              <div className="adel-icon-ring" />
              <div className="adel-icon"><i className="fas fa-trash-alt" /></div>
            </div>
            <h3 className="adel-title">Delete "{modal.title}"?</h3>
            <p className="adel-msg">This post will be permanently deleted. This cannot be undone.</p>
            <div className="adel-actions">
              <button className="adel-btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className="adel-btn-confirm" onClick={confirmDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reply to comment modal ── */}
      {replyModal && (
        <div className="adel-overlay" onClick={() => setReplyModal(null)}>
          <div className="areply-modal" onClick={(e) => e.stopPropagation()}>
            <div className="areply-modal-header">
              <div className="areply-modal-icon">
                <i className="fas fa-reply" />
              </div>
              <div>
                <h3 className="areply-modal-title">Reply as {authorName}</h3>
                <p className="areply-modal-context">Replying to <strong>{replyModal.name}</strong></p>
              </div>
              <button className="areply-modal-close" onClick={() => setReplyModal(null)} aria-label="Close">
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="areply-modal-quote">
              <p>{replyModal.message}</p>
            </div>
            <form onSubmit={handleReply}>
              <textarea
                className="areply-modal-textarea"
                placeholder={`Write a reply to ${replyModal.name}…`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
                autoFocus
              />
              <div className="areply-modal-actions">
                <button type="button" className="adel-btn-cancel" onClick={() => setReplyModal(null)}>Cancel</button>
                <button type="submit" className="areply-modal-submit" disabled={replyPosting || !replyText.trim()}>
                  {replyPosting ? <><i className="fas fa-spinner fa-spin" /> Posting…</> : <><i className="fas fa-paper-plane" /> Post Reply</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm delete comment modal ── */}
      {commentDeleteModal && (
        <div className="adel-overlay" onClick={() => setCommentDeleteModal(null)}>
          <div className="adel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adel-icon-wrap">
              <div className="adel-icon-ring" />
              <div className="adel-icon"><i className="fas fa-trash-alt" /></div>
            </div>
            <h3 className="adel-title">Delete comment?</h3>
            <p className="adel-msg">
              Remove {commentDeleteModal.name ? `"${commentDeleteModal.name}"` : "this"}'s comment permanently?
            </p>
            <div className="adel-actions">
              <button className="adel-btn-cancel" onClick={() => setCommentDeleteModal(null)}>Cancel</button>
              <button className="adel-btn-confirm" onClick={confirmDeleteComment}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
