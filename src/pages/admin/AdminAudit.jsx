import { useEffect, useState, useCallback } from "react";
import AdminSidebar from "./components/AdminSidebar";
import { useToast } from "./components/AdminToast";
import { getAuditLogs, restoreDatabaseTable } from "../../api/apiService";
import "./Admin.css";

export default function AdminAudit() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [restoring, setRestoring] = useState(null);
  const limit = 20;

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs(search, limit, page * limit);
      setLogs(data.logs);
      setTotal(data.total);
    } catch {
      toast?.addToast("Failed to load audit logs.", "error");
    } finally {
      setLoading(false);
    }
  }, [search, page, toast]);

  useEffect(() => {
    const timer = setTimeout(loadLogs, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadLogs, search]);

  const handleRestore = async (log) => {
    if (!window.confirm(`Restore data from "${log.target}" created on ${new Date(log.created_at).toLocaleString()}? This will overwrite current data.`)) return;
    setRestoring(log.id);
    try {
      await restoreDatabaseTable(log.id);
      toast?.addToast("Data restored successfully.", "success");
      loadLogs();
    } catch {
      toast?.addToast("Restore failed. Check if backup data is still available.", "error");
    } finally {
      setRestoring(null);
    }
  };

  const getActionBadge = (action) => {
    if (action.includes("truncate")) return <span className="abadge abadge-danger">Truncate</span>;
    if (action.includes("delete")) return <span className="abadge abadge-danger">Delete</span>;
    if (action.includes("backup")) return <span className="abadge abadge-info">Backup</span>;
    if (action.includes("restore")) return <span className="abadge abadge-success">Restore</span>;
    if (action.includes("optimize")) return <span className="abadge abadge-pub">Optimize</span>;
    return <span className="abadge abadge-draft">{action}</span>;
  };

  return (
    <div className="alayout">
      <AdminSidebar />
      <main className="amain">
        <div className="amain-inner">
          <div className="apage-topbar">
            <div>
              <div className="apage-crumb">
                <span className="apage-crumb-link">Admin</span>
                <span className="apage-crumb-sep">/</span>
                <span className="apage-crumb-cur">Security</span>
              </div>
              <h1 className="apage-title">Audit Logs</h1>
              <p className="amain-subtitle">Track all administrative actions and security events.</p>
            </div>
            <div className="atopbar-right-group">
              <div className="asearch-wrap" style={{ minWidth: 260 }}>
                <i className="fas fa-search asearch-icon" />
                <input 
                  id="audit-search"
                  name="audit-search"
                  type="text" 
                  placeholder="Search actions, targets, IPs..." 
                  value={search} 
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  className="asearch-input"
                />
                {search && (
                  <button className="asearch-clear" onClick={() => { setSearch(""); setPage(0); }}>
                    <i className="fas fa-times" />
                  </button>
                )}
              </div>
              <button className={`arefresh-btn ${loading ? "is-refreshing" : ""}`} onClick={loadLogs} title="Refresh Logs">
                <i className="fas fa-sync-alt" />
              </button>
            </div>
          </div>

          <div className="acard" style={{ padding: 0, overflow: "hidden" }}>
            <div className="atable-responsive">
              <table className="atable">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 24, width: 140 }}>Event</th>
                    <th style={{ width: 160 }}>Target</th>
                    <th>Details</th>
                    <th style={{ width: 150 }}>IP Address</th>
                    <th style={{ width: 180 }}>Timestamp</th>
                    <th style={{ paddingRight: 24, textAlign: "right", width: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && logs.length === 0 ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6} style={{ padding: "18px 24px" }}>
                          <div className="askel askel-line" style={{ width: "100%", height: 14 }} />
                        </td>
                      </tr>
                    ))
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="aempty" style={{ padding: "100px 0" }}>
                          <div className="aempty-icon" style={{ fontSize: 64, marginBottom: 20 }}>
                            <i className="fas fa-shield-alt" style={{ color: "var(--ap)", opacity: 0.2 }} />
                          </div>
                          <h3 className="aempty-title">No logs found</h3>
                          <p className="aempty-sub">Security events and administrative actions will appear here.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="audit-row">
                        <td style={{ paddingLeft: 24 }}>{getActionBadge(log.action)}</td>
                        <td>
                          <code className="audit-target-code">{log.target || "system"}</code>
                        </td>
                        <td>
                          <div className="audit-details-wrap" title={JSON.stringify(log.details, null, 2)}>
                            {typeof log.details === 'object' 
                              ? Object.entries(log.details).slice(0, 3).map(([k,v]) => `${k}:${v}`).join(', ') 
                              : log.details}
                            {Object.keys(log.details || {}).length > 3 && " ..."}
                          </div>
                        </td>
                        <td>
                          <span className="audit-ip-badge">{log.ip_address}</span>
                        </td>
                        <td>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--atxt)" }}>
                            {new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--atxt2)", opacity: 0.7 }}>
                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </td>
                        <td style={{ paddingRight: 24, textAlign: "right" }}>
                          {log.can_restore ? (
                            <button 
                              className="abtn abtn-sm abtn-ghost audit-restore-btn" 
                              onClick={() => handleRestore(log)}
                              disabled={restoring === log.id}
                            >
                              <i className={restoring === log.id ? "aspin fas fa-spinner" : "fas fa-undo-alt"} />
                              <span>Restore</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: "var(--atxt2)", opacity: 0.4 }}>Manual Entry</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {total > limit && (
              <div className="atable-pagination" style={{ borderTop: "1px solid var(--abdr)", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button className="abtn abtn-ghost" onClick={() => { setPage(p => Math.max(0, p - 1)); window.scrollTo(0,0); }} disabled={page === 0}>
                  <i className="fas fa-chevron-left" style={{ fontSize: 11, marginRight: 8 }} /> Previous
                </button>
                <div style={{ fontSize: 13, color: "var(--atxt2)" }}>
                  Showing logs <strong>{page * limit + 1}</strong> – <strong>{Math.min((page + 1) * limit, total)}</strong> of <strong>{total}</strong>
                </div>
                <button className="abtn abtn-ghost" onClick={() => { setPage(p => p + 1); window.scrollTo(0,0); }} disabled={(page + 1) * limit >= total}>
                  Next <i className="fas fa-chevron-right" style={{ fontSize: 11, marginLeft: 8 }} />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
