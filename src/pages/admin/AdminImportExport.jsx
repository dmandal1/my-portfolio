import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllBlogsAdmin, createBlog } from '../../api/apiService';
import AdminSidebar from './components/AdminSidebar';
import { useToast } from './components/AdminToast';
import { apiFetch } from '../../api/config';

/* ── Export helpers ──────────────────────────────────────────── */
function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadCSV(blogs, filename) {
  const cols = ['id','title','slug','status','views','commentsCount','createdAt','updatedAt','tags','excerpt','metaTitle','metaDescription'];
  const header = cols.join(',');
  const rows = blogs.map(b => cols.map(k => `"${String(b[k] ?? '').replace(/"/g, '""')}"`).join(','));
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function blogStatus(b) {
  if (b.published)     return 'published';
  if (b.pendingReview) return 'pending';
  if (b.scheduledAt)   return 'scheduled';
  return 'draft';
}

/* ── Import helpers ──────────────────────────────────────────── */
function parseJSONImport(raw) {
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [data];
}

function parseMarkdown(raw) {
  // Very simple: each file = one post. Extract front-matter if present.
  const fmMatch = raw.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);
  if (fmMatch) {
    const fm = {}; fmMatch[1].split('\n').forEach(l => { const [k,...v]=l.split(':'); if(k) fm[k.trim()]=v.join(':').trim(); });
    return [{ title: fm.title || 'Imported Post', content: fmMatch[2], tags: fm.tags || '', slug: fm.slug || '' }];
  }
  return [{ title: 'Imported Post', content: raw }];
}

