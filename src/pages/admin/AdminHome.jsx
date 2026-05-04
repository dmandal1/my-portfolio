import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { 
  subscribeToBlogs, 
  deleteBlog, 
  publishScheduledPosts, 
  updateBlog, 
  getCategories, 
  getTags, 
  subscribeToRecentComments, 
  deleteComment, 
  addComment,
  approvePendingPost,
  rejectPendingPost,
  getAuditLogs,
  downloadDatabaseBackup,
  getNewsletterSubscribers
} from "../../api/apiService";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import AdminSidebar from "./components/AdminSidebar";
import { useAdminSettings } from "./components/useAdminSettings";
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AdminHome() {
  const toast = useToast();
  const adminSettings = useAdminSettings();
  const { profile } = usePortfolioData();
  const [blogs, setBlogs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // { id, title }
  const [trafficRange, setTrafficRange] = useState(7); // 7 | 30 | 90
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
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [subscriberCount, setSubscriberCount] = useState(null);

  const authorName = profile?.logo_name || profile?.title || "Author";


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

  useEffect(() => {
    async function loadActivity() {
      setActivityLoading(true);
      try {
      const logsData = await getAuditLogs('', 10, 0);
      setActivity(logsData.logs || []);
    } catch {
      console.error("Failed to load activity feed");
    } finally {
      setActivityLoading(false);
    }
  }
    loadActivity();
  }, []);

  // Fetch real subscriber count from newsletter API
  useEffect(() => {
    let cancelled = false;
    getNewsletterSubscribers()
      .then(data => { if (!cancelled) setSubscriberCount(Array.isArray(data) ? data.length : 0); })
      .catch(() => { if (!cancelled) setSubscriberCount(0); });
    return () => { cancelled = true; };
  }, []);

  const handleQuickBackup = async () => {
    try {
      await downloadDatabaseBackup();
      toast?.addToast("Backup started successfully", "success");
    } catch {
      toast?.addToast("Backup failed", "error");
    }
  };

  function getActivityIcon(action) {
    if (action.includes("backup")) return "fas fa-database";
    if (action.includes("delete") || action.includes("truncate")) return "fas fa-trash-alt";
    if (action.includes("newsletter")) return "fas fa-paper-plane";
    if (action.includes("update") || action.includes("edit")) return "fas fa-edit";
    return "fas fa-info-circle";
  }

  function getActivityColor(action) {
    if (action.includes("delete") || action.includes("truncate")) return "ahome-activity-dot--danger";
    if (action.includes("newsletter") || action.includes("publish")) return "ahome-activity-dot--success";
    if (action.includes("update")) return "ahome-activity-dot--warning";
    return "";
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

  // ── Real traffic analytics derived entirely from live blog data ──
  const trafficData = useMemo(() => {
    const now = new Date();
    const MS_DAY = 86400000;

    const totalViews    = blogs.reduce((s, b) => s + (b.views || 0), 0);
    const totalComments = blogs.reduce((s, b) => s + (b.commentsCount || 0), 0);
    const published     = blogs.filter(b => b.published).length;
    const draft         = blogs.filter(b => !b.published && !b.pendingReview && !b.scheduledAt).length;
    const pending       = blogs.filter(b => b.pendingReview && !b.published).length;
    const scheduled     = blogs.filter(b => !b.published && !b.pendingReview && b.scheduledAt).length;

    // Avg views per published post
    const avgViewsPerPost = published > 0 ? Math.round(totalViews / published) : 0;
    // Engagement rate = comments per 100 views
    const engRate = totalViews > 0 ? Math.min(100, +((totalComments / totalViews) * 100).toFixed(1)) : 0;
    // Peak post
    const peakPost = [...blogs].sort((a, b) => (b.views || 0) - (a.views || 0))[0] || null;

    // Compute views/comments bucketed by blog creation date
    function getTrend(range) {
      let labels, vBuckets, cBuckets, pBuckets;

      if (range === 7) {
        labels   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
        vBuckets = new Array(7).fill(0);
        cBuckets = new Array(7).fill(0);
        pBuckets = new Array(7).fill(0);
        blogs.forEach(b => {
          const d   = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          const age = (now - d) / MS_DAY;
          if (age <= 7) {
            const dow = d.getDay(); // 0=Sun
            const idx = dow === 0 ? 6 : dow - 1;
            vBuckets[idx] += b.views || 0;
            cBuckets[idx] += b.commentsCount || 0;
            pBuckets[idx]++;
          }
        });
      } else if (range === 30) {
        labels   = ['Week 1','Week 2','Week 3','Week 4'];
        vBuckets = new Array(4).fill(0);
        cBuckets = new Array(4).fill(0);
        pBuckets = new Array(4).fill(0);
        blogs.forEach(b => {
          const d   = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          const age = (now - d) / MS_DAY;
          if (age <= 30) {
            const wk  = Math.min(3, Math.floor(age / 7));
            const idx = 3 - wk; // most-recent week = W4 (idx 3)
            vBuckets[idx] += b.views || 0;
            cBuckets[idx] += b.commentsCount || 0;
            pBuckets[idx]++;
          }
        });
      } else {
        const months = Array.from({ length: 3 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (2 - i), 1);
          return { label: d.toLocaleDateString('en-US', { month: 'short' }), month: d.getMonth(), year: d.getFullYear(), v: 0, c: 0, p: 0 };
        });
        blogs.forEach(b => {
          const d   = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          const bkt = months.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
          if (bkt) { bkt.v += b.views || 0; bkt.c += b.commentsCount || 0; bkt.p++; }
        });
        labels   = months.map(m => m.label);
        vBuckets = months.map(m => m.v);
        cBuckets = months.map(m => m.c);
        pBuckets = months.map(m => m.p);
      }
      return { labels, vBuckets, cBuckets, pBuckets };
    }

    // Top posts
    const top5Views    = [...blogs].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
    const top5Comments = [...blogs].sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0)).slice(0, 5);

    // Category → views (from blog categoryIds)
    const catMap = {};
    blogs.forEach(b => {
      const ids = Array.isArray(b.categoryIds) ? b.categoryIds : (b.categoryId ? [b.categoryId] : []);
      ids.forEach(id => { catMap[id] = (catMap[id] || 0) + (b.views || 0); });
    });

    // Post status doughnut data (real)
    const statusData = [published, draft, pending, scheduled];

    // Recent published posts (sorted by creation date)
    const recentPublished = [...blogs]
      .filter(b => b.published)
      .sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const db = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return db - da;
      })
      .slice(0, 6);

    return { totalViews, totalComments, avgViewsPerPost, engRate, peakPost,
             published, draft, pending, scheduled, statusData,
             getTrend, top5Views, top5Comments, catMap, recentPublished };
  }, [blogs]);


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
          <div className="ahome-stat-grid">
            <div className="ahome-stat-card ahome-stat-card--primary">
              <div className="ahome-stat-icon"><i className="fas fa-eye" /></div>
              <div className="ahome-stat-info">
                <h3>Total Views</h3>
                <div className="ahome-stat-value">
                  {loading ? "..." : Number(stats.totalViews).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="ahome-stat-card ahome-stat-card--success">
              <div className="ahome-stat-icon"><i className="fas fa-check-circle" /></div>
              <div className="ahome-stat-info">
                <h3>Published</h3>
                <div className="ahome-stat-value">{loading ? "..." : stats.published}</div>
              </div>
            </div>
            <div className="ahome-stat-card ahome-stat-card--warning">
              <div className="ahome-stat-icon"><i className="fas fa-clock" /></div>
              <div className="ahome-stat-info">
                <h3>Pending</h3>
                <div className="ahome-stat-value">{loading ? "..." : stats.pending}</div>
              </div>
            </div>
            <div className="ahome-stat-card ahome-stat-card--info">
              <div className="ahome-stat-icon"><i className="fas fa-users" /></div>
              <div className="ahome-stat-info">
                <h3>Subscribers</h3>
                <div className="ahome-stat-value">
                  {loading || subscriberCount === null ? '...' : subscriberCount}
                </div>
              </div>
            </div>
          </div>

          {/* ══ Traffic Overview ══════════════════════════════════ */}
          {(() => {
            const td = trafficData;
            const trend = td.getTrend(trafficRange);
            const CHART_TOOLTIP = { backgroundColor:'rgba(15,23,42,0.92)', titleColor:'#fff', bodyColor:'#cbd5e1', borderColor:'rgba(255,255,255,0.1)', borderWidth:1, padding:10, cornerRadius:8 };
            const CHART_Y = { beginAtZero:true, grid:{ color:'rgba(100,116,139,0.08)' }, ticks:{ color:'#94a3b8', font:{ size:11 } } };
            const CHART_X = { grid:{ display:false }, ticks:{ color:'#94a3b8', font:{ size:11 } } };

            // Category views sorted
            const catEntries = Object.entries(td.catMap)
              .map(([id, v]) => ({ name: allCategories.find(c => c.id === id)?.name || 'Uncategorised', views: v }))
              .sort((a, b) => b.views - a.views)
              .slice(0, 5);

            const BAR_COLORS = ['rgba(59,130,246,0.85)','rgba(16,185,129,0.85)','rgba(245,158,11,0.85)','rgba(139,92,246,0.85)','rgba(236,72,153,0.85)'];

            return (
              <div className="ahome-traffic-overview">
                {/* Header */}
                <div className="ahome-traffic-header">
                  <div>
                    <h2 className="ahome-widget-title" style={{ marginBottom: 2 }}>Traffic Overview</h2>
                    <p style={{ fontSize: 12, color: 'var(--atxt2)', margin: 0 }}>Computed from live post &amp; comment data</p>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span className="abadge abadge-pub" style={{ fontSize:11 }}>Live Data</span>
                    <div className="ahome-traffic-range-tabs">
                      {[7, 30, 90].map(r => (
                        <button key={r} className={`ahome-traffic-range-btn${trafficRange === r ? ' active' : ''}`} onClick={() => setTrafficRange(r)}>{r}d</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* KPI mini-cards — all real */}
                <div className="ahome-traffic-kpis">
                  {[
                    { icon:'fas fa-eye',       c:'#3b82f6', val: td.totalViews.toLocaleString(),      lbl:'Total Views' },
                    { icon:'fas fa-file-alt',  c:'#10b981', val: td.published,                        lbl:'Published Posts' },
                    { icon:'fas fa-chart-bar', c:'#f59e0b', val: td.avgViewsPerPost.toLocaleString(), lbl:'Avg Views / Post' },
                    { icon:'fas fa-trophy',    c:'#8b5cf6', val: td.peakPost ? (td.peakPost.views || 0).toLocaleString() : '0', lbl:'Top Post Views' },
                    { icon:'fas fa-comments',  c:'#ec4899', val: td.totalComments.toLocaleString(),   lbl:'Total Comments' },
                    { icon:'fas fa-percentage',c:'#06b6d4', val: `${td.engRate}%`,                   lbl:'Engagement Rate' },
                  ].map(({ icon, c, val, lbl }) => (
                    <div key={lbl} className="ahome-traffic-kpi">
                      <div className="ahome-traffic-kpi-icon" style={{ background: c + '20', color: c }}><i className={icon} /></div>
                      <div>
                        <div className="ahome-traffic-kpi-val">{loading ? '…' : val}</div>
                        <div className="ahome-traffic-kpi-lbl">{lbl}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Charts grid */}
                <div className="ahome-traffic-charts">

                  {/* Views & Comments Trend — real bucketed by creation date */}
                  <div className="ahome-traffic-chart-card ahome-traffic-chart-card--wide">
                    <div className="ahome-traffic-chart-title">
                      <span><i className="fas fa-chart-area" style={{ marginRight:6, color:'#3b82f6' }} />Views &amp; Comments Trend <span style={{ fontWeight:400, fontSize:11, opacity:0.6 }}>(by post creation date)</span></span>
                      <div className="ahome-traffic-legend">
                        <span className="ahome-legend-dot" style={{ background:'#3b82f6' }} /> Views
                        <span className="ahome-legend-dot" style={{ background:'#ec4899', marginLeft:12 }} /> Comments
                        <span className="ahome-legend-dot" style={{ background:'#10b981', marginLeft:12 }} /> Posts
                      </div>
                    </div>
                    <div style={{ height:220 }}>
                      <Line
                        options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false }, tooltip:{ mode:'index', intersect:false, ...CHART_TOOLTIP } }, scales:{ y:CHART_Y, x:CHART_X }, elements:{ line:{ tension:0.4 }, point:{ radius:0, hoverRadius:5 } } }}
                        data={{ labels: trend.labels, datasets:[
                          { label:'Views',    data: trend.vBuckets, borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,0.1)',  fill:true, borderWidth:2.5 },
                          { label:'Comments', data: trend.cBuckets, borderColor:'#ec4899', backgroundColor:'rgba(236,72,153,0.07)', fill:true, borderWidth:2 },
                          { label:'Posts',    data: trend.pBuckets, borderColor:'#10b981', backgroundColor:'rgba(16,185,129,0.07)', fill:true, borderWidth:2, borderDash:[4,3] },
                        ]}}
                      />
                    </div>
                  </div>

                  {/* Post Status Doughnut — real counts */}
                  <div className="ahome-traffic-chart-card">
                    <div className="ahome-traffic-chart-title">
                      <span><i className="fas fa-circle-notch" style={{ marginRight:6, color:'#8b5cf6' }} />Post Status</span>
                    </div>
                    <div style={{ height:150, display:'flex', justifyContent:'center' }}>
                      <Doughnut
                        options={{ responsive:true, maintainAspectRatio:false, cutout:'65%', plugins:{ legend:{ display:false }, tooltip:{ ...CHART_TOOLTIP } } }}
                        data={{ labels:['Published','Draft','Pending','Scheduled'], datasets:[{ data: td.statusData, backgroundColor:['#10b981','#94a3b8','#f59e0b','#8b5cf6'], borderWidth:0, hoverOffset:6 }] }}
                      />
                    </div>
                    <div className="ahome-source-legend" style={{ marginTop:12 }}>
                      {[['Published',td.published,'#10b981'],['Draft',td.draft,'#94a3b8'],['Pending',td.pending,'#f59e0b'],['Scheduled',td.scheduled,'#8b5cf6']].map(([lbl,val,c]) => (
                        <div key={lbl} className="ahome-source-row">
                          <span className="ahome-legend-dot" style={{ background:c }} />
                          <span className="ahome-source-name">{lbl}</span>
                          <span className="ahome-source-pct" style={{ color:c, fontWeight:700 }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top 5 Posts by Views — real */}
                  <div className="ahome-traffic-chart-card ahome-traffic-chart-card--wide">
                    <div className="ahome-traffic-chart-title">
                      <span><i className="fas fa-fire" style={{ marginRight:6, color:'#f59e0b' }} />Top Posts by Views</span>
                    </div>
                    <div style={{ height:180 }}>
                      {td.top5Views.length === 0
                        ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--atxt2)', fontSize:13 }}>No posts yet</div>
                        : <Bar
                            options={{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false }, tooltip:{ ...CHART_TOOLTIP } }, scales:{ x:{ beginAtZero:true, ...CHART_Y }, y:{ grid:{ display:false }, ticks:{ color:'#94a3b8', font:{ size:11 } } } } }}
                            data={{ labels: td.top5Views.map(b => b.title?.length > 24 ? b.title.slice(0,24)+'…' : (b.title || 'Untitled')), datasets:[{ label:'Views', data: td.top5Views.map(b => b.views || 0), backgroundColor: BAR_COLORS, borderRadius:6, borderWidth:0 }] }}
                          />
                      }
                    </div>
                  </div>

                  {/* Most Commented Posts — real */}
                  <div className="ahome-traffic-chart-card">
                    <div className="ahome-traffic-chart-title">
                      <span><i className="fas fa-comments" style={{ marginRight:6, color:'#ec4899' }} />Most Commented</span>
                    </div>
                    {td.top5Comments.filter(b => (b.commentsCount || 0) > 0).length === 0
                      ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:80, color:'var(--atxt2)', fontSize:13 }}>No comments yet</div>
                      : td.top5Comments.filter(b => (b.commentsCount || 0) > 0).map((b, i) => (
                          <div key={b.id} className="ahome-device-row" style={{ marginBottom:10 }}>
                            <span style={{ width:16, fontSize:11, fontWeight:800, color: BAR_COLORS[i]?.replace('0.85','1') || '#3b82f6', textAlign:'center', flexShrink:0 }}>#{i+1}</span>
                            <span className="ahome-device-name" style={{ width:'auto', flex:1, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.title || 'Untitled'}</span>
                            <span style={{ fontWeight:700, color:'#ec4899', fontSize:13, flexShrink:0 }}>{b.commentsCount}</span>
                          </div>
                        ))
                    }
                  </div>

                  {/* Category Performance — real views per category */}
                  <div className="ahome-traffic-chart-card ahome-traffic-chart-card--wide">
                    <div className="ahome-traffic-chart-title">
                      <span><i className="fas fa-tags" style={{ marginRight:6, color:'#06b6d4' }} />Views by Category</span>
                    </div>
                    <div style={{ height: Math.max(120, catEntries.length * 38) }}>
                      {catEntries.length === 0
                        ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--atxt2)', fontSize:13 }}>No category data yet</div>
                        : <Bar
                            options={{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false }, tooltip:{ ...CHART_TOOLTIP } }, scales:{ x:{ beginAtZero:true, grid:{ color:'rgba(100,116,139,0.08)' }, ticks:{ color:'#94a3b8', font:{ size:11 } } }, y:{ grid:{ display:false }, ticks:{ color:'#94a3b8', font:{ size:11 } } } } }}
                            data={{ labels: catEntries.map(c => c.name), datasets:[{ label:'Views', data: catEntries.map(c => c.views), backgroundColor: BAR_COLORS, borderRadius:6, borderWidth:0 }] }}
                          />
                      }
                    </div>
                  </div>

                  {/* Recent Publications — real sorted blogs */}
                  <div className="ahome-traffic-chart-card">
                    <div className="ahome-traffic-chart-title">
                      <span><i className="fas fa-clock" style={{ marginRight:6, color:'#10b981' }} />Recent Publications</span>
                    </div>
                    {td.recentPublished.length === 0
                      ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:80, color:'var(--atxt2)', fontSize:13 }}>No published posts yet</div>
                      : td.recentPublished.map(b => {
                          const d = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                          const daysAgo = Math.floor((Date.now() - d) / 86400000);
                          return (
                            <div key={b.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, fontSize:12 }}>
                              <span style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', flexShrink:0 }} />
                              <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--atxt)', fontWeight:500 }}>{b.title || 'Untitled'}</span>
                              <span style={{ flexShrink:0, color:'var(--atxt2)', fontSize:11 }}>{daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`}</span>
                            </div>
                          );
                        })
                    }
                  </div>

                </div>
              </div>
            );
          })()}


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
                            <td className="atable-num">{blog.commentsCount ?? 0}</td>
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
                                    <div className="aquick-field">
                                      <label htmlFor={`qe-title-${blog.id}`}>Title</label>
                                      <input
                                        id={`qe-title-${blog.id}`}
                                        name="title"
                                        className="ainput"
                                        value={quickForm.title}
                                        onChange={(e) => setQuickForm((f) => ({ ...f, title: e.target.value }))}
                                        autoComplete="off"
                                      />
                                    </div>

                                    <div className="aquick-field">
                                      <label htmlFor={`qe-slug-${blog.id}`}>Slug</label>
                                      <input
                                        id={`qe-slug-${blog.id}`}
                                        name="slug"
                                        className="ainput"
                                        value={quickForm.slug}
                                        onChange={(e) => setQuickForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                                        autoComplete="off"
                                      />
                                    </div>

                                    <div className="aquick-field">
                                      <label htmlFor={`qe-cat-trigger-${blog.id}`}>Category</label>
                                      <div className="aquick-cat-select" ref={quickCategoryRef}>
                                        <button
                                          id={`qe-cat-trigger-${blog.id}`}
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
                                                <label className="aquick-cat-option-main" htmlFor={`qe-cat-${cat.id}`}>
                                                  <input
                                                    id={`qe-cat-${cat.id}`}
                                                    type="checkbox"
                                                    className="aquick-cat-checkbox"
                                                    checked={quickForm.categoryIds?.includes(cat.id)}
                                                    readOnly
                                                    tabIndex={-1}
                                                  />
                                                  <span>{cat.name}</span>
                                                </label>
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="aquick-field">
                                      <label htmlFor={`qe-status-${blog.id}`}>Status</label>
                                      <select
                                        id={`qe-status-${blog.id}`}
                                        name="status"
                                        className="ainput"
                                        value={quickForm.status}
                                        onChange={(e) => setQuickForm((f) => ({ ...f, status: e.target.value }))}
                                      >
                                        <option value="published">Published</option>
                                        <option value="scheduled">Scheduled</option>
                                        <option value="draft">Draft</option>
                                        <option value="pending">Pending Review</option>
                                      </select>
                                    </div>

                                    <div className="aquick-field">
                                      <label htmlFor={`qe-date-${blog.id}`}>Date</label>
                                      <input
                                        id={`qe-date-${blog.id}`}
                                        name="date"
                                        type="date"
                                        className="ainput"
                                        value={quickForm.date}
                                        onChange={(e) => setQuickForm((f) => ({ ...f, date: e.target.value }))}
                                      />
                                    </div>

                                    <div className="aquick-field">
                                      <label htmlFor={`qe-time-${blog.id}`}>Time</label>
                                      <input
                                        id={`qe-time-${blog.id}`}
                                        name="time"
                                        type="time"
                                        className="ainput"
                                        value={quickForm.time}
                                        onChange={(e) => setQuickForm((f) => ({ ...f, time: e.target.value }))}
                                      />
                                    </div>

                                    <div className="aquick-field aquick-field--wide">
                                      <label htmlFor={`qe-tag-trigger-${blog.id}`}>Tags</label>
                                      <div className="aquick-cat-select aquick-tag-select" ref={quickTagRef}>
                                        <button
                                          id={`qe-tag-trigger-${blog.id}`}
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
                                                <label className="aquick-cat-option-main" htmlFor={`qe-tag-${tag.id}`}>
                                                  <input
                                                    id={`qe-tag-${tag.id}`}
                                                    type="checkbox"
                                                    className="aquick-cat-checkbox"
                                                    checked={quickForm.tags?.some((t) => normalizeTagName(t) === normalizeTagName(tag.name))}
                                                    readOnly
                                                    tabIndex={-1}
                                                  />
                                                  <span>{tag.name}</span>
                                                </label>
                                              </button>
                                            ))}

                                            <div className="aquick-tag-add-row">
                                              <label htmlFor={`qe-tag-new-${blog.id}`} className="sr-only">New tag name</label>
                                              <input
                                                id={`qe-tag-new-${blog.id}`}
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
                                    </div>
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
                {/* ... existing table code ... */}
              </tbody>
            </table>
          </div>

          <div className="ahome-dashboard-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 24 }}>
            {/* Recent Activity */}
            <div className="ahome-widget">
              <div className="ahome-widget-header">
                <h2 className="ahome-widget-title">Recent Activity</h2>
                <Link to="/admin/audit" className="abtn abtn-ghost abtn-sm">View All</Link>
              </div>
              <div className="ahome-activity-list">
                {activityLoading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="ahome-activity-item">
                      <div className="askel askel-av" style={{ width: 12, height: 12 }} />
                      <div className="ahome-activity-content">
                        <div className="askel askel-line" style={{ width: "80%", marginBottom: 4 }} />
                        <div className="askel askel-line" style={{ width: "30%" }} />
                      </div>
                    </div>
                  ))
                ) : activity.length === 0 ? (
                  <div className="aempty" style={{ padding: "40px 0" }}>
                    <div className="aempty-icon" style={{ fontSize: 32 }}>💤</div>
                    <div className="aempty-title">All quiet for now</div>
                  </div>
                ) : (
                  activity.map((log) => (
                    <div key={log.id} className="ahome-activity-item">
                      <div className={`ahome-activity-dot ${getActivityColor(log.action)}`} />
                      <div className="ahome-activity-content">
                        <span className="ahome-activity-text">
                          {log.action.replace(/\./g, " ").replace(/\b\w/g, l => l.toUpperCase())}: <b>{log.target || "System"}</b>
                        </span>
                        <span className="ahome-activity-time">{timeAgo(toMillis(log.created_at))}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="ahome-widget">
              <div className="ahome-widget-header">
                <h2 className="ahome-widget-title">Quick Actions</h2>
              </div>
              <div className="ahome-quick-grid">
                <Link to="/admin/post/new" className="ahome-qaction-card qaction-blue">
                  <div className="ahome-qaction-icon"><i className="fas fa-edit" /></div>
                  <span className="ahome-qaction-label">New Post</span>
                </Link>
                <Link to="/admin/inbox" className="ahome-qaction-card qaction-purple">
                  <div className="ahome-qaction-icon"><i className="fas fa-envelope" /></div>
                  <span className="ahome-qaction-label">Messages</span>
                </Link>
                <button className="ahome-qaction-card qaction-emerald" onClick={handleQuickBackup}>
                  <div className="ahome-qaction-icon"><i className="fas fa-cloud-download-alt" /></div>
                  <span className="ahome-qaction-label">Backup</span>
                </button>
                <button className="ahome-qaction-card qaction-amber" onClick={() => window.open(`${import.meta.env.VITE_API_URL || '/api'}/sitemap.php`, '_blank')}>
                  <div className="ahome-qaction-icon"><i className="fas fa-globe-americas" /></div>
                  <span className="ahome-qaction-label">Sitemap</span>
                </button>
              </div>
            </div>
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
                  <div className="aempty" style={{ padding: "40px 0" }}>
                    <div className="aempty-icon" style={{ fontSize: 32 }}>💬</div>
                    <div className="aempty-title">No comments yet</div>
                  </div>
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
      {modal && createPortal(
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
        </div>,
        document.body
      )}

      {/* ── Reply to comment modal ── */}
      {replyModal && createPortal(
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
              <label htmlFor="reply-message" className="sr-only">Reply message</label>
              <textarea
                id="reply-message"
                name="reply_message"
                className="areply-modal-textarea"
                placeholder={`Write a reply to ${replyModal.name}…`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
                autoComplete="off"
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
        </div>,
        document.body
      )}

      {/* ── Confirm delete comment modal ── */}
      {commentDeleteModal && createPortal(
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
        </div>,
        document.body
      )}
    </div>
  );
}
