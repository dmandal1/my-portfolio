import React, { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import AdminSidebar from "./components/AdminSidebar";
import { getAllBlogsAdmin, getComments, addComment, deleteComment } from "../../api/apiService";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";
import "./Admin.css";

function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function avatarInitials(name = "") {
  return name.trim().split(" ").map((p) => p[0]?.toUpperCase() || "").slice(0, 2).join("");
}

function avatarColor(name = "") {
  const colors = ["#3b82f6","#10b981","#8b5cf6","#f59e0b","#ef4444","#06b6d4","#84cc16","#f97316"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

export default function AdminComments() {
  const [blogs, setBlogs]           = useState([]);
  const [selected, setSelected]     = useState(null);
  const [comments, setComments]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [blogsLoading, setBlogsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText]   = useState("");
  const [posting, setPosting]       = useState(false);
  const [toast, setToast]           = useState(null);
  const [search, setSearch]         = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]     = useState(false);

  const { profile } = usePortfolioData();
  const authorName = profile?.logo_name || profile?.title || "Author";
  const location = useLocation();

  useEffect(() => {
    const incomingBlogId = location.state?.blogId ?? null;
    getAllBlogsAdmin().then((all) => {
      setBlogs(all);
      setBlogsLoading(false);
      if (incomingBlogId) {
        const match = all.find((b) => b.id === incomingBlogId);
        if (match) {
          setSelected({ blogId: match.id, blogTitle: match.title });
          setLoading(true);
          getComments(match.id).then((data) => { setComments(data); setLoading(false); });
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadComments = useCallback(async (blogId) => {
    setLoading(true);
    const data = await getComments(blogId);
    setComments(data);
    setLoading(false);
  }, []);

  function selectBlog(blog) {
    setSelected({ blogId: blog.id, blogTitle: blog.title });
    setReplyingTo(null);
    setReplyText("");
    loadComments(blog.id);
  }

  async function handleReply(e) {
    e.preventDefault();
    if (!replyText.trim()) return;
    setPosting(true);
    try {
      await addComment(selected.blogId, {
        name: authorName,
        message: replyText.trim(),
        parentId: replyingTo,
        isAuthorReply: true,
      });
      setReplyText("");
      setReplyingTo(null);
      await loadComments(selected.blogId);
      showToast("Reply posted successfully!", false);
    } catch {
      showToast("Failed to post reply.", true);
    }
    setPosting(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteComment(deleteTarget.blogId, deleteTarget.commentId);
      await loadComments(selected.blogId);
      showToast("Comment deleted.", false);
    } catch {
      showToast("Failed to delete comment.", true);
    }
    setDeleting(false);
    setDeleteTarget(null);
  }

  function showToast(msg, err = false) {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3500);
  }

  const topLevel = comments.filter((c) => !c.parentId);
  const repliesMap = comments.reduce((acc, c) => {
    if (c.parentId) acc[c.parentId] = [...(acc[c.parentId] || []), c];
    return acc;
  }, {});

  const commentedBlogs = blogs
    .filter((b) => b.published)
    .sort((a, b) => {
      const hasA = (a.commentsCount ?? 0) > 0;
      const hasB = (b.commentsCount ?? 0) > 0;
      if (hasA !== hasB) return hasA ? -1 : 1;
      const ta = a.lastCommentedAt?.toDate?.() ?? a.lastCommentedAt ?? new Date(0);
      const tb = b.lastCommentedAt?.toDate?.() ?? b.lastCommentedAt ?? new Date(0);
      return new Date(tb) - new Date(ta);
    });

  const filteredBlogs = commentedBlogs.filter((b) =>
    b.title?.toLowerCase().includes(search.toLowerCase())
  );

  const totalComments = topLevel.length;
  const totalReplies  = comments.filter((c) => c.parentId).length;

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
                <span className="apage-crumb-cur">Comments</span>
              </div>
              <h1 className="apage-title">Comments</h1>
            </div>
          </div>

          {/* ── Toast ── */}
          {toast && (
            <div className={`acmt2-toast${toast.err ? " acmt2-toast--err" : ""}`}>
              <i className={`fas fa-${toast.err ? "exclamation-circle" : "check-circle"}`} />
              <span>{toast.msg}</span>
            </div>
          )}

          <div className="acmt2-layout">

            {/* ══ LEFT: Post list ══ */}
            <aside className="acmt2-sidebar">
              <div className="acmt2-sidebar-head">
                <span className="acmt2-sidebar-title">Posts</span>
                <span className="acmt2-sidebar-badge">{commentedBlogs.length}</span>
              </div>
              <div className="acmt2-search">
                <label htmlFor="comment-post-search" className="sr-only">Search Posts</label>
                <i className="fas fa-search acmt2-search-icon" />
                <input
                  id="comment-post-search"
                  name="comment-post-search"
                  className="acmt2-search-input"
                  placeholder="Search posts…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="acmt2-search-clear" onClick={() => setSearch("")} aria-label="Clear">
                    <i className="fas fa-times" />
                  </button>
                )}
              </div>
              <div className="acmt2-blog-list">
                {blogsLoading ? (
                  [1,2,3,4].map(i => <div key={i} className="acmt2-blog-skeleton" />)
                ) : filteredBlogs.length === 0 ? (
                  <div className="acmt2-sidebar-empty">No posts found</div>
                ) : filteredBlogs.map((b) => {
                  const isActive = selected?.blogId === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      className={`acmt2-blog-item${isActive ? " is-active" : ""}`}
                      onClick={() => selectBlog(b)}
                    >
                      <div className="acmt2-blog-item-icon">
                        <i className="fas fa-file-alt" />
                      </div>
                      <div className="acmt2-blog-item-body">
                        <span className="acmt2-blog-item-title">{b.title}</span>
                        <span className="acmt2-blog-item-count">
                          <i className="fas fa-comment" /> {b.commentsCount ?? 0}
                        </span>
                      </div>
                      {isActive && <i className="fas fa-chevron-right acmt2-blog-item-arrow" />}
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* ══ RIGHT: Comments panel ══ */}
            <div className="acmt2-panel">
              {selected ? (
                <>
                  {/* Panel header */}
                  <div className="acmt2-panel-header">
                    <div className="acmt2-panel-header-left">
                      <h2 className="acmt2-panel-title">{selected.blogTitle}</h2>
                      <div className="acmt2-panel-stats">
                        <span className="acmt2-stat-chip">
                          <i className="fas fa-comment" /> {totalComments} comment{totalComments === 1 ? "" : "s"}
                        </span>
                        {totalReplies > 0 && (
                          <span className="acmt2-stat-chip acmt2-stat-chip--reply">
                            <i className="fas fa-reply" /> {totalReplies} {totalReplies === 1 ? "reply" : "replies"}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="acmt2-refresh-btn"
                      onClick={() => loadComments(selected.blogId)}
                      title="Refresh comments"
                      disabled={loading}
                    >
                      <i className={`fas fa-sync-alt${loading ? " fa-spin" : ""}`} />
                    </button>
                  </div>

                  {/* Comments list */}
                  <div className={`acmt2-comments${loading && comments.length > 0 ? " is-refreshing" : ""}`}>
                    {loading && comments.length === 0 ? (
                      <div className="acmt2-loading">
                        <div className="acmt2-loading-spinner" />
                        <span>Loading comments…</span>
                      </div>
                    ) : topLevel.length === 0 ? (
                      <div className="acmt2-no-comments">
                        <div className="acmt2-no-comments-icon"><i className="far fa-comment-dots" /></div>
                        <p className="acmt2-no-comments-title">No comments yet</p>
                        <p className="acmt2-no-comments-sub">Be the first to start the conversation.</p>
                      </div>
                    ) : topLevel.map((c) => {
                      const reps = repliesMap[c.id] || [];
                      const isReplying = replyingTo === c.id;
                      return (
                        <div key={c.id} className="acmt2-comment-card">
                          {/* Comment header */}
                          <div className="acmt2-comment-row">
                            <div
                              className="acmt2-avatar"
                              style={{ background: avatarColor(c.name) }}
                            >
                              {avatarInitials(c.name)}
                            </div>
                            <div className="acmt2-comment-body">
                              <div className="acmt2-comment-top">
                                <div className="acmt2-comment-meta">
                                  <span className="acmt2-commenter-name">{c.name}</span>
                                  <span className="acmt2-comment-time">
                                    <i className="far fa-clock" /> {formatDate(c.createdAt)} · {formatTime(c.createdAt)}
                                  </span>
                                </div>
                                <div className="acmt2-comment-actions">
                                  <button
                                    type="button"
                                    className={`acmt2-action-btn acmt2-action-btn--reply${isReplying ? " is-active" : ""}`}
                                    onClick={() => { setReplyingTo(isReplying ? null : c.id); setReplyText(""); }}
                                    title={isReplying ? "Cancel reply" : "Reply"}
                                  >
                                    <i className={`fas fa-${isReplying ? "times" : "reply"}`} />
                                    <span>{isReplying ? "Cancel" : "Reply"}</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="acmt2-action-btn acmt2-action-btn--delete"
                                    onClick={() => setDeleteTarget({ blogId: selected.blogId, commentId: c.id, name: c.name })}
                                    title="Delete comment"
                                  >
                                    <i className="fas fa-trash" />
                                  </button>
                                </div>
                              </div>
                              <p className="acmt2-comment-message">{c.message}</p>
                              {reps.length > 0 && (
                                <span className="acmt2-reply-count-badge">
                                  <i className="fas fa-reply" /> {reps.length} {reps.length === 1 ? "reply" : "replies"}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Inline reply form */}
                          {isReplying && (
                            <form className="acmt2-reply-form" onSubmit={handleReply}>
                              <div className="acmt2-reply-form-author">
                                <div className="acmt2-reply-author-dot" />
                                <span>Replying as <strong>{authorName}</strong></span>
                              </div>
                              <textarea
                                id={`comment-reply-${c.id}`}
                                name={`comment-reply-${c.id}`}
                                className="acmt2-reply-textarea"
                                placeholder={`Write your reply to ${c.name}…`}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={3}
                                maxLength={600}
                                autoFocus
                              />
                              <div className="acmt2-reply-footer">
                                <span className="acmt2-reply-char">{replyText.length}/600</span>
                                <div className="acmt2-reply-btns">
                                  <button type="button" className="acmt2-cancel-btn" onClick={() => { setReplyingTo(null); setReplyText(""); }}>
                                    Cancel
                                  </button>
                                  <button type="submit" className="acmt2-submit-btn" disabled={posting || !replyText.trim()}>
                                    {posting
                                      ? <><i className="fas fa-spinner fa-spin" /> Posting…</>
                                      : <><i className="fas fa-paper-plane" /> Post Reply</>
                                    }
                                  </button>
                                </div>
                              </div>
                            </form>
                          )}

                          {/* Replies */}
                          {reps.length > 0 && (
                            <div className="acmt2-replies">
                              {reps.map((r) => (
                                <div key={r.id} className="acmt2-reply-item">
                                  <div className="acmt2-reply-line" />
                                  <div className="acmt2-reply-avatar-wrap">
                                    <div className="acmt2-reply-avatar">
                                      <i className="fas fa-pen-nib" />
                                    </div>
                                  </div>
                                  <div className="acmt2-reply-body">
                                    <div className="acmt2-reply-meta">
                                      <span className="acmt2-commenter-name">{r.name}</span>
                                      <span className="acmt2-author-badge">
                                        <i className="fas fa-crown" /> Author
                                      </span>
                                      <span className="acmt2-comment-time">
                                        {formatDate(r.createdAt)}
                                      </span>
                                    </div>
                                    <p className="acmt2-comment-message">{r.message}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="acmt2-empty-state">
                  <div className="acmt2-empty-icon-wrap">
                    <i className="fas fa-comments" />
                  </div>
                  <h3 className="acmt2-empty-title">Select a post</h3>
                  <p className="acmt2-empty-desc">Choose a post from the left to view and manage its comments.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* ── Delete confirm modal ── */}
      {deleteTarget && (
        <div className="adel-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="adel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adel-icon-wrap">
              <div className="adel-icon-ring" />
              <div className="adel-icon"><i className="fas fa-trash-alt" /></div>
            </div>
            <h3 className="adel-title">Delete comment?</h3>
            <p className="adel-msg">
              Remove {deleteTarget.name ? `"${deleteTarget.name}"` : "this"}'s comment permanently? This cannot be undone.
            </p>
            <div className="adel-actions">
              <button className="adel-btn-cancel" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="adel-btn-confirm" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