export default function AdminImportExport() {
  const toast   = useToast();
  const fileRef = useRef(null);
  const [tab, setTab]              = useState('export');  // export | import
  const [exporting, setExporting]  = useState(false);
  const [format, setFormat]        = useState('json');    // json | csv
  const [filter, setFilter]        = useState('all');     // all | published | draft
  const [importing, setImporting]  = useState(false);
  const [importFile, setImportFile]= useState(null);
  const [importFormat, setImportFormat] = useState('json');
  const [preview, setPreview]      = useState([]);
  const [importResult, setImportResult] = useState(null);

  async function handleExport() {
    setExporting(true);
    try {
      let blogs = await getAllBlogsAdmin();
      if (filter === 'published') blogs = blogs.filter(b => b.published);
      if (filter === 'draft')     blogs = blogs.filter(b => !b.published);

      const enriched = blogs.map(b => ({ ...b, status: blogStatus(b) }));
      const date = new Date().toISOString().slice(0, 10);

      if (format === 'json') downloadJSON(enriched, `posts-export-${date}.json`);
      else downloadCSV(enriched, `posts-export-${date}.csv`);

      toast?.addToast(`${enriched.length} posts exported as ${format.toUpperCase()}.`, 'success');
    } catch { toast?.addToast('Export failed.', 'error'); }
    finally { setExporting(false); }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setPreview([]);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        let posts;
        if (importFormat === 'json') posts = parseJSONImport(ev.target.result);
        else posts = parseMarkdown(ev.target.result);
        setPreview(posts.slice(0, 5)); // show up to 5 preview rows
        toast?.addToast(`${posts.length} post${posts.length > 1 ? 's' : ''} found in file.`, 'info');
      } catch { toast?.addToast('Could not parse file. Check format.', 'error'); }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const raw = await importFile.text();
      let posts;
      if (importFormat === 'json') posts = parseJSONImport(raw);
      else posts = parseMarkdown(raw);

      let ok = 0, fail = 0;
      for (const p of posts) {
        try {
          await createBlog({ ...p, published: false, pendingReview: false });
          ok++;
        } catch { fail++; }
      }
      setImportResult({ ok, fail, total: posts.length });
      toast?.addToast(`Imported ${ok} posts${fail > 0 ? `, ${fail} failed` : ''}.`, ok > 0 ? 'success' : 'error');
    } catch { toast?.addToast('Import failed. Check file format.', 'error'); }
    finally { setImporting(false); }
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
                <span className="apage-crumb-cur">Import & Export</span>
              </div>
              <h1 className="apage-title">Import & Export</h1>
              <p className="amain-subtitle">Move content in and out of your blog with ease.</p>
            </div>
          </div>

          {/* Segmented Tab Switcher */}
          <div style={{ display: "flex", gap: 6, marginBottom: 24, background: "var(--acard)", padding: 6, borderRadius: 12, width: "fit-content", border: "1px solid var(--abdr)" }}>
            {[
              { id: 'export', icon: 'fas fa-file-export', label: 'Export Posts' },
              { id: 'import', icon: 'fas fa-file-import', label: 'Import Posts' }
            ].map(item => (
              <button 
                key={item.id} 
                className={`ahome-traffic-range-btn ${tab === item.id ? "active" : ""}`} 
                onClick={() => setTab(item.id)}
                style={{ padding: "8px 20px", borderRadius: 8 }}
              >
                <i className={item.icon} style={{ marginRight: 8 }} />
                {item.label}
              </button>
            ))}
          </div>

          {tab === 'export' && (
            <div className="apage-content-wrap" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
              {/* Options */}
              <div className="acard" style={{ padding: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(16, 185, 129, 0.1)", color: "#10b981", display: "grid", placeItems: "center", fontSize: 18 }}>
                    <i className="fas fa-sliders-h" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 700, fontSize: 16, color: 'var(--atxt)' }}>Export Configuration</h3>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--atxt2)' }}>Customize your data extraction</p>
                  </div>
                </div>

                <div className="aform-group" style={{ marginBottom: 20 }}>
                  <label htmlFor="export-format" className="aform-label" style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 13 }}>File Format</label>
                  <select id="export-format" name="format" className="aselect" value={format} onChange={e => setFormat(e.target.value)}>
                    <option value="json">JSON — Full data with all fields</option>
                    <option value="csv">CSV — Spreadsheet-compatible</option>
                  </select>
                </div>

                <div className="aform-group" style={{ marginBottom: 28 }}>
                  <label htmlFor="export-filter" className="aform-label" style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Posts Filter</label>
                  <select id="export-filter" name="filter" className="aselect" value={filter} onChange={e => setFilter(e.target.value)}>
                    <option value="all">All posts (Total history)</option>
                    <option value="published">Published posts only</option>
                    <option value="draft">Drafts and unpublished</option>
                  </select>
                </div>

                <button 
                  className="abtn abtn-primary" 
                  style={{ width: '100%', height: 48, fontSize: 15 }} 
                  onClick={handleExport} 
                  disabled={exporting}
                >
                  {exporting ? (
                    <><span className="aspin" style={{ marginRight: 10, borderTopColor: "#fff" }} /> Generating file...</>
                  ) : (
                    <><i className="fas fa-download" style={{ marginRight: 10 }} /> Download {format.toUpperCase()} Archive</>
                  )}
                </button>
              </div>

              {/* Field Info */}
              <div className="acard" style={{ padding: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", display: "grid", placeItems: "center", fontSize: 18 }}>
                    <i className="fas fa-info-circle" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 700, fontSize: 16, color: 'var(--atxt)' }}>Exported Schema</h3>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--atxt2)' }}>Fields included in the generated file</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {['id', 'title', 'slug', 'content', 'status', 'tags', 'categories', 'excerpt', 'metaTitle', 'metaDescription', 'views', 'commentsCount', 'createdAt', 'updatedAt'].map(f => (
                    <div key={f} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 10, 
                      padding: "8px 12px", 
                      borderRadius: 8, 
                      background: "var(--acard-alt)", 
                      border: "1px solid var(--abdr)",
                      fontSize: 12
                    }}>
                      <i className="fas fa-check-circle" style={{ color: '#10b981', fontSize: 14 }} />
                      <code style={{ color: 'var(--atxt)', fontWeight: 600 }}>{f}</code>
                    </div>
                  ))}
                </div>
                
                <div style={{ marginTop: 24, padding: 16, borderRadius: 10, background: "rgba(59, 130, 246, 0.05)", border: "1px solid rgba(59, 130, 246, 0.1)", fontSize: 12, color: "var(--atxt2)", lineHeight: 1.6 }}>
                  <i className="fas fa-lightbulb" style={{ color: "#3b82f6", marginRight: 8 }} />
                  JSON format preserves full metadata including comments counts and timestamps. CSV is recommended for bulk editing in Excel.
                </div>
              </div>
            </div>
          )}

          {tab === 'import' && (
            <div className="apage-content-wrap" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
              {/* Upload Card */}
              <div className="acard" style={{ padding: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", display: "grid", placeItems: "center", fontSize: 18 }}>
                    <i className="fas fa-upload" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 700, fontSize: 16, color: 'var(--atxt)' }}>Upload Content</h3>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--atxt2)' }}>Select your import file</p>
                  </div>
                </div>

                <div className="aform-group" style={{ marginBottom: 20 }}>
                  <label htmlFor="import-format" className="aform-label" style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Source Format</label>
                  <select id="import-format" name="importFormat" className="aselect" value={importFormat} onChange={e => setImportFormat(e.target.value)}>
                    <option value="json">JSON (exported from this panel)</option>
                    <option value="md">Markdown (.md with front-matter)</option>
                  </select>
                </div>

                <div
                  style={{ 
                    border: '2px dashed var(--abdr)', 
                    borderRadius: 16, 
                    padding: 40, 
                    textAlign: 'center', 
                    cursor: 'pointer', 
                    marginBottom: 20, 
                    transition: 'all 0.2s ease',
                    background: importFile ? "rgba(16, 185, 129, 0.05)" : "transparent",
                    borderColor: importFile ? "#10b981" : "var(--abdr)"
                  }}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--ap)"; }}
                  onDragLeave={e => { e.currentTarget.style.borderColor = "var(--abdr)"; }}
                  onDrop={e => { 
                    e.preventDefault(); 
                    e.currentTarget.style.borderColor = "var(--abdr)";
                    const f = e.dataTransfer.files[0]; 
                    if(f) { const fake = { target: { files: [f] } }; handleFileChange(fake); } 
                  }}
                >
                  <div style={{ 
                    width: 64, height: 64, borderRadius: 50, 
                    background: "var(--acard-alt)", 
                    display: "grid", placeItems: "center", 
                    margin: "0 auto 16px",
                    color: importFile ? "#10b981" : "var(--atxt2)",
                    fontSize: 24,
                    boxShadow: "var(--sh-sm)"
                  }}>
                    <i className={importFile ? "fas fa-file-check" : "fas fa-cloud-upload-alt"} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--atxt)' }}>
                    {importFile ? importFile.name : 'Click or drag file here'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--atxt2)', marginTop: 6 }}>
                    Supports .json and .md formats
                  </div>
                  <input ref={fileRef} type="file" accept=".json,.md" style={{ display: 'none' }} onChange={handleFileChange} />
                </div>

                <div style={{ 
                  padding: '12px 16px', 
                  background: 'rgba(245,158,11,0.08)', 
                  border: '1px solid rgba(245,158,11,0.2)', 
                  borderRadius: 10, 
                  fontSize: 12, 
                  color: 'var(--atxt2)', 
                  marginBottom: 24,
                  lineHeight: 1.5
                }}>
                  <i className="fas fa-info-circle" style={{ color: '#f59e0b', marginRight: 8 }} />
                  Imported posts are saved as <strong>drafts</strong>. You can batch-publish them later from the Posts section.
                </div>

                <button 
                  className="abtn abtn-primary" 
                  style={{ width: '100%', height: 48, fontSize: 15 }} 
                  onClick={handleImport} 
                  disabled={!importFile || importing}
                >
                  {importing ? (
                    <><span className="aspin" style={{ marginRight: 10, borderTopColor: "#fff" }} /> Processing...</>
                  ) : (
                    <><i className="fas fa-file-import" style={{ marginRight: 10 }} /> Start Import Process</>
                  )}
                </button>

                {importResult && (
                  <div style={{ 
                    marginTop: 20, 
                    padding: '16px', 
                    background: importResult.fail === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                    borderRadius: 12, 
                    fontSize: 14,
                    border: `1px solid ${importResult.fail === 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                    color: importResult.fail === 0 ? '#065f46' : '#991b1b'
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                      <i className={`fas ${importResult.fail === 0 ? 'fa-check-circle' : 'fa-exclamation-circle'}`} style={{ marginRight: 8 }} />
                      Import Complete
                    </div>
                    {importResult.ok} posts successfully imported. {importResult.fail > 0 && `${importResult.fail} failed.`}
                  </div>
                )}
              </div>

              {/* Preview Card */}
              <div className="acard" style={{ padding: 32, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6", display: "grid", placeItems: "center", fontSize: 18 }}>
                    <i className="fas fa-eye" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 700, fontSize: 16, color: 'var(--atxt)' }}>Import Preview</h3>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--atxt2)' }}>Previewing up to 5 items</p>
                  </div>
                </div>

                {preview.length === 0 ? (
                  <div style={{ 
                    flex: 1, 
                    display: "flex", 
                    flexDirection: "column", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    padding: '40px 0', 
                    textAlign: 'center', 
                    color: 'var(--atxt2)', 
                    fontSize: 14,
                    background: "var(--acard-alt)",
                    borderRadius: 12,
                    border: "1px dashed var(--abdr)"
                  }}>
                    <i className="fas fa-file-upload" style={{ fontSize: 32, marginBottom: 12, opacity: 0.2 }} />
                    No file selected for preview
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {preview.map((p, i) => (
                      <div key={i} style={{ 
                        padding: '14px', 
                        borderRadius: 10, 
                        background: "var(--acard-alt)", 
                        border: "1px solid var(--abdr)",
                        transition: "transform 0.2s ease"
                      }}>
                        <div style={{ fontWeight: 700, color: 'var(--atxt)', marginBottom: 4, fontSize: 14 }}>{p.title || 'Untitled Post'}</div>
                        <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                          {p.slug && <span style={{ color: '#3b82f6', background: "rgba(59, 130, 246, 0.1)", padding: "2px 6px", borderRadius: 4 }}>/{p.slug}</span>}
                          {p.tags && <span style={{ color: 'var(--atxt2)' }}><i className="fas fa-tags" style={{ marginRight: 4 }} />{p.tags.slice(0, 30)}{p.tags.length > 30 ? "..." : ""}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
