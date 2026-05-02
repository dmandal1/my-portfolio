import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/config';
import AdminSidebar from './components/AdminSidebar';
import { useToast } from './components/AdminToast';

async function getPendingComments()    { try { return await apiFetch('/comments.php?pending=1'); } catch { return []; } }
async function approveComment(id)      { return apiFetch(`/comments.php?id=${id}&action=approve`, { method: 'POST' }); }
async function rejectComment(id)       { return apiFetch(`/comments.php?id=${id}&action=reject`,  { method: 'POST' }); }
async function markSpam(id)            { return apiFetch(`/comments.php?id=${id}&action=spam`,    { method: 'POST' }); }

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

export default function AdminModerationQueue() {
  const toast = useToast();
  const [comments, setComments]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [acting, setActing]       = useState(null);
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState(new Set());
  const [bulkActing, setBulkActing] = useState(false);

  async function load() {
    setLoading(true);
    try { setComments(await getPendingComments()); }
    catch { toast?.addToast('Failed to load pending comments.', 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function act(id, action, fn) {
    setActing(`${id}-${action}`);
    try {
      await fn(id);
      setComments(prev => prev.filter(c => c.id !== id));
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
      toast?.addToast(action === 'approve' ? 'Comment approved.' : action === 'spam' ? 'Marked as spam.' : 'Comment rejected.', 'success');
    } catch { toast?.addToast(`Action failed.`, 'error'); }
    finally { setActing(null); }
  }

  async function bulkAct(action, fn) {
    if (!selected.size) return;
    setBulkActing(true);
    const ids = [...selected];
    try {
      await Promise.all(ids.map(id => fn(id)));
      setComments(prev => prev.filter(c => !ids.includes(c.id)));
      setSelected(new Set());
      toast?.addToast(`${ids.length} comment${ids.length > 1 ? 's' : ''} ${action}.`, 'success');
    } catch { toast?.addToast('Bulk action failed.', 'error'); }
    finally { setBulkActing(false); }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return comments;
    const q = search.toLowerCase();
    return comments.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.message || '').toLowerCase().includes(q) ||
      (c.blog_title || '').toLowerCase().includes(q)
    );
  }, [comments, search]);

  const allSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(filtered.map(c => c.id)));
  }

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
                <span className="apage-crumb-cur">Moderation</span>
              </div>
              <h1 className="apage-title">Comment Moderation</h1>
              <p className="apage-subtitle">Review and action pending comments before they go live.</p>
            </div>
            <div className="atopbar-right-group">
              <div className="asearch-wrap" style={{ minWidth: 260 }}>
                <i className="fas fa-search asearch-icon" />
                <input
                  id="mod-search"
                  name="mod-search"
                  type="text"
                  className="asearch-input"
                  placeholder="Search comments…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button type="button" className="asearch-clear" onClick={() => setSearch('')}>
                    <i className="fas fa-times" />
                  </button>
                )}
              </div>
              <button className={`arefresh-btn ${loading ? "is-refreshing" : ""}`} onClick={load} title="Refresh Queue">
                <i className="fas fa-sync-alt" />
              </button>
            </div>
          </div>

        {/* Stats */}
        <div className="astat-strip">
          {[
            { key: 'pending', label: 'Pending', val: comments.length, mod: 'pending' },
            { key: 'selected', label: 'Selected', val: selected.size, mod: 'info' },
            { key: 'reviewed', label: 'Reviewed today', val: '—', mod: 'pub' },
          ].map((c, i, arr) => (
            <div key={c.key} className={`astat-strip-item astat-strip-item--${c.mod}`}>
              <span className="astat-strip-value">{loading ? <span className="askel askel-line" style={{ width: 36, height: 26, display: 'block' }} /> : c.val}</span>
              <span className="astat-strip-label">{c.label}</span>
              {i < arr.length - 1 && <div className="astat-strip-divider" />}
            </div>
          ))}
        </div>

        {/* Bulk Toolbar */}
        {selected.size > 0 && (
          <div className="amod-bulk-toolbar">
            <div className="amod-bulk-left">
              <span className="amod-bulk-count"><strong>{selected.size}</strong> comments selected</span>
              <div className="amod-bulk-actions">
                <button className="abtn abtn-sm abtn-primary" disabled={bulkActing} onClick={() => bulkAct('approved', approveComment)}>
                  <i className="fas fa-check" /> Approve
                </button>
                <button className="abtn abtn-sm abtn-danger" disabled={bulkActing} onClick={() => bulkAct('rejected', rejectComment)}>
                  <i className="fas fa-times" /> Reject
                </button>
                <button className="abtn abtn-sm abtn-secondary" disabled={bulkActing} onClick={() => bulkAct('marked as spam', markSpam)}>
                  <i className="fas fa-ban" /> Spam
                </button>
              </div>
            </div>
            <button className="abtn abtn-sm abtn-ghost" onClick={() => setSelected(new Set())}>Deselect All</button>
          </div>
        )}

        {/* Queue Table */}
        <div className="acard" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div className="atable-loading">
              <i className="fas fa-spinner fa-spin" />
              <span>Checking moderation queue...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="aempty amod-empty-card">
              <div className="aempty-icon">
                <i className="fas fa-check-double" />
              </div>
              <h3 className="aempty-title">{comments.length === 0 ? 'No pending comments!' : 'No matching comments'}</h3>
              <p className="aempty-sub">All caught up. 🎉 Everything has been reviewed.</p>
            </div>
          ) : (
            <div className="atable-responsive">
              <table className="atable">
                <thead>
                  <tr>
                    <th style={{ width: 40, paddingLeft: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input 
                          id="bulk-select-all"
                          type="checkbox" 
                          checked={filtered.length > 0 && selected.size === filtered.length}
                          onChange={(e) => {
                            if (e.target.checked) setSelected(new Set(filtered.map(c => c.id)));
                            else setSelected(new Set());
                          }}
                        />
                        <label htmlFor="bulk-select-all" className="sr-only">Select all comments</label>
                      </div>
                    </th>
                    <th style={{ width: 220 }}>Author</th>
                    <th>Comment</th>
                    <th style={{ width: 200 }}>Post / Origin</th>
                    <th style={{ width: 140 }}>Time</th>
                    <th style={{ textAlign: "right", paddingRight: 24, width: 220 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(comment => (
                    <tr key={comment.id} className={`amod-row ${selected.has(comment.id) ? 'is-selected' : ''}`}>
                      <td style={{ paddingLeft: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <input 
                            id={`comment-select-${comment.id}`}
                            type="checkbox" 
                            checked={selected.has(comment.id)} 
                            onChange={() => {
                              setSelected(prev => { const n = new Set(prev); n.has(comment.id) ? n.delete(comment.id) : n.add(comment.id); return n; });
                            }} 
                          />
                          <label htmlFor={`comment-select-${comment.id}`} className="sr-only">Select comment from {comment.name}</label>
                        </div>
                      </td>
                      <td>
                        <div className="anl-sub-info">
                          <div className="anl-sub-avatar">{(comment.name || 'U').charAt(0).toUpperCase()}</div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="anl-sub-email">{comment.name || 'Anonymous'}</span>
                            <span style={{ fontSize: 11, color: 'var(--atxt2)', opacity: 0.7 }}>{comment.email || 'No email'}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="amod-comment-bubble" style={{ margin: 0, background: 'none', padding: 0, fontSize: 13 }}>
                          {comment.message}
                        </div>
                      </td>
                      <td>
                        <div className="anl-sub-date" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="fas fa-file-alt" style={{ opacity: 0.5 }} />
                          <span>{comment.blog_title || 'Unknown post'}</span>
                        </div>
                      </td>
                      <td>
                        <span className="anl-sub-date">{timeAgo(comment.created_at)}</span>
                      </td>
                      <td style={{ textAlign: "right", paddingRight: 24 }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="abtn abtn-sm abtn-primary" disabled={!!acting} onClick={() => act(comment.id, 'approve', approveComment)}>
                            {acting === `${comment.id}-approve` ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check" />}
                          </button>
                          <button className="abtn abtn-sm abtn-danger" disabled={!!acting} onClick={() => act(comment.id, 'reject', rejectComment)}>
                            {acting === `${comment.id}-reject` ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-times" />}
                          </button>
                          <button className="abtn abtn-sm abtn-secondary" disabled={!!acting} onClick={() => act(comment.id, 'spam', markSpam)}>
                            {acting === `${comment.id}-spam` ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-ban" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      </main>
    </div>
  );
}
