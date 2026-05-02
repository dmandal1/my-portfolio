import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../../api/config';
import AdminSidebar from './components/AdminSidebar';
import { useToast } from './components/AdminToast';

/* ── API helpers (uses /revisions.php on the PHP backend) ─────── */
async function getRevisions(blogId)    { try { return await apiFetch(`/revisions.php?blog_id=${blogId}`); } catch { return []; } }
async function getRevision(id)         { return apiFetch(`/revisions.php?id=${id}`); }
async function restoreRevision(id)     { return apiFetch(`/revisions.php?id=${id}&action=restore`, { method: 'POST' }); }
async function deleteRevision(id)      { return apiFetch(`/revisions.php?id=${id}`, { method: 'DELETE' }); }

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

function wordCount(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
}

export default function AdminRevisions() {
  const { id: blogId } = useParams();
  const toast = useToast();

  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);   // revision detail
  const [comparing, setComparing] = useState(null);   // { a, b } — two revision objects
  const [restoring, setRestoring] = useState(null);
  const [deleting, setDeleting]   = useState(null);

  async function load() {
    setLoading(true);
    try { setRevisions(await getRevisions(blogId)); }
    catch { toast?.addToast('Failed to load revisions.', 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (blogId) load(); }, [blogId]);

  async function handleView(rev) {
    try {
      const detail = await getRevision(rev.id);
      setSelected(detail);
      setComparing(null);
    } catch {
      toast?.addToast('Could not load revision detail.', 'error');
    }
  }

  async function handleRestore(rev) {
    if (!window.confirm(`Restore revision from ${timeAgo(rev.created_at)}? The current post content will be overwritten.`)) return;
    setRestoring(rev.id);
    try {
      await restoreRevision(rev.id);
      toast?.addToast('Revision restored successfully!', 'success');
      load();
    } catch {
      toast?.addToast('Restore failed. Please retry.', 'error');
    } finally { setRestoring(null); }
  }

  async function handleDelete(rev) {
    if (!window.confirm('Delete this revision? This cannot be undone.')) return;
    setDeleting(rev.id);
    try {
      await deleteRevision(rev.id);
      toast?.addToast('Revision deleted.', 'success');
      setRevisions(prev => prev.filter(r => r.id !== rev.id));
      if (selected?.id === rev.id) setSelected(null);
    } catch {
      toast?.addToast('Delete failed.', 'error');
    } finally { setDeleting(null); }
  }

  /* Compare two revisions side by side */
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');

  async function handleCompare() {
    if (!compareA || !compareB) { toast?.addToast('Select two revisions to compare.', 'error'); return; }
    try {
      const [a, b] = await Promise.all([getRevision(compareA), getRevision(compareB)]);
      setComparing({ a, b });
      setSelected(null);
    } catch {
      toast?.addToast('Could not load revisions.', 'error');
    }
  }

  return (
    <div className="alayout">
      <AdminSidebar />
      <main className="amain">
        <div className="apage-topbar">
          <div>
            <div className="apage-crumb">
              <Link to="/admin/home" className="apage-crumb-link">Admin</Link>
              <span className="apage-crumb-sep">/</span>
              <span className="apage-crumb-cur">Revisions</span>
            </div>
            <h1 className="apage-title">
              Post Revisions
            </h1>
            <p className="apage-subtitle">
              {blogId ? `Revision history for post #${blogId}.` : 'Select a post to view its revision history.'}
            </p>
          </div>
          {blogId && (
            <Link to={`/admin/post/${blogId}/edit`} className="abtn abtn-secondary">
              <i className="fas fa-arrow-left" /> Back to Editor
            </Link>
          )}
        </div>

        {!blogId ? (
          <NoBlogSelected />
        ) : loading ? (
          <div className="acard" style={{ padding: 48, textAlign: 'center', color: 'var(--atxt2)' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, display: 'block', marginBottom: 12 }} />
            Loading revisions…
          </div>
        ) : revisions.length === 0 ? (
          <div className="acard" style={{ padding: 48, textAlign: 'center', color: 'var(--atxt2)' }}>
            <i className="fas fa-history" style={{ fontSize: 36, display: 'block', marginBottom: 12, opacity: 0.3 }} />
            <strong style={{ fontSize: 15 }}>No revisions yet</strong>
            <p style={{ fontSize: 13, marginTop: 6 }}>Revisions are saved automatically each time you update a post.</p>
          </div>
        ) : (
          <>
            {/* Compare toolbar */}
            <div className="acard" style={{ padding: '12px 18px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--atxt2)', fontWeight: 500 }}>Compare:</span>
              <label htmlFor="rev-compare-a" className="sr-only">Compare revision A</label>
              <select id="rev-compare-a" name="rev_compare_a" className="aselect" style={{ minWidth: 200 }} value={compareA} onChange={e => setCompareA(e.target.value)}>
                <option value="">— Revision A —</option>
                {revisions.map(r => <option key={r.id} value={r.id}>Rev #{r.id} — {timeAgo(r.created_at)}</option>)}
              </select>
              <label htmlFor="rev-compare-b" className="sr-only">Compare revision B</label>
              <select id="rev-compare-b" name="rev_compare_b" className="aselect" style={{ minWidth: 200 }} value={compareB} onChange={e => setCompareB(e.target.value)}>
                <option value="">— Revision B —</option>
                {revisions.map(r => <option key={r.id} value={r.id}>Rev #{r.id} — {timeAgo(r.created_at)}</option>)}
              </select>
              <button className="abtn abtn-secondary" onClick={handleCompare}>
                <i className="fas fa-columns" /> Compare
              </button>
              {(selected || comparing) && (
                <button className="abtn abtn-ghost" onClick={() => { setSelected(null); setComparing(null); }}>
                  <i className="fas fa-times" /> Close
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: comparing || selected ? '300px 1fr' : '1fr', gap: 16 }}>
              {/* Revisions list */}
              <div className="acard" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--abdr)', fontWeight: 700, fontSize: 13, color: 'var(--atxt)' }}>
                  {revisions.length} Revision{revisions.length !== 1 ? 's' : ''}
                </div>
                <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                  {revisions.map((rev, idx) => (
                    <div
                      key={rev.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--abdr)',
                        cursor: 'pointer',
                        background: selected?.id === rev.id ? 'var(--ap-soft)' : 'transparent',
                        transition: 'background 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: idx === 0 ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.12)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                          <i className="fas fa-code-branch" style={{ fontSize: 11, color: idx === 0 ? '#10b981' : '#94a3b8' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--atxt)' }}>
                            Rev #{rev.id} {idx === 0 && <span style={{ fontSize: 10, background: '#10b98120', color: '#10b981', padding: '1px 6px', borderRadius: 8, marginLeft: 4 }}>Latest</span>}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--atxt2)' }}>{timeAgo(rev.created_at)}</div>
                        </div>
                      </div>
                      {rev.word_count !== undefined && (
                        <div style={{ fontSize: 11, color: 'var(--atxt2)', marginBottom: 6, marginLeft: 36 }}>
                          {rev.word_count || wordCount(rev.content)} words
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6, marginLeft: 36 }}>
                        <button className="abtn abtn-xs abtn-secondary" onClick={() => handleView(rev)}>
                          <i className="fas fa-eye" /> View
                        </button>
                        <button className="abtn abtn-xs abtn-primary" onClick={() => handleRestore(rev)} disabled={restoring === rev.id}>
                          {restoring === rev.id ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-undo" />} Restore
                        </button>
                        {idx !== 0 && (
                          <button className="abtn abtn-xs abtn-danger" onClick={() => handleDelete(rev)} disabled={deleting === rev.id}>
                            {deleting === rev.id ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-trash" />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detail / Compare panel */}
              {(selected || comparing) && (
                <div className="acard" style={{ padding: 20, overflow: 'auto', maxHeight: 700 }}>
                  {selected && (
                    <>
                      <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--atxt)' }}>
                        <i className="fas fa-file-alt" style={{ marginRight: 8, color: '#f59e0b' }} />
                        Revision #{selected.id} — {timeAgo(selected.created_at)}
                      </h3>
                      <div style={{ padding: 16, background: 'var(--acard-alt)', borderRadius: 8, fontSize: 13, lineHeight: 1.7, color: 'var(--atxt)', maxHeight: 560, overflowY: 'auto' }}
                        dangerouslySetInnerHTML={{ __html: selected.content || '<em style="color:#94a3b8">No content snapshot available</em>' }}
                      />
                    </>
                  )}
                  {comparing && (
                    <>
                      <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--atxt)' }}>
                        <i className="fas fa-columns" style={{ marginRight: 8, color: '#8b5cf6' }} />
                        Comparing Rev #{comparing.a.id} vs Rev #{comparing.b.id}
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[comparing.a, comparing.b].map((rev, i) => (
                          <div key={rev.id}>
                            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6, color: i === 0 ? '#3b82f6' : '#10b981' }}>
                              Rev #{rev.id} — {timeAgo(rev.created_at)}
                            </div>
                            <div style={{ padding: 12, background: 'var(--acard-alt)', borderRadius: 8, fontSize: 12, lineHeight: 1.6, color: 'var(--atxt)', maxHeight: 480, overflowY: 'auto', border: `2px solid ${i === 0 ? 'rgba(59,130,246,0.2)' : 'rgba(16,185,129,0.2)'}` }}
                              dangerouslySetInnerHTML={{ __html: rev.content || '<em style="color:#94a3b8">No content</em>' }}
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Info banner */}
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, fontSize: 12, color: 'var(--atxt2)' }}>
              <i className="fas fa-info-circle" style={{ color: '#f59e0b', marginRight: 6 }} />
              Revisions require a <code>blog_revisions</code> MySQL table and <code>revisions.php</code> on your Hostinger backend.
              Each time a post is saved, a snapshot is stored automatically.
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function NoBlogSelected() {
  return (
    <div className="acard" style={{ padding: 48, textAlign: 'center', color: 'var(--atxt2)' }}>
      <i className="fas fa-history" style={{ fontSize: 40, display: 'block', marginBottom: 12, opacity: 0.25 }} />
      <strong style={{ fontSize: 15 }}>No post selected</strong>
      <p style={{ fontSize: 13, marginTop: 6 }}>
        Open a post in the editor and click <strong>Revision History</strong> to view revisions.
      </p>
      <Link to="/admin/dashboard" className="abtn abtn-primary" style={{ marginTop: 16 }}>
        <i className="fas fa-file-alt" /> Go to All Posts
      </Link>
    </div>
  );
}
