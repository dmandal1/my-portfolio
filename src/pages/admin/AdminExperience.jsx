import { useCallback, useEffect, useRef, useState } from "react";
import AdminSidebar from "./components/AdminSidebar";
import { useToast } from "./components/AdminToast";
import {
  getExperiences,
  createExperience,
  updateExperience,
  deleteExperience,
} from "../../api/apiService";
import "./Admin.css";

const SECTIONS = ["Work", "Internships", "Volunteerships"];

const EMPTY_FORM = {
  section: "Work",
  title: "",
  company: "",
  company_url: "",
  logo_path: "",
  duration: "",
  location: "",
  description: "",
  color: "#1565C0",
  order: 0,
};

export default function AdminExperience() {
  const toast = useToast();
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [editingId, setEditingId]     = useState(null);
  const [delTarget, setDelTarget]     = useState(null);
  const [deleting, setDeleting]       = useState(false);
  const [search, setSearch]           = useState("");
  const [filterSection, setFilterSection] = useState("All");
  const titleRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setExperiences(await getExperiences());
    } catch {
      toast?.addToast("Failed to load experiences.", "error");
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
    if (!form.company.trim()) return toast?.addToast("Company is required.", "error");
    setSaving(true);
    try {
      const payload = {
        section: form.section,
        title: form.title.trim(),
        company: form.company.trim(),
        company_url: form.company_url.trim(),
        logo_path: form.logo_path.trim(),
        duration: form.duration.trim(),
        location: form.location.trim(),
        description: form.description.trim(),
        color: form.color.trim() || "#1565C0",
        order: Number(form.order) || 0,
      };
      if (editingId) {
        await updateExperience(editingId, payload);
        toast?.addToast("Experience updated.", "success");
      } else {
        await createExperience(payload);
        toast?.addToast("Experience added.", "success");
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      await load();
    } catch {
      toast?.addToast("Failed to save experience.", "error");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(exp) {
    setEditingId(exp.id);
    setForm({
      section: exp.section || "Work",
      title: exp.title || "",
      company: exp.company || "",
      company_url: exp.company_url || "",
      logo_path: exp.logo_path || "",
      duration: exp.duration || "",
      location: exp.location || "",
      description: exp.description || "",
      color: exp.color || "#1565C0",
      order: exp.order ?? 0,
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
      await deleteExperience(delTarget.id);
      toast?.addToast(`"${delTarget.title}" deleted.`, "info");
      setDelTarget(null);
      await load();
    } catch {
      toast?.addToast("Delete failed.", "error");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = experiences.filter((e) => {
    const matchSection = filterSection === "All" || e.section === filterSection;
    const matchSearch =
      e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.company?.toLowerCase().includes(search.toLowerCase());
    return matchSection && matchSearch;
  });

  const groupedFiltered = SECTIONS.map((sec) => ({
    title: sec,
    items: filtered.filter((e) => e.section === sec),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="alayout">
      <AdminSidebar />

      <main className="amain">
        <div className="amain-inner acat-page">

          <div className="apage-topbar">
            <div>
              <h1 className="apage-title">Experience</h1>
            </div>
            <div className="apage-topbar-meta">
              {!loading && (
                <span className="acat-total-chip">{experiences.length} total</span>
              )}
            </div>
          </div>

          <div className="acat-layout">

            {/* ── Form ── */}
            <div className="acat-form-card">
              <div className="acat-form-head">
                <span className="acat-form-head-icon">
                  <i className={`fas ${editingId ? "fa-pencil-alt" : "fa-briefcase"}`} />
                </span>
                <div>
                  <h2 className="acat-card-title">
                    {editingId ? "Edit Experience" : "Add Experience"}
                  </h2>
                  {editingId && (
                    <p className="acat-form-editing-name">
                      Editing: <strong>{experiences.find((e) => e.id === editingId)?.title}</strong>
                    </p>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="acat-form">

                <div className="acat-field">
                  <label className="acat-label">Section <span className="acat-required">*</span></label>
                  <select
                    className="ainput"
                    value={form.section}
                    onChange={(e) => field("section", e.target.value)}
                  >
                    {SECTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="acat-field">
                  <label className="acat-label">Job Title <span className="acat-required">*</span></label>
                  <input
                    ref={titleRef}
                    className="ainput"
                    placeholder="e.g. Senior Associate Consultant"
                    value={form.title}
                    onChange={(e) => field("title", e.target.value)}
                    maxLength={120}
                    required
                  />
                </div>

                <div className="acat-field">
                  <label className="acat-label">Company <span className="acat-required">*</span></label>
                  <input
                    className="ainput"
                    placeholder="e.g. Infosys Ltd."
                    value={form.company}
                    onChange={(e) => field("company", e.target.value)}
                    maxLength={120}
                    required
                  />
                </div>

                <div className="acat-field">
                  <label className="acat-label">Company URL</label>
                  <input
                    className="ainput"
                    type="url"
                    placeholder="https://..."
                    value={form.company_url}
                    onChange={(e) => field("company_url", e.target.value)}
                  />
                </div>

                <div className="acat-field">
                  <label className="acat-label">Duration</label>
                  <input
                    className="ainput"
                    placeholder="e.g. Apr 2026 - Present"
                    value={form.duration}
                    onChange={(e) => field("duration", e.target.value)}
                    maxLength={60}
                  />
                </div>

                <div className="acat-field">
                  <label className="acat-label">Location</label>
                  <input
                    className="ainput"
                    placeholder="e.g. Noida, India"
                    value={form.location}
                    onChange={(e) => field("location", e.target.value)}
                    maxLength={80}
                  />
                </div>

                <div className="acat-field">
                  <label className="acat-label">Company Logo</label>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    {form.logo_path && (
                      <div style={{
                        width: 52, height: 52, flexShrink: 0,
                        border: "1px solid var(--ab-border)",
                        borderRadius: 10, background: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        padding: 6, overflow: "hidden",
                      }}>
                        <img
                          src={
                            /^(https?:\/\/|\/\/|data:)/i.test(form.logo_path)
                              ? form.logo_path
                              : ""
                          }
                          alt="logo preview"
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                          onLoad={(e) => { e.currentTarget.style.display = "block"; }}
                          style={{ width: "100%", height: "100%", objectFit: "contain", display: "none" }}
                        />
                      </div>
                    )}
                    <input
                      className="ainput"
                      placeholder="https://… or filename.png"
                      value={form.logo_path}
                      onChange={(e) => field("logo_path", e.target.value)}
                      style={{ flex: 1 }}
                    />
                  </div>
                  <p className="acat-hint">
                    Paste an image URL (e.g. from the uploads folder or a CDN) or enter a filename from the assets folder.
                    This logo appears in the Contributed Organizations section.
                  </p>
                </div>

                <div className="acat-field">
                  <label className="acat-label">Description</label>
                  <textarea
                    className="ainput acat-textarea"
                    placeholder="Describe your role and responsibilities…"
                    value={form.description}
                    onChange={(e) => field("description", e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="acat-field" style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label className="acat-label">Card Color</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="color"
                        value={form.color.slice(0, 7)}
                        onChange={(e) => field("color", e.target.value)}
                        style={{ width: 38, height: 34, padding: 2, borderRadius: 6, border: "1px solid var(--ab-border)", cursor: "pointer" }}
                      />
                      <input
                        className="ainput"
                        placeholder="#1565C0"
                        value={form.color}
                        onChange={(e) => field("color", e.target.value)}
                        maxLength={9}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>
                  <div style={{ width: 90 }}>
                    <label className="acat-label">Order</label>
                    <input
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
                        : <><i className="fas fa-plus" /> Add Experience</>
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

            {/* ── List ── */}
            <div className="acat-table-card">
              <div className="acat-table-header">
                <div className="acat-table-header-left">
                  <h2 className="acat-card-title">All Experiences</h2>
                  {!loading && (
                    <span className="acat-count-badge">
                      {filtered.length !== experiences.length
                        ? `${filtered.length} of ${experiences.length}`
                        : experiences.length}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select
                    className="ainput"
                    style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}
                    value={filterSection}
                    onChange={(e) => setFilterSection(e.target.value)}
                  >
                    <option value="All">All Sections</option>
                    {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div className="acat-search-wrap">
                    <i className="fas fa-search acat-search-icon" />
                    <input
                      className="acat-search-input"
                      placeholder="Search…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                      <button type="button" className="acat-search-clear" onClick={() => setSearch("")}>
                        <i className="fas fa-times" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="acat-skel-wrap">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="acat-skel-row">
                      <div className="askel askel-av" style={{ width: 32, height: 32, borderRadius: 6 }} />
                      <div className="askel askel-line" style={{ flex: 1 }} />
                      <div className="askel askel-line" style={{ width: "25%" }} />
                      <div className="askel askel-line" style={{ width: 60 }} />
                    </div>
                  ))}
                </div>
              ) : groupedFiltered.length === 0 ? (
                <div className="acat-empty-state" style={{ padding: "40px 24px" }}>
                  <span className="acat-empty-icon">{search ? "🔍" : "💼"}</span>
                  <p className="acat-empty-title">
                    {search ? "No experiences match your search" : "No experiences yet"}
                  </p>
                  {!search && <p className="acat-empty-sub">Add your first experience using the form.</p>}
                </div>
              ) : (
                <div style={{ padding: "0 0 8px" }}>
                  {groupedFiltered.map((group) => (
                    <div key={group.title} style={{ marginBottom: 24 }}>
                      <div style={{
                        padding: "8px 20px",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--ab-text-muted)",
                        borderBottom: "1px solid var(--ab-border)",
                      }}>
                        {group.title} ({group.items.length})
                      </div>
                      {group.items.map((exp) => (
                        <div
                          key={exp.id}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 12,
                            padding: "12px 20px",
                            borderBottom: "1px solid var(--ab-border)",
                            background: editingId === exp.id ? "var(--ab-hover)" : "transparent",
                          }}
                        >
                          {/* Logo or color dot */}
                          {exp.logo_path && /^(https?:\/\/|\/\/|data:)/i.test(exp.logo_path) ? (
                            <div style={{
                              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                              border: "1px solid var(--ab-border)", background: "#fff",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              padding: 4, overflow: "hidden",
                            }}>
                              <img
                                src={exp.logo_path}
                                alt={exp.company}
                                onError={(e) => { e.currentTarget.style.display = "none"; }}
                                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                              />
                            </div>
                          ) : (
                            <div style={{
                              width: 10, height: 10, borderRadius: "50%",
                              background: exp.color || "#ccc",
                              flexShrink: 0, marginTop: 4,
                            }} />
                          )}

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 600, fontSize: 13 }}>{exp.title}</span>
                              {editingId === exp.id && <span className="acat-editing-badge">editing</span>}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--ab-text-muted)", marginTop: 2 }}>
                              {exp.company}{exp.duration ? ` · ${exp.duration}` : ""}{exp.location ? ` · ${exp.location}` : ""}
                            </div>
                            {exp.description && (
                              <div style={{
                                fontSize: 12,
                                color: "var(--ab-text-muted)",
                                marginTop: 4,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}>
                                {exp.description}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="acat-row-actions" style={{ flexShrink: 0 }}>
                            <button
                              className="acat-action-btn acat-action-btn--edit"
                              title="Edit"
                              onClick={() => startEdit(exp)}
                            >
                              <i className="fas fa-pencil-alt" />
                            </button>
                            <button
                              className="acat-action-btn acat-action-btn--del"
                              title="Delete"
                              onClick={() => setDelTarget(exp)}
                            >
                              <i className="fas fa-trash-alt" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
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
            <p className="adel-msg">This experience will be permanently removed. This cannot be undone.</p>
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
