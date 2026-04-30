import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminSidebar from "./components/AdminSidebar";
import { useToast } from "./components/AdminToast";
import {
  getDatabaseStats,
  optimizeDatabase,
  truncateTable,
  downloadDatabaseBackup,
} from "../../api/apiService";
import "./Admin.css";
import "./AdminDatabase.css";

/* Tables that must never be truncated (would break the app) */
const PROTECTED = new Set(["admin_users", "admin_settings", "admin_audit_events"]);

/* Icon + colour hints for known table names */
const TABLE_META = {
  comments:         { icon: "fas fa-comment-dots", color: "#1976d2" },
  author_followers: { icon: "fas fa-user-friends",  color: "#0288d1" },
  author_ratings:   { icon: "fas fa-star",          color: "#f59e0b" },
  media_files:      { icon: "fas fa-photo-video",   color: "#ef4444", danger: true },
  blogs:            { icon: "fas fa-newspaper",      color: "#059669" },
  categories:       { icon: "fas fa-folder",         color: "#7c3aed" },
  tags:             { icon: "fas fa-tag",            color: "#d97706" },
  post_tags:        { icon: "fas fa-link",           color: "#0891b2" },
  tokens:           { icon: "fas fa-key",            color: "#dc2626", danger: true },
};

function tableToMeta(name) {
  const m = TABLE_META[name] || { icon: "fas fa-table", color: "#64748b" };
  return {
    table: name,
    label: name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    ...m,
  };
}

