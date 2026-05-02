import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { changeAdminPassword } from '../../api/apiService';
import AdminSidebar from './components/AdminSidebar';
import { useToast } from './components/AdminToast';
import './AdminProfile.css';

export default function AdminProfile() {
  const { currentUser } = useAuth();
  const toast = useToast();

  // Password change
  const [pwForm, setPwForm]     = useState({ old: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError]   = useState('');

  async function handlePasswordChange(e) {
    e.preventDefault();
    setPwError('');
    if (!pwForm.old || !pwForm.next || !pwForm.confirm) { setPwError('All fields are required.'); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match.'); return; }
    if (pwForm.next.length < 8) { setPwError('Password must be at least 8 characters.'); return; }
    setPwSaving(true);
    try {
      await changeAdminPassword(pwForm.old, pwForm.next);
      toast?.addToast('Password updated successfully!', 'success');
      setPwForm({ old: '', next: '', confirm: '' });
    } catch (err) {
      setPwError(err?.message || 'Failed to change password. Check your current password.');
    } finally { setPwSaving(false); }
  }

  const initials = (currentUser?.email || 'AD').slice(0, 2).toUpperCase();
  const joined   = currentUser?.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  const pwStrength = pwForm.next.length === 0 ? 0 : pwForm.next.length < 8 ? 33 : pwForm.next.length < 12 ? 66 : 100;
  const pwColor = pwStrength < 40 ? '#ef4444' : pwStrength < 70 ? '#f59e0b' : '#10b981';
  const pwLabel = pwStrength < 40 ? 'Weak' : pwStrength < 70 ? 'Good' : 'Strong';

  return (
    <div className="alayout">
      <AdminSidebar />
      <main className="amain">
        <div className="apage-topbar">
          <div className="apage-topbar-l">
            <div className="apage-crumb">
              <Link to="/admin/home" className="apage-crumb-link">Admin</Link>
              <span className="apage-crumb-sep">/</span>
              <span className="apage-crumb-cur">Profile</span>
            </div>
            <h1 className="apage-title">Profile &amp; Account</h1>
            <p className="apage-subtitle">Manage your admin account credentials and premium preferences.</p>
          </div>
          <div className="apage-topbar-r">
             <div className="aprof-premium-badge">
                <i className="fas fa-crown" />
                <span>Premium Admin</span>
             </div>
          </div>
        </div>

        <div className="aprof-container">

          {/* Left: Sidebar */}
          <aside className="aprof-sidebar">
            <div className="aprof-card">
              <div className="aprof-avatar-wrap">
                <div className="aprof-avatar">{initials}</div>
                <div className="aprof-status-badge" title="Active Session" />
              </div>
              <div className="aprof-user-info">
                <div className="aprof-name">Admin</div>
                <div className="aprof-role-tag">Super Administrator</div>
              </div>

              <div className="aprof-meta-list">
                {[
                  { icon: 'fas fa-calendar-alt', label: 'Member since', val: joined },
                  { icon: 'fas fa-envelope', label: 'Email', val: currentUser?.email || '—' },
                  { icon: 'fas fa-shield-alt', label: 'Security', val: 'Two-Factor Enabled' },
                ].map(({ icon, label, val }) => (
                  <div key={label} className="aprof-meta-item">
                    <div className="aprof-meta-icon"><i className={icon} /></div>
                    <div className="aprof-meta-content">
                      <div className="aprof-meta-label">{label}</div>
                      <div className="aprof-meta-value">{val}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="aprof-card" style={{ padding: 24, background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fff', border: 'none' }}>
               <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>Security Insight</h4>
               <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: 0 }}>
                 Your account is protected with enterprise-grade encryption. Last password change was 2 months ago.
               </p>
               <button className="abtn abtn-sm" style={{ marginTop: 16, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                 View Logs
               </button>
            </div>
          </aside>

          {/* Right: Main Content */}
          <div className="aprof-main">

            {/* Account Details */}
            <section className="aprof-section">
              <div className="aprof-section-head">
                <div className="aprof-section-icon"><i className="fas fa-id-card" /></div>
                <h3 className="aprof-section-title">Account Information</h3>
              </div>

              <div className="aprof-info-grid">
                {[
                  { label: 'Display Name', val: 'Admin', icon: 'fas fa-user' },
                  { label: 'Email Address', val: currentUser?.email || '—', icon: 'fas fa-envelope' },
                  { label: 'Primary Role', val: 'Super Administrator', icon: 'fas fa-shield-alt' },
                  { label: 'Account Status', val: 'Active', icon: 'fas fa-check-circle' },
                ].map(({ label, val, icon }) => (
                  <div key={label} className="aprof-info-box">
                    <div className="aprof-info-label">{label}</div>
                    <div className="aprof-info-value">{val}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 20, padding: '14px 18px', background: 'var(--ap-soft)', borderRadius: 16, border: '1px solid var(--abdr)', display: 'flex', gap: 12, alignItems: 'center' }}>
                <i className="fas fa-info-circle" style={{ color: 'var(--ap)', fontSize: 18 }} />
                <p style={{ margin: 0, fontSize: 13, color: 'var(--atxt2)', lineHeight: 1.4 }}>
                  Email management is restricted to database-level changes for enhanced security. Contact the system architect to modify core identity fields.
                </p>
              </div>
            </section>

            {/* Change Password */}
            <section className="aprof-section">
              <div className="aprof-section-head">
                <div className="aprof-section-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}><i className="fas fa-key" /></div>
                <h3 className="aprof-section-title">Security &amp; Credentials</h3>
              </div>

              {pwError && (
                <div style={{ padding: '14px 18px', background: 'rgba(239,68,68,0.08)', borderRadius: 16, border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 14, marginBottom: 24, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <i className="fas fa-exclamation-circle" /> {pwError}
                </div>
              )}

              <form className="aprof-form" onSubmit={handlePasswordChange}>
                <div className="aprof-input-group">
                  <label className="aprof-label" htmlFor="old_pw">Current Password</label>
                  <div className="aprof-input-wrap">
                    <input className="aprof-input" id="old_pw" name="old_pw" type="password" placeholder="••••••••" value={pwForm.old} onChange={e => setPwForm(f => ({ ...f, old: e.target.value }))} autoComplete="current-password" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div className="aprof-input-group">
                    <label className="aprof-label" htmlFor="new_pw">New Password</label>
                    <div className="aprof-input-wrap">
                      <input className="aprof-input" id="new_pw" name="new_pw" type="password" placeholder="Min. 8 characters" value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} autoComplete="new-password" />
                    </div>
                    {pwForm.next && (
                      <div className="aprof-pw-strength">
                        <div className="aprof-pw-bar">
                          <div className="aprof-pw-fill" style={{ width: `${pwStrength}%`, background: pwColor }} />
                        </div>
                        <div className="aprof-pw-text" style={{ color: pwColor }}>Strength: {pwLabel}</div>
                      </div>
                    )}
                  </div>

                  <div className="aprof-input-group">
                    <label className="aprof-label" htmlFor="confirm_pw">Confirm Password</label>
                    <div className="aprof-input-wrap">
                      <input className="aprof-input" id="confirm_pw" name="confirm_pw" type="password" placeholder="Repeat new password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} autoComplete="new-password"
                        style={{ borderColor: pwForm.confirm && pwForm.next !== pwForm.confirm ? '#ef4444' : '' }}
                      />
                    </div>
                    {pwForm.confirm && pwForm.next !== pwForm.confirm && (
                      <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, marginTop: 4 }}>Passwords do not match</div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button className="abtn abtn-primary" type="submit" disabled={pwSaving || !pwForm.old || !pwForm.next || !pwForm.confirm || pwForm.next !== pwForm.confirm} style={{ height: 52, padding: '0 32px', borderRadius: 14, fontSize: 15 }}>
                    {pwSaving ? <><i className="fas fa-spinner fa-spin" /> Updating...</> : <><i className="fas fa-shield-alt" /> Update Credentials</>}
                  </button>
                </div>
              </form>
            </section>

            {/* Security Best Practices */}
            <section className="aprof-section" style={{ background: 'var(--acard-alt)' }}>
              <div className="aprof-section-head">
                <div className="aprof-section-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}><i className="fas fa-user-shield" /></div>
                <h3 className="aprof-section-title">Security Best Practices</h3>
              </div>
              <div className="aprof-info-grid">
                {[
                  { icon: 'fas fa-key', title: 'Unique Passwords', desc: 'Use complex phrases with symbols.' },
                  { icon: 'fas fa-history', title: 'Regular Rotation', desc: 'Change your password every 90 days.' },
                  { icon: 'fas fa-mobile-alt', title: '2FA Recommended', desc: 'Keep your login second-factor active.' },
                  { icon: 'fas fa-sign-out-alt', title: 'Public Sessions', desc: 'Always logout from public devices.' },
                ].map(({ icon, title, desc }) => (
                  <div key={title} style={{ display: 'flex', gap: 15, alignItems: 'flex-start' }}>
                    <div style={{ width: 32, height: 32, background: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', flexShrink: 0, boxShadow: 'var(--sh-xs)' }}>
                      <i className={icon} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--atxt)', marginBottom: 2 }}>{title}</div>
                      <div style={{ fontSize: 12, color: 'var(--atxt2)', lineHeight: 1.4 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>
      </main>
      <style>{`
        .aprof-premium-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #fff;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
          animation: aprofPulse 2s infinite;
        }
        @keyframes aprofPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
