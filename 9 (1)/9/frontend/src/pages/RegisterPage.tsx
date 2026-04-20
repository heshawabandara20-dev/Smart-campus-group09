import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const backendBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081';
  const [step, setStep] = useState<'info' | 'oauth'>('info');

  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true });
  }, [user, loading, navigate]);

  const handleGoogleRegister = () => {
    // Same OAuth endpoint — backend creates account on first login
    window.location.href = `${backendBaseUrl}/oauth2/authorization/google?prompt=select_account`;
  };

  if (loading) return (
    <div style={styles.loader}>
      <div style={styles.spinner} />
      <span style={{ color: '#64748b', fontSize: 14 }}>Loading…</span>
    </div>
  );

  if (user) return null;

  return (
    <div style={styles.root}>
      <div style={styles.grid} />
      <div style={{ ...styles.blob, top: '5%', right: '10%', width: 320, height: 320, background: 'radial-gradient(circle, rgba(14,165,233,0.16) 0%, transparent 70%)' }} />
      <div style={{ ...styles.blob, bottom: '15%', left: '5%', width: 260, height: 260, background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)' }} />

      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="#0ea5e9" strokeWidth="2"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={styles.logoText}>SmartCampus</span>
        </div>

        {step === 'info' ? (
          <>
            <h1 style={styles.heading}>Create account</h1>
            <p style={styles.sub}>Join the Smart Campus Operations Hub</p>

            {/* Feature highlights */}
            <div style={styles.features}>
              {[
                { icon: '🏛️', text: 'Book lecture halls, labs & equipment' },
                { icon: '🎫', text: 'Submit & track maintenance tickets' },
                { icon: '🔔', text: 'Real-time notifications' },
              ].map((f, i) => (
                <div key={i} style={styles.featureRow}>
                  <span style={styles.featureIcon}>{f.icon}</span>
                  <span style={styles.featureText}>{f.text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep('oauth')}
              style={styles.continueBtn}
              onMouseEnter={e => (e.currentTarget.style.background = '#4f46e5')}
              onMouseLeave={e => (e.currentTarget.style.background = '#6366f1')}
            >
              Continue with Google →
            </button>

            <div style={styles.note}>
              By registering, your account is created automatically on first Google sign-in.
            </div>
          </>
        ) : (
          <>
            <button onClick={() => setStep('info')} style={styles.backBtn}>← Back</button>
            <h1 style={styles.heading}>Almost there!</h1>
            <p style={styles.sub}>Click below to complete registration via Google</p>

            <div style={styles.infoBox}>
              <strong style={{ color: '#e2e8f0', display: 'block', marginBottom: 6 }}>What happens next?</strong>
              <span style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
                Google will ask you to choose an account. Your profile is automatically created as a <strong style={{ color: '#818cf8' }}>USER</strong> role. You'll be redirected to your dashboard immediately after.
              </span>
            </div>

            <button
              onClick={handleGoogleRegister}
              style={styles.googleBtn}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Register with Google
            </button>
          </>
        )}

        <div style={styles.divider} />
        <p style={styles.loginText}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
            Sign in →
          </Link>
        </p>
      </div>

      <p style={styles.footer}>SLIIT · IT3030 Smart Campus Operations Hub</p>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: '#0f0f13', position: 'relative', overflow: 'hidden',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: 'linear-gradient(rgba(14,165,233,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.06) 1px, transparent 1px)',
    backgroundSize: '48px 48px', pointerEvents: 'none',
  },
  blob: { position: 'absolute', borderRadius: '50%', pointerEvents: 'none' },
  card: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(24px)', borderRadius: 20, padding: '44px 40px',
    width: '100%', maxWidth: 420, position: 'relative', zIndex: 2,
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
  },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 },
  logoIcon: {
    width: 44, height: 44, borderRadius: 12,
    background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 18, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.3px' },
  heading: { fontSize: 28, fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px', letterSpacing: '-0.5px' },
  sub: { fontSize: 14, color: '#94a3b8', margin: '0 0 24px' },
  features: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 },
  featureRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px',
    border: '1px solid rgba(255,255,255,0.07)',
  },
  featureIcon: { fontSize: 18 },
  featureText: { color: '#cbd5e1', fontSize: 14 },
  continueBtn: {
    width: '100%', padding: '13px 20px', borderRadius: 12, border: 'none',
    background: '#6366f1', color: '#fff', fontSize: 15, fontWeight: 600,
    cursor: 'pointer', transition: 'background 0.15s',
  },
  note: { marginTop: 14, fontSize: 12, color: '#475569', textAlign: 'center', lineHeight: 1.5 },
  backBtn: {
    background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
    fontSize: 13, padding: 0, marginBottom: 16, display: 'block',
  },
  infoBox: {
    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: 12, padding: '16px', marginBottom: 24,
  },
  googleBtn: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
    background: '#fff', color: '#1e293b', border: 'none', borderRadius: 12, padding: '13px 20px',
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
    boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
  },
  divider: { borderTop: '1px solid rgba(255,255,255,0.07)', margin: '24px 0 16px' },
  loginText: { fontSize: 14, color: '#64748b', textAlign: 'center', margin: 0 },
  loader: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', background: '#0f0f13', gap: 16,
  },
  spinner: {
    width: 36, height: 36, borderRadius: '50%',
    border: '3px solid rgba(14,165,233,0.2)', borderTopColor: '#0ea5e9',
    animation: 'spin 0.8s linear infinite',
  },
  footer: { position: 'absolute', bottom: 20, color: '#334155', fontSize: 12, zIndex: 2 },
};

export default RegisterPage;