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
  logoText:    "Deepak's Portfolio",
  buttonLabel: 'Read Full Post',
  socialFacebook: '',
  socialTwitter:  '',
  socialInstagram: '',
  socialLinkedin: '',
  socialEmail:    '',
  socialGithub:   '',
};

function buildEmailHTML(tpl, subject, message) {
  const accentRgb = tpl.accentColor || '#3b82f6';
  const defaultMessage = `
    <h2 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: ${tpl.bodyText}; line-height: 1.3;">
      Your newsletter message goes here
    </h2>
    <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.8; color: ${tpl.bodyText}; opacity: 0.85;">
      Customize the template on the left panel. Your content will appear beautifully formatted here in the live preview.
    </p>
    <p style="margin: 0; font-size: 15px; line-height: 1.8; color: ${tpl.bodyText}; opacity: 0.7;">
      You can add <strong>bold text</strong>, <em>italics</em>, and links using standard HTML tags in the broadcast modal.
    </p>`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject || 'Newsletter'}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body style="margin:0;padding:0;background-color:${tpl.bodyBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <!-- Pre-header spacer -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="padding: 32px 16px 0;">&nbsp;</td></tr>
  </table>

  <!-- Main card -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;">

    <!-- HEADER -->
    <tr>
      <td style="border-radius:20px 20px 0 0; overflow:hidden; background: linear-gradient(135deg, ${tpl.headerBg} 0%, #1e3a5f 100%); text-align:center; padding: 48px 40px 44px;">
        <!-- Logo / Brand -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="text-align:center;">
              <div style="display:inline-block; background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.2); border-radius:12px; padding:10px 22px; margin-bottom:20px;">
                <span style="font-size:11px; font-weight:700; letter-spacing:3px; color:rgba(255,255,255,0.7); text-transform:uppercase;">Newsletter</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="text-align:center;">
              <h1 style="margin:0; font-size:30px; font-weight:800; letter-spacing:1.5px; color:${tpl.headerText}; text-transform:uppercase; line-height:1.2;">${tpl.logoText}</h1>
            </td>
          </tr>
          <tr>
            <td style="text-align:center; padding-top:16px;">
              <div style="display:inline-block; width:40px; height:3px; background:${accentRgb}; border-radius:2px;"></div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- BODY -->
    <tr>
      <td style="background-color:${tpl.cardBg}; padding:48px 48px 40px; box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        ${message || defaultMessage}

        <!-- Divider -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 36px 0 32px;">
          <tr><td style="height:1px; background:linear-gradient(90deg, transparent, rgba(0,0,0,0.07), transparent);"></td></tr>
        </table>

        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="text-align:center; padding:4px 0 8px;">
              <a href="#"
                 style="display:inline-block; background:${accentRgb}; color:#ffffff; font-size:15px; font-weight:700; text-decoration:none; padding:16px 40px; border-radius:999px; letter-spacing:0.5px; box-shadow:0 4px 16px rgba(59,130,246,0.35);">
                ${tpl.buttonLabel}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td style="background:${tpl.bodyBg}; border-radius:0 0 20px 20px; padding:32px 48px; border-top:1px solid rgba(0,0,0,0.06);">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="text-align:center; padding-bottom:20px;">
              <span style="font-size:16px; font-weight:800; color:${tpl.bodyText}; opacity:0.6; letter-spacing:1px; text-transform:uppercase;">${tpl.logoText}</span>
            </td>
          </tr>
          <tr>
            <td style="text-align:center; padding-bottom:16px;">
              <div style="display:inline-block; width:32px; height:2px; background:${accentRgb}; border-radius:2px; opacity:0.4;"></div>
            </td>
          </tr>
          ${(tpl.socialFacebook || tpl.socialTwitter || tpl.socialInstagram || tpl.socialLinkedin || tpl.socialEmail || tpl.socialGithub) ? `
          <tr>
            <td style="text-align:center; padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  ${tpl.socialFacebook ? `<td style="padding: 0 6px;"><a href="${tpl.socialFacebook}" style="text-decoration:none;"><span style="display:inline-block; width:36px; height:36px; background-color:#1877F2; border-radius:18px; text-align:center;"><i class="fab fa-facebook-f" style="color:#ffffff; font-size:18px; line-height:36px; margin:0;"></i></span></a></td>` : ''}
                  ${tpl.socialTwitter ? `<td style="padding: 0 6px;"><a href="${tpl.socialTwitter}" style="text-decoration:none;"><span style="display:inline-block; width:36px; height:36px; background-color:#1DA1F2; border-radius:18px; text-align:center;"><i class="fab fa-twitter" style="color:#ffffff; font-size:18px; line-height:36px; margin:0;"></i></span></a></td>` : ''}
                  ${tpl.socialInstagram ? `<td style="padding: 0 6px;"><a href="${tpl.socialInstagram}" style="text-decoration:none;"><span style="display:inline-block; width:36px; height:36px; background-color:#E4405F; border-radius:18px; text-align:center;"><i class="fab fa-instagram" style="color:#ffffff; font-size:18px; line-height:36px; margin:0;"></i></span></a></td>` : ''}
                  ${tpl.socialLinkedin ? `<td style="padding: 0 6px;"><a href="${tpl.socialLinkedin}" style="text-decoration:none;"><span style="display:inline-block; width:36px; height:36px; background-color:#0077B5; border-radius:18px; text-align:center;"><i class="fab fa-linkedin-in" style="color:#ffffff; font-size:18px; line-height:36px; margin:0;"></i></span></a></td>` : ''}
                  ${tpl.socialEmail ? `<td style="padding: 0 6px;"><a href="${tpl.socialEmail.startsWith('mailto:') ? tpl.socialEmail : `mailto:${tpl.socialEmail}`}" style="text-decoration:none;"><span style="display:inline-block; width:36px; height:36px; background-color:#D14836; border-radius:18px; text-align:center;"><i class="fab fa-google" style="color:#ffffff; font-size:18px; line-height:36px; margin:0;"></i></span></a></td>` : ''}
                  ${tpl.socialGithub ? `<td style="padding: 0 6px;"><a href="${tpl.socialGithub}" style="text-decoration:none;"><span style="display:inline-block; width:36px; height:36px; background-color:#181717; border-radius:18px; text-align:center;"><i class="fab fa-github" style="color:#ffffff; font-size:18px; line-height:36px; margin:0;"></i></span></a></td>` : ''}
                </tr>
              </table>
            </td>
          </tr>` : ''}
          <tr>
            <td style="text-align:center;">
              <p style="margin:0 0 10px; font-size:12px; line-height:1.7; color:#94a3b8;">${tpl.footerText}</p>
              <p style="margin:0; font-size:12px; color:#94a3b8;">
                <a href="#" style="color:${accentRgb}; text-decoration:none; font-weight:600;">Unsubscribe</a>
                &nbsp;&bull;&nbsp;
                <a href="#" style="color:#94a3b8; text-decoration:none;">Privacy Policy</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Bottom spacer -->
    <tr><td style="height:32px;"></td></tr>

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
  const [previewMessage, setPreviewMessage] = useState("");

  function saveTemplate(next) {
    setTemplate(next);
    localStorage.setItem('nl_template', JSON.stringify(next));
    toast?.addToast('Template saved locally.', 'success');
  }

  const previewHtml = useMemo(() => buildEmailHTML(template, broadcastData.subject || 'Preview Subject', previewMessage || null), [template, broadcastData, previewMessage]);

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
              <button className="abtn abtn-primary" onClick={() => { setShowBroadcastModal(true); setBroadcastData(d => ({ ...d, message: d.message || previewMessage })); }}>
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
                    <label htmlFor="nl-preview-message" className="aform-label">
                      Email Body <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--amut)', marginLeft: 6 }}>(live preview &amp; broadcast)</span>
                    </label>
                    <textarea
                      id="nl-preview-message"
                      name="nl-preview-message"
                      className="ainput"
                      rows={5}
                      placeholder="Type your message here, or use HTML for rich formatting..."
                      value={previewMessage}
                      onChange={e => {
                        setPreviewMessage(e.target.value);
                        setBroadcastData(d => ({ ...d, message: e.target.value }));
                      }}
                    />
                    <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--amut)', display: 'flex', alignItems: 'center', gap: 5, lineHeight: 1.5 }}>
                      <i className="fas fa-code" style={{ color: '#3b82f6', fontSize: 10 }} />
                      Supports HTML — e.g. <code style={{ background: 'rgba(59,130,246,0.08)', color: '#3b82f6', padding: '1px 5px', borderRadius: 4, fontSize: 10 }}>&lt;b&gt; &lt;p&gt; &lt;h2&gt; &lt;ul&gt;</code>
                    </p>
                  </div>
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

                  {/* Social Links */}
                  <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--abdr)' }}>
                    <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 600, color: 'var(--atxt2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <i className="fas fa-share-alt" style={{ marginRight: 6, color: '#3b82f6' }} />Social Links (optional)
                    </p>
                    {[
                      { key: 'socialFacebook',  label: 'Facebook URL',  icon: 'fab fa-facebook',  placeholder: 'https://facebook.com/username' },
                      { key: 'socialTwitter',   label: 'Twitter URL',   icon: 'fab fa-twitter',   placeholder: 'https://twitter.com/username' },
                      { key: 'socialInstagram', label: 'Instagram URL', icon: 'fab fa-instagram', placeholder: 'https://instagram.com/username' },
                      { key: 'socialLinkedin',  label: 'LinkedIn URL',  icon: 'fab fa-linkedin',  placeholder: 'https://linkedin.com/in/username' },
                      { key: 'socialEmail',     label: 'Email Address', icon: 'fab fa-google',    placeholder: 'me@example.com' },
                      { key: 'socialGithub',    label: 'GitHub URL',    icon: 'fab fa-github',    placeholder: 'https://github.com/username' },
                    ].map(({ key, label, icon, placeholder }) => (
                      <div key={key} className="aform-group">
                        <label htmlFor={`nl-social-${key}`} className="aform-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className={icon} style={{ width: 14, color: '#3b82f6' }} />{label}
                        </label>
                        <input
                          id={`nl-social-${key}`}
                          name={`nl-social-${key}`}
                          className="ainput"
                          type="url"
                          placeholder={placeholder}
                          value={template[key] || ''}
                          onChange={e => setTemplate(t => ({ ...t, [key]: e.target.value }))}
                        />
                      </div>
                    ))}
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
