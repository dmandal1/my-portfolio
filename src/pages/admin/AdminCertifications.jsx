import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "./components/AdminSidebar";
import { useToast } from "./components/AdminToast";
import {
  getCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
} from "../../api/apiService";
import "./Admin.css";

const EMPTY_FORM = {
  title: "",
  subtitle: "",
  logo_path: "",
  certificate_link: "",
  alt_name: "",
  color_code: "#4285F4",
  order: 0,
};

export default function AdminCertifications() {
  const toast = useToast();
  const [certs, setCerts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [deleting, setDeleting]   = useState(false);
  const [search, setSearch]       = useState("");
  const titleRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCerts(await getCertifications());
    } catch {
      toast?.addToast("Failed to load certifications.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function field(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return toast?.addToast("Title is required.", "error");
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        logo_path: form.logo_path.trim(),
        certificate_link: form.certificate_link.trim(),
        alt_name: form.alt_name.trim(),
        color_code: form.color_code.trim() || "#4285F4",
        order: Number(form.order) || 0,
      };
      if (editingId) {
        await updateCertification(editingId, payload);
        toast?.addToast("Certification updated.", "success");
      } else {
        await createCertification(payload);
        toast?.addToast("Certification added.", "success");
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      await load();
    } catch {
      toast?.addToast("Failed to save certification.", "error");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(cert) {
    setEditingId(cert.id);
    setForm({
      title: cert.title || "",
      subtitle: cert.subtitle || "",
      logo_path: cert.logo_path || "",
      certificate_link: cert.certificate_link || "",
      alt_name: cert.alt_name || "",
      color_code: cert.color_code || "#4285F4",
      order: cert.order ?? 0,
    });
    titleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    titleRef.current?.focus();
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function confirmDelete() {
    if (!delTarget) return;
    setDeleting(true);
    try {
      await deleteCertification(delTarget.id);
      toast?.addToast(`"${delTarget.title}" deleted.`, "info");
      setDelTarget(null);
      await load();
    } catch {
      toast?.addToast("Delete failed.", "error");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = certs.filter((c) =>
    c.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.alt_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="alayout">
      <AdminSidebar />

      <main className="amain">
        <div className="amain-inner acat-page">

          <div className="apage-topbar">
            <div>
              <div className="apage-crumb">
                <Link to="/admin/home" className="apage-crumb-link">Admin</Link>
                <span className="apage-crumb-sep">/</span>
                <span className="apage-crumb-cur">Certifications</span>
              </div>
              <h1 className="apage-title">Certifications</h1>
              <p className="apage-subtitle">Manage your professional certificates and badges</p>
            </div>
            <div className="apage-topbar-meta">
              {!loading && (
                <span className="acat-total-chip">{certs.length} total</span>
              )}
            </div>
          </div>

          <div className="acat-layout">

            {/* ── Form ── */}
            <div className="acat-form-card">
              <div className="acat-form-head">
                <span className="acat-form-head-icon">
                  <i className={`fas ${editingId ? "fa-pencil-alt" : "fa-certificate"}`} />
                </span>
                <div>
                  <h2 className="acat-card-title">
                    {editingId ? "Edit Certification" : "Add Certification"}
                  </h2>
                  {editingId && (
                    <p className="acat-form-editing-name">
                      Editing: <strong>{certs.find((c) => c.id === editingId)?.title}</strong>
                    </p>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="acat-form">
                <div className="acat-field">
                  <label htmlFor="cert-title" className="acat-label">Title <span className="acat-required">*</span></label>
                  <input
                    id="cert-title"
                    name="cert_title"
                    ref={titleRef}
                    className="ainput"
                    placeholder="e.g. JavaScript (Basic) Certificate"
                    value={form.title}
                    onChange={(e) => field("title", e.target.value)}
                    maxLength={120}
                    autoComplete="off"
                    required
                  />
                </div>

                <div className="acat-field">
                  <label htmlFor="cert-subtitle" className="acat-label">Subtitle</label>
                  <input
                    id="cert-subtitle"
                    name="cert_subtitle"
                    className="ainput"
                    placeholder="e.g. - HackerRank"
                    value={form.subtitle}
                    onChange={(e) => field("subtitle", e.target.value)}
                    maxLength={80}
                    autoComplete="off"
                  />
                </div>

                <div className="acat-field">
                  <label htmlFor="cert-alt-name" className="acat-label">Issuer / Alt Name</label>
                  <input
                    id="cert-alt-name"
                    name="cert_alt_name"
                    className="ainput"
                    placeholder="e.g. HackerRank"
                    value={form.alt_name}
                    onChange={(e) => field("alt_name", e.target.value)}
                    maxLength={80}
                    autoComplete="off"
                  />
                </div>

                <div className="acat-field">
                  <label htmlFor="cert-link" className="acat-label">Certificate Link</label>
                  <input
                    id="cert-link"
                    name="cert_link"
                    className="ainput"
                    type="url"
                    placeholder="https://..."
                    value={form.certificate_link}
                    onChange={(e) => field("certificate_link", e.target.value)}
                    autoComplete="off"
                  />
                </div>

                <div className="acat-field">
                  <label htmlFor="cert-logo" className="acat-label">Logo Filename</label>
                  <input
                    id="cert-logo"
                    name="cert_logo"
                    className="ainput"
                    placeholder="e.g. hackerrank_logo.png"
                    value={form.logo_path}
                    onChange={(e) => field("logo_path", e.target.value)}
                    maxLength={120}
                    autoComplete="off"
                  />
                  <p className="acat-hint">Filename from the public assets folder.</p>
                </div>

                <div className="acat-field" style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="cert-color-text" className="acat-label">Background Color</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        id="cert-color-picker"
                        name="cert_color_picker"
                        type="color"
                        value={form.color_code.slice(0, 7)}
                        onChange={(e) => field("color_code", e.target.value)}
                        style={{ width: 38, height: 34, padding: 2, borderRadius: 6, border: "1px solid var(--ab-border)", cursor: "pointer" }}
                      />
                      <input
                        id="cert-color-text"
                        name="cert_color_text"
                        className="ainput"
                        placeholder="#4285F4"
                        value={form.color_code}
                        onChange={(e) => field("color_code", e.target.value)}
                        maxLength={9}
                        autoComplete="off"
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>
                  <div style={{ width: 90 }}>
                    <label htmlFor="cert-order" className="acat-label">Order</label>
                    <input
                      id="cert-order"
                      name="cert_order"
                      className="ainput"
                      type="number"
                      min={0}
                      value={form.order}
                      onChange={(e) => field("order", e.target.value)}
                    />
                  </div>
                </div>

                <div className="acat-form-actions">
                  <button type="submit" className="abtn abtn-primary" disabled={saving}>
                    {saving
                      ? <><span className="aspin" style={{ borderTopColor: "#fff" }} /> Saving…</>
                      : editingId
                        ? <><i className="fas fa-check" /> Update</>
                        : <><i className="fas fa-plus" /> Add Certification</>
                    }
                  </button>
                  {editingId && (
                    <button type="button" className="abtn abtn-ghost" onClick={cancelEdit}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* ── Table ── */}
            <div className="acat-table-card">
              <div className="acat-table-header">
                <div className="acat-table-header-left">
                  <h2 className="acat-card-title">All Certifications</h2>
                  {!loading && (
                    <span className="acat-count-badge">
                      {filtered.length !== certs.length
                        ? `${filtered.length} of ${certs.length}`
                        : certs.length}
                    </span>
                  )}
                </div>
                <div className="acat-search-wrap">
                  <label htmlFor="cert-search" className="sr-only">Search certifications</label>
                  <i className="fas fa-search acat-search-icon" />
                  <input
                    id="cert-search"
                    name="cert_search"
                    className="acat-search-input"
                    placeholder="Search certifications…"
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
              </div>

              {loading ? (
                <div className="acat-skel-wrap">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="acat-skel-row">
                      <div className="askel askel-av" style={{ width: 32, height: 32, borderRadius: 6 }} />
                      <div className="askel askel-line" style={{ flex: 1 }} />
                      <div className="askel askel-line" style={{ width: "20%" }} />
                      <div className="askel askel-line" style={{ width: 60 }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="acat-table-wrap">
                  <table className="acat-table acat-table-head">
                    <thead>
                      <tr>
                        <th style={{ width: 44 }}>#</th>
                        <th>Title</th>
                        <th>Issuer</th>
                        <th style={{ width: 80 }}>Color</th>
                        <th style={{ width: 60 }} />
                      </tr>
                    </thead>
                  </table>
                  <div className="acat-table-body-wrap">
                    <table className="acat-table acat-table-body">
                      <tbody>
                        {filtered.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="acat-empty-row">
                              <div className="acat-empty-state">
                                <span className="acat-empty-icon">{search ? "🔍" : "🏅"}</span>
                                <p className="acat-empty-title">
                                  {search ? "No certifications match your search" : "No certifications yet"}
                                </p>
                                {!search && <p className="acat-empty-sub">Add your first certification using the form.</p>}
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filtered.map((cert) => (
                            <tr key={cert.id} className={editingId === cert.id ? "acat-row--editing" : ""}>
                              <td style={{ width: 44, textAlign: "center", color: "var(--ab-text-muted)", fontSize: 12 }}>
                                {cert.order ?? "—"}
                              </td>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <div style={{
                                    width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                                    background: cert.color_code || "#eee",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                  }}>
                                    {cert.logo_path ? (
                                      <img
                                        src={`/images/logos/${cert.logo_path}`}
                                        alt={cert.alt_name}
                                        style={{ width: 22, height: 22, objectFit: "contain" }}
                                        onError={(e) => { e.target.style.display = "none"; }}
                                      />
                                    ) : (
                                      <i className="fas fa-certificate" style={{ fontSize: 14, color: "#fff", opacity: 0.8 }} />
                                    )}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{cert.title}</div>
                                    {cert.subtitle && <div style={{ fontSize: 11, color: "var(--ab-text-muted)" }}>{cert.subtitle}</div>}
                                  </div>
                                  {editingId === cert.id && <span className="acat-editing-badge">editing</span>}
                                </div>
                              </td>
                              <td style={{ fontSize: 13, color: "var(--ab-text-muted)" }}>
                                {cert.alt_name || "—"}
                              </td>
                              <td>
                                <div style={{
                                  width: 28, height: 20, borderRadius: 4,
                                  background: cert.color_code || "#ccc",
                                  border: "1px solid var(--ab-border)",
                                }} />
                              </td>
                              <td className="acat-row-actions">
                                <button
                                  className="acat-action-btn acat-action-btn--edit"
                                  title="Edit"
                                  onClick={() => startEdit(cert)}
                                >
                                  <i className="fas fa-pencil-alt" />
                                </button>
                                <button
                                  className="acat-action-btn acat-action-btn--del"
                                  title="Delete"
                                  onClick={() => setDelTarget(cert)}
                                >
                                  <i className="fas fa-trash-alt" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {delTarget && (
        <div className="adel-overlay" onClick={() => !deleting && setDelTarget(null)}>
          <div className="adel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adel-icon-wrap">
              <div className="adel-icon-ring" />
              <div className="adel-icon"><i className="fas fa-trash-alt" /></div>
            </div>
            <h3 className="adel-title">Delete "{delTarget.title}"?</h3>
            <p className="adel-msg">This certification will be permanently removed. This cannot be undone.</p>
            <div className="adel-actions">
              <button className="adel-btn-cancel" onClick={() => setDelTarget(null)} disabled={deleting}>
                Cancel
              </button>
              <button className="adel-btn-confirm" onClick={confirmDelete} disabled={deleting}>
                {deleting
                  ? <><span className="aspin" style={{ borderTopColor: "#fff" }} /> Deleting…</>
                  : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
