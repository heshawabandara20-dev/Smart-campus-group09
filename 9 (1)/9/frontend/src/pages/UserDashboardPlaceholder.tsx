export default function UserDashboardPlaceholder() {
  return (
    <div style={{ minHeight: '100vh', background: '#07080c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ background: '#0e1018', border: '1px solid rgba(129,140,248,0.15)', borderRadius: 14, padding: '40px 48px', maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>🎓</div>
        <h1 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.4px' }}>User Dashboard</h1>
        <p style={{ margin: 0, fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>
          Booking request form, conflict alerts, and "My Bookings" table will be implemented next.
        </p>
      </div>
    </div>
  )
}
