import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import AdminSidebar from "./components/AdminSidebar";
import { useToast } from "./components/AdminToast";
import {
  getPortfolioProfile, savePortfolioProfile,
  getPortfolioContact, savePortfolioContact,
  getPortfolioSeo,    savePortfolioSeo,
  getExperienceHeader, saveExperienceHeader,
  getContactPageData,  saveContactPageData,
  getProjectsHeader,   saveProjectsHeader,

  getSocialLinks,     createSocialLink,    updateSocialLink,    deleteSocialLink,
  getEducation,       createDegree,        updateDegree,        deleteDegree,
  getCompetitiveSites,createCompetitiveSite,updateCompetitiveSite,deleteCompetitiveSite,
  getPortfolioProjects,createPortfolioProject,updatePortfolioProject,deletePortfolioProject,
  getSkillGroups,     createSkillGroup,    updateSkillGroup,    deleteSkillGroup,
  getCertifications,  createCertification, updateCertification, deleteCertification,
  getExperiences,     createExperience,    updateExperience,    deleteExperience,
  uploadPortfolioAsset,
  getOpenSourceConfig,  saveOpenSourceConfig,
  getBlogSectionConfig, saveBlogSectionConfig,
} from "../../api/apiService";
import "./Admin.css";

const TABS = {
  // ── Home page (/home) ─────────────────────────────────────
  // 1. Greeting section (name, roles, subtitle, resume button)
  profile:          { icon: "fas fa-user",              label: "Profile & Bio" },
  // 2. Social links (rendered inside Greeting)
  social:           { icon: "fas fa-share-alt",          label: "Social Links" },
  // 3. Skills section (below Greeting)
  skills:           { icon: "fas fa-tools",              label: "Skills" },
  // 4. SEO / meta (applies to all pages via <head>)
  seo:              { icon: "fas fa-search",             label: "SEO & Meta" },

  // ── Education page (/education) ───────────────────────────
  // 1. Hero area — CompetitiveSites logos (top of page)
  competitive:      { icon: "fas fa-code",               label: "Coding Profiles" },
  // 2. Degrees section
  education:        { icon: "fas fa-graduation-cap",     label: "Degrees" },
  // 3. Certifications section (below degrees)
  certifications:   { icon: "fas fa-certificate",        label: "Certifications" },

  // ── Experience page (/experience) ─────────────────────────
  // 1. Hero section (title, subtitle, description, stats)
  experienceHeader: { icon: "fas fa-heading",            label: "Page Header" },
  // 2. Experience accordion (Work / Internships / Volunteerships)
  experience:       { icon: "fas fa-briefcase",          label: "Work Experience" },

  // ── Projects page (/projects) ─────────────────────────────
  // 1. Page heading (title + description)
  projectsHeader:   { icon: "fas fa-align-left",         label: "Page Header" },
  // 2. Big project cards (startup/featured projects)
  projects:         { icon: "fas fa-project-diagram",    label: "Big Projects" },

  // ── Contact page (/contact) ───────────────────────────────
  // 1. Top hero sections (contact intro, blog section, address block)
  contactPage:      { icon: "fas fa-address-card",       label: "Page Sections" },
  // 2. Quick Contact + form (email, phone, address details)
  contact:          { icon: "fas fa-envelope",           label: "Contact Details" },
  // 3. FAQ accordion (bottom of page)
  faq:              { icon: "fas fa-question-circle",    label: "FAQ" },

  // ── Integrations ──────────────────────────────────────────
  openSource:       { icon: "fab fa-github",             label: "GitHub / Open Source" },
  blogConfig:       { icon: "fas fa-newspaper",          label: "Blog Section" },

};

const TAB_GROUPS = [
  { label: "Home Page",       color: "#3b82f6", emoji: "🏠", ids: ["profile", "social", "skills", "seo"] },
  { label: "Education Page",  color: "#8b5cf6", emoji: "🎓", ids: ["competitive", "education", "certifications"] },
  { label: "Experience Page", color: "#f59e0b", emoji: "💼", ids: ["experienceHeader", "experience"] },
  { label: "Projects Page",   color: "#10b981", emoji: "🚀", ids: ["projectsHeader", "projects"] },
  { label: "Contact Page",    color: "#06b6d4", emoji: "📬", ids: ["contactPage", "contact", "faq"] },
  { label: "Integrations",   color: "#6366f1", emoji: "🔌", ids: ["openSource", "blogConfig"] },
];

/* ── Reusable primitives ────────────────────────────────────────────────── */
function Field({ label, children, hint }) {
  return (
    <div className="acat-field">
      <label className="acat-label">{label}</label>
      {children}
      {hint && <p className="acat-hint">{hint}</p>}
    </div>
  );
}

function SaveBtn({ saving, label = "Save Changes" }) {
  return (
    <button type="submit" className="abtn abtn-primary" disabled={saving}>
      {saving ? <><span className="aspin" style={{ borderTopColor: "#fff" }} /> Saving…</> : <><i className="fas fa-check" /> {label}</>}
    </button>
  );
}

function DelModal({ target, title, onCancel, onConfirm, deleting }) {
  if (!target) return null;
  return (
    <div className="adel-overlay" onClick={() => !deleting && onCancel()}>
      <div className="adel-modal" onClick={(e) => e.stopPropagation()}>
        <div className="adel-icon-wrap"><div className="adel-icon-ring" /><div className="adel-icon"><i className="fas fa-trash-alt" /></div></div>
        <h3 className="adel-title">{title}</h3>
        <p className="adel-msg">This will be permanently removed and cannot be undone.</p>
        <div className="adel-actions">
          <button className="adel-btn-cancel" onClick={onCancel} disabled={deleting}>Cancel</button>
          <button className="adel-btn-confirm" onClick={onConfirm} disabled={deleting}>
            {deleting ? <><span className="aspin" style={{ borderTopColor: "#fff" }} /> Deleting…</> : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Image / Logo upload field (deferred — uploads only on save) ─────────── */
const ImageUploadField = forwardRef(function ImageUploadField(
  { label, value, onChange, hint, accept = "image/*" },
  ref
) {
  const fileRef = useRef(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreview, setPendingPreview] = useState("");
  const pendingPreviewRef = useRef("");
  const [progress, setProgress] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => { if (pendingPreviewRef.current) URL.revokeObjectURL(pendingPreviewRef.current); };
  }, []);

  function discardPending() {
    if (pendingPreviewRef.current) URL.revokeObjectURL(pendingPreviewRef.current);
    pendingPreviewRef.current = "";
    setPendingFile(null); setPendingPreview("");
    if (fileRef.current) fileRef.current.value = "";
  }

  useImperativeHandle(ref, () => ({
    async resolveUpload() {
      if (!pendingFile) return value;
      setUploading(true); setProgress(0); setError("");
      try {
        const url = await uploadPortfolioAsset(pendingFile, (p) => setProgress(Math.round(p)));
        discardPending();
        onChange(url);
        return url;
      } catch (err) {
        setError(`Upload failed: ${err?.message || "unknown error"}`);
        throw err;
      } finally {
        setUploading(false); setProgress(null);
      }
    },
    clearPending() { discardPending(); },
  }));

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("File too large (max 5 MB)."); return; }
    setError("");
    if (pendingPreviewRef.current) URL.revokeObjectURL(pendingPreviewRef.current);
    const preview = URL.createObjectURL(file);
    pendingPreviewRef.current = preview;
    setPendingFile(file); setPendingPreview(preview);
    if (fileRef.current) fileRef.current.value = "";
  }

  const savedPreview = value ? (value.startsWith("http") ? value : `/images/logos/${value}`) : null;
  const displayPreview = pendingPreview || savedPreview;

  return (
    <div className="acat-field">
      <label className="acat-label">{label}</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          className="ainput"
          value={value}
          onChange={(e) => { discardPending(); onChange(e.target.value); }}
          placeholder="filename.png or paste a URL"
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="abtn abtn-ghost"
          style={{ flexShrink: 0, height: 42, padding: "0 14px", fontSize: 13 }}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading
            ? <><span className="aspin" style={{ width: 12, height: 12, borderTopColor: "currentColor" }} /> {progress}%</>
            : <><i className="fas fa-upload" /> {pendingFile ? "Change" : "Upload"}</>}
        </button>
        <input ref={fileRef} type="file" accept={accept} style={{ display: "none" }} onChange={handleFile} />
        {displayPreview && (
          <div style={{ position: "relative", flexShrink: 0 }}>
            <img
              src={displayPreview}
              alt="preview"
              style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 6, border: "1px solid var(--ab-border)", background: "#f8fafe" }}
              onError={(e) => { e.target.style.display = "none"; }}
            />
            {pendingFile && (
              <span style={{ position: "absolute", top: -5, right: -5, background: "#f59e0b", color: "#fff", fontSize: 8, fontWeight: 700, padding: "1px 3px", borderRadius: 3, lineHeight: 1.3, whiteSpace: "nowrap" }}>
                NEW
              </span>
            )}
          </div>
        )}
        {pendingFile && (
          <button
            type="button"
            className="abtn abtn-ghost"
            style={{ flexShrink: 0, height: 36, padding: "0 10px", fontSize: 12, color: "var(--adanger)" }}
            title="Discard selected file"
            onClick={discardPending}
          >
            <i className="fas fa-times" />
          </button>
        )}
      </div>
      {uploading && (
        <div style={{ height: 3, background: "var(--ab-border)", borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "#4f46e5", borderRadius: 2, transition: "width .2s" }} />
        </div>
      )}
      {pendingFile && !uploading && (
        <p className="acat-hint" style={{ color: "#d97706" }}>
          <i className="fas fa-clock" style={{ marginRight: 4 }} />
          Not uploaded yet — will upload when you save.
        </p>
      )}
      {error && <p className="acat-hint" style={{ color: "var(--adanger)" }}>{error}</p>}
      {hint && <p className="acat-hint">{hint}</p>}
    </div>
  );
});

