import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  subscribeToBlogs,
  subscribeToCategories,
  subscribeToCommentsOverview,
} from "../../api/apiService";
import AdminSidebar from "./components/AdminSidebar";
import "./Admin.css";

/* ── Utility helpers ── */
function toMillis(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value?.toDate) return value.toDate().getTime();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function num(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function pct(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function statusOf(post) {
  if (post.published) return "Published";
  if (post.pendingReview) return "Pending";
  if (post.scheduledAt) return "Scheduled";
  return "Draft";
}

/* Tags are stored as either a comma-separated string or an array of strings */
function extractTags(post) {
  if (Array.isArray(post.tags)) return post.tags.map((t) => String(t || "").trim()).filter(Boolean);
  if (typeof post.tags === "string") return post.tags.split(",").map((t) => t.trim()).filter(Boolean);
  return [];
}

function firstCategoryName(post, categoryById) {
  const ids = Array.isArray(post.categoryIds) ? post.categoryIds : [];
  const byId = ids.map((id) => categoryById.get(id)?.name).find(Boolean);
  if (byId) return byId;
  if (Array.isArray(post.categories) && post.categories[0]) {
    const c = post.categories[0];
    return typeof c === "object" ? (c.name || c.slug || String(c)) : String(c);
  }
  if (typeof post.categories === "string" && post.categories.trim())
    return post.categories.split(",")[0].trim();
  if (Array.isArray(post.category) && post.category[0]) return String(post.category[0]);
  if (typeof post.category === "string" && post.category.trim())
    return post.category.split(",")[0].trim();
  return "Uncategorized";
}

function initials(name) {
  return (
    String(name || "Reader")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("") || "R"
  );
}

function timeAgo(ms) {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function formatDate(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const RANGE_OPTIONS = [
  { id: "all", label: "All time" },
  { id: "30d", label: "30 days" },
  { id: "7d",  label: "7 days"  },
];

const STATUS_CONFIG = {
  Published: { color: "#10b981", bg: "#ecfdf5", icon: "fas fa-check-circle"   },
  Draft:     { color: "#f59e0b", bg: "#fffbeb", icon: "fas fa-pencil-alt"      },
  Pending:   { color: "#3b82f6", bg: "#eff6ff", icon: "fas fa-hourglass-half"  },
  Scheduled: { color: "#8b5cf6", bg: "#f5f3ff", icon: "fas fa-clock"           },
};

const DIFF_CONFIG = {
  beginner:     { color: "#10b981", label: "Beginner"     },
  intermediate: { color: "#f59e0b", label: "Intermediate" },
  advanced:     { color: "#ef4444", label: "Advanced"     },
};

const AVATAR_COLORS = [
  ["#dbeafe", "#1d4ed8"], ["#fce7f3", "#be185d"], ["#d1fae5", "#065f46"],
  ["#fef3c7", "#92400e"], ["#ede9fe", "#6d28d9"], ["#fee2e2", "#991b1b"],
];

function avatarStyle(name) {
  const idx = (name?.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  const [bg, color] = AVATAR_COLORS[idx];
  return { background: bg, color };
}

/* ══════════════════════════════════════════════
   Main page
   ══════════════════════════════════════════════ */
export default function AdminAnalytics() {
  const [blogs,          setBlogs]          = useState([]);
  const [categories,     setCategories]     = useState([]);
  const [comments,       setComments]       = useState([]);
  const [commentsTotal,  setCommentsTotal]  = useState(0);
  const [loaded,         setLoaded]         = useState({ blogs: false, comments: false, categories: false });
  const [error,          setError]          = useState("");
  const [range,          setRange]          = useState("all");
  const [activeSection,  setActiveSection]  = useState("overview");
  const [selectedCategory, setSelectedCategory] = useState(null); /* null = no filter */

  useEffect(() => {
    let cancelled = false;
    setLoaded({ blogs: false, comments: false, categories: false });
    setError("");

    const unsubBlogs = subscribeToBlogs(
      (rows) => {
        if (!cancelled) { setBlogs(rows); setLoaded((p) => ({ ...p, blogs: true })); }
      },
      () => {
        if (!cancelled) {
          setError("Posts could not be loaded.");
          setLoaded((p) => ({ ...p, blogs: true }));
        }
      }
    );

    const unsubCategories = subscribeToCategories(
      (rows) => {
        if (!cancelled) { setCategories(rows); setLoaded((p) => ({ ...p, categories: true })); }
      },
      () => {
        if (!cancelled) { setLoaded((p) => ({ ...p, categories: true })); }
      }
    );

    const unsubComments = subscribeToCommentsOverview(
      (rows) => {
        if (!cancelled) {
          setComments(rows.comments);
          setCommentsTotal(rows.total);
          setLoaded((p) => ({ ...p, comments: true }));
        }
      },
      () => {
        if (!cancelled) { setLoaded((p) => ({ ...p, comments: true })); }
      }
    );

    return () => {
      cancelled = true;
      try { unsubBlogs?.(); unsubCategories?.(); unsubComments?.(); } catch { /* ignore */ }
    };
  }, []);

  const loading = !loaded.blogs || !loaded.comments || !loaded.categories;

  /* ── Range cutoff ── */
  const cutoff = useMemo(() => {
    if (range === "7d")  return Date.now() - 7  * 86400000;
    if (range === "30d") return Date.now() - 30 * 86400000;
    return 0;
  }, [range]);

  /* Filter blogs by createdAt — updatedAt changes on every save and would make
     old posts always appear in short-range filters */
  const filteredBlogs = useMemo(() =>
    cutoff ? blogs.filter((p) => toMillis(p.createdAt) >= cutoff) : blogs,
  [blogs, cutoff]);

  /* Filter comments by their own createdAt */
  const filteredComments = useMemo(() =>
    cutoff ? comments.filter((c) => toMillis(c.createdAt) >= cutoff) : comments,
  [comments, cutoff]);

  const data = useMemo(() => {
    const categoryById = new Map(categories.map((c) => [c.id, c]));

    const total     = filteredBlogs.length;
    const published = filteredBlogs.filter((p) => p.published).length;
    const pending   = filteredBlogs.filter((p) => p.pendingReview && !p.published).length;
    const scheduled = filteredBlogs.filter((p) => !p.published && p.scheduledAt).length;
    const drafts    = filteredBlogs.filter((p) => !p.published && !p.pendingReview && !p.scheduledAt).length;
    const featured  = filteredBlogs.filter((p) => p.featured).length;
    const totalViews = filteredBlogs.reduce((s, p) => s + Number(p.views || 0), 0);

    /* Build comment map from filtered comments only */
    const commentMap = filteredComments.reduce((m, c) => {
      if (!c.blogId) return m;
      m.set(c.blogId, (m.get(c.blogId) || 0) + 1);
      return m;
    }, new Map());

    /* When a range is active only count filtered-range comments per post.
       For all-time fall back to stored commentsCount on the post document. */
    const postComments = (p) =>
      cutoff
        ? (commentMap.get(p.id) || 0)
        : (commentMap.has(p.id) ? commentMap.get(p.id) : Number(p.commentsCount || 0));

    const storedTotal   = filteredBlogs.reduce((s, p) => s + Number(p.commentsCount || 0), 0);
    const totalComments = cutoff
      ? filteredComments.length
      : Math.max(Number(commentsTotal || 0), storedTotal);

    const avgViews    = total ? Math.round(totalViews / total) : 0;
    const avgComments = total ? (totalComments / total).toFixed(1) : "0.0";
    const pubRate     = total ? Math.round((published / total) * 100) : 0;

    /* Category counts */
    const catCounts = new Map();
    filteredBlogs.forEach((p) => {
      const n = firstCategoryName(p, categoryById);
      catCounts.set(n, (catCounts.get(n) || 0) + 1);
    });

    /* Difficulty counts */
    const diffCounts = filteredBlogs.reduce((m, p) => {
      const k = String(p.difficulty || "intermediate").toLowerCase();
      m.set(k, (m.get(k) || 0) + 1);
      return m;
    }, new Map());

    /* Tag counts — case-insensitive deduplication, preserve original casing
       (first occurrence wins for display name) */
    const tagCounts  = new Map(); // lowercase key → count
    const tagDisplay = new Map(); // lowercase key → display name
    filteredBlogs.forEach((p) => {
      extractTags(p).forEach((tag) => {
        const key = tag.toLowerCase();
        if (!tagDisplay.has(key)) tagDisplay.set(key, tag);
        tagCounts.set(key, (tagCounts.get(key) || 0) + 1);
      });
    });

    /* Series counts */
    const seriesCounts = new Map();
    filteredBlogs.forEach((p) => {
      const s = String(p.series || "").trim();
      if (s) seriesCounts.set(s, (seriesCounts.get(s) || 0) + 1);
    });

    const topPosts    = [...filteredBlogs].sort((a, b) => Number(b.views || 0) - Number(a.views || 0));
    const recentPosts = [...filteredBlogs].sort((a, b) =>
      Math.max(toMillis(b.updatedAt), toMillis(b.createdAt)) -
      Math.max(toMillis(a.updatedAt), toMillis(a.createdAt))
    );
    const maxViews = topPosts.length ? Math.max(Number(topPosts[0].views || 0), 1) : 1;

    return {
      total, published, pending, scheduled, drafts, featured,
      totalViews, totalComments, avgViews, avgComments, pubRate,
      postComments, maxViews, categoryById,
      categoryRows:   [...catCounts.entries()].sort((a, b) => b[1] - a[1]),
      difficultyRows: [...diffCounts.entries()].sort((a, b) => b[1] - a[1]),
      tagRows: [...tagCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([key, count]) => [tagDisplay.get(key) || key, count]),
      seriesRows:     [...seriesCounts.entries()].sort((a, b) => b[1] - a[1]),
      topPosts, recentPosts,
    };
  }, [filteredBlogs, filteredComments, categories, cutoff, commentsTotal]);

  /* Posts filtered by the category the user clicked in the Content tab */
  const categoryFilteredPosts = useMemo(() => {
    if (!selectedCategory) return data.topPosts;
    return data.topPosts.filter(
      (p) => firstCategoryName(p, data.categoryById) === selectedCategory
    );
  }, [data.topPosts, data.categoryById, selectedCategory]);

  /* Click a category row → jump to Posts tab with that category active */
  function drillIntoCategory(name) {
    setSelectedCategory(name);
    setActiveSection("posts");
  }

  const SECTIONS = [
    { id: "overview",   label: "Overview",   icon: "fas fa-th-large"  },
    { id: "posts",      label: "Posts",      icon: "fas fa-file-alt"  },
    { id: "engagement", label: "Engagement", icon: "fas fa-comments"  },
    { id: "content",    label: "Content",    icon: "fas fa-tags"      },
  ];

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
                <span className="apage-crumb-cur">Analytics</span>
              </div>
              <h1 className="apage-title">Analytics</h1>
              <p className="apage-subtitle">Insights and performance metrics for your blog</p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div className="aan-range-tabs">
                {RANGE_OPTIONS.map((opt) => (
                  <button key={opt.id} type="button"
                    className={`aan-range-tab${range === opt.id ? " is-active" : ""}`}
                    onClick={() => setRange(opt.id)}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <Link to="/admin/post/new" className="abtn abtn-primary abtn-sm">
                <i className="fas fa-plus" style={{ marginRight: 5 }} />New Post
              </Link>
            </div>
          </div>

          {error && (
            <div className="anotice anotice-error">
              <i className="fas fa-exclamation-triangle" /> {error}
            </div>
          )}

          {/* ── Hero banner ── */}
          <div className="aan-hero">
            <div className="aan-hero-left">
              <div className="aan-hero-live">
                <span className="aan-live-dot" />
                <span>Live data</span>
              </div>
              <h2 className="aan-hero-title">Publishing Overview</h2>
              <p className="aan-hero-sub">
                {range === "all"
                  ? `${data.total} total posts across all time.`
                  : `${data.total} post${data.total !== 1 ? "s" : ""} in the last ${range === "30d" ? "30 days" : "7 days"}.`}
              </p>
              <div className="aan-hero-pills">
                <span className="aan-hero-pill aan-hero-pill--green">
                  <i className="fas fa-check-circle" /> {data.published} published
                </span>
                <span className="aan-hero-pill aan-hero-pill--amber">
                  <i className="fas fa-pencil-alt" /> {data.drafts} draft{data.drafts !== 1 ? "s" : ""}
                </span>
                {data.pending > 0 && (
                  <span className="aan-hero-pill aan-hero-pill--blue">
                    <i className="fas fa-hourglass-half" /> {data.pending} pending
                  </span>
                )}
                {data.scheduled > 0 && (
                  <span className="aan-hero-pill" style={{ background: "#f5f3ff", color: "#6d28d9" }}>
                    <i className="fas fa-clock" /> {data.scheduled} scheduled
                  </span>
                )}
              </div>
            </div>
            <div className="aan-hero-metrics">
              <HeroStat label="Total Views"   value={num(data.totalViews)}    icon="fas fa-eye"          loading={loading} />
              <HeroStat label="Publish Rate"  value={`${data.pubRate}%`}      icon="fas fa-paper-plane"  loading={loading} accent />
              <HeroStat label="Avg. Views"    value={num(data.avgViews)}       icon="fas fa-chart-line"   loading={loading} />
              <HeroStat label="Comments"      value={num(data.totalComments)}  icon="fas fa-comment-dots" loading={loading} />
            </div>
          </div>

          {/* ── Section nav ── */}
          <div className="aan-section-nav">
            {SECTIONS.map((s) => (
              <button key={s.id} type="button"
                className={`aan-section-tab${activeSection === s.id ? " is-active" : ""}`}
                onClick={() => { setActiveSection(s.id); setSelectedCategory(null); }}>
                <i className={s.icon} style={{ marginRight: 6 }} />{s.label}
              </button>
            ))}
          </div>

          {/* ══ OVERVIEW ══ */}
          {activeSection === "overview" && (
            <>
              <div className="aan-cards">
                <MetricCard icon="fas fa-newspaper"      label="Total Posts"   value={num(data.total)}         sub={`${data.published} published`}     tone="default" loading={loading} />
                <MetricCard icon="fas fa-check-circle"   label="Published"     value={num(data.published)}     sub={`${data.pubRate}% pub rate`}        tone="green"   loading={loading} />
                <MetricCard icon="fas fa-star"           label="Featured"      value={num(data.featured)}      sub="highlighted posts"                  tone="gold"    loading={loading} />
                <MetricCard icon="fas fa-eye"            label="Total Views"   value={num(data.totalViews)}    sub={`avg ${num(data.avgViews)} / post`} tone="blue"    loading={loading} />
                <MetricCard icon="fas fa-comments"       label="Comments"      value={num(data.totalComments)} sub={`avg ${data.avgComments} / post`}   tone="purple"  loading={loading} />
                <MetricCard icon="fas fa-hourglass-half" label="Pending"       value={num(data.pending)}       sub="awaiting review"                    tone="amber"   loading={loading} />
              </div>

              <div className="aan-grid-2">
                {/* Status breakdown */}
                <div className="aan-panel">
                  <PanelHead icon="fas fa-tasks" title="Publishing Status" badge={data.total} />
                  <div className="aan-status-list">
                    {[
                      { label: "Published", value: data.published },
                      { label: "Draft",     value: data.drafts    },
                      { label: "Pending",   value: data.pending   },
                      { label: "Scheduled", value: data.scheduled },
                    ].map((row) => {
                      const cfg = STATUS_CONFIG[row.label] || STATUS_CONFIG.Draft;
                      const p   = pct(row.value, data.total);
                      return (
                        <div className="aan-status-row" key={row.label}>
                          <div className="aan-status-left">
                            <span className="aan-status-dot" style={{ background: cfg.color }} />
                            <span className="aan-status-name">{row.label}</span>
                          </div>
                          <div className="aan-status-bar-wrap">
                            <div className="aan-status-bar">
                              <div className="aan-status-bar-fill" style={{ width: `${p}%`, background: cfg.color }} />
                            </div>
                          </div>
                          <div className="aan-status-right">
                            <strong>{row.value}</strong>
                            <span>{p}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top categories */}
                <div className="aan-panel">
                  <PanelHead icon="fas fa-folder-open" title="Top Categories" badge={data.categoryRows.length} />
                  {loading ? (
                    <BarsSkeleton />
                  ) : data.categoryRows.length ? (
                    <div className="aan-rank-list">
                      {data.categoryRows.slice(0, 6).map(([name, count], idx) => (
                        <div className="aan-rank-row" key={name}>
                          <span className="aan-rank-num">#{idx + 1}</span>
                          <span className="aan-rank-name">{name}</span>
                          <div className="aan-rank-bar">
                            <div className="aan-rank-fill" style={{ width: `${pct(count, data.total)}%` }} />
                          </div>
                          <strong className="aan-rank-count">{count}</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState text="No category data yet." />
                  )}
                </div>
              </div>
            </>
          )}

          {/* ══ POSTS ══ */}
          {activeSection === "posts" && (
            <div className="aan-panel">
              <PanelHead icon="fas fa-chart-bar"
                title={selectedCategory ? `Posts in "${selectedCategory}"` : "All Posts by Views"}
                badge={categoryFilteredPosts.length} />
              {selectedCategory && (
                <div className="aan-cat-filter-bar">
                  <span><i className="fas fa-filter" /> Filtered by category:</span>
                  <span className="aan-cat-chip">{selectedCategory}</span>
                  <button type="button" className="aan-cat-filter-clear"
                    onClick={() => setSelectedCategory(null)}>
                    <i className="fas fa-times" /> Clear filter
                  </button>
                </div>
              )}
              <div className="aan-table-wrap">
                <table className="aan-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>#</th>
                      <th>Post</th>
                      <th>Status</th>
                      <th>Category</th>
                      <th>Published</th>
                      <th>Views</th>
                      <th>Reach</th>
                      <th>Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
                    ) : categoryFilteredPosts.length ? (
                      categoryFilteredPosts.map((post, idx) => {
                        const views   = Number(post.views || 0);
                        const reach   = Math.round((views / data.maxViews) * 100);
                        const status  = statusOf(post);
                        const cfg     = STATUS_CONFIG[status] || STATUS_CONFIG.Draft;
                        const catName = firstCategoryName(post, data.categoryById);
                        const pubMs   = post.published ? toMillis(post.createdAt) : null;
                        return (
                          <tr key={post.id} className={idx === 0 ? "aan-tr--top" : ""}>
                            <td>
                              <span className={`aan-rank-badge${idx < 3 ? ` aan-rank-badge--${idx}` : ""}`}>
                                {idx + 1}
                              </span>
                            </td>
                            <td>
                              <Link to={`/admin/post/${post.id}/edit`} className="aan-post-link">
                                {post.title || "Untitled post"}
                              </Link>
                              <small className="aan-post-date">
                                {timeAgo(Math.max(toMillis(post.updatedAt), toMillis(post.createdAt)))}
                              </small>
                            </td>
                            <td>
                              <span className="aan-status-pill" style={{ color: cfg.color, background: cfg.bg }}>
                                <i className={cfg.icon} /> {status}
                              </span>
                            </td>
                            <td><span className="aan-cat-chip">{catName}</span></td>
                            <td>
                              <span style={{ fontSize: 12, color: "var(--amut)" }}>
                                {pubMs ? formatDate(pubMs) : "—"}
                              </span>
                            </td>
                            <td><strong>{num(views)}</strong></td>
                            <td>
                              <div className="aan-reach-bar">
                                <div className="aan-reach-fill" style={{ width: `${reach}%` }} />
                              </div>
                            </td>
                            <td>{num(data.postComments(post))}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan="8" className="aan-empty">
                        {selectedCategory
                          ? `No posts in "${selectedCategory}" for this range.`
                          : "No posts found for this range."}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══ ENGAGEMENT ══ */}
          {activeSection === "engagement" && (
            <div className="aan-grid-2">
              {/* Recent post activity */}
              <div className="aan-panel">
                <PanelHead icon="fas fa-history" title="Recent Post Activity" badge={data.recentPosts.length} />
                <div className="aan-timeline">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => <TimelineSkeleton key={i} />)
                  ) : data.recentPosts.length ? (
                    data.recentPosts.slice(0, 10).map((post) => {
                      const status = statusOf(post);
                      const cfg    = STATUS_CONFIG[status] || STATUS_CONFIG.Draft;
                      const ts     = Math.max(toMillis(post.updatedAt), toMillis(post.createdAt));
                      return (
                        <Link to={`/admin/post/${post.id}/edit`} className="aan-tl-item" key={post.id}>
                          <div className="aan-tl-dot" style={{ background: cfg.color }} />
                          <div className="aan-tl-body">
                            <span className="aan-tl-title">{post.title || "Untitled"}</span>
                            <div className="aan-tl-meta">
                              <span className="aan-status-pill aan-status-pill--sm"
                                style={{ color: cfg.color, background: cfg.bg }}>
                                {status}
                              </span>
                              <span className="aan-tl-time">{timeAgo(ts)}</span>
                            </div>
                          </div>
                          <div className="aan-tl-views">
                            <i className="fas fa-eye" /> {num(post.views)}
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <EmptyState text="No recent activity." />
                  )}
                </div>
              </div>

              {/* Recent comments */}
              <div className="aan-panel">
                <PanelHead icon="fas fa-comment-dots" title="Recent Comments" badge={data.totalComments} />
                <div className="aan-comments">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => <CommentSkeleton key={i} />)
                  ) : filteredComments.length ? (
                    filteredComments.slice(0, 10).map((comment) => {
                      const name  = comment.name || "Anonymous";
                      const style = avatarStyle(name);
                      return (
                        <div className="aan-comment" key={comment.id}>
                          <div className="aan-comment-av" style={style}>{initials(name)}</div>
                          <div className="aan-comment-body">
                            <div className="aan-comment-top">
                              <strong>{name}</strong>
                              <span className="aan-comment-time">
                                {timeAgo(toMillis(comment.createdAt))}
                              </span>
                            </div>
                            <p className="aan-comment-text">{comment.message || comment.text || "—"}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <EmptyState text="No comments in this period." />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══ CONTENT ══ */}
          {activeSection === "content" && (
            <>
              <div className="aan-grid-2">
                {/* Difficulty breakdown */}
                <div className="aan-panel">
                  <PanelHead icon="fas fa-signal" title="Difficulty Breakdown" badge={data.total} />
                  {loading ? (
                    <BarsSkeleton />
                  ) : (
                    <div className="aan-diff-list">
                      {data.difficultyRows.length ? (
                        data.difficultyRows.map(([key, count]) => {
                          const cfg = DIFF_CONFIG[key] || { color: "#94a3b8", label: key.charAt(0).toUpperCase() + key.slice(1) };
                          return (
                            <div className="aan-diff-row" key={key}>
                              <div className="aan-diff-header">
                                <span className="aan-diff-dot" style={{ background: cfg.color }} />
                                <span className="aan-diff-label">{cfg.label}</span>
                                <strong className="aan-diff-count">{count} post{count !== 1 ? "s" : ""}</strong>
                              </div>
                              <div className="aan-diff-bar">
                                <div className="aan-diff-fill"
                                  style={{ width: `${pct(count, data.total)}%`, background: cfg.color }} />
                              </div>
                              <span className="aan-diff-pct">{pct(count, data.total)}%</span>
                            </div>
                          );
                        })
                      ) : (
                        <EmptyState text="No difficulty data yet." />
                      )}
                    </div>
                  )}
                </div>

                {/* Tag cloud */}
                <div className="aan-panel">
                  <PanelHead icon="fas fa-tags" title="Popular Tags" badge={data.tagRows.length} />
                  {loading ? (
                    <TagsSkeleton />
                  ) : data.tagRows.length ? (
                    <div className="aan-tag-cloud">
                      {data.tagRows.map(([tag, count]) => {
                        const maxCount = data.tagRows[0]?.[1] || 1;
                        const ratio = maxCount > 1 ? (count - 1) / (maxCount - 1) : 1;
                        const size  = Math.round(12 + ratio * 9);   /* 12 – 21 px */
                        /* Vary background intensity: low-count tags are lighter */
                        const bgAlpha = (0.08 + ratio * 0.18).toFixed(2);
                        return (
                          <span key={tag} className="aan-tag"
                            style={{
                              fontSize: size,
                              '--tag-bg': `rgba(21,101,192,${bgAlpha})`,
                              fontWeight: count > 1 ? 700 : 500,
                            }}>
                            {tag}
                            <span className="aan-tag-count">{count}</span>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState text="No tags used yet." />
                  )}
                </div>
              </div>

              {/* Categories full table */}
              <div className="aan-panel">
                <PanelHead icon="fas fa-folder-open" title="All Categories" badge={data.categoryRows.length} />
                <div className="aan-table-wrap">
                  <table className="aan-table">
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}>#</th>
                        <th>Category</th>
                        <th>Posts</th>
                        <th>Share</th>
                        <th style={{ width: 180 }}>Distribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
                      ) : data.categoryRows.length ? (
                        data.categoryRows.map(([name, count], idx) => (
                          <tr key={name} className="aan-cat-row" onClick={() => drillIntoCategory(name)}
                            title={`View all posts in "${name}"`}>
                            <td><span className="aan-rank-badge">{idx + 1}</span></td>
                            <td>
                              <span className="aan-cat-drill-name">
                                <strong>{name}</strong>
                                <i className="fas fa-arrow-right aan-cat-drill-icon" />
                              </span>
                            </td>
                            <td>{count}</td>
                            <td>{pct(count, data.total)}%</td>
                            <td>
                              <div className="aan-reach-bar">
                                <div className="aan-reach-fill" style={{ width: `${pct(count, data.total)}%` }} />
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="5" className="aan-empty">No categories found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Series — only shown if any posts belong to a series */}
              {(loading || data.seriesRows.length > 0) && (
                <div className="aan-panel">
                  <PanelHead icon="fas fa-layer-group" title="Post Series" badge={data.seriesRows.length} />
                  {loading ? (
                    <BarsSkeleton />
                  ) : (
                    <div className="aan-rank-list">
                      {data.seriesRows.map(([name, count], idx) => (
                        <div className="aan-rank-row" key={name}>
                          <span className="aan-rank-num">#{idx + 1}</span>
                          <span className="aan-rank-name">{name}</span>
                          <div className="aan-rank-bar">
                            <div className="aan-rank-fill" style={{ width: `${pct(count, data.total)}%` }} />
                          </div>
                          <strong className="aan-rank-count">{count}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  );
}

/* ── Sub-components ── */

function HeroStat({ label, value, icon, loading, accent }) {
  return (
    <div className={`aan-hero-stat${accent ? " aan-hero-stat--accent" : ""}`}>
      <i className={icon} />
      {loading
        ? <span className="askel askel-line" style={{ width: 80, height: 28 }} />
        : <strong>{value}</strong>}
      <span>{label}</span>
    </div>
  );
}

function MetricCard({ icon, label, value, sub, tone = "default", loading }) {
  return (
    <div className={`aan-card aan-card--${tone}`}>
      <div className="aan-card-icon"><i className={icon} /></div>
      <div className="aan-card-body">
        {loading
          ? <span className="askel askel-line" style={{ width: 72, height: 28, display: "block", marginBottom: 8 }} />
          : <strong className="aan-card-value">{value}</strong>}
        <span className="aan-card-label">{label}</span>
        {sub && <span className="aan-card-sub">{sub}</span>}
      </div>
    </div>
  );
}

function PanelHead({ icon, title, badge }) {
  return (
    <div className="aan-panel-head">
      <div className="aan-panel-head-left">
        <span className="aan-panel-icon"><i className={icon} /></span>
        <h2 className="aan-panel-title">{title}</h2>
      </div>
      {badge !== undefined && <span className="aan-panel-badge">{badge}</span>}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="aan-empty-state">
      <i className="fas fa-inbox" />
      <p>{text}</p>
    </div>
  );
}

function SkeletonRow({ cols }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}>
          <span className="askel askel-line"
            style={{ width: i === 1 ? 160 : 60, height: 13, display: "block" }} />
        </td>
      ))}
    </tr>
  );
}

function BarsSkeleton() {
  return (
    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="askel askel-line" style={{ width: 80, height: 13 }} />
          <span className="askel askel-line" style={{ flex: 1, height: 8, borderRadius: 4 }} />
          <span className="askel askel-line" style={{ width: 24, height: 13 }} />
        </div>
      ))}
    </div>
  );
}

function TagsSkeleton() {
  return (
    <div style={{ padding: "16px 20px", display: "flex", flexWrap: "wrap", gap: 8 }}>
      {[80, 55, 100, 65, 45, 90, 70, 50, 60, 85].map((w, i) => (
        <span key={i} className="askel askel-line" style={{ width: w, height: 30, borderRadius: 15 }} />
      ))}
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="aan-tl-item" style={{ pointerEvents: "none" }}>
      <div className="aan-tl-dot" style={{ background: "#e2e8f0" }} />
      <div className="aan-tl-body" style={{ flex: 1 }}>
        <span className="askel askel-line" style={{ width: "70%", height: 13, display: "block", marginBottom: 6 }} />
        <span className="askel askel-line" style={{ width: "40%", height: 11, display: "block" }} />
      </div>
    </div>
  );
}

function CommentSkeleton() {
  return (
    <div className="aan-comment">
      <span className="askel askel-av" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
        <span className="askel askel-line" style={{ width: "50%", height: 13 }} />
        <span className="askel askel-line" style={{ width: "90%", height: 11 }} />
      </div>
    </div>
  );
}
