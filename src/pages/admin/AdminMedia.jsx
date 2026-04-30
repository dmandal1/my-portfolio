import React, { useCallback, useEffect, useRef, useState } from "react";
import AdminSidebar from "./components/AdminSidebar";
import { useAdminSettings } from "./components/useAdminSettings";
import { useToast } from "./components/AdminToast";
import {
  deleteMediaItem,
  listAllMedia,
  uploadCoverImage,
} from "../../api/apiService";
import "./Admin.css";

/* ── helpers ─────────────────────────────────────────────── */
function fmtBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}
function getMonthKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function getMonthLabel(iso) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long" });
}

const TYPE_LABELS = {
  "image/jpeg": "JPEG",
  "image/jpg":  "JPEG",
  "image/png":  "PNG",
  "image/webp": "WebP",
  "image/gif":  "GIF",
  "image/avif": "AVIF",
};

const SORT_LABELS = {
  newest:  "Newest first",
  oldest:  "Oldest first",
  name_az: "Name A – Z",
  name_za: "Name Z – A",
  largest: "Largest first",
};

export default function AdminMedia() {
  const toast = useToast();
  const adminSettings = useAdminSettings();
  const maxUploadSizeMb = Math.min(25, Math.max(1, Number(adminSettings.maxUploadSizeMb) || 5));
  const maxUploadBytes = maxUploadSizeMb * 1024 * 1024;

  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortOrder, setSortOrder]   = useState("newest");
  const [openPill, setOpenPill]     = useState(null); // "type" | "date" | "sort" | null
  const [viewMode, setViewMode]     = useState("grid"); // "grid" | "list"
  const [selected, setSelected]     = useState(null);
  const [deleting, setDeleting]         = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [copied, setCopied]             = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [uploadPct, setUploadPct]   = useState(0);
  const uploadRef                   = useRef(null);
  const searchRef                   = useRef(null);
  const pillsRef                    = useRef(null);

  /* ── load ─────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listAllMedia();
      setItems(data);
    } catch (e) {
      console.error(e);
      setError(`Failed to load media. ${e?.message || "Check server permissions and try again."}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* focus search input when it opens */
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  /* close pill dropdowns on outside click */
  useEffect(() => {
    if (!openPill) return;
    function onOutside(e) {
      if (pillsRef.current && !pillsRef.current.contains(e.target)) {
        setOpenPill(null);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [openPill]);

  /* ── upload ───────────────────────────────────────────── */
  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    if (!allowed.includes(file.type)) {
      toast?.addToast("Only JPEG, PNG, WebP, GIF, or AVIF images are allowed.", "error");
      return;
    }
    if (file.size > maxUploadBytes) {
      toast?.addToast(`Image must be under ${maxUploadSizeMb} MB.`, "error");
      return;
    }
    setUploading(true);
    setUploadPct(0);
    try {
      await uploadCoverImage(file, (pct) => setUploadPct(Math.round(pct)));
      toast?.addToast("Image uploaded!", "success");
      await load();
    } catch {
      toast?.addToast("Upload failed. Check server permissions and file size limits.", "error");
    } finally {
      setUploading(false);
      setUploadPct(0);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }

  /* ── copy URL ─────────────────────────────────────────── */
  function copyUrl(item) {
    navigator.clipboard.writeText(item.url).then(() => {
      setCopied(item.fullPath);
      toast?.addToast("URL copied!", "success");
      setTimeout(() => setCopied(null), 2000);
    });
  }

  /* ── delete ───────────────────────────────────────────── */
  function handleDelete(item) {
    setDeleteTarget(item);
  }

  async function confirmDelete() {
    const item = deleteTarget;
    setDeleteTarget(null);
    setDeleting(item.fullPath);
    try {
      await deleteMediaItem(item.fullPath);
      setItems((prev) => prev.filter((i) => i.fullPath !== item.fullPath));
      if (selected?.fullPath === item.fullPath) setSelected(null);
      toast?.addToast("Image deleted.", "info");
    } catch {
      toast?.addToast("Delete failed.", "error");
    } finally {
      setDeleting(null);
    }
  }

  /* ── type options ─────────────────────────────────────── */
  const typeOptions = [...new Set(items.map((i) => i.contentType))].sort();

  /* ── date options ─────────────────────────────────────── */
  const monthOptions = [
    ...new Map(
      items.map((i) => [getMonthKey(i.timeCreated), getMonthLabel(i.timeCreated)])
    ).entries(),
  ].sort((a, b) => b[0].localeCompare(a[0]));

  /* ── filtered + sorted list ───────────────────────────── */
  const filtered = items
    .filter((i) => {
      const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
      const matchDate   = dateFilter === "all" || getMonthKey(i.timeCreated) === dateFilter;
      const matchType   = typeFilter === "all" || i.contentType === typeFilter;
      return matchSearch && matchDate && matchType;
    })
    .sort((a, b) => {
      if (sortOrder === "oldest")  return new Date(a.timeCreated) - new Date(b.timeCreated);
      if (sortOrder === "name_az") return a.name.localeCompare(b.name);
      if (sortOrder === "name_za") return b.name.localeCompare(a.name);
      if (sortOrder === "largest") return b.size - a.size;
      return new Date(b.timeCreated) - new Date(a.timeCreated);
    });

  return (
    <div className="alayout">
      <AdminSidebar />

      <main className="amain">
        <div className="amain-inner">

          {/* ── Page header ── */}
          <div className="apage-topbar">
            <h1 className="apage-title">Media Library</h1>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                className="abtn abtn-primary"
                onClick={() => !uploading && uploadRef.current?.click()}
                disabled={uploading}
              >
                {uploading
                  ? <><span className="aspin" style={{ borderTopColor: "#fff" }} /> Uploading {uploadPct}%</>
                  : <><i className="fas fa-upload" style={{ marginRight: 7 }} />Upload New Files</>}
              </button>
              <input
                ref={uploadRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                style={{ display: "none" }}
                onChange={handleUpload}
              />
            </div>
          </div>

          {/* ── Error ── */}
          {error && (
            <div className="aeditor-error" style={{ marginBottom: 16 }}>
              <i className="fas fa-exclamation-triangle" /> {error}
            </div>
          )}

          {/* ── Main content card ── */}
          <div className="aml-page-card">

            {/* ── Filter toolbar ── */}
            <div className="aml-toolbar">
              <div className="aml-filters" ref={pillsRef}>
                {/* ── Type filter ── */}
                <div
                  className={`aml-filter-pill${openPill === "type" ? " aml-filter-pill--open" : ""}`}
                  onClick={() => setOpenPill(openPill === "type" ? null : "type")}
                >
                  <span>{typeFilter === "all" ? "All Media Items" : (TYPE_LABELS[typeFilter] ?? typeFilter)}</span>
                  <i className="fas fa-chevron-down" />
                  {openPill === "type" && (
                    <div className="aml-pill-menu">
                      <button
                        className={`aml-pill-option${typeFilter === "all" ? " aml-pill-option--active" : ""}`}
                        onClick={(e) => { e.stopPropagation(); setTypeFilter("all"); setOpenPill(null); }}
                      >All Media Items</button>
                      {typeOptions.map((ct) => (
                        <button
                          key={ct}
                          className={`aml-pill-option${typeFilter === ct ? " aml-pill-option--active" : ""}`}
                          onClick={(e) => { e.stopPropagation(); setTypeFilter(ct); setOpenPill(null); }}
                        >{TYPE_LABELS[ct] ?? ct}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Date filter ── */}
                <div
                  className={`aml-filter-pill${openPill === "date" ? " aml-filter-pill--open" : ""}`}
                  onClick={() => setOpenPill(openPill === "date" ? null : "date")}
                >
                  <span>{dateFilter === "all" ? "All Dates" : (monthOptions.find(([k]) => k === dateFilter)?.[1] ?? "All Dates")}</span>
                  <i className="fas fa-chevron-down" />
                  {openPill === "date" && (
                    <div className="aml-pill-menu">
                      <button
                        className={`aml-pill-option${dateFilter === "all" ? " aml-pill-option--active" : ""}`}
                        onClick={(e) => { e.stopPropagation(); setDateFilter("all"); setOpenPill(null); }}
                      >All Dates</button>
                      {monthOptions.map(([key, label]) => (
                        <button
                          key={key}
                          className={`aml-pill-option${dateFilter === key ? " aml-pill-option--active" : ""}`}
                          onClick={(e) => { e.stopPropagation(); setDateFilter(key); setOpenPill(null); }}
                        >{label}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Sort order ── */}
                <div
                  className={`aml-filter-pill${openPill === "sort" ? " aml-filter-pill--open" : ""}`}
                  onClick={() => setOpenPill(openPill === "sort" ? null : "sort")}
                >
                  <span>{SORT_LABELS[sortOrder]}</span>
                  <i className="fas fa-chevron-down" />
                  {openPill === "sort" && (
                    <div className="aml-pill-menu">
                      {Object.entries(SORT_LABELS).map(([key, label]) => (
                        <button
                          key={key}
                          className={`aml-pill-option${sortOrder === key ? " aml-pill-option--active" : ""}`}
                          onClick={(e) => { e.stopPropagation(); setSortOrder(key); setOpenPill(null); }}
                        >{label}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right controls */}
              <div className="aml-controls">
                {/* Inline search */}
                <div className={`aml-search${searchOpen ? " aml-search--open" : ""}`}>
                  {searchOpen && (
                    <input
                      ref={searchRef}
                      className="aml-search-input"
                      placeholder="Search files…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Escape" && (setSearchOpen(false), setSearch(""))}
                    />
                  )}
                  {searchOpen && search && (
                    <button className="aml-search-clear" onClick={() => setSearch("")}>×</button>
                  )}
                </div>

                {/* View toggle group */}
                <div className="aml-view-toggle">
                  <button
                    type="button"
                    className={`aml-icon-btn${viewMode === "grid" ? " aml-icon-btn--active" : ""}`}
                    onClick={() => setViewMode("grid")}
                    title="Grid view"
                  >
                    <i className="fas fa-th-large" />
                  </button>
                  <button
                    type="button"
                    className={`aml-icon-btn${viewMode === "list" ? " aml-icon-btn--active" : ""}`}
                    onClick={() => setViewMode("list")}
                    title="List view"
                  >
                    <i className="fas fa-list" />
                  </button>
                </div>

                {/* Search toggle */}
                <button
                  type="button"
                  className="aml-icon-btn"
                  onClick={() => { setSearchOpen((v) => !v); if (searchOpen) setSearch(""); }}
                  title="Search"
                >
                  <i className="fas fa-sliders-h" />
                </button>
              </div>
            </div>

            {/* ── Body: grid/list + detail panel ── */}
            <div className="aml-body">

              {/* Grid / List */}
              <div className="aml-grid-wrap">
                {loading ? (
                  /* Skeleton */
                  <div className={viewMode === "grid" ? "aml-grid" : "aml-list"}>
                    {Array.from({ length: 16 }).map((_, i) => (
                      viewMode === "grid" ? (
                        <div key={i} className="aml-card aml-card--skel">
                          <div className="askel aml-thumb-skel" />
                        </div>
                      ) : (
                        <div key={i} className="aml-list-row aml-list-row--skel">
                          <div className="askel aml-list-thumb-skel" />
                          <div className="aml-list-info">
                            <div className="askel askel-line" style={{ width: "40%", marginBottom: 6 }} />
                            <div className="askel askel-line" style={{ width: "20%" }} />
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="aempty">
                    <div className="aempty-icon">🖼</div>
                    <p className="aempty-title">
                      {search ? "No images match your search" : "No images uploaded yet"}
                    </p>
                    <p className="aempty-sub">
                      {search
                        ? "Try a different filename."
                        : `Click "Upload New Files" to add images.`}
                    </p>
                    {!search && (
                      <button className="abtn abtn-primary" onClick={() => uploadRef.current?.click()}>
                        <i className="fas fa-upload" style={{ marginRight: 7 }} />Upload First Image
                      </button>
                    )}
                  </div>
                ) : viewMode === "grid" ? (
                  /* ── Grid view ── */
                  <div className="aml-grid">
                    {filtered.map((item) => (
                      <div
                        key={item.fullPath}
                        className={`aml-card${selected?.fullPath === item.fullPath ? " aml-card--active" : ""}`}
                        onClick={() => setSelected(selected?.fullPath === item.fullPath ? null : item)}
                      >
                        <div className="aml-thumb-wrap">
                          <img
                            src={item.url}
                            alt={item.name}
                            className="aml-thumb"
                            loading="lazy"
                          />
                          {/* Hover overlay */}
                          <div className="aml-overlay">
                            <button
                              className="aml-overlay-btn"
                              onClick={(e) => { e.stopPropagation(); copyUrl(item); }}
                              title="Copy URL"
                            >
                              <i className={copied === item.fullPath ? "fas fa-check" : "fas fa-link"} />
                            </button>
                            <button
                              className="aml-overlay-btn aml-overlay-btn--del"
                              onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                              disabled={deleting === item.fullPath}
                              title="Delete"
                            >
                              {deleting === item.fullPath
                                ? <span className="aspin" />
                                : <i className="fas fa-trash-alt" />}
                            </button>
                          </div>
                          {selected?.fullPath === item.fullPath && (
                            <div className="aml-card-selected-badge">
                              <i className="fas fa-check" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* ── List view ── */
                  <div className="aml-list">
                    {filtered.map((item) => (
                      <div
                        key={item.fullPath}
                        className={`aml-list-row${selected?.fullPath === item.fullPath ? " aml-list-row--active" : ""}`}
                        onClick={() => setSelected(selected?.fullPath === item.fullPath ? null : item)}
                      >
                        <img src={item.url} alt={item.name} className="aml-list-thumb" loading="lazy" />
                        <div className="aml-list-info">
                          <span className="aml-list-name" title={item.name}>{item.name}</span>
                          <span className="aml-list-meta">{fmtBytes(item.size)} · {fmtDate(item.timeCreated)}</span>
                        </div>
                        <div className="aml-list-actions">
                          <button
                            className="abtn abtn-ghost abtn-sm"
                            onClick={(e) => { e.stopPropagation(); copyUrl(item); }}
                          >
                            <i className={copied === item.fullPath ? "fas fa-check" : "fas fa-link"} />
                            {copied === item.fullPath ? " Copied" : " Copy URL"}
                          </button>
                          <button
                            className="abtn abtn-danger abtn-sm"
                            onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                            disabled={deleting === item.fullPath}
                          >
                            <i className="fas fa-trash-alt" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Detail panel (slides in when image selected) ── */}
              {selected && (
                <div className="aml-detail">
                  <div className="aml-detail-header">
                    <span className="aml-detail-title">Attachment Details</span>
                    <button
                      className="aml-detail-close"
                      onClick={() => setSelected(null)}
                      title="Close"
                    >
                      <i className="fas fa-times" />
                    </button>
                  </div>

                  <div className="aml-detail-preview-wrap">
                    <img src={selected.url} alt={selected.name} className="aml-detail-preview" />
                  </div>

                  <div className="aml-detail-rows">
                    <div className="aml-detail-row">
                      <span className="aml-detail-label">File name</span>
                      <span className="aml-detail-val" title={selected.name}>{selected.name}</span>
                    </div>
                    <div className="aml-detail-row">
                      <span className="aml-detail-label">Type</span>
                      <span className="aml-detail-val">{selected.contentType}</span>
                    </div>
                    <div className="aml-detail-row">
                      <span className="aml-detail-label">Size</span>
                      <span className="aml-detail-val">{fmtBytes(selected.size)}</span>
                    </div>
                    <div className="aml-detail-row">
                      <span className="aml-detail-label">Uploaded</span>
                      <span className="aml-detail-val">{fmtDate(selected.timeCreated)}</span>
                    </div>
                  </div>

                  <div className="aml-detail-url-section">
                    <span className="aml-detail-label">File URL</span>
                    <div className="aml-detail-url-row">
                      <input
                        className="ainput"
                        value={selected.url}
                        readOnly
                        onClick={(e) => e.target.select()}
                        style={{ fontSize: 12 }}
                      />
                      <button
                        className={`abtn abtn-sm ${copied === selected.fullPath ? "abtn-success" : "abtn-secondary"}`}
                        onClick={() => copyUrl(selected)}
                        style={{ flexShrink: 0 }}
                      >
                        {copied === selected.fullPath ? <><i className="fas fa-check" /> Copied</> : "Copy"}
                      </button>
                    </div>
                  </div>

                  <button
                    className="abtn abtn-danger"
                    style={{ width: "100%", justifyContent: "center", marginTop: 12 }}
                    onClick={() => handleDelete(selected)}
                    disabled={deleting === selected.fullPath}
                  >
                    {deleting === selected.fullPath
                      ? <><span className="aspin" /> Deleting…</>
                      : <><i className="fas fa-trash-alt" style={{ marginRight: 6 }} />Delete Image</>}
                  </button>
                </div>
              )}
            </div>

          </div>{/* /.aml-page-card */}

        </div>
      </main>

      {/* ── Delete confirmation modal ── */}
      {deleteTarget && (
        <div className="adel-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="adel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adel-icon-wrap">
              <div className="adel-icon-ring" />
              <div className="adel-icon">
                <i className="fas fa-trash-alt" />
              </div>
            </div>
            <h3 className="adel-title">Are you sure?</h3>
            <p className="adel-msg">This action cannot be undone.</p>
            <div className="adel-actions">
              <button
                className="adel-btn-cancel"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                className="adel-btn-confirm"
                onClick={confirmDelete}
                disabled={!!deleting}
              >
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
