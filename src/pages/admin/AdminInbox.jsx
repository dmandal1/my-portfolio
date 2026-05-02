import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "./components/AdminSidebar";
import { useToast } from "./components/AdminToast";
import { getContactMessages, deleteContactMessage, markContactMessageRead } from "../../api/apiService";
import "./Admin.css";

export default function AdminInbox() {
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getContactMessages();
      setMessages(data || []);
    } catch (err) {
      toast?.addToast("Failed to load messages", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    
    try {
      await deleteContactMessage(id);
      toast?.addToast("Message deleted", "success");
      if (selectedMessage?.id === id) setSelectedMessage(null);
      await loadMessages();
    } catch (err) {
      toast?.addToast("Failed to delete message", "error");
    }
  };

  const handleSelectMessage = async (msg) => {
    setSelectedMessage(msg);
    if (!msg.is_read) {
      try {
        await markContactMessageRead(msg.id);
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: 1 } : m));
      } catch (e) {
        console.error("Failed to mark as read", e);
      }
    }
  };

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
                <span className="apage-crumb-cur">Inbox</span>
              </div>
              <h1 className="apage-title">Contact Inbox</h1>
              <p className="apage-subtitle">Manage and respond to messages from your visitors</p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="abtn abtn-ghost" onClick={loadMessages}>
                <i className="fas fa-sync-alt" style={{ marginRight: 6 }} /> Refresh
              </button>
            </div>
          </div>
          
          <div className="ainbox-container">
            {/* Left: Message List */}
            <div className="ainbox-sidebar">
              <div className="ainbox-sidebar-header">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: 15, color: "var(--atxt)", fontWeight: 700 }}>Recent Messages</h3>
                  <span className="abadge" style={{ fontSize: 10, background: "var(--ap-soft)", color: "var(--ap)" }}>
                    {messages.length} total
                  </span>
                </div>
              </div>
              <div className="ainbox-list">
                {loading ? (
                  <div className="ainbox-loading-state">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="ainbox-item-skel">
                        <div className="askel askel-line" style={{ width: "60%", marginBottom: 8 }} />
                        <div className="askel askel-line" style={{ width: "90%" }} />
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="ainbox-empty-list">
                    <i className="fas fa-inbox" />
                    <p>Inbox is empty</p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`ainbox-item ${selectedMessage?.id === msg.id ? "is-active" : ""} ${!msg.is_read ? "is-unread" : ""}`}
                      onClick={() => handleSelectMessage(msg)}
                    >
                      <div className="ainbox-item-header">
                        <span className="ainbox-item-name">{msg.name}</span>
                        <span className="ainbox-item-date">{new Date(msg.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                      </div>
                      <span className="ainbox-item-preview">{msg.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: Message Detail */}
            <div className="ainbox-view">
              {selectedMessage ? (
                <>
                  <div className="ainbox-view-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div className="ainbox-view-avatar">
                        {selectedMessage.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="ainbox-view-meta">
                        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "var(--atxt)" }}>{selectedMessage.name}</h2>
                        <div className="ainbox-view-email">
                          <i className="fas fa-envelope" style={{ fontSize: 12, opacity: 0.6 }} />
                          <a href={`mailto:${selectedMessage.email}`} style={{ fontSize: 13, color: "var(--ap)", fontWeight: 600 }}>{selectedMessage.email}</a>
                        </div>
                      </div>
                    </div>
                    <div className="ainbox-view-actions">
                      <a href={`mailto:${selectedMessage.email}?subject=Re: Your Contact Request`} className="abtn abtn-primary abtn-sm">
                        <i className="fas fa-reply" style={{ marginRight: 6 }} /> Reply
                      </a>
                      <button className="abtn abtn-ghost abtn-sm" onClick={(e) => handleDelete(selectedMessage.id, e)} style={{ color: "var(--err)" }}>
                        <i className="fas fa-trash-alt" />
                      </button>
                    </div>
                  </div>
                  <div className="ainbox-view-body">
                    <div className="ainbox-view-bubble">
                      {selectedMessage.message}
                    </div>
                  </div>
                  <div className="ainbox-view-footer">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--amut)", fontSize: 12 }}>
                      <i className="far fa-clock" />
                      Received on {new Date(selectedMessage.created_at).toLocaleString("en-IN", { 
                        weekday: "short", 
                        year: "numeric", 
                        month: "long", 
                        day: "numeric", 
                        hour: "2-digit", 
                        minute: "2-digit" 
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="ainbox-empty">
                  <div className="ainbox-empty-icon">
                    <i className="fas fa-envelope-open-text" />
                  </div>
                  <h3>Select a message to read</h3>
                  <p>Choose a conversation from the list to view full details and reply.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
