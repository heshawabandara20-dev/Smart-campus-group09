import React, { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const backendBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081';

  const params = new URLSearchParams(location.search);
  const hasError = params.get('error') === 'true';
  const loggedOut = params.get('loggedOut') === 'true';

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleGoogleLogin = () => {
    window.location.href = `${backendBaseUrl}/oauth2/authorization/google?prompt=select_account`;
  };

  if (loading) return (
    <div style={styles.loader}>
      <div style={styles.spinner} />
      <span style={styles.loaderText}>Authenticating…</span>
    </div>
  );

  if (user) return null;

  return (
    <div style={styles.root}>
      {/* Background grid */}
      <div style={styles.grid} />

      {/* Floating accent blobs */}
      <div style={{ ...styles.blob, top: '8%', left: '12%', width: 340, height: 340, background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />
      <div style={{ ...styles.blob, bottom: '10%', right: '8%', width: 280, height: 280, background: 'radial-gradient(circle, rgba(14,165,233,0.06) 0%, transparent 70%)' }} />

      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="9 22 9 12 15 12 15 22" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={styles.logoText}>SmartCampus</span>
        </div>

        <h1 style={styles.heading}>Welcome back</h1>
        <p style={styles.sub}>Sign in to access the Operations Hub</p>

        {hasError && (
          <div style={styles.alertError}>
            ⚠ Authentication failed. Please try again.
          </div>
        )}
        {loggedOut && (
          <div style={styles.alertSuccess}>
            ✓ You have been signed out successfully.
          </div>
        )}

        <button onClick={handleGoogleLogin} style={styles.googleBtn} onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')} onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>

        <div style={styles.divider}><span style={styles.dividerText}>New to SmartCampus?</span></div>

        <Link to="/register" style={styles.registerLink}>
          Create an account →
        </Link>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ffffff',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: 'linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px)',
    backgroundSize: '48px 48px',
    pointerEvents: 'none',
  },
  blob: { position: 'absolute', borderRadius: '50%', pointerEvents: 'none' },
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    backdropFilter: 'blur(24px)',
    borderRadius: 20,
    padding: '44px 40px',
    width: '100%',
    maxWidth: 400,
    position: 'relative',
    zIndex: 2,
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 },
  logoIcon: {
    width: 44, height: 44, borderRadius: 12,
    background: '#f0f4ff',
    border: '1px solid rgba(99,102,241,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 18, fontWeight: 700, color: '#1e293b', letterSpacing: '-0.3px' },
  heading: { fontSize: 28, fontWeight: 700, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' },
  sub: { fontSize: 14, color: '#475569', margin: '0 0 28px' },
  alertError: {
    background: '#fef2f2', border: '1px solid #fecaca',
    color: '#dc2626', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 20,
  },
  alertSuccess: {
    background: '#f0fdf4', border: '1px solid #bbf7d0',
    color: '#16a34a', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 20,
  },
  googleBtn: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
    background: '#f3f4f6', color: '#1f2937',
    border: '1px solid #e5e7eb', borderRadius: 12, padding: '13px 20px',
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  divider: { textAlign: 'center', margin: '24px 0 16px', position: 'relative' },
  dividerText: { fontSize: 13, color: '#94a3b8' },
  registerLink: {
    display: 'block', textAlign: 'center',
    color: '#6366f1', fontSize: 14, fontWeight: 600,
    textDecoration: 'none', letterSpacing: '0.2px',
  },
  loader: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', background: '#ffffff', gap: 16,
  },
  spinner: {
    width: 36, height: 36, borderRadius: '50%',
    border: '3px solid #e5e7eb',
    borderTopColor: '#6366f1',
    animation: 'spin 0.8s linear infinite',
  },
  loaderText: { color: '#94a3b8', fontSize: 14 },
};

export default LoginPage;