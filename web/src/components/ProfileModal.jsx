import { useState } from 'react';
import {
  X,
  Mail,
  Briefcase,
  Building,
  FileText,
  Calendar,
  LogOut,
  Edit3,
  Check,
  ShieldCheck,
  Activity,
  Printer,
  Sparkles,
  Waves
} from 'lucide-react';

export default function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  onUpdateUser,
  apiUrl = 'http://127.0.0.1:8000',
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editOrg, setEditOrg] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  if (!isOpen || !currentUser) return null;

  const getInitials = (name = 'Marine Researcher') => {
    return name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const startEditing = () => {
    setEditName(currentUser.name || '');
    setEditRole(currentUser.role || 'Marine Researcher');
    setEditOrg(currentUser.organization || 'Oceanic AI Research Foundation');
    setEditBio(currentUser.bio || '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveProfile = async () => {
    setSaveLoading(true);
    const updated = {
      ...currentUser,
      name: editName.trim() || currentUser.name,
      role: editRole.trim() || currentUser.role,
      organization: editOrg.trim() || currentUser.organization,
      bio: editBio.trim() || currentUser.bio,
    };

    try {
      const token = localStorage.getItem('aquascope_token');
      if (token && !token.startsWith('demo_') && !token.startsWith('local_')) {
        await fetch(`${apiUrl}/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: updated.name,
            role: updated.role,
            organization: updated.organization,
            bio: updated.bio,
          }),
        });
      }
    } catch {
      // offline fallback - update local
    }

    localStorage.setItem('aquascope_user', JSON.stringify(updated));
    onUpdateUser(updated);
    setIsEditing(false);
    setSaveLoading(false);
  };

  return (
    <div className="profile-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Top Ocean Hero Banner */}
        <div className="profile-cover">
          <div className="profile-cover-rings">
            <span className="cover-circle ring-1" />
            <span className="cover-circle ring-2" />
          </div>
          <button className="profile-close-btn" onClick={onClose} aria-label="Close profile">
            <X size={19} />
          </button>
        </div>

        {/* User Avatar Circle */}
        <div className="profile-avatar-row">
          <div className="profile-avatar-large">
            <span className="avatar-initials-large">{getInitials(currentUser.name)}</span>
            <span className="online-status-badge" title="Active Researcher"></span>
          </div>

          <div className="profile-action-controls">
            {!isEditing ? (
              <button className="profile-edit-btn" onClick={startEditing}>
                <Edit3 size={15} />
                <span>Edit Profile</span>
              </button>
            ) : (
              <div className="edit-action-group">
                <button className="profile-cancel-btn" onClick={cancelEditing}>
                  Cancel
                </button>
                <button className="profile-save-btn" onClick={saveProfile} disabled={saveLoading}>
                  <Check size={15} />
                  <span>{saveLoading ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Header Details */}
        <div className="profile-info-header">
          {!isEditing ? (
            <>
              <h2>{currentUser.name}</h2>
              <p className="profile-email">
                <Mail size={14} /> {currentUser.email}
              </p>
              <div className="profile-verified-badge">
                <ShieldCheck size={14} />
                <span>Verified Researcher · Underwater AI Contributor</span>
              </div>
            </>
          ) : (
            <div className="edit-field-group">
              <label>Full Name</label>
              <input
                type="text"
                className="profile-edit-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Research & Institutional Details */}
        <div className="profile-details-grid">
          <div className="profile-detail-card">
            <span className="detail-icon">
              <Briefcase size={16} />
            </span>
            <div className="detail-copy">
              <small>Position / Role</small>
              {!isEditing ? (
                <strong>{currentUser.role || 'Marine Researcher'}</strong>
              ) : (
                <input
                  type="text"
                  className="profile-edit-input compact"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                />
              )}
            </div>
          </div>

          <div className="profile-detail-card">
            <span className="detail-icon">
              <Building size={16} />
            </span>
            <div className="detail-copy">
              <small>Organization / Affiliation</small>
              {!isEditing ? (
                <strong>{currentUser.organization || 'Oceanic AI Research Foundation'}</strong>
              ) : (
                <input
                  type="text"
                  className="profile-edit-input compact"
                  value={editOrg}
                  onChange={(e) => setEditOrg(e.target.value)}
                />
              )}
            </div>
          </div>

          <div className="profile-detail-card">
            <span className="detail-icon">
              <Calendar size={16} />
            </span>
            <div className="detail-copy">
              <small>Member Since</small>
              <strong>{currentUser.joined_date || 'October 2024'}</strong>
            </div>
          </div>

          <div className="profile-detail-card">
            <span className="detail-icon">
              <Waves size={16} />
            </span>
            <div className="detail-copy">
              <small>Platform ID</small>
              <strong>AS-{(currentUser.id || 101).toString().padStart(5, '0')}</strong>
            </div>
          </div>
        </div>

        {/* Research Focus / Bio */}
        <div className="profile-bio-box">
          <span className="bio-title">
            <FileText size={15} /> Research Focus &amp; Notes
          </span>
          {!isEditing ? (
            <p>
              {currentUser.bio ||
                'Conducting optical enhancement, neural segmentation of anthropogenic debris, and explainable AI monitoring for benthic reef preservation.'}
            </p>
          ) : (
            <textarea
              className="profile-edit-textarea"
              rows={3}
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
            />
          )}
        </div>

        {/* Live Activity & Capstone Stats */}
        <div className="profile-stats-section">
          <h4>Research Activity &amp; Diagnostics</h4>
          <div className="profile-stats-grid">
            <div className="stat-pill">
              <span className="stat-num">{currentUser.analyses_count ?? 14}</span>
              <span className="stat-label">
                <Activity size={13} /> Underwater Scans Run
              </span>
            </div>
            <div className="stat-pill">
              <span className="stat-num">{currentUser.reports_count ?? 5}</span>
              <span className="stat-label">
                <Printer size={13} /> Audit Dossiers Exported
              </span>
            </div>
            <div className="stat-pill highlight">
              <span className="stat-num">Active</span>
              <span className="stat-label">
                <Sparkles size={13} /> 6-Stage AI Pipeline
              </span>
            </div>
          </div>
        </div>

        {/* Sign Out Action Button */}
        <div className="profile-footer-actions">
          <button className="profile-logout-btn" onClick={onLogout}>
            <LogOut size={16} />
            <span>Sign Out of Aqua Scope</span>
          </button>
        </div>
      </div>
    </div>
  );
}
