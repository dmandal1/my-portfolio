import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllBlogsAdmin, updateBlog } from '../../api/apiService';
import { createPortal } from 'react-dom';
import AdminSidebar from './components/AdminSidebar';
import { useToast } from './components/AdminToast';

/* ── SEO completeness score (0-100) ───────────────────────────────── */
function seoScore(blog) {
  let score = 0;
  if (blog.title?.trim())           score += 15;
  if (blog.slug?.trim())            score += 10;
  if (blog.metaTitle?.trim())       score += 20;
  if (blog.metaDescription?.trim()) score += 20;
  if (blog.image?.trim())           score += 10;
  if (blog.imageAlt?.trim())        score += 10;
  if ((blog.tags || '').trim())     score += 5;
  if (blog.excerpt?.trim())         score += 5;
  if (blog.canonicalUrl?.trim())    score += 5;
  return score;
}

function scoreColor(s) {
  if (s >= 80) return '#10b981';
  if (s >= 50) return '#f59e0b';
  return '#ef4444';
}

function scoreLabel(s) {
  if (s >= 80) return 'Good';
  if (s >= 50) return 'Fair';
  return 'Poor';
}

const TITLE_MAX = 60;
const DESC_MAX  = 160;

export default function AdminSEO() {
  const toast = useToast();
  const [blogs, setBlogs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');   // all | poor | fair | good
  const [search, setSearch]   = useState('');
  const [editing, setEditing] = useState(null);    // { id, metaTitle, metaDescription, canonicalUrl }
  const [saving, setSaving]   = useState(false);
  const [sortBy, setSortBy]   = useState('score');  // score | title | date

  async function load() {
    setLoading(true);
    try {
      const data = await getAllBlogsAdmin();
      setBlogs(data);
    } catch {
      toast?.addToast('Failed to load posts.', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    let list = blogs.map(b => ({ ...b, _score: seoScore(b) }));

    if (filter === 'poor') list = list.filter(b => b._score < 50);
    else if (filter === 'fair') list = list.filter(b => b._score >= 50 && b._score < 80);
    else if (filter === 'good') list = list.filter(b => b._score >= 80);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(b =>
        (b.title || '').toLowerCase().includes(q) ||
        (b.slug || '').toLowerCase().includes(q)
      );
    }

    if (sortBy === 'score') list.sort((a, b) => a._score - b._score);
    else if (sortBy === 'title') list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    else list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return list;
  }, [blogs, filter, search, sortBy]);

  function startEdit(blog) {
    setEditing({
      id:               blog.id,
      metaTitle:        blog.metaTitle        || '',
      metaDescription:  blog.metaDescription  || '',
      canonicalUrl:     blog.canonicalUrl     || '',
      imageAlt:         blog.imageAlt         || '',
      excerpt:          blog.excerpt          || '',
    });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await updateBlog(editing.id, {
        metaTitle:       editing.metaTitle,
        metaDescription: editing.metaDescription,
        canonicalUrl:    editing.canonicalUrl,
        imageAlt:        editing.imageAlt,
        excerpt:         editing.excerpt,
      });
      setBlogs(prev => prev.map(b => b.id === editing.id ? { ...b, ...editing } : b));
      toast?.addToast('SEO fields saved.', 'success');
      setEditing(null);
    } catch {
      toast?.addToast('Save failed. Please retry.', 'error');
    } finally {
      setSaving(false);
    }
  }

  const avgScore = blogs.length
    ? Math.round(blogs.reduce((s, b) => s + seoScore(b), 0) / blogs.length)
    : 0;
  const poorCount = blogs.filter(b => seoScore(b) < 50).length;
  const goodCount = blogs.filter(b => seoScore(b) >= 80).length;

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
                <span className="apage-crumb-cur">SEO Manager</span>
              </div>
              <h1 className="apage-title">SEO Manager</h1>
              <p className="apage-subtitle">Monitor and optimise meta fields across all posts.</p>
            </div>
            <div className="atopbar-right-group">
              <div className="asearch-wrap" style={{ minWidth: 260 }}>
                <i className="fas fa-search asearch-icon" />
                <input
                  id="seo-search"
                  name="seo-search"
                  type="text"
                  className="asearch-input"
                  placeholder="Search title or slug…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button type="button" className="asearch-clear" onClick={() => setSearch('')}>
                    <i className="fas fa-times" />
                  </button>
                )}
              </div>
              <div className="aselect-wrap">
                <select 
                  id="seo-sort"
                  name="seo-sort"
                  className="aselect aselect-sm" 
                  value={sortBy} 
                  onChange={e => setSortBy(e.target.value)}
                >
                  <option value="score">Sort: Score ↑</option>
                  <option value="title">Sort: Title</option>
                  <option value="date">Sort: Newest</option>
                </select>
              </div>
              <button className={`arefresh-btn ${loading ? "is-refreshing" : ""}`} onClick={load} title="Refresh Data">
                <i className="fas fa-sync-alt" />
              </button>
            </div>
          </div>

          {/* KPI summary row */}
          <div className="astat-strip">
            {[
              { key: 'total', label: 'Total Posts',  val: blogs.length, mod: 'total' },
              { key: 'score', label: 'Avg SEO Score',val: `${avgScore}%`, mod: 'info' },
              { key: 'poor',  label: 'Needs Work',   val: poorCount, mod: 'pending' },
              { key: 'good',  label: 'Optimised',    val: goodCount, mod: 'pub' },
            ].map((c, i, arr) => (
              <div key={c.key} className={`astat-strip-item astat-strip-item--${c.mod}`}>
                <span className="astat-strip-value">{loading ? <span className="askel askel-line" style={{ width: 36, height: 26, display: 'block' }} /> : c.val}</span>
                <span className="astat-strip-label">{c.label}</span>
                {i < arr.length - 1 && <div className="astat-strip-divider" />}
              </div>
            ))}
          </div>

          {/* Filters & search */}
          <div className="aseo-filter-bar">
            <div className="aseo-chips">
              {['all', 'poor', 'fair', 'good'].map(f => (
                <button
                  key={f}
                  className={`aseo-chip${filter === f ? ' is-active' : ''} is-${f}`}
                  onClick={() => setFilter(f)}
                >
                  <span className="aseo-chip-label">{f}</span>
                  <span className="aseo-chip-count">
                    {f === 'all' ? blogs.length : f === 'poor' ? poorCount : f === 'fair' ? blogs.filter(b => seoScore(b) >= 50 && seoScore(b) < 80).length : goodCount}
                  </span>
                </button>
              ))}
            </div>
          </div>

        {/* Table */}
        <div className="acard" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div className="aempty aseo-empty aseo-loading">
              <div className="aempty-icon">
                <i className="fas fa-spinner fa-spin" />
              </div>
              <h3 className="aempty-title">Analyzing SEO data...</h3>
              <p className="aempty-sub">Scanning posts for meta tags and completeness.</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="aempty areo-empty">
              <div className="aempty-icon">
                <i className="fas fa-search-plus" />
              </div>
              <h3 className="aempty-title">{blogs.length === 0 ? 'No posts found' : 'No matching results'}</h3>
              <p className="aempty-sub">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="atable-responsive">
              <table className="atable" style={{ marginBottom: 0 }}>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 24 }}>Post Title</th>
                    <th>Meta Title</th>
                    <th>Meta Description</th>
                    <th style={{ textAlign: 'center' }}>Score</th>
                    <th style={{ textAlign: 'center' }}>Issues</th>
                    <th style={{ paddingRight: 24 }} />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(blog => {
                    const s = blog._score;
                    const c = scoreColor(s);
                    const issues = [];
                    if (!blog.metaTitle?.trim())       issues.push('Meta title missing');
                    if (!blog.metaDescription?.trim()) issues.push('Meta description missing');
                    if (!blog.imageAlt?.trim())        issues.push('Image alt missing');
                    if (!blog.excerpt?.trim())         issues.push('Excerpt missing');
                    if ((blog.metaTitle || '').length > TITLE_MAX) issues.push(`Title > ${TITLE_MAX} chars`);
                    if ((blog.metaDescription || '').length > DESC_MAX) issues.push(`Desc > ${DESC_MAX} chars`);
                    return (
                      <tr key={blog.id} className="aseo-row">
                        <td style={{ paddingLeft: 24 }}>
                          <div className="aseo-post-title">{blog.title || 'Untitled'}</div>
                          <div className="aseo-post-slug">{blog.slug}</div>
                        </td>
                        <td>
                          <div className={`aseo-field-val ${!blog.metaTitle ? 'is-missing' : ''}`}>
                            {blog.metaTitle || 'Title missing'}
                          </div>
                          {blog.metaTitle && (
                            <div className={`aseo-field-len ${(blog.metaTitle||'').length > TITLE_MAX ? 'is-error' : ''}`}>
                              {(blog.metaTitle||'').length} / {TITLE_MAX}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className={`aseo-field-val ${!blog.metaDescription ? 'is-missing' : ''}`}>
                            {blog.metaDescription ? blog.metaDescription.slice(0, 50) + '...' : 'Description missing'}
                          </div>
                          {blog.metaDescription && (
                            <div className={`aseo-field-len ${(blog.metaDescription||'').length > DESC_MAX ? 'is-error' : ''}`}>
                              {(blog.metaDescription||'').length} / {DESC_MAX}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="aseo-score-ring" style={{ '--score-color': c }}>
                            <div className="aseo-score-val">{s}</div>
                            <div className="aseo-score-lbl">{scoreLabel(s)}</div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {issues.length === 0
                            ? <div className="aseo-issue-badge is-clean"><i className="fas fa-check" /> Optimized</div>
                            : <div className="aseo-issue-badge is-warning" title={issues.join('\n')}>{issues.length} Issues</div>
                          }
                        </td>
                        <td style={{ paddingRight: 24, textAlign: 'right' }}>
                          <button className="abtn abtn-sm abtn-secondary aseo-edit-btn" onClick={() => startEdit(blog)}>
                            <i className="fas fa-magic" />
                            <span>Optimize</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit drawer / modal */}
        {editing && createPortal(
          <div className="amodal-overlay">
            <div className="amodal-card aseo-modal">
              <div className="amodal-header">
                <div className="amodal-title">
                  <i className="fas fa-search-plus" />
                  <span>SEO Optimization</span>
                </div>
                <button className="amodal-close" onClick={() => setEditing(null)}><i className="fas fa-times" /></button>
              </div>

              <div className="amodal-body">
                {[
                  { key: 'metaTitle',       label: 'Meta Title',       max: TITLE_MAX, hint: `Optimal: 50–${TITLE_MAX} characters`,     multiline: false },
                  { key: 'metaDescription', label: 'Meta Description', max: DESC_MAX,  hint: `Optimal: 120–${DESC_MAX} characters`,    multiline: true  },
                  { key: 'excerpt',         label: 'Excerpt / Summary',max: 300,        hint: 'Shown in post cards and RSS feeds',      multiline: true  },
                  { key: 'imageAlt',        label: 'Cover Image Alt',  max: 125,        hint: 'Describe the image for accessibility',   multiline: false },
                  { key: 'canonicalUrl',    label: 'Canonical URL',    max: null,       hint: 'Leave blank to use default page URL',    multiline: false },
                ].map(({ key, label, max, hint, multiline }) => (
                  <div key={key} className="aform-group">
                    <label htmlFor={`seo-field-${key}`} className="acat-label">{label}</label>
                    {multiline
                      ? <textarea
                          id={`seo-field-${key}`}
                          name={key}
                          className="ainput"
                          rows={3}
                          value={editing[key]}
                          onChange={e => setEditing(prev => ({ ...prev, [key]: e.target.value }))}
                        />
                      : <input
                          id={`seo-field-${key}`}
                          name={key}
                          className="ainput"
                          type="text"
                          value={editing[key]}
                          onChange={e => setEditing(prev => ({ ...prev, [key]: e.target.value }))}
                        />
                    }
                    <div className="aform-hint">
                      <span>{hint}</span>
                      {max && <span className={editing[key].length > max ? 'is-error' : ''}>{editing[key].length}/{max}</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="amodal-footer">
                <button className="abtn abtn-ghost" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
                <button className="abtn abtn-primary" onClick={saveEdit} disabled={saving}>
                  {saving ? <><i className="fas fa-spinner fa-spin" /> Saving…</> : <><i className="fas fa-save" /> Save SEO</>}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
        </div>
      </main>
    </div>
  );
}
