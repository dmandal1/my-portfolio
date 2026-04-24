import React, { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import "./BlogCard.css";

function formatDate(ts) {
  if (!ts) return "Freshly published";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function readingTime(content) {
  if (!content) return "1 min read";
  const words = content.replace(/[#*_`~[\]()>!-]/g, "").split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

function initials(name) {
  return (name || "A")
    .trim()
    .split(" ")
    .map((part) => part[0]?.toUpperCase() || "")
    .slice(0, 2)
    .join("");
}


export default function BlogCard({ blog, index = 0 }) {
  const cardRef = useRef(null);
  const prefetchedRef = useRef(false);
  const isInternal = Boolean(blog.slug);
  const href = isInternal ? `/blogs/${blog.slug}` : blog.externalUrl || blog.url;
  const tags = blog.tags
    ? blog.tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 3)
    : [];

  const authorName = blog.author || "Admin";

  const stats = useMemo(() => ({
    comments: blog.commentsCount ?? 0,
    views: blog.views ?? 0,
    read: readingTime(blog.content || blog.description || blog.subtitle),
  }), [blog]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("bc-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function prefetchCover() {
    if (prefetchedRef.current) return;
    if (!blog?.image) return;
    prefetchedRef.current = true;
    const img = new Image();
    img.decoding = "async";
    img.src = blog.image;
  }

  return (
    <article
      className="bc-card"
      ref={cardRef}
      style={{ "--delay": `${index * 0.08}s` }}
    >
      <div className="bc-img-wrap">
        {blog.image ? (
          <img
            src={blog.image}
            alt={blog.imageAlt || blog.title}
            className="bc-img"
            loading={index < 2 ? "eager" : "lazy"}
            fetchPriority={index < 2 ? "high" : "low"}
            decoding="async"
            onLoad={prefetchCover}
          />
        ) : (
          <div className="bc-img-placeholder">
            <span className="bc-img-placeholder-icon">✍️</span>
          </div>
        )}

        <div className="bc-img-shimmer" />
        <div className="bc-img-gradient" />

        {blog.featured && (
          <div className="bc-featured-badge">
            <i className="fas fa-star" /> Featured
          </div>
        )}

        {tags.length > 0 && (
          <div className="bc-tags-overlay">
            {tags.map((tag) => (
              <span key={tag} className="bc-tag">{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div className="bc-body">
        <h3 className="bc-title">{blog.title}</h3>

        <div className="bc-author-row">
          <span className="bc-author-avatar">{initials(authorName)}</span>
          <span className="bc-author-name">{authorName}</span>
          <span className="bc-meta-sep">•</span>
          <span className="bc-inline-meta">{formatDate(blog.createdAt)}</span>
        </div>

        {(blog.excerpt || blog.subtitle || blog.description) && (
          <p className="bc-excerpt">{blog.excerpt || blog.subtitle || blog.description}</p>
        )}

        {(blog.difficulty || blog.series) && (
          <div className="bc-tech-row">
            {blog.difficulty && (
              <span><i className="fas fa-signal" /> {blog.difficulty}</span>
            )}
            {blog.series && (
              <span><i className="fas fa-layer-group" /> {blog.series}</span>
            )}
          </div>
        )}

        <div className="bc-footer">
          <div className="bc-meta">
            <span className="bc-stat">
              <i className="fas fa-comment-alt" /> {stats.comments}
            </span>
            <span className="bc-stat">
              <i className="fas fa-eye" /> {Number(stats.views).toLocaleString("en-IN")}
            </span>
            <span className="bc-stat">
              <i className="far fa-clock" /> {stats.read}
            </span>
          </div>

          {isInternal ? (
            <Link
              to={href}
              state={{
                prefetchImage: blog.image || "",
                prefetchTitle: blog.title || "",
              }}
              className="bc-read-btn"
              onMouseEnter={prefetchCover}
              onFocus={prefetchCover}
              onTouchStart={prefetchCover}
            >
              Read More
              <svg className="bc-arrow" viewBox="0 0 16 16" fill="none" width="14" height="14">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ) : (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="bc-read-btn"
              onMouseEnter={prefetchCover}
              onFocus={prefetchCover}
              onTouchStart={prefetchCover}
            >
              Read More
              <svg className="bc-arrow" viewBox="0 0 16 16" fill="none" width="14" height="14">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
