import { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Building,
  Briefcase,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Waves
} from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onLoginSuccess, reason = '', apiUrl = 'http://127.0.0.1:8000' }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Marine Researcher');
  const [organization, setOrganization] = useState('Oceanic AI Research Foundation');
  const [rememberMe, setRememberMe] = useState(true);

  if (!isOpen) return null;

  const handleModeSwitch = (newMode) => {
    setError('');
    setSuccessMsg('');
    setMode(newMode);
  };

  // Quick Demo Account Auto-Fill & Submit
  const handleQuickDemo = async () => {
    setError('');
    setLoading(true);
    const demoData = {
      id: 1,
      name: 'Dr. Marina Chen',
      email: 'demo@aquascope.org',
      role: 'Senior Marine Biologist',
      organization: 'Oceanic AI Research Foundation',
      bio: 'Specializing in benthic ecosystem preservation, computer vision marine debris localization, and deep reef restoration.',
      joined_date: 'October 2024',
      analyses_count: 14,
      reports_count: 5,
    };

    try {
      // Try hitting the backend first
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@aquascope.org', password: 'password123' }),
      });
      if (res.ok) {
        const data = await res.json();
        onLoginSuccess(data.user, data.token);
        onClose();
        return;
      }
    } catch {
      // Backend offline fallback - continue with demo data
    }

    // Local authentication fallback
    localStorage.setItem('aquascope_user', JSON.stringify(demoData));
    localStorage.setItem('aquascope_token', 'demo_token_marina_chen');
    onLoginSuccess(demoData, 'demo_token_marina_chen');
    setLoading(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = mode === 'login' ? `${apiUrl}/auth/login` : `${apiUrl}/auth/signup`;
      const payload =
        mode === 'login'
          ? { email: email.trim(), password }
          : {
              name: name.trim(),
              email: email.trim(),
              password,
              role: role.trim() || 'Marine Researcher',
              organization: organization.trim() || 'Oceanic AI Research Foundation',
              bio: 'Active research contributor to underwater computer vision & debris monitoring.',
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || `${mode === 'login' ? 'Login' : 'Signup'} failed.`);
      }

      if (rememberMe) {
        localStorage.setItem('aquascope_user', JSON.stringify(data.user));
        localStorage.setItem('aquascope_token', data.token);
      }
      onLoginSuccess(data.user, data.token);
      onClose();
    } catch (err) {
      // If network fails (e.g. backend offline), offer local session seamlessly
      if (err.message.includes('Failed to fetch') || err.message.includes('Cannot connect')) {
        const localUser = {
          id: Date.now(),
          name: mode === 'signup' ? name.trim() : email.split('@')[0] || 'Marine Researcher',
          email: email.trim(),
          role: mode === 'signup' ? role : 'Marine Researcher',
          organization: mode === 'signup' ? organization : 'Oceanic AI Research Foundation',
          bio: 'Active research contributor to underwater computer vision & debris monitoring.',
          joined_date: 'Current Session',
          analyses_count: 0,
          reports_count: 0,
        };
        const localToken = `local_token_${Date.now()}`;
        if (rememberMe) {
          localStorage.setItem('aquascope_user', JSON.stringify(localUser));
          localStorage.setItem('aquascope_token', localToken);
        }
        onLoginSuccess(localUser, localToken);
        onClose();
      } else {
        setError(err.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Close Button */}
        <button className="auth-close-btn" onClick={onClose} aria-label="Close authentication modal">
          <X size={19} />
        </button>

        {/* Header with Aqua Scope branding */}
        <div className="auth-header">
          <div className="auth-brand-badge">
            <Waves size={24} />
          </div>
          <h3>{mode === 'login' ? 'Sign in to Aqua Scope' : 'Create Researcher Account'}</h3>
          <p>
            {mode === 'login'
              ? 'Access underwater AI diagnostics, saved session dossiers, and severity indices.'
              : 'Join the marine vision platform for automated debris detection and habitat monitoring.'}
          </p>
        </div>

        {/* Reason banner if triggered by trying to analyze */}
        {reason && (
          <div className="auth-reason-banner">
            <Lock size={15} />
            <span>{reason}</span>
          </div>
        )}

        {/* Quick Demo Pill */}
        <div className="auth-demo-banner">
          <button type="button" className="demo-chip-btn" onClick={handleQuickDemo} disabled={loading}>
            <Sparkles size={15} />
            <span>Quick 1-Click Demo Sign-In (Dr. Marina Chen)</span>
          </button>
        </div>

        {/* Tabs for switching between Sign In and Sign Up */}
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => handleModeSwitch('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => handleModeSwitch('signup')}
          >
            Create Account
          </button>
        </div>

        {/* Alerts / Error feedback */}
        {error && (
          <div className="auth-alert error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="auth-alert success">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <div className="auth-field">
              <label htmlFor="auth-name">Full Name</label>
              <div className="input-wrap">
                <User size={17} className="input-icon" />
                <input
                  id="auth-name"
                  type="text"
                  placeholder="e.g. Dr. Marina Chen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-email">Email Address</label>
            <div className="input-wrap">
              <Mail size={17} className="input-icon" />
              <input
                id="auth-email"
                type="email"
                placeholder="name@organization.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div className="auth-row-2">
              <div className="auth-field">
                <label htmlFor="auth-role">Role / Position</label>
                <div className="input-wrap">
                  <Briefcase size={17} className="input-icon" />
                  <input
                    id="auth-role"
                    type="text"
                    placeholder="e.g. Marine Biologist"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </div>
              </div>
              <div className="auth-field">
                <label htmlFor="auth-org">Organization</label>
                <div className="input-wrap">
                  <Building size={17} className="input-icon" />
                  <input
                    id="auth-org"
                    type="text"
                    placeholder="e.g. Oceanic AI Lab"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <div className="input-wrap">
              <Lock size={17} className="input-icon" />
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div className="auth-field">
              <label htmlFor="auth-confirm-password">Confirm Password</label>
              <div className="input-wrap">
                <Lock size={17} className="input-icon" />
                <input
                  id="auth-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="auth-options">
            <label className="checkbox-wrap">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me on this device</span>
            </label>
            {mode === 'login' && (
              <button
                type="button"
                className="text-link-btn"
                onClick={() => alert('For password reset, please contact your research administrator or use the demo login.')}
              >
                Forgot password?
              </button>
            )}
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="spin-icon" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{mode === 'login' ? 'Sign In to Aqua Scope' : 'Create Research Account'}</span>
            )}
          </button>
        </form>

        <div className="auth-footer-switch">
          {mode === 'login' ? (
            <p>
              New to Aqua Scope?{' '}
              <button type="button" onClick={() => handleModeSwitch('signup')}>
                Create an account
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button type="button" onClick={() => handleModeSwitch('login')}>
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