/* ── Profile tab ────────────────────────────────────────────────────────── */
function ProfileTab({ toast }) {
  const [form, setForm] = useState({ title: "", logo_name: "", nickname: "", job_profile: "", subTitle: "", resumeLink: "", githubProfile: "", portfolio_repository: "", roles: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    getPortfolioProfile().then((d) => { if (d) setForm({ title: d.title || "", logo_name: d.logo_name || "", nickname: d.nickname || "", job_profile: d.job_profile || "", subTitle: d.subTitle || "", resumeLink: d.resumeLink || "", githubProfile: d.githubProfile || "", portfolio_repository: d.portfolio_repository || "", roles: Array.isArray(d.roles) ? d.roles.join("\n") : (d.roles || "") }); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      const roles = form.roles.split("\n").map(s => s.trim()).filter(Boolean);
      await savePortfolioProfile({ ...form, roles });
      toast?.addToast("Profile saved.", "success");
    }
    catch { toast?.addToast("Failed to save profile.", "error"); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="acat-skel-wrap">{[1,2,3].map(i => <div key={i} className="acat-skel-row"><div className="askel askel-line" style={{ flex: 1, height: 36 }} /></div>)}</div>;

  return (
    <form onSubmit={handleSubmit} className="acat-form" style={{ maxWidth: 640 }}>
      <Field label="Full Name"><input className="ainput" value={form.title} onChange={e => f("title", e.target.value)} placeholder="e.g. Deepak Mandal" /></Field>
      <Field label="Logo / Display Name"><input className="ainput" value={form.logo_name} onChange={e => f("logo_name", e.target.value)} placeholder="e.g. Deepak Mandal" /></Field>
      <Field label="Nickname"><input className="ainput" value={form.nickname} onChange={e => f("nickname", e.target.value)} placeholder="e.g. dmandal" /></Field>
      <Field label="Job Profile / Title"><input className="ainput" value={form.job_profile} onChange={e => f("job_profile", e.target.value)} placeholder="e.g. Full Stack Developer | Programmer" /></Field>
      <Field label="Typing Roles" hint="One role per line — shown as typewriter animation on the home page"><textarea className="ainput acat-textarea" rows={5} value={form.roles} onChange={e => f("roles", e.target.value)} placeholder={"Node.js Developer\nReact Engineer\nJavaScript Enthusiast\nFull Stack Developer"} /></Field>
      <Field label="Subtitle / Bio"><textarea className="ainput acat-textarea" rows={3} value={form.subTitle} onChange={e => f("subTitle", e.target.value)} /></Field>
      <Field label="Resume Link"><input className="ainput" type="url" value={form.resumeLink} onChange={e => f("resumeLink", e.target.value)} placeholder="https://drive.google.com/..." /></Field>
      <Field label="GitHub Profile URL"><input className="ainput" type="url" value={form.githubProfile} onChange={e => f("githubProfile", e.target.value)} placeholder="https://github.com/..." /></Field>
      <Field label="Portfolio Repository URL"><input className="ainput" type="url" value={form.portfolio_repository} onChange={e => f("portfolio_repository", e.target.value)} placeholder="https://github.com/..." /></Field>
      <SaveBtn saving={saving} />
    </form>
  );
}

/* ── Social Links tab ───────────────────────────────────────────────────── */
const EMPTY_SOCIAL = { name: "", link: "", fontAwesomeIcon: "", backgroundColor: "#1877F2", order: 0 };
function SocialTab({ toast }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState(EMPTY_SOCIAL);
  const [editId, setEditId]   = useState(null);
  const [saving, setSaving]   = useState(false);
  const [delTarget, setDel]   = useState(null);
  const [deleting, setDeleting] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => { setLoading(true); try { setItems(await getSocialLinks()); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.link.trim()) return toast?.addToast("Name and link are required.", "error");
    setSaving(true);
    try {
      if (editId) { await updateSocialLink(editId, form); toast?.addToast("Updated.", "success"); setEditId(null); }
      else { await createSocialLink(form); toast?.addToast("Added.", "success"); }
      setForm(EMPTY_SOCIAL); await load();
    } catch { toast?.addToast("Failed to save.", "error"); } finally { setSaving(false); }
  }

  async function confirmDel() {
    setDeleting(true);
    try { await deleteSocialLink(delTarget.id); toast?.addToast("Deleted.", "info"); setDel(null); await load(); }
    catch { toast?.addToast("Delete failed.", "error"); } finally { setDeleting(false); }
  }

  return (
    <div className="acat-layout">
      <div className="acat-form-card">
        <div className="acat-form-head"><span className="acat-form-head-icon"><i className={`fas ${editId ? "fa-pencil-alt" : "fa-plus"}`} /></span><div><h2 className="acat-card-title">{editId ? "Edit Link" : "Add Social Link"}</h2></div></div>
        <form onSubmit={handleSubmit} className="acat-form">
          <Field label="Platform Name *"><input className="ainput" value={form.name} onChange={e => f("name", e.target.value)} placeholder="e.g. LinkedIn" required /></Field>
          <Field label="URL *"><input className="ainput" type="url" value={form.link} onChange={e => f("link", e.target.value)} placeholder="https://..." required /></Field>
          <Field label="Font Awesome Icon" hint="e.g. fa-linkedin-in (without 'fab ')"><input className="ainput" value={form.fontAwesomeIcon} onChange={e => f("fontAwesomeIcon", e.target.value)} placeholder="fa-linkedin-in" /></Field>
          <Field label="Background Color">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" value={form.backgroundColor.slice(0,7)} onChange={e => f("backgroundColor", e.target.value)} style={{ width: 38, height: 34, padding: 2, borderRadius: 6, border: "1px solid var(--ab-border)", cursor: "pointer" }} />
              <input className="ainput" value={form.backgroundColor} onChange={e => f("backgroundColor", e.target.value)} maxLength={9} style={{ flex: 1 }} />
            </div>
          </Field>
          <Field label="Order"><input className="ainput" type="number" min={0} value={form.order} onChange={e => f("order", e.target.value)} /></Field>
          <div className="acat-form-actions">
            <SaveBtn saving={saving} label={editId ? "Update" : "Add Link"} />
            {editId && <button type="button" className="abtn abtn-ghost" onClick={() => { setEditId(null); setForm(EMPTY_SOCIAL); }}>Cancel</button>}
          </div>
        </form>
      </div>
      <div className="acat-table-card">
        <div className="acat-table-header"><div className="acat-table-header-left"><h2 className="acat-card-title">Social Links</h2>{!loading && <span className="acat-count-badge">{items.length}</span>}</div></div>
        {loading ? <div className="acat-skel-wrap">{[1,2,3].map(i => <div key={i} className="acat-skel-row"><div className="askel askel-line" style={{ flex: 1 }} /></div>)}</div> : (
          <div className="acat-table-body-wrap">
            {items.length === 0 ? <div className="acat-empty-state" style={{ padding: 40 }}><span className="acat-empty-icon">🔗</span><p className="acat-empty-title">No social links yet</p></div> : items.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: "1px solid var(--ab-border)", background: editId === item.id ? "var(--ab-hover)" : "transparent" }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: item.backgroundColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><i className={`fab ${item.fontAwesomeIcon}`} style={{ color: "#fff", fontSize: 13 }} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ab-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.link}</div>
                </div>
                <div className="acat-row-actions">
                  <button className="acat-action-btn acat-action-btn--edit" onClick={() => { setEditId(item.id); setForm({ name: item.name, link: item.link, fontAwesomeIcon: item.fontAwesomeIcon || "", backgroundColor: item.backgroundColor || "#1877F2", order: item.order ?? 0 }); }}><i className="fas fa-pencil-alt" /></button>
                  <button className="acat-action-btn acat-action-btn--del" onClick={() => setDel(item)}><i className="fas fa-trash-alt" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <DelModal target={delTarget} title={`Delete "${delTarget?.name}"?`} onCancel={() => setDel(null)} onConfirm={confirmDel} deleting={deleting} />
    </div>
  );
}

/* ── Contact tab ────────────────────────────────────────────────────────── */
function ContactTab({ toast }) {
  const [form, setForm] = useState({ title: "", subtitle: "", number: "", email_address: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    getPortfolioContact().then(d => { if (d) setForm({ title: d.title || "", subtitle: d.subtitle || "", number: d.number || "", email_address: d.email_address || "", address: d.address || "" }); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try { await savePortfolioContact(form); toast?.addToast("Contact info saved.", "success"); }
    catch { toast?.addToast("Failed to save.", "error"); } finally { setSaving(false); }
  }

  if (loading) return <div className="acat-skel-wrap">{[1,2,3].map(i => <div key={i} className="acat-skel-row"><div className="askel askel-line" style={{ flex: 1, height: 36 }} /></div>)}</div>;

  return (
    <form onSubmit={handleSubmit} className="acat-form" style={{ maxWidth: 640 }}>
      <Field label="Section Title"><input className="ainput" value={form.title} onChange={e => f("title", e.target.value)} placeholder="e.g. Contact Me" /></Field>
      <Field label="Subtitle"><textarea className="ainput acat-textarea" rows={2} value={form.subtitle} onChange={e => f("subtitle", e.target.value)} /></Field>
      <Field label="Phone Number"><input className="ainput" value={form.number} onChange={e => f("number", e.target.value)} placeholder="+91-..." /></Field>
      <Field label="Email Address"><input className="ainput" type="email" value={form.email_address} onChange={e => f("email_address", e.target.value)} /></Field>
      <Field label="Address"><input className="ainput" value={form.address} onChange={e => f("address", e.target.value)} placeholder="City, State, Country" /></Field>
      <SaveBtn saving={saving} />
    </form>
  );
}

/* ── SEO tab ────────────────────────────────────────────────────────────── */
function SeoTab({ toast }) {
  const [form, setForm] = useState({ title: "", description: "", ogTitle: "", ogType: "website", ogUrl: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    getPortfolioSeo().then(d => { if (d) setForm({ title: d.title || "", description: d.description || "", ogTitle: d.ogTitle || "", ogType: d.ogType || "website", ogUrl: d.ogUrl || "" }); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try { await savePortfolioSeo(form); toast?.addToast("SEO settings saved.", "success"); }
    catch { toast?.addToast("Failed to save.", "error"); } finally { setSaving(false); }
  }

  if (loading) return <div className="acat-skel-wrap">{[1,2,3].map(i => <div key={i} className="acat-skel-row"><div className="askel askel-line" style={{ flex: 1, height: 36 }} /></div>)}</div>;

  return (
    <form onSubmit={handleSubmit} className="acat-form" style={{ maxWidth: 640 }}>
      <Field label="Page Title" hint="Shown in browser tab and search results"><input className="ainput" value={form.title} onChange={e => f("title", e.target.value)} placeholder="Your Name - Software Developer" /></Field>
      <Field label="Meta Description" hint="Shown in Google search snippets (150–160 chars)"><textarea className="ainput acat-textarea" rows={3} value={form.description} onChange={e => f("description", e.target.value)} /></Field>
      <Field label="OG Title" hint="Open Graph title for social shares"><input className="ainput" value={form.ogTitle} onChange={e => f("ogTitle", e.target.value)} /></Field>
      <Field label="OG Type"><input className="ainput" value={form.ogType} onChange={e => f("ogType", e.target.value)} placeholder="website" /></Field>
      <Field label="OG URL"><input className="ainput" type="url" value={form.ogUrl} onChange={e => f("ogUrl", e.target.value)} placeholder="https://yourdomain.dev/" /></Field>
      <SaveBtn saving={saving} />
    </form>
  );
}

/* ── Education tab ──────────────────────────────────────────────────────── */
const EMPTY_DEG = { title: "", subtitle: "", logo_path: "", alt_name: "", duration: "", descriptions: "", website_link: "", order: 0 };
function EducationTab({ toast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_DEG);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [delTarget, setDel] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const imageRef = useRef(null);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => { setLoading(true); try { setItems(await getEducation()); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return toast?.addToast("Title is required.", "error");
    setSaving(true);
    try {
      const logo_path = await imageRef.current?.resolveUpload() ?? form.logo_path;
      const descriptions = form.descriptions.split("\n").map(s => s.trim()).filter(Boolean);
      const payload = { ...form, logo_path, descriptions, order: Number(form.order) || 0 };
      if (editId) { await updateDegree(editId, payload); toast?.addToast("Updated.", "success"); setEditId(null); }
      else { await createDegree(payload); toast?.addToast("Added.", "success"); }
      setForm(EMPTY_DEG); await load();
    } catch { toast?.addToast("Failed to save.", "error"); } finally { setSaving(false); }
  }

  async function confirmDel() {
    setDeleting(true);
    try { await deleteDegree(delTarget.id); toast?.addToast("Deleted.", "info"); setDel(null); await load(); }
    catch { toast?.addToast("Delete failed.", "error"); } finally { setDeleting(false); }
  }

  return (
    <div className="acat-layout">
      <div className="acat-form-card">
        <div className="acat-form-head"><span className="acat-form-head-icon"><i className={`fas ${editId ? "fa-pencil-alt" : "fa-graduation-cap"}`} /></span><div><h2 className="acat-card-title">{editId ? "Edit Degree" : "Add Degree"}</h2></div></div>
        <form onSubmit={handleSubmit} className="acat-form">
          <Field label="University / Institution *"><input className="ainput" value={form.title} onChange={e => f("title", e.target.value)} placeholder="e.g. Dr. A.P.J. Abdul Kalam Technical University" required /></Field>
          <Field label="Degree / Subtitle"><input className="ainput" value={form.subtitle} onChange={e => f("subtitle", e.target.value)} placeholder="e.g. B.Tech. in Computer Engineering" /></Field>
          <Field label="Duration"><input className="ainput" value={form.duration} onChange={e => f("duration", e.target.value)} placeholder="e.g. 2016 - 2020" /></Field>
          <Field label="Alt Name"><input className="ainput" value={form.alt_name} onChange={e => f("alt_name", e.target.value)} placeholder="e.g. AKTU University" /></Field>
          <ImageUploadField ref={imageRef} label="Logo / Image" hint="Upload a file or enter a filename from public assets" value={form.logo_path} onChange={v => f("logo_path", v)} />
          <Field label="Website Link"><input className="ainput" type="url" value={form.website_link} onChange={e => f("website_link", e.target.value)} placeholder="https://..." /></Field>
          <Field label="Descriptions" hint="One bullet per line — e.g. ⚡ CGPA: 7.08/10"><textarea className="ainput acat-textarea" rows={5} value={form.descriptions} onChange={e => f("descriptions", e.target.value)} placeholder={"⚡ CGPA: 7.08/10\n⚡ Studied core subjects..."} /></Field>
          <Field label="Order"><input className="ainput" type="number" min={0} value={form.order} onChange={e => f("order", e.target.value)} /></Field>
          <div className="acat-form-actions">
            <SaveBtn saving={saving} label={editId ? "Update" : "Add Degree"} />
            {editId && <button type="button" className="abtn abtn-ghost" onClick={() => { imageRef.current?.clearPending(); setEditId(null); setForm(EMPTY_DEG); }}>Cancel</button>}
          </div>
        </form>
      </div>
      <div className="acat-table-card">
        <div className="acat-table-header"><div className="acat-table-header-left"><h2 className="acat-card-title">Degrees</h2>{!loading && <span className="acat-count-badge">{items.length}</span>}</div></div>
        {loading ? <div className="acat-skel-wrap">{[1,2].map(i => <div key={i} className="acat-skel-row"><div className="askel askel-line" style={{ flex: 1 }} /></div>)}</div> : items.length === 0 ? (
          <div className="acat-empty-state" style={{ padding: 40 }}><span className="acat-empty-icon">🎓</span><p className="acat-empty-title">No degrees yet</p></div>
        ) : items.map(item => (
          <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--ab-border)", background: editId === item.id ? "var(--ab-hover)" : "transparent" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "var(--ab-text-muted)" }}>{item.subtitle}{item.duration ? ` · ${item.duration}` : ""}</div>
            </div>
            <div className="acat-row-actions">
              <button className="acat-action-btn acat-action-btn--edit" onClick={() => { setEditId(item.id); setForm({ title: item.title || "", subtitle: item.subtitle || "", logo_path: item.logo_path || "", alt_name: item.alt_name || "", duration: item.duration || "", descriptions: (item.descriptions || []).join("\n"), website_link: item.website_link || "", order: item.order ?? 0 }); }}><i className="fas fa-pencil-alt" /></button>
              <button className="acat-action-btn acat-action-btn--del" onClick={() => setDel(item)}><i className="fas fa-trash-alt" /></button>
            </div>
          </div>
        ))}
      </div>
      <DelModal target={delTarget} title={`Delete "${delTarget?.title}"?`} onCancel={() => setDel(null)} onConfirm={confirmDel} deleting={deleting} />
    </div>
  );
}

/* ── Competitive Sites tab ──────────────────────────────────────────────── */
const EMPTY_COMP = { siteName: "", iconifyClassname: "", color: "#2EC866", profileLink: "", order: 0 };
function CompetitiveTab({ toast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_COMP);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [delTarget, setDel] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => { setLoading(true); try { setItems(await getCompetitiveSites()); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.siteName.trim()) return toast?.addToast("Site name is required.", "error");
    setSaving(true);
    try {
      const payload = { ...form, style: { color: form.color }, order: Number(form.order) || 0 };
      if (editId) { await updateCompetitiveSite(editId, payload); toast?.addToast("Updated.", "success"); setEditId(null); }
      else { await createCompetitiveSite(payload); toast?.addToast("Added.", "success"); }
      setForm(EMPTY_COMP); await load();
    } catch { toast?.addToast("Failed to save.", "error"); } finally { setSaving(false); }
  }

  async function confirmDel() {
    setDeleting(true);
    try { await deleteCompetitiveSite(delTarget.id); toast?.addToast("Deleted.", "info"); setDel(null); await load(); }
    catch { toast?.addToast("Delete failed.", "error"); } finally { setDeleting(false); }
  }

  return (
    <div className="acat-layout">
      <div className="acat-form-card">
        <div className="acat-form-head"><span className="acat-form-head-icon"><i className={`fas ${editId ? "fa-pencil-alt" : "fa-code"}`} /></span><div><h2 className="acat-card-title">{editId ? "Edit Site" : "Add Competitive Site"}</h2></div></div>
        <form onSubmit={handleSubmit} className="acat-form">
          <Field label="Site Name *"><input className="ainput" value={form.siteName} onChange={e => f("siteName", e.target.value)} placeholder="e.g. HackerRank" required /></Field>
          <Field label="Iconify Class" hint="e.g. simple-icons:hackerrank"><input className="ainput" value={form.iconifyClassname} onChange={e => f("iconifyClassname", e.target.value)} placeholder="simple-icons:hackerrank" /></Field>
          <Field label="Icon Color">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" value={form.color.slice(0,7)} onChange={e => f("color", e.target.value)} style={{ width: 38, height: 34, padding: 2, borderRadius: 6, border: "1px solid var(--ab-border)", cursor: "pointer" }} />
              <input className="ainput" value={form.color} onChange={e => f("color", e.target.value)} maxLength={9} style={{ flex: 1 }} />
            </div>
          </Field>
          <Field label="Profile Link"><input className="ainput" type="url" value={form.profileLink} onChange={e => f("profileLink", e.target.value)} placeholder="https://..." /></Field>
          <Field label="Order"><input className="ainput" type="number" min={0} value={form.order} onChange={e => f("order", e.target.value)} /></Field>
          <div className="acat-form-actions">
            <SaveBtn saving={saving} label={editId ? "Update" : "Add Site"} />
            {editId && <button type="button" className="abtn abtn-ghost" onClick={() => { setEditId(null); setForm(EMPTY_COMP); }}>Cancel</button>}
          </div>
        </form>
      </div>
      <div className="acat-table-card">
        <div className="acat-table-header"><div className="acat-table-header-left"><h2 className="acat-card-title">Competitive Sites</h2>{!loading && <span className="acat-count-badge">{items.length}</span>}</div></div>
        {loading ? <div className="acat-skel-wrap">{[1,2,3].map(i => <div key={i} className="acat-skel-row"><div className="askel askel-line" style={{ flex: 1 }} /></div>)}</div> : items.length === 0 ? (
          <div className="acat-empty-state" style={{ padding: 40 }}><span className="acat-empty-icon">💻</span><p className="acat-empty-title">No sites yet</p></div>
        ) : items.map(item => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: "1px solid var(--ab-border)", background: editId === item.id ? "var(--ab-hover)" : "transparent" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.style?.color || item.color || "#ccc", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{item.siteName}</div>
              <div style={{ fontSize: 11, color: "var(--ab-text-muted)" }}>{item.iconifyClassname}</div>
            </div>
            <div className="acat-row-actions">
              <button className="acat-action-btn acat-action-btn--edit" onClick={() => { setEditId(item.id); setForm({ siteName: item.siteName || "", iconifyClassname: item.iconifyClassname || "", color: item.style?.color || item.color || "#2EC866", profileLink: item.profileLink || "", order: item.order ?? 0 }); }}><i className="fas fa-pencil-alt" /></button>
              <button className="acat-action-btn acat-action-btn--del" onClick={() => setDel(item)}><i className="fas fa-trash-alt" /></button>
            </div>
          </div>
        ))}
      </div>
      <DelModal target={delTarget} title={`Delete "${delTarget?.siteName}"?`} onCancel={() => setDel(null)} onConfirm={confirmDel} deleting={deleting} />
    </div>
  );
}

/* ── Projects tab ───────────────────────────────────────────────────────── */
const EMPTY_PROJ = { title: "", description: "", image: "", link: "", order: 0 };
function ProjectsTab({ toast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_PROJ);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [delTarget, setDel] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const imageRef = useRef(null);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => { setLoading(true); try { setItems(await getPortfolioProjects()); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return toast?.addToast("Title is required.", "error");
    setSaving(true);
    try {
      const image = await imageRef.current?.resolveUpload() ?? form.image;
      const payload = { ...form, image, order: Number(form.order) || 0 };
      if (editId) { await updatePortfolioProject(editId, payload); toast?.addToast("Updated.", "success"); setEditId(null); }
      else { await createPortfolioProject(payload); toast?.addToast("Added.", "success"); }
      setForm(EMPTY_PROJ); await load();
    } catch { toast?.addToast("Failed to save.", "error"); } finally { setSaving(false); }
  }

  async function confirmDel() {
    setDeleting(true);
    try { await deletePortfolioProject(delTarget.id); toast?.addToast("Deleted.", "info"); setDel(null); await load(); }
    catch { toast?.addToast("Delete failed.", "error"); } finally { setDeleting(false); }
  }

  return (
    <div className="acat-layout">
      <div className="acat-form-card">
        <div className="acat-form-head"><span className="acat-form-head-icon"><i className={`fas ${editId ? "fa-pencil-alt" : "fa-project-diagram"}`} /></span><div><h2 className="acat-card-title">{editId ? "Edit Project" : "Add Project"}</h2></div></div>
        <form onSubmit={handleSubmit} className="acat-form">
          <Field label="Project Title *"><input className="ainput" value={form.title} onChange={e => f("title", e.target.value)} placeholder="e.g. My SaaS App" required /></Field>
          <Field label="Description"><textarea className="ainput acat-textarea" rows={3} value={form.description} onChange={e => f("description", e.target.value)} /></Field>
          <ImageUploadField ref={imageRef} label="Project Image" hint="Upload a screenshot/logo or paste a direct URL" value={form.image} onChange={v => f("image", v)} />
          <Field label="Project Link"><input className="ainput" type="url" value={form.link} onChange={e => f("link", e.target.value)} placeholder="https://..." /></Field>
          <Field label="Order"><input className="ainput" type="number" min={0} value={form.order} onChange={e => f("order", e.target.value)} /></Field>
          <div className="acat-form-actions">
            <SaveBtn saving={saving} label={editId ? "Update" : "Add Project"} />
            {editId && <button type="button" className="abtn abtn-ghost" onClick={() => { imageRef.current?.clearPending(); setEditId(null); setForm(EMPTY_PROJ); }}>Cancel</button>}
          </div>
        </form>
      </div>
      <div className="acat-table-card">
        <div className="acat-table-header"><div className="acat-table-header-left"><h2 className="acat-card-title">Projects</h2>{!loading && <span className="acat-count-badge">{items.length}</span>}</div></div>
        {loading ? <div className="acat-skel-wrap">{[1,2].map(i => <div key={i} className="acat-skel-row"><div className="askel askel-line" style={{ flex: 1 }} /></div>)}</div> : items.length === 0 ? (
          <div className="acat-empty-state" style={{ padding: 40 }}><span className="acat-empty-icon">🚀</span><p className="acat-empty-title">No projects yet</p><p className="acat-empty-sub">Add your first featured project using the form.</p></div>
        ) : items.map(item => (
          <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--ab-border)", background: editId === item.id ? "var(--ab-hover)" : "transparent" }}>
            {item.image && <img src={item.image} alt={item.title} style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} onError={e => e.target.style.display = "none"} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</div>
              {item.description && <div style={{ fontSize: 12, color: "var(--ab-text-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.description}</div>}
            </div>
            <div className="acat-row-actions">
              <button className="acat-action-btn acat-action-btn--edit" onClick={() => { setEditId(item.id); setForm({ title: item.title || "", description: item.description || "", image: item.image || "", link: item.link || "", order: item.order ?? 0 }); }}><i className="fas fa-pencil-alt" /></button>
              <button className="acat-action-btn acat-action-btn--del" onClick={() => setDel(item)}><i className="fas fa-trash-alt" /></button>
            </div>
          </div>
        ))}
      </div>
      <DelModal target={delTarget} title={`Delete "${delTarget?.title}"?`} onCancel={() => setDel(null)} onConfirm={confirmDel} deleting={deleting} />
    </div>
  );
}

/* ── Skills tab ─────────────────────────────────────────────────────────── */
const SKILL_IMAGES = [
  { value: "FullStackImg",   label: "Full Stack" },
  { value: "CloudInfraImg",  label: "Cloud / Infra" },
  { value: "DesignImg",      label: "Design" },
  { value: "DataScienceImg", label: "Data Science" },
];
const EMPTY_GROUP  = { title: "", fileName: "FullStackImg", skills: "", softwareSkills: [], order: 0 };
const EMPTY_SW_SKILL = { skillName: "", fontAwesomeClassname: "", color: "#61DAFB", hasBg: false, bgColor: "#000000" };

function SkillsTab({ toast }) {
  /* ── group list ── */
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [delTarget, setDel]     = useState(null);
  const [deleting, setDeleting] = useState(false);

  /* ── group form ── */
  const [editId, setEditId] = useState(null);
  const [form,   setForm]   = useState(EMPTY_GROUP);
  const fg = (k, v) => setForm(p => ({ ...p, [k]: v }));

  /* ── inline software-skill builder ── */
  const [swForm,    setSwForm]    = useState(EMPTY_SW_SKILL);
  const [swEditIdx, setSwEditIdx] = useState(null);   // null = adding new
  const fsw = (k, v) => setSwForm(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await getSkillGroups()); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  /* ── software skill helpers ── */
  function swToEntry(sw) {
    const style = sw.hasBg
      ? { color: sw.color, backgroundColor: sw.bgColor }
      : { color: sw.color };
    return { skillName: sw.skillName.trim(), fontAwesomeClassname: sw.fontAwesomeClassname.trim(), style };
  }

  function entryToSw(entry) {
    return {
      skillName:           entry.skillName || "",
      fontAwesomeClassname: entry.fontAwesomeClassname || "",
      color:   entry.style?.color           || "#61DAFB",
      hasBg:   !!entry.style?.backgroundColor,
      bgColor: entry.style?.backgroundColor || "#000000",
    };
  }

  function handleAddSw(e) {
    e.preventDefault();
    if (!swForm.skillName.trim())              return toast?.addToast("Skill name is required.", "error");
    if (!swForm.fontAwesomeClassname.trim())   return toast?.addToast("Icon identifier is required.", "error");
    const entry = swToEntry(swForm);
    if (swEditIdx === null) {
      fg("softwareSkills", [...form.softwareSkills, entry]);
    } else {
      fg("softwareSkills", form.softwareSkills.map((s, i) => i === swEditIdx ? entry : s));
      setSwEditIdx(null);
    }
    setSwForm(EMPTY_SW_SKILL);
  }

  function startEditSw(i) {
    setSwEditIdx(i);
    setSwForm(entryToSw(form.softwareSkills[i]));
  }

  function removeSw(i) {
    fg("softwareSkills", form.softwareSkills.filter((_, idx) => idx !== i));
    if (swEditIdx === i) { setSwEditIdx(null); setSwForm(EMPTY_SW_SKILL); }
  }

  function moveSw(i, dir) {
    const next = [...form.softwareSkills];
    const t = i + dir;
    if (t < 0 || t >= next.length) return;
    [next[i], next[t]] = [next[t], next[i]];
    fg("softwareSkills", next);
    if (swEditIdx === i) setSwEditIdx(t);
    else if (swEditIdx === t) setSwEditIdx(i);
  }

  /* ── group form submit ── */
  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return toast?.addToast("Group title is required.", "error");
    setSaving(true);
    try {
      const bullets = form.skills.split("\n").map(s => s.trim()).filter(Boolean);
      const payload  = { title: form.title.trim(), fileName: form.fileName, skills: bullets, softwareSkills: form.softwareSkills, order: Number(form.order) || 0 };
      if (editId) { await updateSkillGroup(editId, payload); toast?.addToast("Skill group updated.", "success"); }
      else        { await createSkillGroup(payload);         toast?.addToast("Skill group added.", "success"); }
      cancelEdit(); await load();
    } catch { toast?.addToast("Failed to save.", "error"); } finally { setSaving(false); }
  }

  function startEdit(item) {
    setEditId(item.id);
    setForm({ title: item.title || "", fileName: item.fileName || "FullStackImg", skills: (item.skills || []).join("\n"), softwareSkills: item.softwareSkills || [], order: item.order ?? 0 });
    setSwForm(EMPTY_SW_SKILL); setSwEditIdx(null);
  }

  function cancelEdit() {
    setEditId(null); setForm(EMPTY_GROUP); setSwForm(EMPTY_SW_SKILL); setSwEditIdx(null);
  }

  async function confirmDel() {
    setDeleting(true);
    try { await deleteSkillGroup(delTarget.id); toast?.addToast("Deleted.", "info"); setDel(null); await load(); }
    catch { toast?.addToast("Delete failed.", "error"); } finally { setDeleting(false); }
  }

  /* ── software-skill preview dot ── */
  function SkillDot({ entry }) {
    const bg = entry.style?.backgroundColor;
    const col = entry.style?.color || "#aaa";
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
        background: bg || "var(--ab-surface)",
        border: "1px solid var(--ab-border)",
      }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: col, display: "block" }} />
      </span>
    );
  }

  return (
    <div className="acat-layout">

      {/* ── Group form ── */}
      <div className="acat-form-card">
        <div className="acat-form-head">
          <span className="acat-form-head-icon"><i className={`fas ${editId ? "fa-pencil-alt" : "fa-tools"}`} /></span>
          <div>
            <h2 className="acat-card-title">{editId ? "Edit Skill Group" : "Add Skill Group"}</h2>
            {editId && <p className="acat-form-editing-name">Editing: <strong>{items.find(i => i.id === editId)?.title}</strong></p>}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="acat-form">
          <Field label="Group Title *">
            <input className="ainput" value={form.title} onChange={e => fg("title", e.target.value)} placeholder="e.g. Full Stack Development" required />
          </Field>

          <Field label="Illustration Image">
            <select className="ainput" value={form.fileName} onChange={e => fg("fileName", e.target.value)}>
              {SKILL_IMAGES.map(img => <option key={img.value} value={img.value}>{img.label} ({img.value})</option>)}
            </select>
          </Field>

          <Field label="Bullet Points" hint="One point per line. Tip: start with ⚡ for style.">
            <textarea className="ainput acat-textarea" rows={4} value={form.skills}
              onChange={e => fg("skills", e.target.value)}
              placeholder={"⚡ Building responsive UIs with React\n⚡ Designing RESTful APIs with Node.js"}
            />
          </Field>

          {/* ── Software Skills builder ── */}
          <div className="acat-field">
            <label className="acat-label">
              Software Skills
              {form.softwareSkills.length > 0 && (
                <span className="acat-count-badge" style={{ marginLeft: 6 }}>{form.softwareSkills.length}</span>
              )}
            </label>

            {/* Added skills list */}
            {form.softwareSkills.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                {form.softwareSkills.map((entry, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "7px 10px", borderRadius: 8,
                    border: `1px solid ${swEditIdx === i ? "var(--aprimary)" : "var(--ab-border)"}`,
                    background: swEditIdx === i ? "rgba(59,130,246,.06)" : "var(--ab-surface)",
                  }}>
                    <SkillDot entry={entry} />
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{entry.skillName}</span>
                    <span style={{ fontSize: 11, color: "var(--ab-text-muted)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
                      {entry.fontAwesomeClassname}
                    </span>
                    <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                      <button type="button" className="acat-action-btn" title="Move up"   onClick={() => moveSw(i, -1)} disabled={i === 0}><i className="fas fa-chevron-up" /></button>
                      <button type="button" className="acat-action-btn" title="Move down" onClick={() => moveSw(i, 1)}  disabled={i === form.softwareSkills.length - 1}><i className="fas fa-chevron-down" /></button>
                      <button type="button" className="acat-action-btn acat-action-btn--edit" title="Edit" onClick={() => startEditSw(i)}><i className="fas fa-pencil-alt" /></button>
                      <button type="button" className="acat-action-btn acat-action-btn--del"  title="Remove" onClick={() => removeSw(i)}><i className="fas fa-times" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add / edit a single software skill */}
            <div style={{ border: "1px dashed var(--ab-border)", borderRadius: 10, padding: 14, background: "var(--ab-surface)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--ab-text-muted)", margin: "0 0 12px" }}>
                {swEditIdx !== null ? `Editing skill #${swEditIdx + 1}` : "Add a skill"}
              </p>

              {/* Row 1: Skill Name + Icon ID — top-aligned grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "start" }}>
                <div>
                  <label className="acat-label" style={{ fontSize: 11 }}>Skill Name *</label>
                  <input
                    className="ainput"
                    value={swForm.skillName}
                    onChange={e => fsw("skillName", e.target.value)}
                    placeholder="e.g. ReactJS"
                  />
                </div>
                <div>
                  <label className="acat-label" style={{ fontSize: 11 }}>Icon ID *</label>
                  <input
                    className="ainput"
                    value={swForm.fontAwesomeClassname}
                    onChange={e => fsw("fontAwesomeClassname", e.target.value)}
                    placeholder="e.g. simple-icons:react"
                  />
                </div>
              </div>

              {/* Row 2: Colors */}
              <div style={{ display: "flex", gap: 16, marginTop: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                {/* Icon color */}
                <div>
                  <label className="acat-label" style={{ fontSize: 11 }}>Icon Color</label>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="color"
                      value={swForm.color}
                      onChange={e => fsw("color", e.target.value)}
                      style={{ width: 36, height: 34, padding: 2, borderRadius: 6, border: "1px solid var(--ab-border)", cursor: "pointer", flexShrink: 0 }}
                    />
                    <input
                      className="ainput"
                      value={swForm.color}
                      onChange={e => fsw("color", e.target.value)}
                      style={{ width: 88 }}
                      placeholder="#61DAFB"
                      maxLength={9}
                    />
                  </div>
                </div>

                {/* Background color */}
                <div>
                  <label className="acat-label" style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="checkbox" checked={swForm.hasBg} onChange={e => fsw("hasBg", e.target.checked)} style={{ margin: 0 }} />
                    Background Color
                  </label>
                  {swForm.hasBg ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                      <input
                        type="color"
                        value={swForm.bgColor}
                        onChange={e => fsw("bgColor", e.target.value)}
                        style={{ width: 36, height: 34, padding: 2, borderRadius: 6, border: "1px solid var(--ab-border)", cursor: "pointer", flexShrink: 0 }}
                      />
                      <input
                        className="ainput"
                        value={swForm.bgColor}
                        onChange={e => fsw("bgColor", e.target.value)}
                        style={{ width: 88 }}
                        placeholder="#000000"
                        maxLength={9}
                      />
                    </div>
                  ) : (
                    <div style={{ height: 34, marginTop: 4 }} />
                  )}
                </div>

                {/* Live preview */}
                {swForm.skillName && (
                  <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ab-text-muted)" }}>Preview</span>
                    <div style={{
                      width: 42, height: 42, borderRadius: 10,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: swForm.hasBg ? swForm.bgColor : "#ffffff",
                      border: "1px solid var(--ab-border)",
                      boxShadow: "0 2px 6px rgba(0,0,0,.08)",
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: swForm.color, lineHeight: 1, textAlign: "center" }}>
                        {swForm.skillName.slice(0, 3).toUpperCase()}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, maxWidth: 70, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {swForm.skillName}
                    </span>
                  </div>
                )}
              </div>

              {/* Row 3: Actions */}
              <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
                <button type="button" className="abtn abtn-primary" style={{ fontSize: 13, padding: "7px 16px" }} onClick={handleAddSw}>
                  {swEditIdx !== null ? <><i className="fas fa-check" /> Update Skill</> : <><i className="fas fa-plus" /> Add Skill</>}
                </button>
                {swEditIdx !== null && (
                  <button type="button" className="abtn abtn-ghost" style={{ fontSize: 13, padding: "7px 12px" }}
                    onClick={() => { setSwEditIdx(null); setSwForm(EMPTY_SW_SKILL); }}>
                    Cancel
                  </button>
                )}
                <a
                  href="https://icon-sets.iconify.design"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ marginLeft: "auto", fontSize: 12, color: "var(--aprimary)", display: "flex", alignItems: "center", gap: 4 }}
                >
                  <i className="fas fa-search" style={{ fontSize: 10 }} />
                  Browse icons
                  <i className="fas fa-external-link-alt" style={{ fontSize: 9 }} />
                </a>
              </div>
            </div>

            <p className="acat-hint" style={{ marginTop: 6 }}>
              Icon examples: <code>simple-icons:react</code>, <code>logos:nodejs</code>, <code>mdi:language-python</code>
            </p>
          </div>

          <Field label="Order">
            <input className="ainput" type="number" min={0} value={form.order} onChange={e => fg("order", e.target.value)} style={{ width: 90 }} />
          </Field>

          <div className="acat-form-actions">
            <SaveBtn saving={saving} label={editId ? "Update Group" : "Add Group"} />
            {editId && <button type="button" className="abtn abtn-ghost" onClick={cancelEdit}>Cancel</button>}
          </div>
        </form>
      </div>

      {/* ── Group list ── */}
      <div className="acat-table-card">
        <div className="acat-table-header">
          <div className="acat-table-header-left">
            <h2 className="acat-card-title">Skill Groups</h2>
            {!loading && <span className="acat-count-badge">{items.length}</span>}
          </div>
        </div>

        {loading ? (
          <div className="acat-skel-wrap">
            {[1, 2, 3].map(i => <div key={i} className="acat-skel-row"><div className="askel askel-line" style={{ flex: 1 }} /></div>)}
          </div>
        ) : items.length === 0 ? (
          <div className="acat-empty-state" style={{ padding: 40 }}>
            <span className="acat-empty-icon">🛠</span>
            <p className="acat-empty-title">No skill groups yet</p>
            <p className="acat-empty-sub">Add your first skill group using the form.</p>
          </div>
        ) : items.map(item => (
          <div key={item.id} style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            padding: "12px 20px", borderBottom: "1px solid var(--ab-border)",
            background: editId === item.id ? "var(--ab-hover)" : "transparent",
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{item.title}</div>
              {/* software skill color dots */}
              {(item.softwareSkills || []).length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
                  {(item.softwareSkills || []).slice(0, 12).map((s, i) => (
                    <span key={i} title={s.skillName} style={{
                      display: "inline-flex", alignItems: "center", gap: 3,
                      padding: "2px 7px", borderRadius: 999,
                      fontSize: 10.5, fontWeight: 600,
                      background: s.style?.backgroundColor || "var(--ab-surface)",
                      border: "1px solid var(--ab-border)",
                      color: s.style?.color || "var(--ab-text)",
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.style?.color || "#aaa", flexShrink: 0 }} />
                      {s.skillName}
                    </span>
                  ))}
                  {(item.softwareSkills || []).length > 12 && (
                    <span style={{ fontSize: 10.5, color: "var(--ab-text-muted)", padding: "2px 4px" }}>
                      +{item.softwareSkills.length - 12} more
                    </span>
                  )}
                </div>
              )}
              <div style={{ fontSize: 11, color: "var(--ab-text-muted)" }}>
                {SKILL_IMAGES.find(i => i.value === item.fileName)?.label || item.fileName}
                {" · "}
                {(item.softwareSkills || []).length} skill{(item.softwareSkills || []).length === 1 ? "" : "s"}
                {" · "}
                {(item.skills || []).length} bullet{(item.skills || []).length === 1 ? "" : "s"}
              </div>
            </div>
            <div className="acat-row-actions">
              <button className="acat-action-btn acat-action-btn--edit" title="Edit" onClick={() => startEdit(item)}>
                <i className="fas fa-pencil-alt" />
              </button>
              <button className="acat-action-btn acat-action-btn--del" title="Delete" onClick={() => setDel(item)}>
                <i className="fas fa-trash-alt" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <DelModal target={delTarget} title={`Delete "${delTarget?.title}"?`} onCancel={() => setDel(null)} onConfirm={confirmDel} deleting={deleting} />
    </div>
  );
}

/* ── Certifications tab ─────────────────────────────────────────────────── */
const EMPTY_CERT = { title: "", subtitle: "", logo_path: "", certificate_link: "", alt_name: "", color_code: "#4285F4", order: 0 };
function CertificationsTab({ toast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_CERT);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [delTarget, setDel] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const titleRef = useRef(null);
  const imageRef = useRef(null);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => { setLoading(true); try { setItems(await getCertifications()); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return toast?.addToast("Title is required.", "error");
    setSaving(true);
    try {
      const logo_path = await imageRef.current?.resolveUpload() ?? form.logo_path;
      const payload = { ...form, logo_path, order: Number(form.order) || 0 };
      if (editId) { await updateCertification(editId, payload); toast?.addToast("Updated.", "success"); setEditId(null); }
      else { await createCertification(payload); toast?.addToast("Added.", "success"); }
      setForm(EMPTY_CERT); await load();
    } catch { toast?.addToast("Failed to save.", "error"); } finally { setSaving(false); }
  }

  async function confirmDel() {
    setDeleting(true);
    try { await deleteCertification(delTarget.id); toast?.addToast("Deleted.", "info"); setDel(null); await load(); }
    catch { toast?.addToast("Delete failed.", "error"); } finally { setDeleting(false); }
  }

  const filtered = items.filter(c => c.title?.toLowerCase().includes(search.toLowerCase()) || c.alt_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="acat-layout">
      <div className="acat-form-card">
        <div className="acat-form-head"><span className="acat-form-head-icon"><i className={`fas ${editId ? "fa-pencil-alt" : "fa-certificate"}`} /></span><div><h2 className="acat-card-title">{editId ? "Edit Certification" : "Add Certification"}</h2></div></div>
        <form onSubmit={handleSubmit} className="acat-form">
          <Field label="Title *"><input ref={titleRef} className="ainput" value={form.title} onChange={e => f("title", e.target.value)} placeholder="e.g. JavaScript (Basic) Certificate" required /></Field>
          <Field label="Subtitle"><input className="ainput" value={form.subtitle} onChange={e => f("subtitle", e.target.value)} placeholder="e.g. - HackerRank" /></Field>
          <Field label="Issuer / Alt Name"><input className="ainput" value={form.alt_name} onChange={e => f("alt_name", e.target.value)} placeholder="e.g. HackerRank" /></Field>
          <Field label="Certificate Link"><input className="ainput" type="url" value={form.certificate_link} onChange={e => f("certificate_link", e.target.value)} placeholder="https://..." /></Field>
          <ImageUploadField ref={imageRef} label="Logo / Image" hint="Upload a file or enter a filename from public assets" value={form.logo_path} onChange={v => f("logo_path", v)} />
          <Field label="Background Color">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" value={form.color_code.slice(0,7)} onChange={e => f("color_code", e.target.value)} style={{ width: 38, height: 34, padding: 2, borderRadius: 6, border: "1px solid var(--ab-border)", cursor: "pointer" }} />
              <input className="ainput" value={form.color_code} onChange={e => f("color_code", e.target.value)} maxLength={9} style={{ flex: 1 }} />
            </div>
          </Field>
          <Field label="Order"><input className="ainput" type="number" min={0} value={form.order} onChange={e => f("order", e.target.value)} /></Field>
          <div className="acat-form-actions">
            <SaveBtn saving={saving} label={editId ? "Update" : "Add Certification"} />
            {editId && <button type="button" className="abtn abtn-ghost" onClick={() => { imageRef.current?.clearPending(); setEditId(null); setForm(EMPTY_CERT); }}>Cancel</button>}
          </div>
        </form>
      </div>
      <div className="acat-table-card">
        <div className="acat-table-header">
          <div className="acat-table-header-left"><h2 className="acat-card-title">Certifications</h2>{!loading && <span className="acat-count-badge">{filtered.length === items.length ? items.length : `${filtered.length} of ${items.length}`}</span>}</div>
          <div className="acat-search-wrap">
            <i className="fas fa-search acat-search-icon" />
            <input className="acat-search-input" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button type="button" className="acat-search-clear" onClick={() => setSearch("")}><i className="fas fa-times" /></button>}
          </div>
        </div>
        {loading ? <div className="acat-skel-wrap">{[1,2,3,4].map(i => <div key={i} className="acat-skel-row"><div className="askel askel-av" style={{ width: 32, height: 32, borderRadius: 6 }} /><div className="askel askel-line" style={{ flex: 1 }} /><div className="askel askel-line" style={{ width: 60 }} /></div>)}</div> : (
          <div className="acat-table-body-wrap">
            {filtered.length === 0 ? <div className="acat-empty-state" style={{ padding: 40 }}><span className="acat-empty-icon">{search ? "🔍" : "🏅"}</span><p className="acat-empty-title">{search ? "No matches" : "No certifications yet"}</p></div> : filtered.map(cert => (
              <div key={cert.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--ab-border)", background: editId === cert.id ? "var(--ab-hover)" : "transparent" }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, flexShrink: 0, background: cert.color_code || "#eee", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {cert.logo_path ? <img src={`/images/logos/${cert.logo_path}`} alt={cert.alt_name} style={{ width: 22, height: 22, objectFit: "contain" }} onError={e => e.target.style.display = "none"} /> : <i className="fas fa-certificate" style={{ fontSize: 14, color: "#fff", opacity: 0.8 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{cert.title}</div>
                  <div style={{ fontSize: 11, color: "var(--ab-text-muted)" }}>{cert.alt_name}{cert.subtitle ? ` · ${cert.subtitle}` : ""}</div>
                </div>
                <div className="acat-row-actions">
                  <button className="acat-action-btn acat-action-btn--edit" onClick={() => { setEditId(cert.id); setForm({ title: cert.title || "", subtitle: cert.subtitle || "", logo_path: cert.logo_path || "", certificate_link: cert.certificate_link || "", alt_name: cert.alt_name || "", color_code: cert.color_code || "#4285F4", order: cert.order ?? 0 }); titleRef.current?.focus(); }}><i className="fas fa-pencil-alt" /></button>
                  <button className="acat-action-btn acat-action-btn--del" onClick={() => setDel(cert)}><i className="fas fa-trash-alt" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <DelModal target={delTarget} title={`Delete "${delTarget?.title}"?`} onCancel={() => setDel(null)} onConfirm={confirmDel} deleting={deleting} />
    </div>
  );
}

/* ── Experience tab ─────────────────────────────────────────────────────── */
const EXP_SECTIONS = ["Work", "Internships", "Volunteerships"];
const EMPTY_EXP = { section: "Work", title: "", company: "", company_url: "", logo_path: "", duration: "", location: "", description: "", color: "#1565C0", order: 0 };
function ExperienceTab({ toast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_EXP);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [delTarget, setDel] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterSection, setFilterSection] = useState("All");
  const titleRef = useRef(null);
  const imageRef = useRef(null);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => { setLoading(true); try { setItems(await getExperiences()); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return toast?.addToast("Title is required.", "error");
    if (!form.company.trim()) return toast?.addToast("Company is required.", "error");
    setSaving(true);
    try {
      const logo_path = await imageRef.current?.resolveUpload() ?? form.logo_path;
      const payload = { ...form, logo_path, order: Number(form.order) || 0 };
      if (editId) { await updateExperience(editId, payload); toast?.addToast("Updated.", "success"); setEditId(null); }
      else { await createExperience(payload); toast?.addToast("Added.", "success"); }
      setForm(EMPTY_EXP); await load();
    } catch { toast?.addToast("Failed to save.", "error"); } finally { setSaving(false); }
  }

  async function confirmDel() {
    setDeleting(true);
    try { await deleteExperience(delTarget.id); toast?.addToast("Deleted.", "info"); setDel(null); await load(); }
    catch { toast?.addToast("Delete failed.", "error"); } finally { setDeleting(false); }
  }

  const filtered = items.filter(e => {
    const matchSection = filterSection === "All" || e.section === filterSection;
    const matchSearch = e.title?.toLowerCase().includes(search.toLowerCase()) || e.company?.toLowerCase().includes(search.toLowerCase());
    return matchSection && matchSearch;
  });
  const grouped = EXP_SECTIONS.map(sec => ({ title: sec, items: filtered.filter(e => e.section === sec) })).filter(g => g.items.length > 0);

  return (
    <div className="acat-layout">
      <div className="acat-form-card">
        <div className="acat-form-head"><span className="acat-form-head-icon"><i className={`fas ${editId ? "fa-pencil-alt" : "fa-briefcase"}`} /></span><div><h2 className="acat-card-title">{editId ? "Edit Experience" : "Add Experience"}</h2></div></div>
        <form onSubmit={handleSubmit} className="acat-form">
          <Field label="Section *">
            <select className="ainput" value={form.section} onChange={e => f("section", e.target.value)}>
              {EXP_SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Job Title *"><input ref={titleRef} className="ainput" value={form.title} onChange={e => f("title", e.target.value)} placeholder="e.g. Senior Associate Consultant" required /></Field>
          <Field label="Company *"><input className="ainput" value={form.company} onChange={e => f("company", e.target.value)} placeholder="e.g. Infosys Ltd." required /></Field>
          <Field label="Company URL"><input className="ainput" type="url" value={form.company_url} onChange={e => f("company_url", e.target.value)} placeholder="https://..." /></Field>
          <Field label="Duration"><input className="ainput" value={form.duration} onChange={e => f("duration", e.target.value)} placeholder="e.g. Apr 2026 - Present" /></Field>
          <Field label="Location"><input className="ainput" value={form.location} onChange={e => f("location", e.target.value)} placeholder="e.g. Noida, India" /></Field>
          <ImageUploadField ref={imageRef} label="Logo / Image" hint="Upload a file or enter a filename from public assets" value={form.logo_path} onChange={v => f("logo_path", v)} />
          <Field label="Description"><textarea className="ainput acat-textarea" rows={4} value={form.description} onChange={e => f("description", e.target.value)} placeholder="Describe your role and responsibilities…" /></Field>
          <Field label="Card Color">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" value={form.color.slice(0,7)} onChange={e => f("color", e.target.value)} style={{ width: 38, height: 34, padding: 2, borderRadius: 6, border: "1px solid var(--ab-border)", cursor: "pointer" }} />
              <input className="ainput" value={form.color} onChange={e => f("color", e.target.value)} maxLength={9} style={{ flex: 1 }} />
            </div>
          </Field>
          <Field label="Order"><input className="ainput" type="number" min={0} value={form.order} onChange={e => f("order", e.target.value)} /></Field>
          <div className="acat-form-actions">
            <SaveBtn saving={saving} label={editId ? "Update" : "Add Experience"} />
            {editId && <button type="button" className="abtn abtn-ghost" onClick={() => { imageRef.current?.clearPending(); setEditId(null); setForm(EMPTY_EXP); }}>Cancel</button>}
          </div>
        </form>
      </div>
      <div className="acat-table-card">
        <div className="acat-table-header">
          <div className="acat-table-header-left"><h2 className="acat-card-title">Experience</h2>{!loading && <span className="acat-count-badge">{filtered.length === items.length ? items.length : `${filtered.length} of ${items.length}`}</span>}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select className="ainput" style={{ width: "auto", padding: "6px 10px", fontSize: 13 }} value={filterSection} onChange={e => setFilterSection(e.target.value)}>
              <option value="All">All Sections</option>
              {EXP_SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="acat-search-wrap">
              <i className="fas fa-search acat-search-icon" />
              <input className="acat-search-input" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
              {search && <button type="button" className="acat-search-clear" onClick={() => setSearch("")}><i className="fas fa-times" /></button>}
            </div>
          </div>
        </div>
        {loading ? <div className="acat-skel-wrap">{[1,2,3,4].map(i => <div key={i} className="acat-skel-row"><div className="askel askel-av" style={{ width: 32, height: 32, borderRadius: 6 }} /><div className="askel askel-line" style={{ flex: 1 }} /><div className="askel askel-line" style={{ width: 60 }} /></div>)}</div>
          : grouped.length === 0 ? <div className="acat-empty-state" style={{ padding: 40 }}><span className="acat-empty-icon">{search ? "🔍" : "💼"}</span><p className="acat-empty-title">{search ? "No matches" : "No experiences yet"}</p></div>
          : grouped.map(group => (
            <div key={group.title} style={{ marginBottom: 24 }}>
              <div style={{ padding: "8px 20px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ab-text-muted)", borderBottom: "1px solid var(--ab-border)" }}>{group.title} ({group.items.length})</div>
              {group.items.map(exp => (
                <div key={exp.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--ab-border)", background: editId === exp.id ? "var(--ab-hover)" : "transparent" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: exp.color || "#ccc", flexShrink: 0, marginTop: 4 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{exp.title}</div>
                    <div style={{ fontSize: 12, color: "var(--ab-text-muted)", marginTop: 2 }}>{exp.company}{exp.duration ? ` · ${exp.duration}` : ""}{exp.location ? ` · ${exp.location}` : ""}</div>
                    {exp.description && <div style={{ fontSize: 12, color: "var(--ab-text-muted)", marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{exp.description}</div>}
                  </div>
                  <div className="acat-row-actions">
                    <button className="acat-action-btn acat-action-btn--edit" onClick={() => { setEditId(exp.id); setForm({ section: exp.section || "Work", title: exp.title || "", company: exp.company || "", company_url: exp.company_url || "", logo_path: exp.logo_path || "", duration: exp.duration || "", location: exp.location || "", description: exp.description || "", color: exp.color || "#1565C0", order: exp.order ?? 0 }); titleRef.current?.focus(); }}><i className="fas fa-pencil-alt" /></button>
                    <button className="acat-action-btn acat-action-btn--del" onClick={() => setDel(exp)}><i className="fas fa-trash-alt" /></button>
                  </div>
                </div>
              ))}
            </div>
          ))
        }
      </div>
      <DelModal target={delTarget} title={`Delete "${delTarget?.title}"?`} onCancel={() => setDel(null)} onConfirm={confirmDel} deleting={deleting} />
    </div>
  );
}

/* ── Experience Header tab ──────────────────────────────────────────────── */
const EMPTY_EXP_HDR = { title: "Experience", subtitle: "Work, Internship and Volunteership", description: "", stats: "" };
function ExperienceHeaderTab({ toast }) {
  const [form, setForm] = useState(EMPTY_EXP_HDR);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    getExperienceHeader().then(d => {
      if (d) setForm({
        title:       d.title       || "",
        subtitle:    d.subtitle    || "",
        description: d.description || "",
        stats: Array.isArray(d.stats) ? d.stats.map(s => `${s.value}|${s.label}`).join("\n") : "",
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      const stats = form.stats.split("\n").map(s => s.trim()).filter(Boolean).map(s => {
        const [value, ...rest] = s.split("|");
        return { value: value.trim(), label: rest.join("|").trim() };
      });
      await saveExperienceHeader({ title: form.title, subtitle: form.subtitle, description: form.description, stats });
      toast?.addToast("Experience header saved.", "success");
    } catch { toast?.addToast("Failed to save.", "error"); } finally { setSaving(false); }
  }

  if (loading) return <div className="acat-skel-wrap">{[1,2,3].map(i => <div key={i} className="acat-skel-row"><div className="askel askel-line" style={{ flex: 1, height: 36 }} /></div>)}</div>;

  return (
    <form onSubmit={handleSubmit} className="acat-form" style={{ maxWidth: 640 }}>
      <Field label="Page Title"><input className="ainput" value={form.title} onChange={e => f("title", e.target.value)} placeholder="e.g. Experience" /></Field>
      <Field label="Badge / Subtitle"><input className="ainput" value={form.subtitle} onChange={e => f("subtitle", e.target.value)} placeholder="e.g. Work, Internship and Volunteership" /></Field>
      <Field label="Description"><textarea className="ainput acat-textarea" rows={4} value={form.description} onChange={e => f("description", e.target.value)} placeholder="Brief paragraph about your experience..." /></Field>
      <Field label="Stats" hint={'One per line: value|label — e.g. "4+|Years Experience"'}>
        <textarea className="ainput acat-textarea" rows={4} value={form.stats} onChange={e => f("stats", e.target.value)} placeholder={"4+|Years Experience\n3+|Companies\n10+|Projects Built"} />
      </Field>
      <SaveBtn saving={saving} />
    </form>
  );
}

/* ── Contact Page Sections tab ──────────────────────────────────────────── */
const EMPTY_CPD = {
  cs_title: "Contact Me", cs_description: "",
  blog_title: "Blogs", blog_subtitle: "", blog_link: "/#/blogs",
  addr_title: "Address", addr_subtitle: "", addr_map_link: "",
  phone_title: "Phone Number", phone_subtitle: "",
};
function ContactPageTab({ toast }) {
  const [form, setForm] = useState(EMPTY_CPD);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    getContactPageData().then(d => {
      if (d) setForm({
        cs_title:       d.contactSection?.title       || "",
        cs_description: d.contactSection?.description || "",
        blog_title:     d.blogSection?.title          || "",
        blog_subtitle:  d.blogSection?.subtitle       || "",
        blog_link:      d.blogSection?.link           || "/#/blogs",
        addr_title:     d.addressSection?.title       || "",
        addr_subtitle:  d.addressSection?.subtitle    || "",
        addr_map_link:  d.addressSection?.location_map_link || "",
        phone_title:    d.phoneSection?.title         || "",
        phone_subtitle: d.phoneSection?.subtitle      || "",
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      await saveContactPageData({
        contactSection: { title: form.cs_title, description: form.cs_description },
        blogSection:    { title: form.blog_title, subtitle: form.blog_subtitle, link: form.blog_link },
        addressSection: { title: form.addr_title, subtitle: form.addr_subtitle, location_map_link: form.addr_map_link },
        phoneSection:   { title: form.phone_title, subtitle: form.phone_subtitle },
      });
      toast?.addToast("Contact page saved.", "success");
    } catch { toast?.addToast("Failed to save.", "error"); } finally { setSaving(false); }
  }

  if (loading) return <div className="acat-skel-wrap">{[1,2,3].map(i => <div key={i} className="acat-skel-row"><div className="askel askel-line" style={{ flex: 1, height: 36 }} /></div>)}</div>;

  return (
    <form onSubmit={handleSubmit} className="acat-form" style={{ maxWidth: 640 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ab-text-muted)", paddingBottom: 4, borderBottom: "1px solid var(--ab-border)", marginBottom: 4 }}>Contact Section</div>
      <Field label="Heading"><input className="ainput" value={form.cs_title} onChange={e => f("cs_title", e.target.value)} /></Field>
      <Field label="Description"><textarea className="ainput acat-textarea" rows={3} value={form.cs_description} onChange={e => f("cs_description", e.target.value)} /></Field>

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ab-text-muted)", paddingBottom: 4, borderBottom: "1px solid var(--ab-border)", marginTop: 12, marginBottom: 4 }}>Blog Section</div>
      <Field label="Title"><input className="ainput" value={form.blog_title} onChange={e => f("blog_title", e.target.value)} /></Field>
      <Field label="Subtitle"><textarea className="ainput acat-textarea" rows={2} value={form.blog_subtitle} onChange={e => f("blog_subtitle", e.target.value)} /></Field>
      <Field label="Blog Link"><input className="ainput" value={form.blog_link} onChange={e => f("blog_link", e.target.value)} placeholder="/#/blogs" /></Field>

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ab-text-muted)", paddingBottom: 4, borderBottom: "1px solid var(--ab-border)", marginTop: 12, marginBottom: 4 }}>Address Section</div>
      <Field label="Title"><input className="ainput" value={form.addr_title} onChange={e => f("addr_title", e.target.value)} /></Field>
      <Field label="Address Subtitle"><input className="ainput" value={form.addr_subtitle} onChange={e => f("addr_subtitle", e.target.value)} placeholder="e.g. Noida, UP, India - 201301" /></Field>
      <Field label="Google Maps Link"><input className="ainput" type="url" value={form.addr_map_link} onChange={e => f("addr_map_link", e.target.value)} placeholder="https://goo.gl/maps/..." /></Field>

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ab-text-muted)", paddingBottom: 4, borderBottom: "1px solid var(--ab-border)", marginTop: 12, marginBottom: 4 }}>Phone Section</div>
      <Field label="Title"><input className="ainput" value={form.phone_title} onChange={e => f("phone_title", e.target.value)} /></Field>
      <Field label="Phone Number"><input className="ainput" value={form.phone_subtitle} onChange={e => f("phone_subtitle", e.target.value)} placeholder="+91-XXXXXXXXXX" /></Field>

      <SaveBtn saving={saving} />
    </form>
  );
}

/* ── Projects Header tab ────────────────────────────────────────────────── */
const EMPTY_PH = { title: "Projects", description: "" };
function ProjectsHeaderTab({ toast }) {
  const [form, setForm] = useState(EMPTY_PH);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    getProjectsHeader().then(d => {
      if (d) setForm({ title: d.title || "", description: d.description || "" });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try { await saveProjectsHeader(form); toast?.addToast("Projects header saved.", "success"); }
    catch { toast?.addToast("Failed to save.", "error"); } finally { setSaving(false); }
  }

  if (loading) return <div className="acat-skel-wrap">{[1,2].map(i => <div key={i} className="acat-skel-row"><div className="askel askel-line" style={{ flex: 1, height: 36 }} /></div>)}</div>;

  return (
    <form onSubmit={handleSubmit} className="acat-form" style={{ maxWidth: 640 }}>
      <Field label="Page Title"><input className="ainput" value={form.title} onChange={e => f("title", e.target.value)} placeholder="e.g. Projects" /></Field>
      <Field label="Description"><textarea className="ainput acat-textarea" rows={4} value={form.description} onChange={e => f("description", e.target.value)} placeholder="Brief description shown at the top of the Projects page..." /></Field>
      <SaveBtn saving={saving} />
    </form>
  );
}

/* ── FAQ tab ────────────────────────────────────────────────────────────── */
function FaqTab({ toast }) {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [form, setForm] = useState({ q: "", a: "" });

  async function load() {
    setLoading(true);
    try {
      const d = await getContactPageData();
      setFaqs(d?.faqs || []);
    } catch { toast?.addToast("Failed to load FAQs.", "error"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function save(updated) {
    setSaving(true);
    try {
      const current = await getContactPageData() || {};
      await saveContactPageData({ ...current, faqs: updated });
      setFaqs(updated);
      toast?.addToast("FAQs saved.", "success");
    } catch { toast?.addToast("Failed to save.", "error"); }
    finally { setSaving(false); }
  }

  function startEdit(i) {
    setEditIdx(i);
    setForm({ q: faqs[i].q, a: faqs[i].a });
  }

  function cancelEdit() { setEditIdx(null); setForm({ q: "", a: "" }); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.q.trim() || !form.a.trim()) return toast?.addToast("Question and answer are required.", "error");
    const entry = { q: form.q.trim(), a: form.a.trim() };
    const updated = editIdx === null
      ? [...faqs, entry]
      : faqs.map((f, i) => i === editIdx ? entry : f);
    await save(updated);
    cancelEdit();
  }

  async function handleDelete(i) {
    await save(faqs.filter((_, idx) => idx !== i));
  }

  async function move(i, dir) {
    const updated = [...faqs];
    const target = i + dir;
    if (target < 0 || target >= updated.length) return;
    [updated[i], updated[target]] = [updated[target], updated[i]];
    await save(updated);
  }

  if (loading) return <div className="acat-skel-wrap">{[1,2,3].map(i => <div key={i} className="acat-skel-row"><div className="askel askel-line" style={{ flex: 1, height: 56 }} /></div>)}</div>;

  return (
    <div style={{ maxWidth: 720 }}>
      <form onSubmit={handleSubmit} className="acat-form" style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ab-text-muted)", paddingBottom: 4, borderBottom: "1px solid var(--ab-border)", marginBottom: 8 }}>
          {editIdx !== null ? `Editing FAQ #${editIdx + 1}` : "Add FAQ"}
        </div>
        <Field label="Question *">
          <input className="ainput" value={form.q} onChange={e => setForm(p => ({ ...p, q: e.target.value }))} placeholder="e.g. Are you available for remote work?" />
        </Field>
        <Field label="Answer *">
          <textarea className="ainput acat-textarea" rows={3} value={form.a} onChange={e => setForm(p => ({ ...p, a: e.target.value }))} placeholder="Your answer…" />
        </Field>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" className="abtn abtn-primary" disabled={saving}>
            {saving ? <><span className="aspin" style={{ borderTopColor: "#fff" }} /> Saving…</> : editIdx !== null ? <><i className="fas fa-check" /> Update</> : <><i className="fas fa-plus" /> Add FAQ</>}
          </button>
          {editIdx !== null && <button type="button" className="abtn abtn-ghost" onClick={cancelEdit}>Cancel</button>}
        </div>
      </form>

      {faqs.length === 0 ? (
        <div className="acat-empty-state" style={{ padding: "32px 24px" }}>
          <span className="acat-empty-icon">❓</span>
          <p className="acat-empty-title">No FAQs yet</p>
          <p className="acat-empty-sub">Add your first FAQ using the form above.</p>
        </div>
      ) : (
        <div className="acat-table-card">
          <div className="acat-table-header"><h2 className="acat-card-title">All FAQs</h2><span className="acat-count-badge">{faqs.length}</span></div>
          {faqs.map((faq, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "14px 20px", borderBottom: "1px solid var(--ab-border)", alignItems: "flex-start", background: editIdx === i ? "var(--ab-hover)" : "transparent" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{faq.q}</div>
                <div style={{ fontSize: 12, color: "var(--ab-text-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{faq.a}</div>
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button className="acat-action-btn" title="Move up" onClick={() => move(i, -1)} disabled={i === 0 || saving}><i className="fas fa-chevron-up" /></button>
                <button className="acat-action-btn" title="Move down" onClick={() => move(i, 1)} disabled={i === faqs.length - 1 || saving}><i className="fas fa-chevron-down" /></button>
                <button className="acat-action-btn acat-action-btn--edit" title="Edit" onClick={() => startEdit(i)}><i className="fas fa-pencil-alt" /></button>
                <button className="acat-action-btn acat-action-btn--del" title="Delete" onClick={() => handleDelete(i)} disabled={saving}><i className="fas fa-trash-alt" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/* ── Open Source / GitHub tab ───────────────────────────────────────────── */
function OpenSourceTab({ toast }) {
  const [form, setForm] = useState({ githubUserName: "", githubConvertedToken: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    getOpenSourceConfig().then(d => {
      if (d) setForm({ githubUserName: d.githubUserName || "", githubConvertedToken: d.githubConvertedToken || "" });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try { await saveOpenSourceConfig(form); toast?.addToast("GitHub config saved.", "success"); }
    catch { toast?.addToast("Failed to save.", "error"); } finally { setSaving(false); }
  }

  if (loading) return <div className="acat-skel-wrap">{[1,2].map(i => <div key={i} className="acat-skel-row"><div className="askel askel-line" style={{ flex: 1, height: 36 }} /></div>)}</div>;

  return (
    <form onSubmit={handleSubmit} className="acat-form" style={{ maxWidth: 640 }}>
      <Field label="GitHub Username"><input className="ainput" value={form.githubUserName} onChange={e => f("githubUserName", e.target.value)} placeholder="e.g. dmandal1" /></Field>
      <Field
        label="GitHub Token (base64 encoded)"
        hint={'Generate a token at github.com/settings/tokens with public_repo scope, then encode it: open browser console and run btoa("your_token_here"), paste the result here.'}
      >
        <input className="ainput" value={form.githubConvertedToken} onChange={e => f("githubConvertedToken", e.target.value)} placeholder="base64-encoded GitHub PAT" />
      </Field>
      <SaveBtn saving={saving} />
    </form>
  );
}


/* ── Blog Section Config tab ────────────────────────────────────────────── */
function BlogConfigTab({ toast }) {
  const [form, setForm] = useState({ title: "", subtitle: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    getBlogSectionConfig().then(d => {
      if (d) setForm({ title: d.title || "", subtitle: d.subtitle || "" });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try { await saveBlogSectionConfig(form); toast?.addToast("Blog section config saved.", "success"); }
    catch { toast?.addToast("Failed to save.", "error"); } finally { setSaving(false); }
  }

  if (loading) return <div className="acat-skel-wrap">{[1,2].map(i => <div key={i} className="acat-skel-row"><div className="askel askel-line" style={{ flex: 1, height: 36 }} /></div>)}</div>;

  return (
    <form onSubmit={handleSubmit} className="acat-form" style={{ maxWidth: 640 }}>
      <Field label="Section Title"><input className="ainput" value={form.title} onChange={e => f("title", e.target.value)} placeholder="e.g. Blogs" /></Field>
      <Field label="Subtitle"><textarea className="ainput acat-textarea" rows={3} value={form.subtitle} onChange={e => f("subtitle", e.target.value)} placeholder="Brief description shown above the blog post list…" /></Field>
      <p className="acat-hint" style={{ marginTop: -4 }}>Individual blog posts are managed in the <strong>Blogs</strong> section of the admin panel.</p>
      <SaveBtn saving={saving} />
    </form>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────── */
export default function AdminPortfolio() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("profile");

  const TAB_CONTENT = {
    profile:          <ProfileTab toast={toast} />,
    social:           <SocialTab toast={toast} />,
    contact:          <ContactTab toast={toast} />,
    contactPage:      <ContactPageTab toast={toast} />,
    faq:              <FaqTab toast={toast} />,
    seo:              <SeoTab toast={toast} />,
    education:        <EducationTab toast={toast} />,
    certifications:   <CertificationsTab toast={toast} />,
    experience:       <ExperienceTab toast={toast} />,
    experienceHeader: <ExperienceHeaderTab toast={toast} />,
    competitive:      <CompetitiveTab toast={toast} />,
    projects:         <ProjectsTab toast={toast} />,
    projectsHeader:   <ProjectsHeaderTab toast={toast} />,
    skills:           <SkillsTab toast={toast} />,
    openSource:       <OpenSourceTab toast={toast} />,
    blogConfig:       <BlogConfigTab toast={toast} />,
  };

  const currentGroup = TAB_GROUPS.find(g => g.ids.includes(activeTab));

  return (
    <div className="alayout">
      <AdminSidebar />
      <main className="amain apf-page">
        <div className="amain-inner">

          {/* ── Banner ── */}
          <div className="apf-banner">
            <div className="apf-banner-inner">
              <div className="apf-banner-icon">
                <i className="fas fa-layer-group" />
              </div>
              <div className="apf-banner-text">
                <p className="apf-banner-kicker">Admin Panel</p>
                <h1 className="apf-banner-title">Portfolio Content</h1>
                <p className="apf-banner-sub">Manage all sections of your public portfolio</p>
              </div>
              <div className="apf-banner-chips">
                {TAB_GROUPS.map(g => (
                  <button
                    key={g.label}
                    type="button"
                    className="apf-banner-chip"
                    onClick={() => setActiveTab(g.ids[0])}
                  >
                    <span className="apf-chip-dot" style={{ background: g.color }} />
                    {g.label.replace(" Page", "")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Shell ── */}
          <div className="apf-shell">

            {/* Sidebar nav */}
            <nav className="apf-sidenav">
              {TAB_GROUPS.map((group) => (
                <div key={group.label} className="apf-navgroup">
                  <div className="apf-navgroup-header">
                    <span className="apf-navgroup-dot" style={{ background: group.color }} />
                    <span className="apf-navgroup-label">{group.label}</span>
                  </div>
                  {group.ids.map(id => {
                    const active = activeTab === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`apf-navitem${active ? " apf-navitem--active" : ""}`}
                        style={active ? { "--g-color": group.color } : {}}
                        onClick={() => setActiveTab(id)}
                      >
                        <span className="apf-navitem-icon"><i className={TABS[id].icon} /></span>
                        <span className="apf-navitem-label">{TABS[id].label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* Content area */}
            <div className="apf-content">
              <div className="apf-content-header" style={{ "--g-color": currentGroup?.color }}>
                <span className="apf-content-icon"><i className={TABS[activeTab].icon} /></span>
                <div className="apf-content-meta">
                  <p className="apf-content-breadcrumb">
                    <span className="apf-content-breadcrumb-dot" />
                    {currentGroup?.emoji} {currentGroup?.label}
                  </p>
                  <h2 className="apf-content-title">{TABS[activeTab].label}</h2>
                </div>
              </div>
              <div className="apf-content-body" key={activeTab}>
                {TAB_CONTENT[activeTab]}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
