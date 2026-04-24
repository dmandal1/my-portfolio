import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAllBlogsAdmin, getCategories } from "../../firebase/blogService";
import AdminSidebar from "./components/AdminSidebar";
import "./Admin.css";

function wordCount(text) {
  return String(text || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_`~[\]()>!-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function statusOf(post) {
  if (post.published) return "Published";
  if (post.pendingReview) return "Pending Review";
  if (post.scheduledAt) return "Scheduled";
  return "Draft";
}

function getPostCategoryNames(post, categoryById) {
  const byIds = (Array.isArray(post.categoryIds) ? post.categoryIds : [])
    .map((id) => categoryById.get(id)?.name)
    .filter(Boolean);
  if (byIds.length) return byIds;
  if (Array.isArray(post.categories)) return post.categories.filter(Boolean);
  if (typeof post.categories === "string") return post.categories.split(",").map((v) => v.trim()).filter(Boolean);
  return [];
}

function postTags(post) {
  if (Array.isArray(post.tags)) return post.tags.filter(Boolean);
  if (typeof post.tags === "string") return post.tags.split(",").map((v) => v.trim()).filter(Boolean);
  return [];
}

function auditPost(post, categoryById, duplicateSlugs) {
  const issues = [];
  const warnings = [];
  const contentWords = wordCount(post.content);
  const tags = postTags(post);
  const categories = getPostCategoryNames(post, categoryById);

  if (!String(post.title || "").trim()) issues.push("Missing title");
  if (!String(post.slug || "").trim()) issues.push("Missing slug");
  if (post.slug && duplicateSlugs.has(post.slug)) issues.push("Duplicate slug");
  if (!String(post.excerpt || post.subtitle || "").trim()) warnings.push("Add excerpt or subtitle");
  if (!String(post.metaTitle || "").trim()) warnings.push("Add meta title");
  if (!String(post.metaDescription || "").trim()) warnings.push("Add meta description");
  if (!post.image) warnings.push("Add cover image");
  if (post.image && !String(post.imageAlt || "").trim()) warnings.push("Add cover alt text");
  if (!categories.length) issues.push("Select category");
  if (!tags.length) warnings.push("Add tags");
  if (contentWords < 300) warnings.push("Content is short");
  if (post.published && post.allowComments === undefined) warnings.push("Confirm comments setting");

  const penalty = issues.length * 18 + warnings.length * 8;
  const score = Math.max(0, Math.min(100, 100 - penalty));
  const priority = issues.length ? "critical" : score < 80 ? "needs-work" : "ready";

  return {
    post,
    issues,
    warnings,
    score,
    priority,
    words: contentWords,
    categories,
    tags,
  };
}

export default function AdminContentAudit() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [blogRows, categoryRows] = await Promise.all([
          getAllBlogsAdmin(),
          getCategories().catch(() => []),
        ]);
        if (cancelled) return;
        setPosts(blogRows);
        setCategories(categoryRows);
      } catch (err) {
        if (cancelled) return;
        console.error("Content audit failed:", err);
        setError("Content audit could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const audit = useMemo(() => {
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const slugCounts = new Map();
    posts.forEach((post) => {
      if (!post.slug) return;
      slugCounts.set(post.slug, (slugCounts.get(post.slug) || 0) + 1);
    });
    const duplicateSlugs = new Set([...slugCounts.entries()].filter(([, count]) => count > 1).map(([slug]) => slug));

    return posts
      .map((post) => auditPost(post, categoryById, duplicateSlugs))
      .sort((a, b) => a.score - b.score || String(a.post.title || "").localeCompare(String(b.post.title || "")));
  }, [posts, categories]);

  const filteredAudit = useMemo(() => {
    if (filter === "all") return audit;
    return audit.filter((item) => item.priority === filter);
  }, [audit, filter]);

  const stats = useMemo(() => {
    const total = audit.length;
    const avgScore = total ? Math.round(audit.reduce((sum, item) => sum + item.score, 0) / total) : 0;
    return {
      total,
      avgScore,
      critical: audit.filter((item) => item.priority === "critical").length,
      needsWork: audit.filter((item) => item.priority === "needs-work").length,
      ready: audit.filter((item) => item.priority === "ready").length,
    };
  }, [audit]);

  return (
    <div className="alayout">
      <AdminSidebar />
      <main className="amain">
        <div className="amain-inner">
          <div className="apage-topbar">
            <div>
              <div className="apage-crumb">
                <Link to="/admin/home" className="apage-crumb-link">Admin</Link>
                <span className="apage-crumb-sep">/</span>
                <span className="apage-crumb-cur">Content Audit</span>
              </div>
              <h1 className="apage-title">Content Audit</h1>
            </div>
            <Link to="/admin/post/new" className="abtn abtn-primary">
              <i className="fas fa-plus" /> New Post
            </Link>
          </div>

          {error && (
            <div className="anotice anotice-error">
              <i className="fas fa-exclamation-triangle" /> {error}
            </div>
          )}

          <section className="aaudit-hero">
            <div>
              <span className="aaudit-kicker">Publishing quality</span>
              <h2>Find posts that need SEO, structure, or metadata fixes</h2>
            </div>
            <div className="aaudit-score">
              <strong>{loading ? "..." : stats.avgScore}</strong>
              <span>Average Score</span>
            </div>
          </section>

          <section className="aaudit-stats">
            <AuditStat icon="fas fa-file-alt" label="Total Posts" value={stats.total} />
            <AuditStat icon="fas fa-exclamation-circle" label="Critical" value={stats.critical} tone="red" />
            <AuditStat icon="fas fa-tools" label="Needs Work" value={stats.needsWork} tone="orange" />
            <AuditStat icon="fas fa-check-circle" label="Ready" value={stats.ready} tone="green" />
          </section>

          <div className="aaudit-toolbar">
            {[
              ["all", "All"],
              ["critical", "Critical"],
              ["needs-work", "Needs Work"],
              ["ready", "Ready"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`aaudit-filter${filter === value ? " is-active" : ""}`}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <section className="aaudit-list">
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => <AuditSkeleton key={idx} />)
            ) : filteredAudit.length ? (
              filteredAudit.map((item) => <AuditRow key={item.post.id} item={item} />)
            ) : (
              <div className="aaudit-empty">
                <i className="fas fa-check-circle" />
                <p>No posts found for this audit filter.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function AuditStat({ icon, label, value, tone = "blue" }) {
  return (
    <div className={`aaudit-stat aaudit-stat--${tone}`}>
      <span><i className={icon} /></span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}

function AuditRow({ item }) {
  const combined = [...item.issues, ...item.warnings];
  return (
    <article className={`aaudit-row aaudit-row--${item.priority}`}>
      <div className="aaudit-row-main">
        <div className="aaudit-row-head">
          <h3>{item.post.title || "Untitled post"}</h3>
          <span className={`aaudit-status aaudit-status--${item.priority}`}>{item.priority.replace("-", " ")}</span>
        </div>
        <div className="aaudit-row-meta">
          <span>{statusOf(item.post)}</span>
          <span>{item.words.toLocaleString("en-IN")} words</span>
          <span>{item.categories.length ? item.categories.join(", ") : "No category"}</span>
        </div>
        <div className="aaudit-issues">
          {combined.length ? combined.slice(0, 5).map((issue) => <span key={issue}>{issue}</span>) : <span>Looks good</span>}
          {combined.length > 5 && <span>+{combined.length - 5} more</span>}
        </div>
      </div>
      <div className="aaudit-row-side">
        <div className="aaudit-meter" aria-label={`Score ${item.score}`}>
          <svg viewBox="0 0 42 42">
            <circle cx="21" cy="21" r="16" />
            <circle cx="21" cy="21" r="16" style={{ "--pct": item.score }} />
          </svg>
          <strong>{item.score}</strong>
        </div>
        <Link to={`/admin/post/${item.post.id}/edit`} className="abtn abtn-ghost abtn-sm">Fix</Link>
      </div>
    </article>
  );
}

function AuditSkeleton() {
  return (
    <div className="aaudit-row">
      <div className="aaudit-row-main">
        <div className="askel askel-line" style={{ width: "45%", height: 18 }} />
        <div className="askel askel-line" style={{ width: "60%", height: 12, marginTop: 12 }} />
        <div className="askel askel-line" style={{ width: "80%", height: 28, marginTop: 14 }} />
      </div>
      <div className="askel askel-av" />
    </div>
  );
}
