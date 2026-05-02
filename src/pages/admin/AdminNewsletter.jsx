import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "./components/AdminSidebar";
import { useToast } from "./components/AdminToast";
import { getNewsletterSubscribers, deleteNewsletterSubscriber, sendNewsletterBroadcast } from "../../api/apiService";
import "./Admin.css";

/* ── Default template ───────────────────────────────────────── */
const DEFAULT_TEMPLATE = {
  headerBg:    '#0f172a',
  headerText:  '#ffffff',
  bodyBg:      '#f8fafc',
  cardBg:      '#ffffff',
  bodyText:    '#334155',
  accentColor: '#3b82f6',
  footerText:  'You are receiving this email because you subscribed to our newsletter. If you wish to stop receiving these emails, you can unsubscribe at any time.',
  logoText:    'CHAYOLOGY',
  buttonLabel: 'Read Full Post',
};

function buildEmailHTML(tpl, subject, message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 40px 20px; background-color: ${tpl.bodyBg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: ${tpl.cardBg || '#ffffff'}; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.04);">
    <tr>
      <td style="padding: 40px 32px; text-align: center; background-color: ${tpl.headerBg};">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 2px; color: ${tpl.headerText}; text-transform: uppercase;">${tpl.logoText}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 48px 32px; color: ${tpl.bodyText}; font-size: 16px; line-height: 1.8;">
        ${message || '<p style="margin-top: 0;">Welcome to our latest update! Your message will appear beautifully formatted right here.</p>'}
        <div style="text-align: center; margin-top: 40px; margin-bottom: 8px;">
          <a href="#" style="display: inline-block; background-color: ${tpl.accentColor}; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 999px; letter-spacing: 0.5px;">${tpl.buttonLabel}</a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px; text-align: center; background-color: #fafafa; border-top: 1px solid #eaeaea;">
        <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.6;">
          ${tpl.footerText}<br>
          <a href="#" style="color: #a1a1aa; text-decoration: underline;">Unsubscribe</a> from these emails.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export default function AdminNewsletter() {
  const toast = useToast();
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNewsletterSubscribers();
      setSubscribers(data || []);
    } catch (err) {
      toast?.addToast("Failed to load subscribers", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSubscribers();
  }, [loadSubscribers]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this subscriber?")) return;
    
    try {
      await deleteNewsletterSubscriber(id);
      toast?.addToast("Subscriber removed", "success");
      await loadSubscribers();
    } catch (err) {
      toast?.addToast("Failed to remove subscriber", "error");
    }
  };

  const exportSubscribers = () => {
    const csv = subscribers.map(s => `${s.email},${s.subscribed_at}`).join("\n");
    const blob = new Blob([`Email,Subscribed At\n${csv}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter_subscribers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [activeTab, setActiveTab]      = useState('subscribers');
  const [template, setTemplate]         = useState(() => {
    try { return JSON.parse(localStorage.getItem('nl_template') || 'null') || DEFAULT_TEMPLATE; } catch { return DEFAULT_TEMPLATE; }
  });
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastData, setBroadcastData] = useState({ subject: "", message: "" });
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  function saveTemplate(next) {
    setTemplate(next);
    localStorage.setItem('nl_template', JSON.stringify(next));
    toast?.addToast('Template saved locally.', 'success');
  }

  const previewHtml = useMemo(() => buildEmailHTML(template, broadcastData.subject || 'Preview Subject', broadcastData.message || '<p>Your newsletter message goes here. Customize the template on the left.</p>'), [template, broadcastData]);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastData.subject || !broadcastData.message) {
      toast?.addToast("Please fill all fields", "warning");
      return;
    }
    
    setIsBroadcasting(true);
    try {
      const result = await sendNewsletterBroadcast(broadcastData);
      toast?.addToast(`Successfully sent to ${result.sent_count} subscribers!`, "success");
      setShowBroadcastModal(false);
      setBroadcastData({ subject: "", message: "" });
    } catch (err) {
      toast?.addToast("Failed to send broadcast", "error");
    } finally {
      setIsBroadcasting(false);
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
                <span className="apage-crumb-cur">Newsletter</span>
              </div>
              <h1 className="apage-title">Newsletter</h1>
              <p className="apage-subtitle">Manage subscribers, send broadcasts, and design your email template.</p>
            </div>
            <div className="atopbar-right-group">
              <button className="abtn abtn-primary" onClick={() => setShowBroadcastModal(true)} disabled={subscribers.length === 0}>
                <i className="fas fa-paper-plane" /> Send Broadcast
              </button>
              <button className="abtn abtn-ghost" onClick={exportSubscribers} disabled={subscribers.length === 0}>
                <i className="fas fa-file-export" /> Export CSV
              </button>
              <button className={`arefresh-btn ${loading ? "is-refreshing" : ""}`} onClick={loadSubscribers} title="Refresh List">
                <i className="fas fa-sync-alt" />
              </button>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="anl-tabs">
            {[
              { key: 'subscribers', icon: 'fas fa-users', label: 'Subscribers' },
              { key: 'template', icon: 'fas fa-palette', label: 'Email Template' }
            ].map((t) => (
              <button
                key={t.key}
                className={`anl-tab ${activeTab === t.key ? 'is-active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                <i className={t.icon} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {activeTab === 'subscribers' && (
            <div className="acard" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="atable-responsive">
                <table className="atable">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: 24 }}>Subscriber Email</th>
                      <th>Subscribed On</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right", paddingRight: 24 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan="4" style={{ padding: "18px 24px" }}>
                            <div className="askel askel-line" style={{ width: "100%", height: 14 }} />
                          </td>
                        </tr>
                      ))
                    ) : subscribers.length === 0 ? (
                      <tr>
                        <td colSpan="4">
                          <div className="aempty anl-empty">
                            <div className="aempty-icon">
                              <i className="fas fa-users-slash" />
                            </div>
                            <h3 className="aempty-title">No subscribers found</h3>
                            <p className="aempty-sub">Your newsletter list is currently empty.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      subscribers.map(sub => (
                        <tr key={sub.id} className="anl-row">
                          <td style={{ paddingLeft: 24 }}>
                            <div className="anl-sub-info">
                              <div className="anl-sub-avatar">
                                {sub.email.charAt(0).toUpperCase()}
                              </div>
                              <div className="anl-sub-email">{sub.email}</div>
                            </div>
                          </td>
                          <td>
                            <div className="anl-sub-date">
                              {new Date(sub.subscribed_at).toLocaleDateString("en-IN", { 
                                year: "numeric", month: "short", day: "numeric" 
                              })}
                            </div>
                          </td>
                          <td>
                            <span className="abadge abadge-success">
                              Active
                            </span>
                          </td>
                          <td style={{ textAlign: "right", paddingRight: 24 }}>
                            <button 
                              className="abtn abtn-sm abtn-ghost anl-delete-btn" 
                              onClick={() => handleDelete(sub.id)}
                              title="Remove Subscriber"
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

          {activeTab === 'template' && (
            <div className="anl-template-grid">
              {/* Controls */}
              <div className="acard anl-controls-card">
                <div className="acard-header">
                  <i className="fas fa-palette" />
                  <span>Template Settings</span>
                </div>
                <div className="acard-body">
                  {[
                    { key: 'logoText',    label: 'Brand Name',        type: 'text'  },
                    { key: 'buttonLabel', label: 'Button Text',       type: 'text'  },
                    { key: 'headerBg',    label: 'Header Background', type: 'color' },
                    { key: 'headerText',  label: 'Header Text Color', type: 'color' },
                    { key: 'bodyBg',      label: 'Email Background',  type: 'color' },
                    { key: 'cardBg',      label: 'Card Background',   type: 'color' },
                    { key: 'bodyText',    label: 'Body Text Color',   type: 'color' },
                    { key: 'accentColor', label: 'Accent / Button',   type: 'color' },
                  ].map(({ key, label, type }) => (
                    <div key={key} className="aform-group">
                      <label htmlFor={type === 'color' ? `nl-text-${key}` : `nl-field-${key}`} className="aform-label">{label}</label>
                      {type === 'color' ? (
                        <div className="anl-color-input">
                          <input 
                            id={`nl-color-${key}`}
                            name={`nl-color-${key}`}
                            type="color" 
                            value={template[key]} 
                            onChange={e => setTemplate(t => ({ ...t, [key]: e.target.value }))} 
                          />
                          <input 
                            id={`nl-text-${key}`}
                            name={`nl-text-${key}`}
                            className="ainput" 
                            value={template[key]} 
                            onChange={e => setTemplate(t => ({ ...t, [key]: e.target.value }))} 
                          />
                        </div>
                      ) : (
                        <input 
                          id={`nl-field-${key}`}
                          name={`nl-field-${key}`}
                          className="ainput" 
                          value={template[key]} 
                          onChange={e => setTemplate(t => ({ ...t, [key]: e.target.value }))} 
                        />
                      )}
                    </div>
                  ))}
                  <div className="aform-group">
                    <label htmlFor="nl-footer-text" className="aform-label">Footer Disclaimer</label>
                    <textarea 
                      id="nl-footer-text"
                      name="nl-footer-text"
                      className="ainput" 
                      rows={2} 
                      value={template.footerText} 
                      onChange={e => setTemplate(t => ({ ...t, footerText: e.target.value }))} 
                    />
                  </div>
                </div>
                <div className="acard-footer">
                  <button className="abtn abtn-primary is-full" onClick={() => saveTemplate(template)}>
                    <i className="fas fa-save" /> Save Template
                  </button>
                  <button className="abtn abtn-secondary" onClick={() => setTemplate(DEFAULT_TEMPLATE)} title="Reset to defaults">
                    <i className="fas fa-undo" />
                  </button>
                </div>
              </div>

              {/* Live preview */}
              <div className="acard anl-preview-card">
                <div className="acard-header">
                  <i className="fas fa-eye" />
                  <span>Live Preview</span>
                  <div className="anl-preview-hint">Updates in real-time</div>
                </div>
                <div className="anl-preview-body">
                  <iframe
                    srcDoc={previewHtml}
                    title="Email Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {showBroadcastModal && (
        <div className="amodal-overlay">
          <div className="amodal-card anl-broadcast-modal">
            <div className="amodal-header">
              <div className="amodal-title">
                <i className="fas fa-paper-plane" />
                <span>Newsletter Broadcast</span>
              </div>
              <button className="amodal-close" onClick={() => setShowBroadcastModal(false)} disabled={isBroadcasting}><i className="fas fa-times" /></button>
            </div>
            <form onSubmit={handleBroadcast}>
              <div className="amodal-body">
                <div className="aform-group">
                  <label htmlFor="nl-broadcast-subject" className="aform-label">Email Subject</label>
                  <input 
                    id="nl-broadcast-subject"
                    name="nl-broadcast-subject"
                    className="ainput" 
                    value={broadcastData.subject} 
                    onChange={e => setBroadcastData(d => ({...d, subject: e.target.value}))}
                    placeholder="e.g. Monthly Newsletter - May 2024"
                    required
                  />
                </div>
                <div className="aform-group">
                  <label htmlFor="nl-broadcast-message" className="aform-label">Message Content (HTML)</label>
                  <textarea 
                    id="nl-broadcast-message"
                    name="nl-broadcast-message"
                    className="ainput anl-broadcast-textarea" 
                    rows={12} 
                    value={broadcastData.message}
                    onChange={e => setBroadcastData(d => ({...d, message: e.target.value}))}
                    placeholder="<h1>Hello!</h1><p>Here are the latest updates...</p>"
                    required
                  />
                  <div className="aform-hint">
                    <i className="fas fa-info-circle" /> Use standard HTML tags for formatting.
                  </div>
                </div>
              </div>
              <div className="amodal-footer">
                <button type="button" className="abtn abtn-ghost" onClick={() => setShowBroadcastModal(false)} disabled={isBroadcasting}>Cancel</button>
                <button type="submit" className="abtn abtn-primary" disabled={isBroadcasting}>
                  {isBroadcasting ? (
                    <><i className="fas fa-spinner fa-spin" /> Sending...</>
                  ) : (
                    <><i className="fas fa-paper-plane" /> Send to {subscribers.length} Subscribers</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
