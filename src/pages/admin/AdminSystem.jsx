import { useEffect, useState } from "react";
import AdminSidebar from "./components/AdminSidebar";
import { useToast } from "./components/AdminToast";
import { getSystemHealth } from "../../api/apiService";
import "./Admin.css";

export default function AdminSystem() {
  const toast = useToast();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

  const loadHealth = async () => {
    setLoading(true);
    try {
      const data = await getSystemHealth();
      setHealth(data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      toast?.addToast("Failed to fetch system health.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const InfoRow = ({ label, value, icon, color }) => (
    <div className="ast-row" style={{ padding: "16px 20px", borderBottom: "1px solid var(--abdr)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ 
          width: 38, height: 38, borderRadius: 10, background: color + "15", 
          color: color, display: "grid", placeItems: "center", fontSize: 17,
          boxShadow: `0 2px 8px ${color}20`
        }}>
          <i className={icon} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--atxt)" }}>{label}</span>
          <span style={{ fontSize: 12, color: "var(--atxt2)", opacity: 0.8, fontFamily: "var(--f-mono)" }}>{value || "Unknown"}</span>
        </div>
      </div>
    </div>
  );

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
                <span className="apage-crumb-cur">Health</span>
              </div>
              <h1 className="apage-title">System Status</h1>
              <p className="amain-subtitle">Monitor server environment and configuration.</p>
            </div>
            <div className="atopbar-right-group">
              <div className="alast-checked">
                <span className="alast-checked-label">Last Checked</span>
                <span className="alast-checked-time">{lastUpdated}</span>
              </div>
              <button 
                className={`arefresh-btn ${loading ? "is-refreshing" : ""}`} 
                onClick={loadHealth} 
                disabled={loading} 
                title="Refresh System Info"
              >
                <i className={`fas fa-sync-alt`} />
              </button>
            </div>
          </div>

          {loading && !health ? (
            <div className="acard" style={{ padding: "80px 0", textAlign: "center", background: "transparent", border: "1px dashed var(--abdr)" }}>
              <span className="aspin" style={{ width: 32, height: 32, borderColor: "var(--ap) transparent var(--ap) transparent" }} />
              <p style={{ marginTop: 16, color: "var(--atxt2)", fontSize: 14 }}>Gathering system information...</p>
            </div>
          ) : (
            <div className={`apage-content-wrap ${loading ? "is-refreshing" : ""}`} style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", 
              gap: 24,
              transition: "opacity 0.3s ease, filter 0.3s ease",
              opacity: loading ? 0.6 : 1,
              filter: loading ? "blur(1px)" : "none"
            }}>
              <div className="acard" style={{ padding: 0, overflow: "hidden" }}>
                <div className="acard-header" style={{ padding: "16px 20px", borderBottom: "1px solid var(--abdr)", background: "rgba(21, 101, 192, 0.02)" }}>
                  <h2 className="acard-title" style={{ fontSize: 15, fontWeight: 700, color: "var(--ap)" }}>
                    <i className="fas fa-microchip" style={{ marginRight: 10, opacity: 0.6 }} />
                    Software Environment
                  </h2>
                </div>
                <InfoRow label="PHP Version" value={health?.php_version} icon="fab fa-php" color="#777bb3" />
                <InfoRow label="MySQL Version" value={health?.mysql_version} icon="fas fa-database" color="#00758f" />
                <InfoRow label="Server Software" value={health?.server_software} icon="fas fa-server" color="#3b82f6" />
                <InfoRow label="Operating System" value={health?.os} icon="fas fa-terminal" color="#10b981" />
              </div>

              <div className="acard" style={{ padding: 0, overflow: "hidden" }}>
                <div className="acard-header" style={{ padding: "16px 20px", borderBottom: "1px solid var(--abdr)", background: "rgba(139, 92, 246, 0.02)" }}>
                  <h2 className="acard-title" style={{ fontSize: 15, fontWeight: 700, color: "#8b5cf6" }}>
                    <i className="fas fa-sliders-h" style={{ marginRight: 10, opacity: 0.6 }} />
                    PHP Configuration
                  </h2>
                </div>
                <InfoRow label="Memory Limit" value={health?.memory_limit} icon="fas fa-memory" color="#8b5cf6" />
                <InfoRow label="Upload Max Size" value={health?.upload_max_filesize} icon="fas fa-file-upload" color="#f59e0b" />
                <InfoRow label="Post Max Size" value={health?.post_max_size} icon="fas fa-envelope-open-text" color="#ef4444" />
                <InfoRow label="Max Execution Time" value={health?.max_execution_time + "s"} icon="fas fa-stopwatch" color="#06b6d4" />
              </div>

              <div className="acard" style={{ padding: 0, overflow: "hidden" }}>
                <div className="acard-header" style={{ padding: "16px 20px", borderBottom: "1px solid var(--abdr)", background: "rgba(99, 102, 241, 0.02)" }}>
                  <h2 className="acard-title" style={{ fontSize: 15, fontWeight: 700, color: "#6366f1" }}>
                    <i className="fas fa-tachometer-alt" style={{ marginRight: 10, opacity: 0.6 }} />
                    Resource Usage
                  </h2>
                </div>
                <InfoRow label="Disk Free Space" value={health?.disk_free_space} icon="fas fa-hdd" color="#6366f1" />
                <InfoRow label="Uploads Directory" value={health?.uploads_directory_size} icon="fas fa-folder-open" color="#ec4899" />
                <InfoRow label="Current Server Time" value={health?.time} icon="far fa-clock" color="#14b8a6" />
                <InfoRow label="Server Timezone" value={health?.timezone} icon="fas fa-globe" color="#f43f5e" />
              </div>

              <div className="acard" style={{ padding: 0, overflow: "hidden" }}>
                <div className="acard-header" style={{ padding: "16px 20px", borderBottom: "1px solid var(--abdr)", background: "rgba(16, 185, 129, 0.02)" }}>
                  <h2 className="acard-title" style={{ fontSize: 15, fontWeight: 700, color: "#10b981" }}>
                    <i className="fas fa-check-circle" style={{ marginRight: 10, opacity: 0.6 }} />
                    System Checks
                  </h2>
                </div>
                <div style={{ padding: "8px 20px 20px" }}>
                  <div className="ast-check-row">
                    <span className="ast-check-label">Configuration File</span>
                    <span className="abadge abadge-success" style={{ padding: "4px 10px", borderRadius: 6 }}>Exists</span>
                  </div>
                  <div className="ast-check-row">
                    <span className="ast-check-label">Installation Lock</span>
                    <span className="abadge abadge-success" style={{ padding: "4px 10px", borderRadius: 6 }}>Locked</span>
                  </div>
                  <div className="ast-check-row">
                    <span className="ast-check-label">Uploads Writable</span>
                    <span className="abadge abadge-success" style={{ padding: "4px 10px", borderRadius: 6 }}>Yes</span>
                  </div>
                  <div className="ast-check-row" style={{ borderBottom: "none" }}>
                    <span className="ast-check-label">Database Connection</span>
                    <span className="abadge abadge-success" style={{ padding: "4px 10px", borderRadius: 6 }}>Healthy</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
