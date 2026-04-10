export default function AdminDashboardPlaceholder() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0b0e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ background: '#111318', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 14, padding: '40px 48px', maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>🛡️</div>
        <h1 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.4px' }}>Admin Dashboard</h1>
        <p style={{ margin: 0, fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>
          Approve/Reject booking requests with reasons and manage the resource catalogue next.
        </p>
      </div>
    </div>
  )
}
