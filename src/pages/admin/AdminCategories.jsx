import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import AdminSidebar from "./components/AdminSidebar";
import { useToast } from "./components/AdminToast";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "../../api/apiService";
import "./Admin.css";

function slugify(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

const EMPTY_FORM = { name: "", slug: "", parentId: "", description: "" };
const DESC_MAX   = 300;

export default function AdminCategories() {
  const toast = useToast();

  /* ── state ── */
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [catSearch, setCatSearch]   = useState("");
  const [form, setForm]             = useState(EMPTY_FORM);
  const [editingId, setEditingId]   = useState(null);
  const [delTarget, setDelTarget]   = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [parentOpen, setParentOpen] = useState(false);
  const [parentMenuMaxHeight, setParentMenuMaxHeight] = useState(260);

  /* ── sort ── */
  const [sortBy,  setSortBy]  = useState("name");   // "name" | "posts"
  const [sortDir, setSortDir] = useState("asc");

  const nameRef         = useRef(null);
  const formCardRef     = useRef(null);
  const parentMenuRef   = useRef(null);
  const parentTriggerRef = useRef(null);

  /* ── load ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch (e) {
      console.error(e);
      toast?.addToast("Failed to load categories.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    function onOutside(e) {
      if (parentMenuRef.current && !parentMenuRef.current.contains(e.target)) {
        setParentOpen(false);
      }
    }
    function onEsc(e) {
      if (e.key === "Escape") setParentOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  useLayoutEffect(() => {
    if (!parentOpen) return;
    function syncParentMenuHeight() {
      const cardRect    = formCardRef.current?.getBoundingClientRect();
      const triggerRect = parentTriggerRef.current?.getBoundingClientRect();
      if (!cardRect || !triggerRect) return;
      const available = Math.floor(cardRect.bottom - triggerRect.bottom - 12);
      setParentMenuMaxHeight(Math.max(120, available));
    }
    syncParentMenuHeight();
    window.addEventListener("resize", syncParentMenuHeight);
    return () => window.removeEventListener("resize", syncParentMenuHeight);
  }, [parentOpen]);

  useEffect(() => {
    const valid = new Set(categories.map((c) => c.id));
    setSelectedIds((prev) => prev.filter((id) => valid.has(id)));
  }, [categories]);

  /* ── auto-slug ── */
  function handleNameChange(e) {
    const name = e.target.value;
    setForm((f) => ({
      ...f,
      name,
      ...(editingId ? {} : { slug: slugify(name) }),
    }));
  }

  /* ── sort toggle ── */
  function toggleSort(col) {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("asc"); }
  }

  /* ── submit ── */
  async function handleSubmit(e, andNew = false) {
    e.preventDefault();
    if (!form.name.trim()) return toast?.addToast("Name is required.", "error");
    if (!form.slug.trim()) return toast?.addToast("Slug is required.", "error");
    const dupSlug = categories.find(
      (c) => c.slug === form.slug.trim().toLowerCase() && c.id !== editingId
    );
    if (dupSlug) return toast?.addToast("Slug already exists.", "error");

    setSaving(true);
    try {
      if (editingId) {
        await updateCategory(editingId, form);
        toast?.addToast("Category updated.", "success");
        setEditingId(null);
      } else {
        await createCategory(form);
        toast?.addToast("Category added.", "success");
      }
      setForm(EMPTY_FORM);
      if (!andNew) setEditingId(null);
      await load();
      if (andNew) nameRef.current?.focus();
    } catch {
      toast?.addToast("Failed to save category.", "error");
    } finally {
      setSaving(false);
    }
  }

  /* ── edit / cancel ── */
  function startEdit(cat) {
    setParentOpen(false);
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId || "",
      description: cat.description || "",
    });
    nameRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    nameRef.current?.focus();
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setParentOpen(false);
  }

  /* ── delete ── */
  async function confirmDelete() {
    if (!delTarget) return;
    setDeleting(true);
    try {
      if (delTarget.bulk && Array.isArray(delTarget.ids)) {
        const results = await Promise.allSettled(delTarget.ids.map((id) => deleteCategory(id)));
        const ok   = results.filter((r) => r.status === "fulfilled").length;
        const fail = results.length - ok;
        if (ok   > 0) toast?.addToast(`${ok} categor${ok === 1 ? "y" : "ies"} deleted.`, "info");
        if (fail > 0) toast?.addToast(`${fail} failed to delete.`, "error");
        setSelectedIds((prev) => prev.filter((id) => !delTarget.ids.includes(id)));
      } else {
        await deleteCategory(delTarget.id);
        toast?.addToast(`"${delTarget.name}" deleted.`, "info");
      }
      setDelTarget(null);
      await load();
    } catch {
      toast?.addToast("Delete failed.", "error");
    } finally {
      setDeleting(false);
    }
  }

  /* ── filter + sort ── */
  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(catSearch.toLowerCase()) ||
    c.slug.toLowerCase().includes(catSearch.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "posts") {
      const diff = (a.postCount ?? 0) - (b.postCount ?? 0);
      return sortDir === "asc" ? diff : -diff;
    }
    const diff = a.name.localeCompare(b.name);
    return sortDir === "asc" ? diff : -diff;
  });

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((c) => selectedIds.includes(c.id));

  function toggleRowSelection(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAllFiltered() {
    setSelectedIds((prev) => {
      if (allFilteredSelected) return prev.filter((id) => !filtered.some((c) => c.id === id));
      return [...new Set([...prev, ...filtered.map((c) => c.id)])];
    });
  }

  function parentLabel(parentId) {
    if (!parentId) return null;
    return categories.find((c) => c.id === parentId)?.name ?? null;
  }

  /* ── helpers ── */
  function SortIcon({ col }) {
    if (sortBy !== col) return <i className="fas fa-sort acat-sort-icon acat-sort-icon--inactive" />;
    return sortDir === "asc"
      ? <i className="fas fa-sort-up acat-sort-icon" />
      : <i className="fas fa-sort-down acat-sort-icon" />;
  }

  const parentOptions  = categories.filter((c) => c.id !== editingId);
  const selectedParent = parentOptions.find((c) => c.id === form.parentId);
  const editingCat     = editingId ? categories.find((c) => c.id === editingId) : null;

  /* ── delete modal copy ── */
  const delModalTitle = delTarget?.bulk
    ? `Delete ${delTarget.ids?.length} categor${delTarget.ids?.length === 1 ? "y" : "ies"}?`
    : `Delete "${delTarget?.name}"?`;
  const delModalMsg = delTarget?.bulk
    ? `${delTarget.ids?.length} categories will be permanently removed. This cannot be undone.`
    : "This category will be permanently removed. This cannot be undone.";

  return (
    <div className="alayout">
      <AdminSidebar />

      <main className="amain">
        <div className="amain-inner acat-page">

          {/* Page topbar */}
          <div className="apage-topbar">
            <div>
              <h1 className="apage-title">Categories</h1>
            </div>
            <div className="apage-topbar-meta">
              {!loading && (
                <span className="acat-total-chip">
                  {categories.length} total
                </span>
              )}
            </div>
          </div>

          <div className="acat-layout">

            {/* ── Left: form ── */}
            <div className="acat-form-card" ref={formCardRef}>

              {/* Form header */}
              <div className="acat-form-head">
                <span className="acat-form-head-icon">
                  <i className={`fas ${editingId ? "fa-pencil-alt" : "fa-folder-plus"}`} />
                </span>
                <div>
                  <h2 className="acat-card-title" style={{ marginBottom: 2 }}>
                    {editingId ? "Edit Category" : "Add New Category"}
                  </h2>
                  {editingCat && (
                    <p className="acat-form-editing-name">
                      Editing: <strong>{editingCat.name}</strong>
                    </p>
                  )}
                </div>
              </div>

              <form onSubmit={(e) => handleSubmit(e, false)} className="acat-form">

                {/* Name */}
                <div className="acat-field">
                  <label className="acat-label">Name <span className="acat-required">*</span></label>
                  <input
                    ref={nameRef}
                    className="ainput"
                    placeholder="e.g. Web Development"
                    value={form.name}
                    onChange={handleNameChange}
                    maxLength={60}
                    required
                  />
                </div>

                {/* Slug */}
                <div className="acat-field">
                  <label className="acat-label">Slug <span className="acat-required">*</span></label>
                  <input
                    className="ainput acat-slug-input"
                    placeholder="auto-generated from name"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                    required
                  />
                  <p className="acat-hint">
                    URL-friendly version of the name — lowercase letters, numbers, and hyphens only.
                  </p>
                </div>

                {/* Parent */}
                <div className="acat-field">
                  <label className="acat-label">Parent Category</label>
                  <div className="acat-parent-select" ref={parentMenuRef}>
                    <button
                      ref={parentTriggerRef}
                      type="button"
                      className={`ainput acat-parent-trigger${parentOpen ? " is-open" : ""}`}
                      onClick={() => setParentOpen((v) => !v)}
                    >
                      <span>{selectedParent?.name || <span className="acat-parent-none">None (top-level)</span>}</span>
                      <i className={`fas fa-chevron-${parentOpen ? "up" : "down"}`} />
                    </button>

                    {parentOpen && (
                      <div className="acat-parent-menu" style={{ maxHeight: `${parentMenuMaxHeight}px` }}>
                        <button
                          type="button"
                          className={`acat-parent-option${!form.parentId ? " is-active" : ""}`}
                          onClick={() => { setForm((f) => ({ ...f, parentId: "" })); setParentOpen(false); }}
                        >
                          <i className="fas fa-layer-group" style={{ fontSize: 11, marginRight: 6, opacity: 0.5 }} />
                          None (top-level)
                        </button>
                        {parentOptions.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className={`acat-parent-option${form.parentId === c.id ? " is-active" : ""}`}
                            onClick={() => { setForm((f) => ({ ...f, parentId: c.id })); setParentOpen(false); }}
                          >
                            <i className="fas fa-folder" style={{ fontSize: 11, marginRight: 6, opacity: 0.5 }} />
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="acat-hint">
                    Nest under another category, or leave as top-level.
                  </p>
                </div>

                {/* Description */}
                <div className="acat-field">
                  <div className="acat-label-row">
                    <label className="acat-label">Description</label>
                    <span className={`acat-charcount${form.description.length > DESC_MAX * 0.9 ? " acat-charcount--warn" : ""}`}>
                      {form.description.length}/{DESC_MAX}
                    </span>
                  </div>
                  <textarea
                    className="ainput acat-textarea"
                    placeholder="Optional short description of this category…"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, DESC_MAX) }))}
                    rows={3}
                  />
                </div>

                {/* Actions */}
                <div className="acat-form-actions">
                  <button type="submit" className="abtn abtn-primary" disabled={saving}>
                    {saving
                      ? <><span className="aspin" style={{ borderTopColor: "#fff" }} /> Saving…</>
                      : editingId
                        ? <><i className="fas fa-check" /> Update</>
                        : <><i className="fas fa-plus" /> Add Category</>
                    }
                  </button>
                  {!editingId && (
                    <button
                      type="button"
                      className="abtn abtn-secondary acat-save-new-btn"
                      disabled={saving}
                      onClick={(e) => handleSubmit(e, true)}
                      title="Save and immediately add another"
                    >
                      Save &amp; New
                    </button>
                  )}
                  {editingId && (
                    <button type="button" className="abtn abtn-ghost" onClick={cancelEdit}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* ── Right: table ── */}
            <div className="acat-table-card">

              {/* Table header */}
              <div className="acat-table-header">
                <div className="acat-table-header-left">
                  <h2 className="acat-card-title">Categories</h2>
                  {!loading && (
                    <span className="acat-count-badge">
                      {filtered.length !== categories.length
                        ? `${filtered.length} of ${categories.length}`
                        : categories.length}
                    </span>
                  )}
                </div>
                <div className="acat-search-wrap">
                  <i className="fas fa-search acat-search-icon" />
                  <input
                    className="acat-search-input"
                    placeholder="Search categories…"
                    value={catSearch}
                    onChange={(e) => setCatSearch(e.target.value)}
                  />
                  {catSearch && (
                    <button
                      type="button"
                      className="acat-search-clear"
                      onClick={() => setCatSearch("")}
                      title="Clear search"
                    >
                      <i className="fas fa-times" />
                    </button>
                  )}
                </div>
              </div>

              {/* Bulk bar */}
              {!loading && (
                <div className="acat-bulkbar">
                  <span className="acat-bulk-meta">
                    {selectedIds.length > 0
                      ? <><span className="acat-bulk-sel-count">{selectedIds.length}</span> selected</>
                      : "Select rows to bulk delete"}
                  </span>
                  <button
                    type="button"
                    className={`acat-bulk-delete${selectedIds.length > 0 ? " acat-bulk-delete--active" : ""}`}
                    disabled={selectedIds.length === 0 || deleting}
                    onClick={() => setDelTarget({ bulk: true, ids: [...selectedIds] })}
                  >
                    <i className="fas fa-trash-alt" />
                    <span>Delete Selected</span>
                    {selectedIds.length > 0 && (
                      <span className="acat-bulk-count">{selectedIds.length}</span>
                    )}
                  </button>
                </div>
              )}

              {/* Content */}
              {loading ? (
                <div className="acat-skel-wrap">
                  {[1,2,3,4,5].map((i) => (
                    <div key={i} className="acat-skel-row">
                      <div className="askel askel-av" style={{ width: 18, height: 18, borderRadius: 3 }} />
                      <div className="askel askel-line" style={{ width: "18%", flex: "0 0 auto" }} />
                      <div className="askel askel-line" style={{ width: "14%", flex: "0 0 auto" }} />
                      <div className="askel askel-line" style={{ flex: 1 }} />
                      <div className="askel askel-line" style={{ width: "12%", flex: "0 0 auto" }} />
                      <div className="askel askel-line" style={{ width: 40, flex: "0 0 auto" }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="acat-table-wrap">
                  <table className="acat-table acat-table-head">
                    <colgroup>
                      <col className="acat-col-check" />
                      <col className="acat-col-name" />
                      <col className="acat-col-parent" />
                      <col className="acat-col-desc" />
                      <col className="acat-col-slug" />
                      <col className="acat-col-posts" />
                      <col className="acat-col-actions" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="acat-check-head">
                          <span className="acat-check-inner">
                            <input
                              type="checkbox"
                              className="acat-row-check"
                              checked={allFilteredSelected}
                              onChange={toggleSelectAllFiltered}
                              aria-label="Select all"
                            />
                          </span>
                        </th>
                        <th>
                          <button type="button" className="acat-sort-btn" onClick={() => toggleSort("name")}>
                            Name <SortIcon col="name" />
                          </button>
                        </th>
                        <th>Parent</th>
                        <th>Description</th>
                        <th>Slug</th>
                        <th>
                          <button type="button" className="acat-sort-btn" onClick={() => toggleSort("posts")}>
                            Posts <SortIcon col="posts" />
                          </button>
                        </th>
                        <th />
                      </tr>
                    </thead>
                  </table>

                  <div className="acat-table-body-wrap">
                    <table className="acat-table acat-table-body">
                      <colgroup>
                        <col className="acat-col-check" />
                        <col className="acat-col-name" />
                        <col className="acat-col-parent" />
                        <col className="acat-col-desc" />
                        <col className="acat-col-slug" />
                        <col className="acat-col-posts" />
                        <col className="acat-col-actions" />
                      </colgroup>
                      <tbody>
                        {sorted.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="acat-empty-row">
                              <div className="acat-empty-state">
                                <span className="acat-empty-icon">
                                  {catSearch ? "🔍" : "🗂️"}
                                </span>
                                <p className="acat-empty-title">
                                  {catSearch ? "No categories match your search" : "No categories yet"}
                                </p>
                                {!catSearch && (
                                  <p className="acat-empty-sub">
                                    Add your first category using the form on the left.
                                  </p>
                                )}
                                {catSearch && (
                                  <button
                                    type="button"
                                    className="acat-empty-clear-btn"
                                    onClick={() => setCatSearch("")}
                                  >
                                    Clear search
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : (
                          sorted.map((cat) => {
                            const pLabel = parentLabel(cat.parentId);
                            const isEditing = editingId === cat.id;
                            return (
                              <tr
                                key={cat.id}
                                className={isEditing ? "acat-row--editing" : ""}
                              >
                                <td className="acat-check-cell">
                                  <span className="acat-check-inner">
                                    <input
                                      type="checkbox"
                                      className="acat-row-check"
                                      checked={selectedIds.includes(cat.id)}
                                      onChange={() => toggleRowSelection(cat.id)}
                                      aria-label={`Select ${cat.name}`}
                                    />
                                  </span>
                                </td>
                                <td>
                                  <div className="acat-name-cell">
                                    <span className="acat-name-link">{cat.name}</span>
                                    {isEditing && (
                                      <span className="acat-editing-badge">editing</span>
                                    )}
                                  </div>
                                </td>
                                <td className="acat-parent-cell">
                                  {pLabel ? (
                                    <span className="acat-parent-pill">
                                      <i className="fas fa-sitemap" />
                                      {pLabel}
                                    </span>
                                  ) : (
                                    <span className="acat-toplevel-pill">
                                      <i className="fas fa-layer-group" />
                                      Top-level
                                    </span>
                                  )}
                                </td>
                                <td className="acat-desc-cell">
                                  {cat.description
                                    ? <span className="acat-desc-text">{cat.description}</span>
                                    : <span className="acat-none">—</span>
                                  }
                                </td>
                                <td className="acat-slug-cell">
                                  <code className="acat-slug">{cat.slug}</code>
                                </td>
                                <td className="acat-count">
                                  {(cat.postCount ?? 0) > 0
                                    ? <span className="acat-post-count">{cat.postCount}</span>
                                    : <span className="acat-none">0</span>
                                  }
                                </td>
                                <td className="acat-row-actions">
                                  <button
                                    className="acat-action-btn acat-action-btn--edit"
                                    title="Edit category"
                                    onClick={() => startEdit(cat)}
                                  >
                                    <i className="fas fa-pencil-alt" />
                                  </button>
                                  <button
                                    className="acat-action-btn acat-action-btn--del"
                                    title="Delete category"
                                    onClick={() => setDelTarget({ id: cat.id, name: cat.name })}
                                  >
                                    <i className="fas fa-trash-alt" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
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

      {/* ── Delete confirmation ── */}
      {delTarget && (
        <div className="adel-overlay" onClick={() => !deleting && setDelTarget(null)}>
          <div className="adel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adel-icon-wrap">
              <div className="adel-icon-ring" />
              <div className="adel-icon"><i className="fas fa-trash-alt" /></div>
            </div>
            <h3 className="adel-title">{delModalTitle}</h3>
            <p className="adel-msg">{delModalMsg}</p>
            <div className="adel-actions">
              <button className="adel-btn-cancel" onClick={() => setDelTarget(null)} disabled={deleting}>
                Cancel
              </button>
              <button className="adel-btn-confirm" onClick={confirmDelete} disabled={deleting}>
                {deleting ? <><span className="aspin" style={{ borderTopColor: "#fff" }} /> Deleting…</> : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
