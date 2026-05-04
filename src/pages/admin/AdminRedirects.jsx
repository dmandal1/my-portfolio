import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/config';
import AdminSidebar from './components/AdminSidebar';
import { useToast } from './components/AdminToast';

/* ─── helpers ─────────────────────────────────────────────────── */
async function getRedirects()        { try { return await apiFetch('/redirects.php'); } catch { return []; } }
async function createRedirect(d)     { return apiFetch('/redirects.php', { method: 'POST',   body: JSON.stringify(d) }); }
async function updateRedirect(id, d) { return apiFetch(`/redirects.php?id=${id}`, { method: 'PUT',    body: JSON.stringify(d) }); }
async function deleteRedirect(id)    { return apiFetch(`/redirects.php?id=${id}`, { method: 'DELETE' }); }

const BLANK = { from_path: '', to_path: '', type: '301', note: '' };

export default function AdminRedirects() {
  const toast = useToast();
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState(BLANK);
  const [editId, setEditId]     = useState(null);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch]     = useState('');
  const fromRef = useRef(null);

  function field(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function load() {
    setLoading(true);
    try { setRows(await getRedirects()); }
    catch { toast?.addToast('Failed to load redirects.', 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function startEdit(row) {
    setEditId(row.id);
    setForm({ from_path: row.from_path, to_path: row.to_path, type: row.type || '301', note: row.note || '' });
  }
  function cancelEdit() { setEditId(null); setForm(BLANK); }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.from_path.trim() || !form.to_path.trim()) {
      toast?.addToast('From and To paths are required.', 'error'); return;
    }
    setSaving(true);
    try {
      if (editId) {
        await updateRedirect(editId, form);
        toast?.addToast('Redirect updated.', 'success');
      } else {
        await createRedirect(form);
        toast?.addToast('Redirect created.', 'success');
      }
      cancelEdit();
      await load();
    } catch {
      toast?.addToast('Save failed. Please retry.', 'error');
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await deleteRedirect(id);
      toast?.addToast('Redirect deleted.', 'success');
      setRows(prev => prev.filter(r => r.id !== id));
    } catch {
      toast?.addToast('Delete failed.', 'error');
    } finally { setDeleting(null); }
  }

  const filtered = rows.filter(r =>
    !search.trim() ||
    r.from_path.toLowerCase().includes(search.toLowerCase()) ||
    r.to_path.toLowerCase().includes(search.toLowerCase())
  );

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
                <span className="apage-crumb-cur">Redirects</span>
              </div>
              <h1 className="apage-title">Redirect Manager</h1>
              <p className="apage-subtitle">Manage 301 / 302 URL redirects to prevent broken links after slug changes.</p>
            </div>
            <div className="atopbar-right-group">
              <div className="acat-search-wrap">
                <label htmlFor="redir-search" className="sr-only">Search Redirects</label>
                <i className="fas fa-search acat-search-icon" />
                <input
                  id="redir-search"
                  name="search"
                  className="acat-search-input"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoComplete="off"
                />
                {search && (
                  <button type="button" className="acat-search-clear" onClick={() => setSearch("")}>
                    <i className="fas fa-times" />
                  </button>
                )}
              </div>
              <button className={`arefresh-btn ${loading ? "is-refreshing" : ""}`} onClick={load} title="Refresh Redirects">
                <i className="fas fa-sync-alt" />
              </button>
            </div>
          </div>

        {/* Add / Edit form */}
        <div className="acard ared-form-card">
          <div className="ared-form-header">
            <h3 className="ared-form-title">
              {editId ? <><i className="fas fa-edit" /> Edit Redirect</> : <><i className="fas fa-plus" /> Add New Redirect</>}
            </h3>
            {editId && <button type="button" className="abtn abtn-sm abtn-ghost" onClick={cancelEdit}>Cancel Editing</button>}
          </div>
          <form onSubmit={handleSave} className="ared-form-grid">
            <div className="aform-group">
              <label htmlFor="redir-from" className="acat-label">Source Path <span className="acat-required">*</span></label>
              <input
                id="redir-from"
                name="from_path"
                ref={fromRef}
                className="ainput"
                placeholder="e.g. /old-blog-post"
                value={form.from_path}
                onChange={(e) => field("from_path", e.target.value)}
                autoComplete="off"
                required
              />
              <p className="acat-hint">Must start with a slash (e.g. /demo)</p>
            </div>
            <div className="aform-group">
              <label htmlFor="redir-to" className="acat-label">Destination URL <span className="acat-required">*</span></label>
              <input
                id="redir-to"
                name="to_path"
                className="ainput"
                placeholder="e.g. /new-post or https://external.com"
                value={form.to_path}
                onChange={(e) => field("to_path", e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <div className="aform-group">
              <label htmlFor="redir-code" className="acat-label">HTTP Code</label>
              <select
                id="redir-code"
                name="type"
                className="ainput"
                value={form.type}
                onChange={(e) => field("type", e.target.value)}
              >
                <option value="301">301 (Permanent)</option>
                <option value="302">302 (Temporary)</option>
              </select>
            </div>
            <div className="aform-group">
              <label htmlFor="redirect-note" className="acat-label">Note (optional)</label>
              <input 
                id="redirect-note"
                name="redirect-note"
                className="ainput" 
                placeholder="e.g. slug rename" 
                value={form.note} 
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))} 
              />
            </div>
            <div className="ared-form-actions">
              <button type="submit" className="abtn abtn-primary ared-submit-btn" disabled={saving}>
                {saving ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-save" />}
                <span>{editId ? 'Update Redirect' : 'Add Redirect'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Table */}
        <div className="acard" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div className="aempty ared-empty ared-loading">
              <div className="aempty-icon">
                <i className="fas fa-spinner fa-spin" />
              </div>
              <h3 className="aempty-title">Loading redirects...</h3>
              <p className="aempty-sub">Fetching the latest URL mapping data.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="aempty ared-empty">
              <div className="aempty-icon">
                <i className="fas fa-directions" />
              </div>
              <h3 className="aempty-title">{rows.length === 0 ? 'No redirects yet' : 'No matching redirects'}</h3>
              <p className="aempty-sub">{rows.length === 0 ? 'Add your first URL redirect using the form above.' : 'Try adjusting your search filters.'}</p>
            </div>
          ) : (
            <div className="atable-responsive">
              <table className="atable" style={{ marginBottom: 0 }}>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 24 }}>From Path</th>
                    <th>To Path</th>
                    <th style={{ textAlign: 'center' }}>Type</th>
                    <th>Note</th>
                    <th style={{ textAlign: 'center' }}>Created</th>
                    <th style={{ paddingRight: 24 }} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(row => (
                    <tr key={row.id} style={editId === row.id ? { background: 'var(--ap-soft)' } : {}}>
                      <td style={{ paddingLeft: 24 }}>
                        <code style={{ fontSize: 12, background: 'var(--acard-alt)', padding: '2px 6px', borderRadius: 4, color: 'var(--atxt)' }}>{row.from_path}</code>
                      </td>
                      <td>
                        <code style={{ fontSize: 12, background: 'var(--acard-alt)', padding: '2px 6px', borderRadius: 4, color: '#10b981' }}>{row.to_path}</code>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: row.type === '301' ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)', color: row.type === '301' ? '#3b82f6' : '#f59e0b' }}>
                          {row.type}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--atxt2)' }}>{row.note || '—'}</td>
                      <td style={{ textAlign: 'center', fontSize: 12, color: 'var(--atxt2)' }}>
                        {row.created_at ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', paddingRight: 24, textAlign: 'right' }}>
                        <button className="abtn abtn-sm abtn-secondary" onClick={() => startEdit(row)} style={{ marginRight: 6 }}><i className="fas fa-edit" /></button>
                        <button className="abtn abtn-sm abtn-danger" onClick={() => handleDelete(row.id)} disabled={deleting === row.id}>
                          {deleting === row.id ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-trash" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Note about PHP backend */}
        <div className="ast-banner asettings-dirty-banner ared-info-banner">
          <div className="ast-dirty-info">
            <i className="fas fa-info-circle" />
            <span>
              Redirects are stored in your MySQL <code>redirects</code> table and served by <code>redirects.php</code>.
              Your PHP router should read this table and issue the appropriate HTTP redirect before rendering any page.
            </span>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
