import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuth } from '../../contexts/AuthContext';
import { changeAdminPassword, uploadAvatar, updateAdminProfile, generate2FASecret, enable2FA, disable2FA } from '../../api/apiService';
import AdminSidebar from './components/AdminSidebar';
import { useToast } from './components/AdminToast';
import './AdminProfile.css';
import './AdminDatabase.css';

export default function AdminProfile() {
  const { currentUser, updateUser } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef(null);

  // Avatar upload
  const [avatarUploading, setAvatarUploading] = useState(false);

  // 2FA Setup
  const [show2FAWizard, setShow2FAWizard] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);

  // Lock body scroll when 2FA wizard is open
  useEffect(() => {
    if (show2FAWizard) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [show2FAWizard]);

  // Password change
  const [pwForm, setPwForm]     = useState({ old: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError]   = useState('');
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNextPw, setShowNextPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Profile fields
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    bio: '',
    social: { facebook: '', twitter: '', instagram: '', linkedin: '', email: '', github: '', website: '' }
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // Sync profile fields from currentUser
  useEffect(() => {
    if (currentUser) {
      let social = { facebook: '', twitter: '', instagram: '', linkedin: '', email: '', github: '', website: '' };
      try {
        if (currentUser.social_links) {
          const parsed = typeof currentUser.social_links === 'string' 
            ? JSON.parse(currentUser.social_links) 
            : currentUser.social_links;
          social = { ...social, ...parsed };
        }
      } catch (e) { console.error("Social parse error", e); }

      setProfileForm({
        displayName: currentUser.display_name || '',
        bio: currentUser.bio || '',
        social
      });
    }
  }, [currentUser]);

  async function handleUpdateProfile(e) {
    if (e) e.preventDefault();
    setProfileSaving(true);
    try {
      const data = {
        display_name: profileForm.displayName,
        bio: profileForm.bio,
        social_links: profileForm.social,
        profile_image: currentUser?.profileImage || ''
      };
      await updateAdminProfile(data);
      updateUser(data);
      toast?.addToast('Profile updated successfully!', 'success');
    } catch (err) {
      toast?.addToast('Failed to update profile.', 'error');
    } finally {
      setProfileSaving(false);
    }
  }

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

  async function start2FASetup() {
    setTwoFactorLoading(true);
    try {
      const res = await generate2FASecret();
      setTwoFactorSecret(res.secret);
      setQrUrl(res.qrUrl);
      setShow2FAWizard(true);
    } catch (err) {
      toast?.addToast('Failed to generate 2FA secret.', 'error');
    } finally {
      setTwoFactorLoading(false);
    }
  }

  async function handleEnable2FA() {
    if (twoFactorCode.length !== 6) {
      toast?.addToast('Please enter a 6-digit code.', 'error');
      return;
    }
    setTwoFactorLoading(true);
    try {
      await enable2FA(twoFactorSecret, twoFactorCode);
      updateUser({ twoFactorEnabled: true });
      setShow2FAWizard(false);
      setTwoFactorCode('');
      toast?.addToast('Two-Factor Authentication enabled!', 'success');
    } catch (err) {
      toast?.addToast(err?.message || 'Invalid code. Try again.', 'error');
    } finally {
      setTwoFactorLoading(false);
    }
  }

  async function handleDisable2FA() {
    if (!window.confirm('Are you sure you want to disable 2FA? This will decrease your account security.')) return;
    setTwoFactorLoading(true);
    try {
      await disable2FA();
      updateUser({ twoFactorEnabled: false });
      toast?.addToast('Two-Factor Authentication disabled.', 'info');
    } catch (err) {
      toast?.addToast('Failed to disable 2FA.', 'error');
    } finally {
      setTwoFactorLoading(false);
    }
  }

  async function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast?.addToast('Please select an image file.', 'error');
      return;
    }

    setAvatarUploading(true);
    try {
      const url = await uploadAvatar(file);
      await updateAdminProfile({ profile_image: url });
      updateUser({ profileImage: url });
      toast?.addToast('Profile picture updated!', 'success');
    } catch (err) {
      toast?.addToast(err?.message || 'Failed to upload image.', 'error');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const getInitials = (name, email) => {
    const nameToProcess = name || currentUser?.display_name;
    if (nameToProcess && nameToProcess.trim()) {
      const parts = nameToProcess.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (email || currentUser?.email || 'AD').slice(0, 2).toUpperCase();
  };

  const initials = getInitials(currentUser?.display_name, currentUser?.email);
  const joined   = currentUser?.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  const calculateStrength = (p) => {
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s += 25;
    if (p.length >= 12) s += 25;
    if (/[A-Z]/.test(p)) s += 20;
    if (/[0-9]/.test(p)) s += 15;
    if (/[^A-Za-z0-9]/.test(p)) s += 15;
    return s;
  };
  const pwStrength = calculateStrength(pwForm.next);
  const pwColor = pwStrength < 40 ? '#ef4444' : pwStrength < 80 ? '#f59e0b' : '#10b981';
  const pwLabel = pwStrength < 40 ? 'Weak' : pwStrength < 80 ? 'Good' : 'Strong';

  return (
    <div className="alayout">
      <AdminSidebar />
      <main className="amain">
        <div className="amain-inner">
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
            <div className="apage-topbar-r" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <a href="/" target="_blank" className="aprof-topbar-btn">
                   <i className="fas fa-external-link-alt" />
                   <span>Visit Site</span>
                </a>
                <button className="aprof-premium-btn">
                   <i className="fas fa-crown" />
                   <span>Premium Admin</span>
                </button>
            </div>
          </div>

          <div className="aprof-container">

            {/* Left: Sidebar */}
            <aside className="aprof-sidebar">
              <div className="aprof-card">
                <div className="aprof-avatar-wrap" onClick={handleAvatarClick} title="Click to change profile picture">
                  <div className={`aprof-avatar ${avatarUploading ? 'is-uploading' : ''}`}>
                    {currentUser?.profileImage ? (
                      <img src={currentUser.profileImage} alt="Avatar" className="aprof-avatar-img" />
                    ) : (
                      <span>{initials}</span>
                    )}
                    <div className="aprof-avatar-overlay">
                      <i className="fas fa-camera" />
                    </div>
                    {avatarUploading && <div className="aprof-avatar-loader"><i className="fas fa-spinner fa-spin" /></div>}
                  </div>
                  <div className={`aprof-status-badge ${currentUser?.twoFactorEnabled ? 'is-secure' : ''}`} title={currentUser?.twoFactorEnabled ? '2FA Active' : '2FA Inactive'} />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                </div>

                <div className="aprof-user-info">
                  <h2 className="aprof-name">{profileForm.displayName || currentUser?.display_name || 'Admin'}</h2>
                  <div className="aprof-role-tag">Super Administrator</div>
                </div>

                <div className="aprof-meta-list">
                  {[
                    { icon: 'fas fa-calendar-alt', label: 'Member since', val: joined },
                    { icon: 'fas fa-envelope', label: 'Email', val: currentUser?.email || '—' },
                    { icon: 'fas fa-shield-alt', label: 'Security', val: currentUser?.twoFactorEnabled ? '2FA Enabled' : '2FA Disabled' },
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

              <div className="aprof-card" style={{ padding: '24px 20px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                   <div style={{ width: 32, height: 32, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                     <i className="fas fa-shield-alt" />
                   </div>
                   <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--atxt)' }}>Security Insight</h4>
                 </div>
                 <p style={{ fontSize: 12, color: 'var(--atxt2)', lineHeight: 1.5, margin: 0, paddingLeft: 4 }}>
                    Your account is protected with enterprise-grade encryption. We recommend rotating your password regularly.
                 </p>
                 <Link 
                    to="/admin/audit" 
                    className="abtn abtn-sm abtn-ghost" 
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 16,
                      marginLeft: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--ap)'
                    }}
                  >
                    <i className="fas fa-history" /> View Audit Log
                  </Link>
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

                <div className="aprof-info-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  {/* Editable: Display Name */}
                  <div className="aprof-info-box" style={{ gridColumn: 'span 1', position: 'relative' }}>
                    <div className="aprof-info-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Display Name</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ap)', background: 'var(--ap-soft)', padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase' }}>Auto-Save</span>
                    </div>
                    <div style={{ position: 'relative', marginTop: 8 }}>
                      <input
                        className="aprof-input"
                        style={{ 
                          width: '100%',
                          height: 42, 
                          fontSize: 14, 
                          fontWeight: 700, 
                          paddingRight: 40, 
                          border: '1.5px solid var(--abdr)',
                          background: 'var(--acard)',
                          borderRadius: 10,
                          paddingLeft: 12
                        }}
                        value={profileForm.displayName}
                        onChange={e => setProfileForm(f => ({ ...f, displayName: e.target.value }))}
                        placeholder="Your display name"
                        onBlur={handleUpdateProfile}
                      />
                      <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ap)', opacity: 0.5, fontSize: 12 }}>
                        <i className={profileSaving ? "fas fa-spinner fa-spin" : "fas fa-check-circle"} />
                      </div>
                    </div>
                  </div>
                  {/* Static: other fields */}
                  {[
                    { label: 'Email Address', val: currentUser?.email || '—' },
                    { label: 'Primary Role', val: 'Super Administrator' },
                    { label: 'Account Status', val: 'Active' },
                  ].map(({ label, val }) => (
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

                {/* Public Profile Metadata */}
                <div style={{ marginTop: 32 }}>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--atxt)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <i className="fas fa-globe-americas" style={{ color: 'var(--ap)' }} /> Public Author Profile
                  </h4>
                  
                  <div className="aprof-form">
                    <div className="aprof-input-group">
                      <label className="aprof-label">Public Display Name</label>
                      <input 
                        className="aprof-input" 
                        value={profileForm.displayName} 
                        onChange={e => setProfileForm(f => ({ ...f, displayName: e.target.value }))}
                        placeholder="Name shown on posts"
                      />
                    </div>

                    <div className="aprof-input-group">
                      <label className="aprof-label">Author Bio</label>
                      <textarea 
                        className="aprof-input" 
                        style={{ minHeight: 100, resize: 'vertical' }}
                        value={profileForm.bio}
                        onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                        placeholder="Tell your readers about yourself..."
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                      <div className="aprof-input-group">
                        <label className="aprof-label"><i className="fab fa-facebook" /> Facebook</label>
                        <input className="aprof-input" value={profileForm.social.facebook} onChange={e => setProfileForm(f => ({ ...f, social: { ...f.social, facebook: e.target.value } }))} placeholder="https://facebook.com/..." />
                      </div>
                      <div className="aprof-input-group">
                        <label className="aprof-label"><i className="fab fa-twitter" /> Twitter / X</label>
                        <input className="aprof-input" value={profileForm.social.twitter} onChange={e => setProfileForm(f => ({ ...f, social: { ...f.social, twitter: e.target.value } }))} placeholder="https://x.com/..." />
                      </div>
                      <div className="aprof-input-group">
                        <label className="aprof-label"><i className="fab fa-instagram" /> Instagram</label>
                        <input className="aprof-input" value={profileForm.social.instagram} onChange={e => setProfileForm(f => ({ ...f, social: { ...f.social, instagram: e.target.value } }))} placeholder="https://instagram.com/..." />
                      </div>
                      <div className="aprof-input-group">
                        <label className="aprof-label"><i className="fab fa-linkedin" /> LinkedIn</label>
                        <input className="aprof-input" value={profileForm.social.linkedin} onChange={e => setProfileForm(f => ({ ...f, social: { ...f.social, linkedin: e.target.value } }))} placeholder="https://linkedin.com/in/..." />
                      </div>
                      <div className="aprof-input-group">
                        <label className="aprof-label"><i className="fab fa-google" /> Email</label>
                        <input className="aprof-input" value={profileForm.social.email} onChange={e => setProfileForm(f => ({ ...f, social: { ...f.social, email: e.target.value } }))} placeholder="mailto:..." />
                      </div>
                      <div className="aprof-input-group">
                        <label className="aprof-label"><i className="fab fa-github" /> GitHub</label>
                        <input className="aprof-input" value={profileForm.social.github} onChange={e => setProfileForm(f => ({ ...f, social: { ...f.social, github: e.target.value } }))} placeholder="https://github.com/..." />
                      </div>
                      <div className="aprof-input-group">
                        <label className="aprof-label"><i className="fas fa-globe" /> Website</label>
                        <input className="aprof-input" value={profileForm.social.website} onChange={e => setProfileForm(f => ({ ...f, social: { ...f.social, website: e.target.value } }))} placeholder="https://..." />
                      </div>
                    </div>

                    <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
                      <button 
                        className="abtn abtn-primary" 
                        onClick={handleUpdateProfile} 
                        disabled={profileSaving}
                        style={{
                          height: 48,
                          padding: '0 32px',
                          borderRadius: 14,
                          fontWeight: 700,
                          fontSize: 14,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          transition: 'all 0.3s ease',
                          cursor: profileSaving ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {profileSaving ? (
                          <><i className="fas fa-spinner fa-spin" /> Saving Changes...</>
                        ) : (
                          <><i className="fas fa-cloud-upload-alt" /> Save Public Profile</>
                        )}
                      </button>
                    </div>
                  </div>
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
                      <input 
                        className="aprof-input" 
                        id="old_pw" 
                        name="old_pw" 
                        type={showOldPw ? "text" : "password"} 
                        placeholder="••••••••" 
                        value={pwForm.old} 
                        onChange={e => setPwForm(f => ({ ...f, old: e.target.value }))} 
                        autoComplete="current-password" 
                      />
                      <button 
                        type="button" 
                        className="aprof-pw-toggle" 
                        onClick={() => setShowOldPw(!showOldPw)}
                      >
                        <i className={showOldPw ? "fas fa-eye-slash" : "fas fa-eye"} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div className="aprof-input-group">
                      <label className="aprof-label" htmlFor="new_pw">New Password</label>
                      <div className="aprof-input-wrap">
                        <input 
                          className="aprof-input" 
                          id="new_pw" 
                          name="new_pw" 
                          type={showNextPw ? "text" : "password"} 
                          placeholder="Min. 8 characters" 
                          value={pwForm.next} 
                          onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} 
                          autoComplete="new-password" 
                        />
                        <button 
                          type="button" 
                          className="aprof-pw-toggle" 
                          onClick={() => setShowNextPw(!showNextPw)}
                        >
                          <i className={showNextPw ? "fas fa-eye-slash" : "fas fa-eye"} />
                        </button>
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
                        <input 
                          className="aprof-input" 
                          id="confirm_pw" 
                          name="confirm_pw" 
                          type={showConfirmPw ? "text" : "password"} 
                          placeholder="Repeat new password" 
                          value={pwForm.confirm} 
                          onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} 
                          autoComplete="new-password"
                          style={{ borderColor: pwForm.confirm && pwForm.next !== pwForm.confirm ? '#ef4444' : '' }}
                        />
                        <button 
                          type="button" 
                          className="aprof-pw-toggle" 
                          onClick={() => setShowConfirmPw(!showConfirmPw)}
                        >
                          <i className={showConfirmPw ? "fas fa-eye-slash" : "fas fa-eye"} />
                        </button>
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

                <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid var(--abdr)' }} />

                {/* 2FA Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--atxt)' }}>Two-Factor Authentication</h4>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--atxt2)' }}>Add an extra layer of security to your account.</p>
                  </div>
                  {currentUser?.twoFactorEnabled ? (
                    <button className="abtn abtn-sm abtn-danger" onClick={handleDisable2FA} disabled={twoFactorLoading}>
                      {twoFactorLoading ? <i className="fas fa-spinner fa-spin" /> : 'Disable 2FA'}
                    </button>
                  ) : (
                    <button className="abtn abtn-primary abtn-sm" onClick={start2FASetup} disabled={twoFactorLoading}>
                      {twoFactorLoading ? <i className="fas fa-spinner fa-spin" /> : 'Enable 2FA'}
                    </button>
                  )}
                </div>

              </section>

              {/* 2FA Setup Modal — rendered via portal into document.body */}
              {show2FAWizard && createPortal(
                <div className="adb-modal-overlay" onClick={() => setShow2FAWizard(false)}>
                  <div className="adb-modal" style={{ maxWidth: 420, textAlign: 'left' }} onClick={e => e.stopPropagation()}>

                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="adb-modal-icon" style={{ margin: 0, width: 44, height: 44, fontSize: 20 }}>
                          <i className="fas fa-shield-alt" />
                        </div>
                        <div>
                          <h3 className="adb-modal-title" style={{ marginBottom: 2 }}>Setup 2FA</h3>
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--ap-muted)' }}>Two-Factor Authentication</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShow2FAWizard(false)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ap-muted)', fontSize: 18, padding: 4, lineHeight: 1 }}
                        title="Close"
                      >
                        <i className="fas fa-times" />
                      </button>
                    </div>

                    {/* Step 1: QR Code */}
                    <p style={{ fontSize: 13, color: 'var(--ap-muted)', marginBottom: 16, lineHeight: 1.5 }}>
                      1. Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, padding: 16, background: '#fff', borderRadius: 12 }}>
                      <QRCodeCanvas value={qrUrl} size={150} />
                    </div>

                    {/* Secret Key */}
                    <div style={{ background: 'var(--ap-soft)', padding: '10px 14px', borderRadius: 10, textAlign: 'center', marginBottom: 20, border: '1px solid var(--abdr)' }}>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ap-muted)', marginBottom: 4, letterSpacing: '0.08em' }}>Secret Key</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ap-accent)', letterSpacing: 2, fontFamily: 'monospace' }}>{twoFactorSecret}</div>
                    </div>

                    {/* Step 2: OTP Input */}
                    <p style={{ fontSize: 13, color: 'var(--ap-muted)', marginBottom: 10, lineHeight: 1.5 }}>
                      2. Enter the 6-digit verification code from the app:
                    </p>
                    <input
                      type="text"
                      className="aprof-input"
                      placeholder="000000"
                      maxLength={6}
                      value={twoFactorCode}
                      onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                      autoFocus
                      style={{ textAlign: 'center', fontSize: 22, letterSpacing: 8, height: 56, fontWeight: 800, marginBottom: 20 }}
                    />

                    {/* Actions */}
                    <div className="adb-modal-actions">
                      <button className="adb-modal-btn adb-modal-btn--cancel" onClick={() => setShow2FAWizard(false)}>Cancel</button>
                      <button
                        className="adb-modal-btn adb-modal-btn--confirm"
                        onClick={handleEnable2FA}
                        disabled={twoFactorLoading || twoFactorCode.length !== 6}
                      >
                        {twoFactorLoading ? <><i className="fas fa-spinner fa-spin" /> Verifying…</> : 'Verify & Enable 2FA'}
                      </button>
                    </div>

                  </div>
                </div>,
                document.body
              )}

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
                      <div style={{ width: 32, height: 32, background: 'var(--acard)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', flexShrink: 0, boxShadow: 'var(--sh-xs)' }}>
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

              {/* Recent Security Activity */}
              <section className="aprof-section" style={{ background: 'var(--acard-alt)' }}>
                <div className="aprof-section-head">
                  <div className="aprof-section-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}><i className="fas fa-history" /></div>
                  <h3 className="aprof-section-title">Recent Security Activity</h3>
                </div>
                <div className="aprof-activity-list">
                  {[
                    { icon: 'fas fa-shield-alt', text: currentUser?.twoFactorEnabled ? '2FA Protection enabled' : '2FA Protection is recommended', time: 'Active' },
                    { icon: 'fas fa-key', text: 'Password last verified', time: 'Today' },
                    { icon: 'fas fa-sync-alt', text: 'Profile identity synchronized', time: 'Just now' },
                  ].map((act, i) => (
                    <div key={i} className="aprof-activity-item">
                      <div className="aprof-act-icon"><i className={act.icon} /></div>
                      <div className="aprof-act-content">
                        <div className="aprof-act-text">{act.text}</div>
                        <div className="aprof-act-time">{act.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

            </div>
          </div>
        </div>
      </main>
      <style>{`
        .aprof-topbar-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff !important;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s ease;
          height: 40px;
          backdrop-filter: blur(8px);
        }
        .aprof-topbar-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.4);
          color: #fff !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
        }

        .aprof-premium-btn {
          height: 40px;
          padding: 0 20px;
          border-radius: 12px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #fff !important;
          border: none;
          font-weight: 800;
          font-size: 13px;
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
          display: flex;
          align-items: center;
          gap: 8,
          cursor: default;
          position: relative;
          overflow: hidden;
        }
        .aprof-premium-btn::after {
          content: "";
          position: absolute;
          top: -50%; left: -50%;
          width: 200%; height: 200%;
          background: linear-gradient(45deg, transparent, rgba(255,255,255,0.3), transparent);
          transform: rotate(45deg);
          animation: aprofShine 3s infinite;
        }
        @keyframes aprofShine {
          0% { left: -100%; }
          20% { left: 100%; }
          100% { left: 100%; }
        }
        @keyframes aprofPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        .aprof-2fa-overlay-fixed {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(10px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
        }
        .aprof-2fa-modal {
          background: var(--acard);
          width: 100%;
          max-width: 380px;
          border-radius: 20px;
          border: 1px solid var(--abdr);
          box-shadow: 0 25px 70px rgba(0,0,0,0.7);
          overflow: hidden;
          animation: aprofPopIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes aprofPopIn {
          from { transform: scale(0.9) translateY(20px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        .aprof-2fa-head {
          padding: 20px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--abdr);
        }
        .aprof-2fa-head h4 {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
        }
        .aprof-modal-close {
          background: none;
          border: none;
          color: var(--atxt2);
          font-size: 20px;
          cursor: pointer;
          transition: color 0.2s;
        }
        .aprof-modal-close:hover { color: #ef4444; }
        .aprof-2fa-body {
          padding: 24px;
        }
        .aprof-qr-box {
          background: #fff;
          padding: 15px;
          border-radius: 16px;
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
        }
        .aprof-2fa-foot {
          padding: 20px 24px;
          background: var(--acard-alt);
          border-top: 1px solid var(--abdr);
        }
        .aprof-input-2fa {
          width: 100%;
          background: var(--acard-alt);
          border: 1.5px solid var(--abdr);
          border-radius: 12px;
          padding: 12px 16px;
          color: var(--atxt);
          transition: all 0.2s;
          text-align: center;
          font-size: 22px;
          letter-spacing: 8px;
          height: 56px;
          font-weight: 800;
        }
        .aprof-input-2fa:focus {
          border-color: var(--ap);
          box-shadow: 0 0 0 4px var(--ap-soft);
          outline: none;
        }
      `}</style>
    </div>
  );
}
