import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import UserDashboard from './pages/UserDashboard'
import TechnicianDashboard from './pages/TechnicianDashboard'
import AdminDashboard from './pages/AdminDashboard'
import type { ReactElement } from 'react'

function RequireAdmin({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return user.role === 'ADMIN' ? children : <Navigate to={user.role === 'TECHNICIAN' ? '/technician/dashboard' : '/user/dashboard'} replace />
}

function RequireUser({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return user.role === 'ADMIN' ? <Navigate to="/admin/dashboard" replace /> : children
}

function RequireTechnician({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return user.role === 'TECHNICIAN' ? children : user.role === 'ADMIN' ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/user/dashboard" replace />
}

function App() {
  const { user, loading } = useAuth()

  // Handle post-logout URL cleanup
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('loggedOut') === 'true') {
      console.log('Logged out detected')
      window.history.replaceState({}, '', '/login')
    }
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: '#0a0b0e', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(245,158,11,0.15)', borderTopColor: '#f59e0b', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>Smart Campus Hub</div>
          <div style={{ fontSize: 12, color: '#4b5563' }}>Connecting to backend…</div>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* /dashboard redirects to role-specific dashboard */}
      <Route
        path="/dashboard"
        element={
          user
            ? <Navigate to={user.role === 'ADMIN' ? '/admin/dashboard' : user.role === 'TECHNICIAN' ? '/technician/dashboard' : '/user/dashboard'} replace />
            : <Navigate to="/login" replace />
        }
      />

      <Route
        path="/user/dashboard"
        element={
          <RequireUser>
            <UserDashboard />
          </RequireUser>
        }
      />

      <Route
        path="/technician/dashboard"
        element={
          <RequireTechnician>
            <TechnicianDashboard />
          </RequireTechnician>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <RequireAdmin>
            <AdminDashboard />
          </RequireAdmin>
        }
      />

      {/* Root redirect */}
      <Route
        path="/"
        element={
          user
            ? <Navigate to={user.role === 'ADMIN' ? '/admin/dashboard' : user.role === 'TECHNICIAN' ? '/technician/dashboard' : '/user/dashboard'} replace />
            : <Navigate to="/login" replace />
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App