function fmtSize(kb) {
  if (kb == null) return "—";
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function fmtCount(value) {
  return Number(value || 0).toLocaleString();
}

function keepStatOnOneLine(value) {
  return String(value).replace(/[-_]/g, (char) => `${char}\u2060`);
}

function tableStatus(table) {
  return (table.row_count ?? 0) > 0 ? "active" : "empty";
}

export default function AdminDatabase() {
  const { addToast } = useToast();
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [optimizing,   setOptimizing]   = useState(false);
  const [backing,      setBacking]      = useState(false);
  const [truncating,   setTruncating]   = useState(null);
  const [confirmTrunc, setConfirmTrunc] = useState(null);
  const [confirmText,  setConfirmText]  = useState("");
  const [exporting,    setExporting]    = useState(null);
  const [tableQuery,   setTableQuery]   = useState("");
  const [tableFilter,  setTableFilter]  = useState("all");
  const [sortConfig,   setSortConfig]   = useState({ key: "name", dir: "asc" });
  const [lastUpdated,  setLastUpdated]  = useState(null);

  const dangerPanelRef  = useRef(null);
  const overviewHeadRef = useRef(null);
  const [tblMaxHeight,  setTblMaxHeight] = useState(null);

  useEffect(() => {
    const danger = dangerPanelRef.current;
    if (!danger) return;
    const ro = new ResizeObserver(() => {
      const dangerH = danger.getBoundingClientRect().height;
      const headH   = overviewHeadRef.current?.getBoundingClientRect().height ?? 68;
      setTblMaxHeight(Math.max(120, dangerH - headH));
    });
    ro.observe(danger);
    return () => ro.disconnect();
  }, []);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      setStats(await getDatabaseStats());
      setLastUpdated(new Date());
    }
    catch { addToast("Could not load database stats.", "error"); }
    finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => { loadStats(); }, [loadStats]);

  async function handleOptimize() {
    setOptimizing(true);
    try {
      const res = await optimizeDatabase();
      addToast(`Optimized ${res.optimized} table(s).`, "success");
      loadStats();
    } catch { addToast("Optimization failed.", "error"); }
    finally { setOptimizing(false); }
  }

  async function handleBackup() {
    setBacking(true);
    try   { await downloadDatabaseBackup(); addToast("Backup downloaded.", "success"); }
    catch { addToast("Backup failed.", "error"); }
    finally { setBacking(false); }
  }

  async function handleTableBackup(table) {
    setExporting(table);
    try {
      await downloadDatabaseBackup(table);
      addToast(`Backup for "${table}" downloaded.`, "success");
    } catch {
      addToast(`Backup for "${table}" failed.`, "error");
    } finally {
      setExporting(null);
    }
  }

  async function handleTruncate(table) {
    setTruncating(table); setConfirmTrunc(null); setConfirmText("");
    try {
      const res = await truncateTable(table);
      if (table === "media_files" && res?.media_cleanup) {
        addToast(`Media cleared. Removed ${res.media_cleanup.deleted} upload file(s).`, "success");
      } else {
        addToast(`Table "${table}" cleared.`, "success");
      }
      loadStats();
    } catch { addToast(`Failed to clear "${table}".`, "error"); }
    finally { setTruncating(null); }
  }

  function handleSort(key) {
    setSortConfig((current) => (
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" ? "asc" : "desc" }
    ));
  }

  const tableSummary = useMemo(() => {
    const tables = stats?.tables || [];
    const totalRows = tables.reduce((sum, table) => sum + Number(table.row_count || 0), 0);
    const emptyTables = tables.filter((table) => tableStatus(table) === "empty").length;
    const largest = tables.reduce((best, table) => {
      if (!best) return table;
      return Number(table.size_kb || 0) > Number(best.size_kb || 0) ? table : best;
    }, null);

    return {
      totalRows,
      emptyTables,
      protectedTables: tables.filter((table) => PROTECTED.has(table.name)).length,
      largest,
      orphanUploads: stats?.uploads?.orphan_files || 0,
    };
  }, [stats]);

  const visibleTables = useMemo(() => {
    const query = tableQuery.trim().toLowerCase();
    const rows = (stats?.tables || []).filter((table) => {
      const matchesQuery = !query || table.name.toLowerCase().includes(query);
      const matchesFilter = tableFilter === "all" || tableStatus(table) === tableFilter;
      return matchesQuery && matchesFilter;
    });

    return [...rows].sort((a, b) => {
      const dir = sortConfig.dir === "asc" ? 1 : -1;
      if (sortConfig.key === "rows") return (Number(a.row_count || 0) - Number(b.row_count || 0)) * dir;
      if (sortConfig.key === "size") return (Number(a.size_kb || 0) - Number(b.size_kb || 0)) * dir;
      if (sortConfig.key === "status") return tableStatus(a).localeCompare(tableStatus(b)) * dir;
      return a.name.localeCompare(b.name) * dir;
    });
  }, [stats, sortConfig, tableFilter, tableQuery]);

  const lastUpdatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "Not refreshed yet";

  const STATS = [
    {
      key: "connection",
      icon: "fas fa-plug", label: "Connection",
      value: loading ? "…" : stats ? "Connected" : "Failed",
      sub: stats?.database || "",
      accent: "#1565c0", ok: !!stats, isConn: true,
    },
    {
      key: "database",
      icon: "fas fa-database", label: "Database",
      value: stats?.database || "—", sub: "Active",
      accent: "#0277bd",
    },
    {
      key: "version",
      icon: "fas fa-server", label: "MySQL Version",
      value: stats?.version || "—", sub: "Server",
      accent: "#00695c",
    },
    {
      key: "size",
      icon: "fas fa-hdd", label: "Total Size",
      value: fmtSize(stats?.total_kb), sub: "Storage used",
      accent: "#7c3aed",
    },
    {
      key: "tables",
      icon: "fas fa-table", label: "Tables",
      value: stats ? `${stats.tables.length}` : "—", sub: "in database",
      accent: "#c2410c",
    },
  ];

  return (
    <div className="alayout">
      <AdminSidebar />
      <main className="amain">
        <div className="amain-inner adb-page">

          {/* ══ Hero Banner ══════════════════════════════════════════ */}
          <div className="adb-banner">
            <div className="adb-banner-bg" />
            <div className="adb-banner-content">
              <div className="adb-banner-left">
                <div className="adb-banner-eyebrow">
                  <span className={`adb-conn-dot${stats ? " ok" : loading ? " pulse" : " err"}`} />
                  {loading ? "Connecting…" : stats ? "Live connection" : "Disconnected"}
                </div>
                <h1 className="adb-banner-title">Database Manager</h1>
                <p className="adb-banner-sub">Backup, optimize, and inspect your MySQL database in real time.</p>
                <div className="adb-banner-meta">Last refresh: {lastUpdatedLabel}</div>
              </div>
              <div className="adb-banner-actions">
                <button className="adb-action adb-action--ghost" onClick={loadStats} disabled={loading}>
                  <i className={`fas fa-sync-alt${loading ? " fa-spin" : ""}`} />
                  Refresh
                </button>
                <button className="adb-action adb-action--outline" onClick={handleOptimize} disabled={optimizing || loading}>
                  <i className="fas fa-broom" />
                  {optimizing ? "Optimizing…" : "Optimize"}
                </button>
                <button className="adb-action adb-action--solid" onClick={handleBackup} disabled={backing || loading}>
                  <i className={`fas fa-${backing ? "spinner fa-spin" : "cloud-download-alt"}`} />
                  {backing ? "Generating…" : "Download Backup"}
                </button>
              </div>
            </div>
          </div>

          {/* ══ Stat Cards ══════════════════════════════════════════ */}
          <div className="adb-cards-row">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className={`adb-stat adb-stat--${s.key}`}
                style={{ "--ac": s.accent, animationDelay: `${i * 55}ms` }}
              >
                <div className="adb-stat-icon">
                  <i className={s.icon} />
                </div>
                <div className="adb-stat-body">
                  <div className="adb-stat-label">{s.label}</div>
                  <div className="adb-stat-val" title={String(s.value)}>
                    {s.isConn && (
                      <span className={`adb-conn-dot adb-conn-dot--sm${stats ? " ok" : loading ? " pulse" : " err"}`} />
                    )}
                    <span className="adb-stat-val-text">{keepStatOnOneLine(s.value)}</span>
                  </div>
                  {s.sub && <div className="adb-stat-sub">{s.sub}</div>}
                </div>
              </div>
            ))}
          </div>

          {stats && (
            <div className="adb-insights">
              <div className="adb-insight">
                <span className="adb-insight-label">Total rows</span>
                <strong>{fmtCount(tableSummary.totalRows)}</strong>
              </div>
              <div className="adb-insight">
                <span className="adb-insight-label">Largest table</span>
                <strong title={tableSummary.largest?.name || ""}>{tableSummary.largest?.name || "—"}</strong>
                <span>{fmtSize(tableSummary.largest?.size_kb)}</span>
              </div>
              <div className="adb-insight">
                <span className="adb-insight-label">Empty tables</span>
                <strong>{tableSummary.emptyTables}</strong>
              </div>
              <div className="adb-insight">
                <span className="adb-insight-label">Protected</span>
                <strong>{tableSummary.protectedTables}</strong>
              </div>
              <div className={`adb-insight${tableSummary.orphanUploads ? " adb-insight--warn" : ""}`}>
                <span className="adb-insight-label">Orphan uploads</span>
                <strong>{tableSummary.orphanUploads}</strong>
                <span>{fmtSize(stats.uploads?.orphan_kb || 0)}</span>
              </div>
            </div>
          )}

          {/* ══ Main Grid ══════════════════════════════════════════ */}
          <div className="adb-grid">

            {/* Table Overview */}
            <div className="adb-panel">
              <div className="adb-panel-head" ref={overviewHeadRef}>
                <div className="adb-panel-head-l">
                  <div className="adb-panel-icon"><i className="fas fa-table" /></div>
                  <span className="adb-panel-title">Table Overview</span>
                  {stats && <span className="adb-chip">{visibleTables.length}/{stats.tables.length}</span>}
                </div>
                {stats && (
                  <div className="adb-panel-tools">
                    <label className="adb-table-search">
                      <i className="fas fa-search" />
                      <input
                        value={tableQuery}
                        onChange={(e) => setTableQuery(e.target.value)}
                        placeholder="Search tables"
                      />
                    </label>
                    <div className="adb-status-filters" aria-label="Filter tables">
                      {["all", "active", "empty"].map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          className={`adb-filter-btn${tableFilter === filter ? " is-active" : ""}`}
                          onClick={() => setTableFilter(filter)}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {stats && (
                <div className="adb-panel-mobile-tools">
                  <label className="adb-table-search">
                    <i className="fas fa-search" />
                    <input
                      value={tableQuery}
                      onChange={(e) => setTableQuery(e.target.value)}
                      placeholder="Search tables"
                    />
                  </label>
                  <div className="adb-status-filters" aria-label="Filter tables">
                    {["all", "active", "empty"].map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        className={`adb-filter-btn${tableFilter === filter ? " is-active" : ""}`}
                        onClick={() => setTableFilter(filter)}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loading ? (
                <div className="adb-skel-wrap">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="adb-skel-row" style={{ animationDelay: `${i * 60}ms` }}>
                      <div className="adb-skel adb-skel--lg" />
                      <div className="adb-skel adb-skel--sm" />
                      <div className="adb-skel adb-skel--sm" />
                      <div className="adb-skel adb-skel--xs" />
                    </div>
                  ))}
                </div>
              ) : !stats ? (
                <div className="adb-empty">
                  <div className="adb-empty-ring"><i className="fas fa-exclamation-triangle" /></div>
                  <p>Could not connect to the database.</p>
                  <button className="adb-retry" onClick={loadStats}><i className="fas fa-redo" /> Retry</button>
                </div>
              ) : (
                <div className="adb-tbl-wrap" style={tblMaxHeight ? { maxHeight: tblMaxHeight } : undefined}>
                  <table className="adb-tbl">
                    <thead>
                      <tr>
                        <th><button type="button" className="adb-th-btn" onClick={() => handleSort("name")}>Table Name <i className={`fas fa-sort${sortConfig.key === "name" ? `-${sortConfig.dir === "asc" ? "up" : "down"}` : ""} adb-sort-icon`} /></button></th>
                        <th><button type="button" className="adb-th-btn" onClick={() => handleSort("rows")}>Rows <i className={`fas fa-sort${sortConfig.key === "rows" ? `-${sortConfig.dir === "asc" ? "up" : "down"}` : ""} adb-sort-icon`} /></button></th>
                        <th><button type="button" className="adb-th-btn" onClick={() => handleSort("size")}>Size <i className={`fas fa-sort${sortConfig.key === "size" ? `-${sortConfig.dir === "asc" ? "up" : "down"}` : ""} adb-sort-icon`} /></button></th>
                        <th><button type="button" className="adb-th-btn" onClick={() => handleSort("status")}>Status <i className={`fas fa-sort${sortConfig.key === "status" ? `-${sortConfig.dir === "asc" ? "up" : "down"}` : ""} adb-sort-icon`} /></button></th>
                        <th>Export</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleTables.length ? (
                        visibleTables.map((t, i) => (
                          <tr key={t.name} style={{ animationDelay: `${i * 25}ms` }}>
                            <td><span className="adb-tname"><i className="fas fa-circle" />{t.name}</span></td>
                            <td className="adb-num">{fmtCount(t.row_count)}</td>
                            <td className="adb-size">{fmtSize(t.size_kb)}</td>
                            <td>
                              <span className={`adb-status${tableStatus(t) === "active" ? " adb-status--on" : ""}`}>
                                {tableStatus(t) === "active" ? "Active" : "Empty"}
                              </span>
                            </td>
                            <td className="adb-actions-cell">
                              <button
                                type="button"
                                className="adb-row-action"
                                onClick={() => handleTableBackup(t.name)}
                                disabled={exporting === t.name}
                                title={`Download ${t.name} backup`}
                              >
                                <i className={`fas fa-${exporting === t.name ? "spinner fa-spin" : "download"}`} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="adb-no-results" colSpan={5}>No tables match the current filters.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

            {/* Right column */}
            <div className="adb-right">

              {/* Clear Data panel — built from live tables, protected tables hidden */}
              <div className="adb-panel adb-panel--danger" ref={dangerPanelRef}>
                <div className="adb-panel-head">
                  <div className="adb-panel-head-l">
                    <div className="adb-panel-icon adb-panel-icon--red"><i className="fas fa-exclamation-triangle" /></div>
                    <span className="adb-panel-title">Clear Table Data</span>
                    {stats && (
                      <span className="adb-chip" style={{ background: "#ef4444" }}>
                        {stats.tables.filter(t => !PROTECTED.has(t.name)).length}
                      </span>
                    )}
                  </div>
                </div>
                <div className="adb-danger-wrap">
                  <p className="adb-danger-note">
                    Permanently removes all rows. <strong>Cannot be undone.</strong>
                    {" "}<span className="adb-protected-note">Protected tables (admin accounts) are hidden.</span>
                  </p>
                  {loading ? (
                    <div className="adb-trunc-loading">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="adb-skel-row" style={{ animationDelay: `${i * 60}ms` }}>
                          <div className="adb-skel" style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }} />
                          <div className="adb-skel adb-skel--lg" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    stats?.tables
                      .filter(t => !PROTECTED.has(t.name))
                      .map(t => {
                        const { table, label, icon, color, danger } = tableToMeta(t.name);
                        return (
                          <div key={table} className="adb-trunc-item">
                            {confirmTrunc === table ? (
                              <div className="adb-confirm">
                                <p className="adb-confirm-q">
                                  Delete all rows in <strong>{label}</strong>?
                                  {table === "media_files" && (
                                    <span> Uploaded files in the uploads folder will also be removed.</span>
                                  )}
                                </p>
                                <label className="adb-confirm-type">
                                  <span>Type <strong>{table}</strong> to confirm</span>
                                  <input
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    autoFocus
                                  />
                                </label>
                                <div className="adb-confirm-row">
                                  <button
                                    className="adb-confirm-yes"
                                    disabled={truncating === table || confirmText !== table}
                                    onClick={() => handleTruncate(table)}
                                  >
                                    <i className={`fas fa-${truncating === table ? "spinner fa-spin" : "trash"}`} />
                                    {truncating === table ? "Clearing…" : "Confirm"}
                                  </button>
                                  <button className="adb-confirm-no" onClick={() => { setConfirmTrunc(null); setConfirmText(""); }}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <button
                                className={`adb-trunc-btn${danger ? " danger" : ""}`}
                                style={{ "--tc": color }}
                                onClick={() => { setConfirmTrunc(table); setConfirmText(""); }}
                                disabled={!!truncating}
                              >
                                <span className="adb-trunc-ico"><i className={icon} /></span>
                                <span className="adb-trunc-lbl">Clear {label}</span>
                                <span className="adb-trunc-count">{(t.row_count ?? 0).toLocaleString()} rows</span>
                                <i className="fas fa-chevron-right adb-trunc-arr" />
                              </button>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Recent activity */}
              {stats?.audit?.length > 0 && (
                <div className="adb-panel">
                  <div className="adb-panel-head">
                    <div className="adb-panel-head-l">
                      <div className="adb-panel-icon"><i className="fas fa-history" /></div>
                      <span className="adb-panel-title">Recent Activity</span>
                    </div>
                  </div>
                  <div className="adb-audit-list">
                    {stats.audit.map((event, index) => (
                      <div key={`${event.created_at}-${index}`} className="adb-audit-item">
                        <div className="adb-audit-action">{event.action.replace("database.", "")}</div>
                        <div className="adb-audit-meta">
                          <span title={event.target}>{event.target}</span>
                          <span>{new Date(event.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}


            </div>
          </div>

          {/* ══ Backup Format — full-width below both panels ══════════ */}
          <div className="adb-backup-bar">
            <div className="adb-backup-bar-ico"><i className="fas fa-shield-alt" /></div>
            <div className="adb-backup-bar-body">
              <div className="adb-backup-bar-title">Backup Format</div>
              <p className="adb-backup-bar-desc">
                Full <code>CREATE TABLE</code> + all <code>INSERT</code> rows.
                Compatible with <strong>phpMyAdmin</strong> and MySQL CLI.
              </p>
            </div>
            <div className="adb-backup-bar-tags">
              <span className="adb-backup-tag"><i className="fas fa-check-circle" /> SQL dump</span>
              <span className="adb-backup-tag"><i className="fas fa-check-circle" /> phpMyAdmin</span>
              <span className="adb-backup-tag"><i className="fas fa-check-circle" /> MySQL CLI</span>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
