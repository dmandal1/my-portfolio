import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAllBlogsAdmin, publishScheduledPosts } from "../../firebase/blogService";
import AdminSidebar from "./components/AdminSidebar";
import "./Admin.css";

function toDate(raw) {
  if (!raw) return null;
  if (raw?.toDate) return raw.toDate();
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toMillis(raw) {
  return toDate(raw)?.getTime() || 0;
}

function formatDate(raw) {
  const date = toDate(raw);
  if (!date) return "Not set";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(raw) {
  const date = toDate(raw);
  if (!date) return "Not scheduled";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysFromNow(raw) {
  const date = toDate(raw);
  if (!date) return null;
  return Math.round((date.getTime() - Date.now()) / 86400000);
}

function statusOf(post) {
  if (post.published) return "published";
  if (post.pendingReview) return "pending";
  if (post.scheduledAt) return "scheduled";
  return "draft";
}

const STATUS_META = {
  draft: { label: "Draft", icon: "fas fa-pen", tone: "gray" },
  pending: { label: "Pending Review", icon: "fas fa-hourglass-half", tone: "orange" },
  scheduled: { label: "Scheduled", icon: "far fa-calendar-check", tone: "blue" },
  published: { label: "Published", icon: "fas fa-check-circle", tone: "green" },
};

function readingMinutes(post) {
  const words = String(post.content || "")
    .replace(/<[^>]*>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function plannedWeek() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return date;
  });
}

export default function AdminEditorialPlanner() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const rows = await getAllBlogsAdmin();
        if (!cancelled) setPosts(rows);
      } catch (err) {
        console.error("Editorial planner failed:", err);
        if (!cancelled) setError("Editorial planner could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    publishScheduledPosts().catch(console.error);
    const timer = setInterval(() => {
      publishScheduledPosts().catch(console.error);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const data = useMemo(() => {
    const groups = {
      draft: [],
      pending: [],
      scheduled: [],
      published: [],
    };

    posts.forEach((post) => {
      groups[statusOf(post)].push(post);
    });

    groups.draft.sort((a, b) => toMillis(b.updatedAt || b.createdAt) - toMillis(a.updatedAt || a.createdAt));
    groups.pending.sort((a, b) => toMillis(b.updatedAt || b.createdAt) - toMillis(a.updatedAt || a.createdAt));
    groups.scheduled.sort((a, b) => toMillis(a.scheduledAt) - toMillis(b.scheduledAt));
    groups.published.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

    const week = plannedWeek().map((day) => {
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      const scheduled = groups.scheduled.filter((post) => {
        const scheduledAt = toDate(post.scheduledAt);
        return scheduledAt && scheduledAt >= day && scheduledAt < nextDay;
      });
      return { day, scheduled };
    });

    const staleDrafts = groups.draft.filter((post) => {
      const age = daysFromNow(post.updatedAt || post.createdAt);
      return age !== null && age <= -14;
    });

    const allVisible = posts
      .filter((post) => filter === "all" || statusOf(post) === filter)
      .sort((a, b) => toMillis(b.updatedAt || b.createdAt || b.scheduledAt) - toMillis(a.updatedAt || a.createdAt || a.scheduledAt));

    return {
      groups,
      week,
      staleDrafts,
      visible: allVisible,
      nextScheduled: groups.scheduled[0] || null,
    };
  }, [posts, filter]);

  const stats = [
    { label: "Drafts", value: data.groups.draft.length, icon: "fas fa-pen", tone: "gray" },
    { label: "Pending Review", value: data.groups.pending.length, icon: "fas fa-hourglass-half", tone: "orange" },
    { label: "Scheduled", value: data.groups.scheduled.length, icon: "far fa-calendar-check", tone: "blue" },
    { label: "Published", value: data.groups.published.length, icon: "fas fa-check-circle", tone: "green" },
  ];

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
                <span className="apage-crumb-cur">Editorial Planner</span>
              </div>
              <h1 className="apage-title">Editorial Planner</h1>
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

          <section className="aplanner-hero">
            <div className="aplanner-hero-main">
              <span className="aplanner-kicker">Publishing workflow</span>
              <h2>Plan drafts, reviews, and scheduled programming posts</h2>
              <p>
                Track what needs writing, what is waiting for review, and what will publish next.
              </p>
            </div>
            <div className="aplanner-next">
              <span>Next scheduled</span>
              <strong>{data.nextScheduled?.title || "Nothing scheduled"}</strong>
              <small>{data.nextScheduled ? formatDateTime(data.nextScheduled.scheduledAt) : "Choose a publish date from the post editor"}</small>
            </div>
          </section>

          <section className="aplanner-stats">
            {stats.map((stat) => (
              <div className={`aplanner-stat aplanner-stat--${stat.tone}`} key={stat.label}>
                <span><i className={stat.icon} /></span>
                <div>
                  <strong>{loading ? "..." : stat.value}</strong>
                  <small>{stat.label}</small>
                </div>
              </div>
            ))}
          </section>

          <section className="aplanner-grid">
            <div className="aplanner-panel aplanner-panel--wide">
              <div className="aplanner-panel-head">
                <div>
                  <h3>Next 7 Days</h3>
                  <p>Scheduled publishing calendar</p>
                </div>
                <i className="far fa-calendar-alt" />
              </div>
              <div className="aplanner-week">
                {data.week.map(({ day, scheduled }) => (
                  <div className={`aplanner-day${scheduled.length ? " has-posts" : ""}`} key={day.toISOString()}>
                    <span>{day.toLocaleDateString("en-IN", { weekday: "short" })}</span>
                    <strong>{day.getDate()}</strong>
                    {scheduled.length ? (
                      <small>{scheduled.length} post{scheduled.length > 1 ? "s" : ""}</small>
                    ) : (
                      <small>Open</small>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="aplanner-panel">
              <div className="aplanner-panel-head">
                <div>
                  <h3>Needs Attention</h3>
                  <p>Old drafts and review queue</p>
                </div>
                <i className="fas fa-bolt" />
              </div>
              <div className="aplanner-attention">
                {loading ? (
                  <PlannerSkeleton compact />
                ) : data.staleDrafts.length || data.groups.pending.length ? (
                  [...data.groups.pending, ...data.staleDrafts].slice(0, 5).map((post) => (
                    <Link to={`/admin/post/${post.id}/edit`} className="aplanner-attn-item" key={post.id}>
                      <span className={`aplanner-dot aplanner-dot--${statusOf(post)}`} />
                      <div>
                        <strong>{post.title || "Untitled post"}</strong>
                        <small>{STATUS_META[statusOf(post)].label} • {formatDate(post.updatedAt || post.createdAt)}</small>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="aplanner-empty-mini">No blocked posts right now.</div>
                )}
              </div>
            </div>
          </section>

          <section className="aplanner-board">
            <div className="aplanner-toolbar">
              <div>
                <h3>Post Pipeline</h3>
                <p>Filter and open posts by workflow status</p>
              </div>
              <div className="aplanner-filters">
                {[
                  ["all", "All"],
                  ["draft", "Drafts"],
                  ["pending", "Pending"],
                  ["scheduled", "Scheduled"],
                  ["published", "Published"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`aplanner-filter${filter === value ? " is-active" : ""}`}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="aplanner-list">
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => <PlannerSkeleton key={index} />)
              ) : data.visible.length ? (
                data.visible.map((post) => <PlannerPostRow key={post.id} post={post} />)
              ) : (
                <div className="aplanner-empty">
                  <i className="far fa-calendar-check" />
                  <p>No posts found for this planner filter.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function PlannerPostRow({ post }) {
  const status = statusOf(post);
  const meta = STATUS_META[status];
  const dateLabel = status === "scheduled"
    ? formatDateTime(post.scheduledAt)
    : formatDate(post.updatedAt || post.createdAt);

  return (
    <article className="aplanner-post">
      <div className={`aplanner-post-icon aplanner-post-icon--${meta.tone}`}>
        <i className={meta.icon} />
      </div>
      <div className="aplanner-post-main">
        <div className="aplanner-post-head">
          <h4>{post.title || "Untitled post"}</h4>
          <span className={`aplanner-pill aplanner-pill--${status}`}>{meta.label}</span>
        </div>
        <div className="aplanner-post-meta">
          <span><i className="far fa-clock" /> {readingMinutes(post)} min read</span>
          <span><i className="far fa-calendar" /> {dateLabel}</span>
          {post.difficulty && <span><i className="fas fa-signal" /> {post.difficulty}</span>}
        </div>
      </div>
      <div className="aplanner-post-actions">
        {post.published && post.slug && (
          <a href={`/#/blogs/${post.slug}`} className="abtn abtn-ghost abtn-sm" target="_blank" rel="noopener noreferrer">
            View
          </a>
        )}
        <Link to={`/admin/post/${post.id}/edit`} className="abtn abtn-primary abtn-sm">
          Edit
        </Link>
      </div>
    </article>
  );
}

function PlannerSkeleton({ compact = false }) {
  return (
    <div className={`aplanner-skeleton${compact ? " aplanner-skeleton--compact" : ""}`}>
      <span />
      <div>
        <i />
        <i />
      </div>
    </div>
  );
}
