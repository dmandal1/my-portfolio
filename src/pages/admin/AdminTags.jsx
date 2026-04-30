import React, { useCallback, useEffect, useRef, useState } from "react";
import AdminSidebar from "./components/AdminSidebar";
import { useToast } from "./components/AdminToast";
import { createTag, deleteTag, getTags, updateTag } from "../../api/apiService";
import "./Admin.css";

function slugify(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

const EMPTY_FORM = { name: "", slug: "" };

export default function AdminTags() {
  const toast = useToast();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [delTarget, setDelTarget] = useState(null); // { id, name }
  const [selectedIds, setSelectedIds] = useState([]);
  const nameRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const tgs = await getTags();
      setTags(tgs);
    } catch (e) {
      console.error(e);
      toast?.addToast("Failed to load tags.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Keep selection in sync with currently loaded tags.
  useEffect(() => {
    const valid = new Set(tags.map((t) => t.id));
    setSelectedIds((prev) => prev.filter((id) => valid.has(id)));
  }, [tags]);

  function handleNameChange(e) {
    const name = e.target.value;
    setForm((f) => ({
      ...f,
      name,
      ...(editingId ? {} : { slug: slugify(name) }),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return toast?.addToast("Name is required.", "error");
    if (!form.slug.trim()) return toast?.addToast("Slug is required.", "error");

    const dupSlug = tags.find(
      (t) => t.slug === form.slug.trim().toLowerCase() && t.id !== editingId
    );
    if (dupSlug) return toast?.addToast("Slug already exists.", "error");

    setSaving(true);
    try {
      if (editingId) {
        await updateTag(editingId, form);
        toast?.addToast("Tag updated.", "success");
      } else {
        await createTag(form.name);
        toast?.addToast("Tag added.", "success");
      }
      setEditingId(null);
      setForm(EMPTY_FORM);
      await load();
    } catch {
      toast?.addToast("Failed to save tag.", "error");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(tag) {
    setEditingId(tag.id);
    setForm({ name: tag.name || "", slug: tag.slug || slugify(tag.name || "") });
    nameRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    nameRef.current?.focus();
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function confirmDelete() {
    if (!delTarget) return;
    setDeleting(true);
    try {
      if (delTarget.bulk && Array.isArray(delTarget.ids)) {
        const targets = delTarget.ids;
        const results = await Promise.allSettled(targets.map((id) => deleteTag(id)));
        const deletedCount = results.filter((r) => r.status === "fulfilled").length;
        const failedCount = results.length - deletedCount;

        if (deletedCount > 0) {
          toast?.addToast(`${deletedCount} tag${deletedCount === 1 ? "" : "s"} deleted.`, "info");
        }
        if (failedCount > 0) {
          toast?.addToast(`${failedCount} tag${failedCount === 1 ? "" : "s"} failed to delete.`, "error");
        }
        setSelectedIds((prev) => prev.filter((id) => !targets.includes(id)));
      } else {
        await deleteTag(delTarget.id);
        toast?.addToast("Tag deleted.", "info");
      }
      setDelTarget(null);
      await load();
    } catch {
      toast?.addToast("Delete failed.", "error");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = tags.filter((t) =>
    (t.name || "").toLowerCase().includes(tagSearch.toLowerCase()) ||
    (t.slug || "").toLowerCase().includes(tagSearch.toLowerCase())
  );
  const allFilteredSelected = filtered.length > 0 && filtered.every((t) => selectedIds.includes(t.id));

  function toggleRowSelection(id) {
    setSelectedIds((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ));
  }

  function toggleSelectAllFiltered() {
    setSelectedIds((prev) => {
      if (allFilteredSelected) {
        return prev.filter((id) => !filtered.some((t) => t.id === id));
      }
      return [...new Set([...prev, ...filtered.map((t) => t.id)])];
    });
  }

  return (
    <div className="alayout">
      <AdminSidebar />

      <main className="amain">
        <div className="amain-inner atag-page">
          <div className="apage-topbar">
            <h1 className="apage-title">Tags</h1>
          </div>

          <div className="acat-layout">
            <div className="acat-form-card">
              <h2 className="acat-card-title">
                {editingId ? "Edit Tag" : "Add New Tag"}
              </h2>

              <form onSubmit={handleSubmit} className="acat-form">
                <div className="acat-field">
                  <label className="acat-label">Name</label>
                  <input
                    ref={nameRef}
                    className="ainput"
                    placeholder="Enter tag name"
                    value={form.name}
                    onChange={handleNameChange}
                    required
                  />
                </div>

                <div className="acat-field">
                  <label className="acat-label">Slug</label>
                  <input
                    className="ainput"
                    placeholder="e.g. react-js"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                    required
                  />
                  <p className="acat-hint">
                    The "slug" is the URL-friendly version of the name.
                  </p>
                </div>

                <div className="acat-form-actions">
                  <button type="submit" className="abtn abtn-primary" disabled={saving}>
                    {saving
                      ? <><span className="aspin" style={{ borderTopColor: "#fff" }} /> Saving…</>
                      : editingId ? "Update Tag" : "Add New Tag"}
                  </button>
                  {editingId && (
                    <button type="button" className="abtn abtn-secondary" onClick={cancelEdit}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="acat-table-card">
              <div className="acat-table-header">
                <h2 className="acat-card-title">Tags</h2>
                <div className="acat-search-wrap">
                  <i className="fas fa-search acat-search-icon" />
                  <input
                    className="acat-search-input"
                    placeholder="Search Tags"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                  />
                </div>
              </div>

              {!loading && (
                <div className="acat-bulkbar">
                  <span className="acat-bulk-meta">
                    {selectedIds.length > 0
                      ? `${selectedIds.length} selected`
                      : "Select tags to bulk delete"}
                  </span>
                  <button
                    type="button"
                    className={`acat-bulk-delete${selectedIds.length > 0 ? " acat-bulk-delete--active" : ""}`}
                    disabled={selectedIds.length === 0 || deleting}
                    onClick={() => setDelTarget({ bulk: true, ids: selectedIds })}
                  >
                    <i className="fas fa-trash-alt" aria-hidden="true" />
                    <span>Delete Selected</span>
                    {selectedIds.length > 0 && <span className="acat-bulk-count">{selectedIds.length}</span>}
                  </button>
                </div>
              )}

              {loading ? (
                <div className="acat-skel-wrap">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="acat-skel-row">
                      <div className="askel askel-line" style={{ width: "35%" }} />
                      <div className="askel askel-line" style={{ width: "35%" }} />
                      <div className="askel askel-line" style={{ width: "18%" }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="acat-table-wrap">
                  <table className="acat-table atag-table-head">
                    <colgroup>
                      <col className="atag-col-check" />
                      <col className="atag-col-name" />
                      <col className="atag-col-slug" />
                      <col className="atag-col-posts" />
                      <col className="atag-col-actions" />
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
                              aria-label="Select all tags"
                            />
                          </span>
                        </th>
                        <th>Name</th>
                        <th>Slug</th>
                        <th>Posts</th>
                        <th />
                      </tr>
                    </thead>
                  </table>

                  <div className="atag-table-body-wrap">
                    <table className="acat-table atag-table-body">
                      <colgroup>
                        <col className="atag-col-check" />
                        <col className="atag-col-name" />
                        <col className="atag-col-slug" />
                        <col className="atag-col-posts" />
                        <col className="atag-col-actions" />
                      </colgroup>
                      <tbody>
                        {filtered.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="acat-empty-row">
                              {tagSearch ? "No tags match your search." : "No tags yet. Add one!"}
                            </td>
                          </tr>
                        ) : (
                          filtered.map((tag) => (
                            <tr key={tag.id} className={editingId === tag.id ? "acat-row--editing" : ""}>
                              <td className="acat-check-cell">
                                <span className="acat-check-inner">
                                  <input
                                    type="checkbox"
                                    className="acat-row-check"
                                    checked={selectedIds.includes(tag.id)}
                                    onChange={() => toggleRowSelection(tag.id)}
                                    aria-label={`Select ${tag.name}`}
                                  />
                                </span>
                              </td>
                              <td>
                                <span className="acat-name-link">{tag.name}</span>
                              </td>
                              <td><code className="acat-slug">{tag.slug || "—"}</code></td>
                              <td className="acat-count">{tag.postCount ?? 0}</td>
                              <td className="acat-row-actions">
                                <button
                                  className="acat-action-btn acat-action-btn--edit"
                                  title="Edit tag"
                                  onClick={() => startEdit(tag)}
                                >
                                  <i className="fas fa-pencil-alt" />
                                </button>
                                <button
                                  className="acat-action-btn acat-action-btn--del"
                                  title="Delete tag"
                                  onClick={() => setDelTarget({ id: tag.id, name: tag.name })}
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
            <h3 className="adel-title">Are you sure?</h3>
            <p className="adel-msg">
              {delTarget.bulk
                ? `Delete ${delTarget.ids.length} selected tag${delTarget.ids.length === 1 ? "" : "s"}? This action cannot be undone.`
                : "This action cannot be undone."}
            </p>
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