import React, { useCallback, useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts'

const API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081'

const get   = (path: string) => fetch(`${API}${path}`, { credentials: 'include' })
const del   = (path: string) => fetch(`${API}${path}`, { method: 'DELETE', credentials: 'include' })
const post  = (path: string, body: unknown) =>
  fetch(`${API}${path}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const put   = (path: string, body?: unknown) =>
  fetch(`${API}${path}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
const patch = (path: string, body?: unknown) =>
  fetch(`${API}${path}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })

// ── Types ──────────────────────────────────────────────────────────────────
type ResType    = 'LECTURE_HALL' | 'LAB' | 'MEETING_ROOM' | 'EQUIPMENT'
type ResStatus  = 'ACTIVE' | 'OUT_OF_SERVICE'
interface Resource { id: number; name: string; type: ResType; capacity: number; location: string; status: ResStatus; description?: string; availabilityStart?: string; availabilityEnd?: string; imageUrl?: string }
type BkStatus   = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
interface Booking { id: number; resourceId: number; requestedByUserId: number; bookingDate: string; startTime: string; endTime: string; purpose: string; status: BkStatus; adminDecisionReason?: string }
type TkStatus   = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REJECTED'
type TkPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
type TkCategory = 'ELECTRICAL' | 'NETWORK' | 'PROJECTOR' | 'HVAC' | 'FURNITURE' | 'SECURITY' | 'OTHER'
interface Ticket { id: number; resourceId?: number; location?: string; category: TkCategory; priority: TkPriority; description: string; status: TkStatus; preferredContact: string; createdByUserId: number; assignedToUserId?: number; rejectionReason?: string; resolutionNotes?: string; createdAt?: string; updatedAt?: string; comments?: Comment[]; attachments?: Attachment[] }
interface Comment    { id: number; authorUserId: number; body: string; createdAt: string }
interface Attachment { id: number; downloadUrl: string; originalFileName: string }
interface Notif      { id: number; message: string; type: string; readAt?: string; createdAt: string }
interface User       { id: number; email: string; name: string; role: string; createdAt: string }

// ── Design tokens — amber/command-center theme ─────────────────────────────
const ADMIN_DARK = {
  '--c-bg':          '#0a0b0e',
  '--c-surface':     '#111318',
  '--c-surface-alt': '#191c24',
  '--c-border':      'var(--c-border)',
  '--c-divider':     'var(--c-divider)',
  '--c-faint':       'var(--c-faint)',
  '--c-text':        '#f1f5f9',
  '--c-sub':         '#94a3b8',
  '--c-muted':       '#4b5563',
}
const ADMIN_LIGHT = {
  '--c-bg':          '#f8fafc',
  '--c-surface':     '#ffffff',
  '--c-surface-alt': '#f1f5f9',
  '--c-border':      'rgba(0,0,0,0.09)',
  '--c-divider':     'rgba(0,0,0,0.07)',
  '--c-faint':       'rgba(0,0,0,0.04)',
  '--c-text':        '#0f172a',
  '--c-sub':         '#475569',
  '--c-muted':       '#94a3b8',
}

const C = {
  bg:        'var(--c-bg)',
  surface:   'var(--c-surface)',
  surfaceAlt:'var(--c-surface-alt)',
  border:    'var(--c-border)',
  divider:   'var(--c-divider)',
  faint:     'var(--c-faint)',
  accent:    '#f59e0b',
  accentDim: 'rgba(245,158,11,0.1)',
  blue:      '#60a5fa',
  text:      'var(--c-text)',
  sub:       'var(--c-sub)',
  muted:     'var(--c-muted)',
  danger:    '#f87171',
  success:   '#34d399',
  warning:   '#fbbf24',
}

const statusColor: Record<string, string> = {
  ACTIVE: C.success, OUT_OF_SERVICE: C.danger,
  PENDING: C.warning, APPROVED: C.success, REJECTED: C.danger, CANCELLED: '#94a3b8',
  OPEN: C.blue, IN_PROGRESS: C.warning, RESOLVED: C.success, CLOSED: '#94a3b8',
  LOW: C.success, MEDIUM: C.warning, HIGH: '#fb923c', CRITICAL: C.danger,
}

// ── Shared UI ──────────────────────────────────────────────────────────────
const Badge = ({ label }: { label: string }) => {
  const color = statusColor[label] ?? C.blue
  return <span style={{ background: `${color}18`, color, border: `1px solid ${color}30`, borderRadius: 5, padding: '3px 9px', fontSize: 11, fontWeight: 700, letterSpacing: '0.3px', whiteSpace: 'nowrap', display: 'inline-block' }}>{label}</span>
}

const Btn = ({ children, variant = 'primary', onClick, disabled, style }: { children: React.ReactNode; variant?: 'primary' | 'danger' | 'ghost' | 'success' | 'warning'; onClick?: () => void; disabled?: boolean; style?: React.CSSProperties }) => {
  const v: Record<string, { bg: string; color: string; border: string }> = {
    primary: { bg: C.accent,   color: '#0a0b0e', border: C.accent },
    danger:  { bg: C.danger,   color: '#fff',    border: C.danger },
    ghost:   { bg: 'transparent', color: C.sub,  border: 'rgba(255,255,255,0.1)' },
    success: { bg: C.success,  color: '#0a0b0e', border: C.success },
    warning: { bg: C.warning,  color: '#0a0b0e', border: C.warning },
  }
  const s = v[variant]
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 7, padding: '7px 15px', fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, transition: 'opacity 0.15s', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6, ...style }}>
      {children}
    </button>
  )
}

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} style={{ width: '100%', background: 'var(--c-faint)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '8px 12px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', ...props.style }} />
)
const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} rows={3} style={{ width: '100%', background: 'var(--c-faint)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '8px 12px', color: C.text, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', ...props.style }} />
)
const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} style={{ width: '100%', background: C.surface, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '8px 12px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', cursor: 'pointer', fontFamily: 'inherit', ...props.style }} />
)
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: 'block', color: C.muted, fontSize: 10, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.7px' }}>{label}</label>
    {children}
  </div>
)
const Modal = ({ title, open, onClose, children, width = 540 }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode; width?: number }) => {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)' }} />
      <div style={{ 
        background: C.surface, 
        border: '1px solid rgba(245,158,11,0.15)', 
        borderRadius: 14, 
        padding: 28, 
        width: '100%', 
        maxWidth: width, 
        maxHeight: '90vh', 
        overflowY: 'auto', 
        position: 'relative', 
        zIndex: 1, 
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        '@media (max-width: 768px)': {
          padding: 20,
          borderRadius: 10,
          maxHeight: '95vh'
        }
      } as React.CSSProperties}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, paddingBottom: 16, borderBottom: '1px solid var(--c-divider)' }}>
          <h3 style={{ margin: 0, color: C.text, fontSize: 16, fontWeight: 700,
            '@media (max-width: 768px)': { fontSize: 14 }
          } as React.CSSProperties}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', color: C.muted, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '3px 8px', borderRadius: 6 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
const Table = ({ cols, rows }: { cols: string[]; rows: React.ReactNode[][] }) => (
  <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--c-border)' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ background: 'rgba(245,158,11,0.04)' }}>
          {cols.map(c => <th key={c} style={{ padding: '11px 16px', textAlign: 'left', color: C.muted, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.7px', whiteSpace: 'nowrap', borderBottom: '1px solid var(--c-border)' }}>{c}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0
          ? <tr><td colSpan={cols.length} style={{ padding: 48, textAlign: 'center', color: C.muted }}>No records found</td></tr>
          : rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--c-faint)', transition: 'background 0.12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              {row.map((cell, j) => <td key={j} style={{ padding: '11px 16px', color: C.text, verticalAlign: 'middle' }}>{cell}</td>)}
            </tr>
          ))}
      </tbody>
    </table>
  </div>
)
const SectionHeader = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
    <div>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: '-0.4px' }}>{title}</h2>
      {subtitle && <p style={{ margin: '4px 0 0', fontSize: 13, color: C.sub }}>{subtitle}</p>}
    </div>
    {action}
  </div>
)

// ── Main Component ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const [tab, setTab]   = useState(0)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [profileOpen, setProfileOpen]       = useState(false)
  const [notifPopupOpen, setNotifPopupOpen] = useState(false)
  const [notifEnabled, setNotifEnabled] = useState(() => localStorage.getItem('notifEnabled') !== 'false')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') !== 'false')
  const profileRef = useRef<HTMLDivElement>(null)
  const notifRef   = useRef<HTMLDivElement>(null)
  const toggleNotif    = () => { const next = !notifEnabled; setNotifEnabled(next); localStorage.setItem('notifEnabled', String(next)) }
  const toggleDarkMode = () => { const next = !darkMode;    setDarkMode(next);    localStorage.setItem('darkMode',    String(next)) }
  const themeVars = darkMode ? ADMIN_DARK : ADMIN_LIGHT
  const showToast  = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  const [resources, setResources] = useState<Resource[]>([])
  const [resFilter, setResFilter] = useState({ type: '', location: '', minCapacity: '', status: '' })
  const emptyResForm = (): Partial<Resource> => ({ type: 'LECTURE_HALL', status: 'ACTIVE', capacity: 30, name: '', location: '', description: '', availabilityStart: '', availabilityEnd: '', imageUrl: '' })
  const [resModal, setResModal]   = useState<{ open: boolean; mode: 'create' | 'edit'; data: Partial<Resource> }>({ open: false, mode: 'create', data: emptyResForm() })
  const [resImage, setResImage]   = useState<File | null>(null)
  const [resImagePreview, setResImagePreview] = useState<string>('')

  const [bookings, setBookings] = useState<Booking[]>([])
  const [bkFilter, setBkFilter] = useState('')
  const [decisionModal, setDecisionModal] = useState<{ open: boolean; booking: Booking | null; approve: boolean }>({ open: false, booking: null, approve: true })
  const [decisionReason, setDecisionReason] = useState('')

  const [tickets, setTickets]           = useState<Ticket[]>([])
  const [tkDetail, setTkDetail]         = useState<Ticket | null>(null)
  const [tkDetailOpen, setTkDetailOpen] = useState(false)
  const [tkStatusForm, setTkStatusForm] = useState({ status: 'OPEN' as TkStatus, assignedToUserId: '', rejectionReason: '', resolutionNotes: '' })
  const [newComment, setNewComment]     = useState('')

  const [notifs, setNotifs]     = useState<Notif[]>([])
  const unread = notifs.filter(n => !n.readAt).length

  const [allBookings, setAllBookings] = useState<Booking[]>([])

  const [users, setUsers]           = useState<User[]>([])
  const [userFilter, setUserFilter] = useState('')
  const [techForm, setTechForm]     = useState({ email: '', name: '' })
  const [addTechModal, setAddTechModal] = useState(false)

  const loadResources = useCallback(async () => {
    const p = new URLSearchParams()
    if (resFilter.type)        p.set('type', resFilter.type)
    if (resFilter.status)      p.set('status', resFilter.status)
    if (resFilter.location)    p.set('location', resFilter.location)
    if (resFilter.minCapacity) p.set('minCapacity', resFilter.minCapacity)
    const r = await get(`/api/resources?${p}`)
    if (r.ok) setResources(await r.json())
  }, [resFilter])

  const loadBookings = useCallback(async () => {
    const url = bkFilter ? `/api/bookings?status=${bkFilter}` : '/api/bookings'
    const r   = await get(url)
    if (r.ok) setBookings(await r.json())
  }, [bkFilter])

  const loadTickets  = useCallback(async () => { const r = await get('/api/tickets'); if (r.ok) setTickets(await r.json()) }, [])
  const loadNotifs   = useCallback(async () => { const r = await get('/api/notifications/my'); if (r.ok) setNotifs(await r.json()) }, [])
  const loadUsers    = useCallback(async () => { const r = await get('/api/auth/users'); if (r.ok) setUsers(await r.json()) }, [])
  const loadAllBookingsForAnalysis = useCallback(async () => { const r = await get('/api/bookings'); if (r.ok) setAllBookings(await r.json()) }, [])

  const createTechnician = async () => {
    if (!techForm.email.trim()) {
      showToast('Technician email is required', false)
      return
    }
    setBusy(true)
    const r = await post('/api/auth/users', { email: techForm.email.trim(), name: techForm.name.trim() || undefined })
    setBusy(false)
    if (r.ok) {
      showToast('Technician added')
      setAddTechModal(false)
      setTechForm({ email: '', name: '' })
      await loadUsers()
    } else {
      const e = await r.json().catch(() => ({}))
      showToast(e.message ?? 'Failed to add technician', false)
    }
  }

  useEffect(() => {
    setBusy(true)
    Promise.all([loadResources(), loadBookings(), loadTickets(), loadNotifs(), loadUsers()]).finally(() => setBusy(false))
  }, [])

  useEffect(() => {
    if (tab === 6) loadAllBookingsForAnalysis()
  }, [tab])

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifPopupOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const saveResource = async () => {
    const d = resModal.data
    if (!d.name?.trim() || !d.location?.trim()) { showToast('Name and location are required', false); return }
    setBusy(true)
    let imageUrl = d.imageUrl ?? ''
    if (resImage) {
      imageUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(resImage)
      })
    }
    const payload = { ...d, imageUrl: imageUrl || undefined }
    const r = resModal.mode === 'create' ? await post('/api/resources', payload) : await put(`/api/resources/${d.id}`, payload)
    setBusy(false)
    if (r.ok) {
      showToast(resModal.mode === 'create' ? 'Resource created' : 'Resource updated')
      setResModal(m => ({ ...m, open: false }))
      setResImage(null); setResImagePreview('')
      await loadResources()
    } else { const e = await r.json().catch(() => ({})); showToast(e.message ?? 'Failed', false) }
  }

  const deleteResource = async (id: number) => {
    if (!confirm('Delete this resource? This cannot be undone.')) return
    setBusy(true)
    const r = await del(`/api/resources/${id}`)
    setBusy(false)
    if (r.ok) { showToast('Resource deleted'); await loadResources() }
    else showToast('Cannot delete resource', false)
  }

  const toggleStatus = async (res: Resource) => {
    const next: ResStatus = res.status === 'ACTIVE' ? 'OUT_OF_SERVICE' : 'ACTIVE'
    setBusy(true)
    const r = await patch(`/api/resources/${res.id}/status?status=${next}`)
    setBusy(false)
    if (r.ok) { showToast(`Status set to ${next}`); await loadResources() }
    else showToast('Update failed', false)
  }

  const submitDecision = async () => {
    if (!decisionModal.booking) return
    setBusy(true)
    const r = await put(`/api/bookings/${decisionModal.booking.id}/status`, { approved: decisionModal.approve, reason: decisionReason || undefined })
    setBusy(false)
    if (r.ok) { showToast(decisionModal.approve ? 'Booking approved' : 'Booking rejected'); setDecisionModal(m => ({ ...m, open: false })); await loadBookings(); await loadNotifs() }
    else { const e = await r.json().catch(() => ({})); showToast(e.message ?? 'Failed', false) }
  }

  const openTicketDetail = async (t: Ticket) => {
    setBusy(true)
    const r = await get(`/api/tickets/${t.id}`)
    setBusy(false)
    if (r.ok) {
      const full: Ticket = await r.json()
      setTkDetail(full)
      setTkDetailOpen(true)
      setTkStatusForm({ status: full.status, assignedToUserId: full.assignedToUserId ? String(full.assignedToUserId) : '', rejectionReason: full.rejectionReason ?? '', resolutionNotes: full.resolutionNotes ?? '' })
      setNewComment('')
    } else showToast('Failed to load ticket', false)
  }

  const updateTicketStatus = async () => {
    if (!tkDetail) return
    setBusy(true)
    const r = await put(`/api/tickets/${tkDetail.id}/status`, { status: tkStatusForm.status, assignedToUserId: tkStatusForm.assignedToUserId ? Number(tkStatusForm.assignedToUserId) : undefined, rejectionReason: tkStatusForm.rejectionReason || undefined, resolutionNotes: tkStatusForm.resolutionNotes || undefined })
    setBusy(false)
    if (r.ok) { showToast('Ticket updated'); setTkDetailOpen(false); await loadTickets() }
    else { const e = await r.json().catch(() => ({})); showToast(e.message ?? 'Update failed', false) }
  }

  const addComment = async () => {
    if (!tkDetail || !newComment.trim()) return
    setBusy(true)
    const r = await post(`/api/tickets/${tkDetail.id}/comments`, { body: newComment })
    setBusy(false)
    if (r.ok) { showToast('Comment added'); setNewComment(''); await openTicketDetail(tkDetail) }
    else showToast('Comment failed', false)
  }

  const deleteComment = async (commentId: number) => {
    if (!tkDetail || !confirm('Delete this comment?')) return
    setBusy(true)
    const r = await del(`/api/tickets/${tkDetail.id}/comments/${commentId}`)
    setBusy(false)
    if (r.ok) { showToast('Comment deleted'); await openTicketDetail(tkDetail) }
    else showToast('Delete failed', false)
  }

  const markRead    = async (id: number) => { const r = await put(`/api/notifications/${id}/read`); if (r.ok) await loadNotifs() }
  const markAllRead = async () => { const r = await put('/api/notifications/read-all'); if (r.ok) await loadNotifs() }

  // ── Render ────────────────────────────────────────────────────────────────
  const tabs = ['Resources', 'Bookings', 'Tickets', 'Users', `Alerts${unread ? ` (${unread})` : ''}`, 'Ticket Analysis', 'Booking Analysis']
  const tabIcons = ['🗄️', '📋', '🔧', '👥', '📣', '📊', '📅']
  const filteredUsers = users.filter(u => !userFilter || u.name?.toLowerCase().includes(userFilter.toLowerCase()) || u.email.toLowerCase().includes(userFilter.toLowerCase()))
  const technicians = users.filter(u => u.role === 'TECHNICIAN')

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Inter', system-ui, sans-serif", color: C.text, display: 'flex', ...themeVars } as React.CSSProperties}>

      {/* ── Sidebar Navigation ── */}
      <aside style={{ 
        width: 240, 
        background: 'var(--c-faint)', 
        borderRight: '1px solid var(--c-divider)', 
        display: 'flex', 
        flexDirection: 'column', 
        position: 'fixed', 
        height: '100vh', 
        top: 0, 
        left: 0, 
        zIndex: 50
      } as React.CSSProperties}>
        {/* Logo */}
        <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid var(--c-divider)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(251,191,36,0.1))', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>🛡️</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.3px' }}>Admin Panel</div>
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Command Center</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 10px', overflowY: 'auto' }}>
          <div style={{ fontSize: 9, color: '#2d3748', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', padding: '0 10px', marginBottom: 10 }}>Management</div>
          {tabs.map((item, i) => (
            <button key={i} onClick={() => setTab(i)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, background: tab === i ? 'rgba(245,158,11,0.12)' : 'transparent', border: `1px solid ${tab === i ? 'rgba(245,158,11,0.2)' : 'transparent'}`, color: tab === i ? '#f59e0b' : C.sub, fontSize: 13, fontWeight: tab === i ? 600 : 400, cursor: 'pointer', marginBottom: 3, textAlign: 'left', transition: 'all 0.15s' }}>
              <span style={{ fontSize: 15, opacity: tab === i ? 1 : 0.6 }}>{tabIcons[i]}</span>
              <span style={{ flex: 1 }}>{item}</span>
              {i === 4 && notifEnabled && unread > 0 && (
                <span style={{ background: C.danger, color: '#fff', borderRadius: 20, padding: '1px 6px', fontSize: 10, fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{unread > 99 ? '99+' : unread}</span>
              )}
              {tab === i && <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.accent, flexShrink: 0 }} />}
            </button>
          ))}
        </nav>

        {/* Dark / Light toggle */}
        <div style={{ padding: '0 10px 6px' }}>
          <button onClick={toggleDarkMode} title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: darkMode ? 'var(--c-faint)' : C.accentDim, border: `1px solid ${darkMode ? 'var(--c-divider)' : C.accent + '30'}`, color: darkMode ? C.sub : C.accent, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
            <span style={{ fontSize: 15 }}>{darkMode ? '☀️' : '🌙'}</span>
            <span style={{ flex: 1, textAlign: 'left' }}>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            <span style={{ fontSize: 10, background: darkMode ? 'var(--c-divider)' : C.accent + '20', color: darkMode ? C.muted : C.accent, borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>{darkMode ? 'ON' : 'ON'}</span>
          </button>
        </div>

        {/* Quick Notifications */}
        <div ref={notifRef} style={{ padding: '0 10px 6px', position: 'relative' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onMouseEnter={() => notifEnabled && setNotifPopupOpen(true)}
              onMouseLeave={() => setNotifPopupOpen(false)}
              onClick={() => setTab(4)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'transparent', border: '1px solid var(--c-divider)', color: C.muted, fontSize: 12, cursor: 'pointer', opacity: notifEnabled ? 1 : 0.45, transition: 'all 0.15s' }}>
              <span>{notifEnabled ? '🔔' : '🔕'}</span>
              <span style={{ flex: 1, textAlign: 'left' }}>{notifEnabled ? 'Quick Notifications' : 'Notifications Off'}</span>
              {notifEnabled && unread > 0 && <span style={{ background: C.danger, color: '#fff', borderRadius: 20, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{unread}</span>}
            </button>
            <button onClick={toggleNotif} title={notifEnabled ? 'Mute notifications' : 'Unmute notifications'}
              style={{ flexShrink: 0, padding: '8px 10px', borderRadius: 8, background: notifEnabled ? 'transparent' : `${C.accentDim}`, border: `1px solid ${notifEnabled ? 'var(--c-divider)' : `${C.accent}40`}`, color: notifEnabled ? C.muted : C.accent, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
              {notifEnabled ? '🔕' : '🔔'}
            </button>
          </div>
          {notifEnabled && notifPopupOpen && (
            <div
              onMouseEnter={() => setNotifPopupOpen(true)}
              onMouseLeave={() => setNotifPopupOpen(false)}
              style={{ position: 'absolute', bottom: '100%', left: 10, right: 10, marginBottom: 6, background: C.surface, border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, maxHeight: 320, overflowY: 'auto', zIndex: 100, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
              <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--c-divider)', fontSize: 12, fontWeight: 600, color: C.text }}>Unread ({unread})</div>
              {notifs.filter(n => !n.readAt).length === 0
                ? <div style={{ padding: '20px 14px', textAlign: 'center', color: C.muted, fontSize: 12 }}>All caught up!</div>
                : notifs.filter(n => !n.readAt).slice(0, 5).map(n => (
                  <div key={n.id} onClick={() => { setTab(4); setNotifPopupOpen(false) }}
                    style={{ padding: '10px 14px', borderBottom: '1px solid var(--c-faint)', cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>{n.message}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* User section */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--c-divider)' }} ref={profileRef}>
          <div onClick={() => setProfileOpen(!profileOpen)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', borderRadius: 9, background: 'var(--c-faint)', border: '1px solid var(--c-divider)', marginBottom: 8, cursor: 'pointer', transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(245,158,11,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--c-divider)')}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(251,191,36,0.1))', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#f59e0b', flexShrink: 0 }}>
              {(user?.name || user?.email || 'A')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || user?.email?.split('@')[0]}</div>
              <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Administrator</div>
            </div>
            <span style={{ fontSize: 9, color: C.muted, transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
          </div>

          {profileOpen && (
            <div style={{ background: C.surfaceAlt, border: '1px solid rgba(245,158,11,0.12)', borderRadius: 8, padding: '10px 12px', marginBottom: 8, fontSize: 12 }}>
              <div style={{ color: C.sub, marginBottom: 4, wordBreak: 'break-all' }}>{user?.email}</div>
              <span style={{ display: 'inline-block', fontSize: 10, color: C.accent, background: C.accentDim, border: `1px solid ${C.accent}30`, borderRadius: 4, padding: '2px 8px', textTransform: 'uppercase', fontWeight: 700 }}>ADMIN</span>
            </div>
          )}

          <button onClick={logout} style={{ width: '100%', background: 'none', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 7, color: C.danger, fontSize: 12, padding: '8px 12px', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.07)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.15)' }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div style={{ 
        flex: 1, 
        marginLeft: 240,
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh'
      } as React.CSSProperties}>

        {/* ── Toast ── */}
        {toast && (
          <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.ok ? 'rgba(16,68,43,0.95)' : 'rgba(80,20,20,0.95)', border: `1px solid ${toast.ok ? '#34d39933' : '#f8717133'}`, color: toast.ok ? C.success : C.danger, borderRadius: 10, padding: '12px 18px', fontSize: 13, fontWeight: 600, boxShadow: '0 12px 40px rgba(0,0,0,0.6)', maxWidth: 340, display: 'flex', alignItems: 'center', gap: 8 }}>
            {toast.ok ? '✓' : '✕'} {toast.msg}
          </div>
        )}

        {/* ── Content ── */}
        <div style={{ flex: 1, width: '100%', padding: '24px 28px', overflowY: 'auto' }}>

        {/* ── RESOURCES ── */}
        {tab === 0 && (
          <div>
            <SectionHeader title="Facilities & Assets" subtitle={`${resources.length} resources managed`} action={<Btn onClick={() => setResModal({ open: true, mode: 'create', data: emptyResForm() })}>+ Add Resource</Btn>} />
            <div style={{ background: C.surface, border: '1px solid var(--c-divider)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 12 }}>Filter Resources</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end',
                '@media (max-width: 768px)': {
                  flexDirection: 'column',
                  alignItems: 'stretch'
                }
              } as React.CSSProperties}>
                <div style={{ flex: '0 0 150px',
                  '@media (max-width: 768px)': { flex: '1' }
                } as React.CSSProperties}>
                  <Select value={resFilter.type} onChange={e => setResFilter(f => ({ ...f, type: e.target.value }))}>
                    <option value="">All Types</option>
                    {(['LECTURE_HALL', 'LAB', 'MEETING_ROOM', 'EQUIPMENT'] as ResType[]).map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </Select>
                </div>
                <div style={{ flex: '0 0 150px',
                  '@media (max-width: 768px)': { flex: '1' }
                } as React.CSSProperties}>
                  <Select value={resFilter.status} onChange={e => setResFilter(f => ({ ...f, status: e.target.value }))}>
                    <option value="">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="OUT_OF_SERVICE">Out of Service</option>
                  </Select>
                </div>
                <div style={{ flex: '0 0 170px',
                  '@media (max-width: 768px)': { flex: '1' }
                } as React.CSSProperties}>
                  <Input placeholder="Location" value={resFilter.location} onChange={e => setResFilter(f => ({ ...f, location: e.target.value }))} />
                </div>
                <div style={{ flex: '0 0 125px',
                  '@media (max-width: 768px)': { flex: '1' }
                } as React.CSSProperties}>
                  <Input type="number" placeholder="Min Capacity" value={resFilter.minCapacity} onChange={e => setResFilter(f => ({ ...f, minCapacity: e.target.value }))} />
                </div>
                <Btn onClick={loadResources} disabled={busy}>Search</Btn>
                <Btn onClick={() => { setResFilter({ type: '', status: '', location: '', minCapacity: '' }); setTimeout(loadResources, 50) }} variant="ghost">Clear</Btn>
              </div>
            </div>
            {resources.length === 0 && (
              <div style={{ textAlign: 'center', padding: 60, color: C.muted, background: C.surface, borderRadius: 12, border: '1px solid var(--c-divider)' }}>No resources found</div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
              {resources.map(r => {
                const typeIcon: Record<string, string> = { LECTURE_HALL: '🏛️', LAB: '🔬', MEETING_ROOM: '🤝', EQUIPMENT: '⚙️' }
                const isActive = r.status === 'ACTIVE'
                return (
                  <div key={r.id} style={{ background: C.surface, border: `1px solid ${isActive ? 'var(--c-border)' : 'rgba(248,113,113,0.15)'}`, borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'border-color 0.2s, transform 0.2s', cursor: 'default' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = isActive ? 'var(--c-border)' : 'rgba(248,113,113,0.15)'; e.currentTarget.style.transform = 'translateY(0)' }}>

                    {/* Image / Placeholder */}
                    <div style={{ position: 'relative', height: 160, background: r.imageUrl ? 'transparent' : 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(251,191,36,0.03))', overflow: 'hidden', flexShrink: 0 }}>
                      {r.imageUrl
                        ? <img src={r.imageUrl.startsWith('http') || r.imageUrl.startsWith('data:') ? r.imageUrl : `${API}${r.imageUrl}`} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52, opacity: 0.4 }}>{typeIcon[r.type] ?? '🏢'}</div>
                      }
                      {/* Status badge overlay */}
                      <div style={{ position: 'absolute', top: 10, right: 10 }}><Badge label={r.status} /></div>
                      {/* ID chip */}
                      <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', borderRadius: 5, padding: '2px 8px', fontSize: 10, fontFamily: 'monospace', color: C.muted }}>#{r.id}</div>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text, flex: 1 }}>{r.name}</h3>
                        </div>
                        <span style={{ fontSize: 11, color: C.accent, background: C.accentDim, border: `1px solid ${C.accent}25`, borderRadius: 5, padding: '2px 8px', fontWeight: 600 }}>{r.type.replace(/_/g, ' ')}</span>
                      </div>

                      {r.description && <p style={{ margin: 0, fontSize: 12, color: C.sub, lineHeight: 1.5 }}>{r.description}</p>}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <span style={{ color: C.muted, width: 16, textAlign: 'center' }}>📍</span>
                          <span style={{ color: C.sub }}>{r.location}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <span style={{ color: C.muted, width: 16, textAlign: 'center' }}>👥</span>
                          <span style={{ color: C.sub }}>Capacity: <strong style={{ color: C.accent }}>{r.capacity}</strong></span>
                        </div>
                        {r.availabilityStart && r.availabilityEnd && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                            <span style={{ color: C.muted, width: 16, textAlign: 'center' }}>🕐</span>
                            <span style={{ color: C.success }}>{r.availabilityStart} – {r.availabilityEnd}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ padding: '12px 18px', borderTop: '1px solid var(--c-divider)', display: 'flex', gap: 6 }}>
                      <Btn variant="ghost" onClick={() => { setResModal({ open: true, mode: 'edit', data: { ...r } }); setResImage(null); setResImagePreview(r.imageUrl ?? '') }} style={{ padding: '5px 10px', fontSize: 12, flex: 1, justifyContent: 'center' }}>Edit</Btn>
                      <Btn variant="ghost" onClick={() => toggleStatus(r)} style={{ padding: '5px 10px', fontSize: 12, flex: 1, justifyContent: 'center', color: isActive ? C.warning : C.success, borderColor: isActive ? 'rgba(251,191,36,0.2)' : 'rgba(52,211,153,0.2)' }}>{isActive ? 'Disable' : 'Enable'}</Btn>
                      <Btn variant="danger" onClick={() => deleteResource(r.id)} style={{ padding: '5px 10px', fontSize: 12 }}>✕</Btn>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── ALL BOOKINGS ── */}
        {tab === 1 && (
          <div>
            <SectionHeader title="Booking Requests" subtitle={`${bookings.length} total requests`} />
            <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center' }}>
              <Select value={bkFilter} onChange={e => setBkFilter(e.target.value)} style={{ width: 200 }}>
                <option value="">All Statuses</option>
                {(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as BkStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Btn onClick={loadBookings} disabled={busy} variant="ghost">Apply</Btn>
            </div>
            <Table
              cols={['ID', 'Resource', 'Requested By', 'Date', 'Time', 'Purpose', 'Status', 'Reason', 'Actions']}
              rows={bookings.map(b => [
                <span style={{ color: C.muted, fontFamily: 'monospace', fontSize: 11 }}>#{b.id}</span>,
                <span style={{ fontWeight: 600 }}>Resource #{b.resourceId}</span>,
                <span style={{ color: C.sub, fontSize: 12 }}>User #{b.requestedByUserId}</span>,
                <span style={{ color: C.sub }}>{b.bookingDate}</span>,
                <span style={{ fontSize: 12, color: C.muted }}>{b.startTime} – {b.endTime}</span>,
                <span style={{ maxWidth: 160, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.purpose}</span>,
                <Badge label={b.status} />,
                b.adminDecisionReason ? <span style={{ fontSize: 12, color: C.muted, maxWidth: 140, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.adminDecisionReason}</span> : <span style={{ color: C.muted }}>—</span>,
                b.status === 'PENDING' ? (
                  <div style={{ display: 'flex', gap: 5 }}>
                    <Btn variant="success" onClick={() => { setDecisionModal({ open: true, booking: b, approve: true }); setDecisionReason('') }} style={{ padding: '4px 10px', fontSize: 12 }}>Approve</Btn>
                    <Btn variant="danger"  onClick={() => { setDecisionModal({ open: true, booking: b, approve: false }); setDecisionReason('') }} style={{ padding: '4px 10px', fontSize: 12 }}>Reject</Btn>
                  </div>
                ) : <span style={{ color: C.muted, fontSize: 12 }}>—</span>,
              ])}
            />
          </div>
        )}

        {/* ── ALL TICKETS ── */}
        {tab === 2 && (
          <div>
            <SectionHeader title="Maintenance Tickets" subtitle={`${tickets.length} tickets total`} />
            <Table
              cols={['ID', 'Category', 'Priority', 'Location', 'Status', 'Reporter', 'Assigned', 'Created', 'Actions']}
              rows={tickets.map(t => {
                const assignedUser = t.assignedToUserId ? users.find(u => u.id === t.assignedToUserId) : null
                return [
                  <span style={{ color: C.muted, fontFamily: 'monospace', fontSize: 11 }}>#{t.id}</span>,
                  <span>{t.category}</span>,
                  <Badge label={t.priority} />,
                  <span style={{ fontSize: 12, color: C.sub }}>{t.location ?? (t.resourceId ? `Resource #${t.resourceId}` : '—')}</span>,
                  <Badge label={t.status} />,
                  <span style={{ color: C.sub, fontSize: 12 }}>User #{t.createdByUserId}</span>,
                  assignedUser ? <span style={{ color: C.warning, fontSize: 12 }}>{`${assignedUser.name} (#${assignedUser.id})`}</span> : <span style={{ color: C.muted, fontSize: 12 }}>Unassigned</span>,
                  <span style={{ fontSize: 12, color: C.muted }}>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}</span>,
                  <Btn variant="ghost" onClick={() => openTicketDetail(t)} style={{ padding: '4px 12px', fontSize: 12 }}>Manage →</Btn>,
                ]
              })}
            />
          </div>
        )}

        {/* ── USERS ── */}
        {tab === 3 && (
          <div>
            <SectionHeader title="Registered Users" subtitle={`${users.length} users registered`} action={<Btn onClick={() => { setAddTechModal(true); setTechForm({ email: '', name: '' }) }}>+ Add Technician</Btn>} />
            <div style={{ background: C.surface, border: '1px solid var(--c-divider)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
              <Input type="text" placeholder="Search by name or email…" value={userFilter} onChange={e => setUserFilter(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredUsers.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: C.muted, background: C.surface, borderRadius: 12, border: '1px solid var(--c-divider)' }}>No users found</div>}
              {filteredUsers.map(u => (
                <div key={u.id} style={{ background: C.surface, border: '1px solid var(--c-divider)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(245,158,11,0.15)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--c-divider)')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: u.role === 'ADMIN' ? 'rgba(245,158,11,0.15)' : 'rgba(96,165,250,0.12)', border: `2px solid ${u.role === 'ADMIN' ? 'rgba(245,158,11,0.3)' : 'rgba(96,165,250,0.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: u.role === 'ADMIN' ? C.accent : C.blue }}>
                      {(u.name || u.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{u.name || u.email.split('@')[0]} <span style={{ color: C.muted, fontSize: 11, fontWeight: 500 }}>#{u.id}</span></div>
                      <div style={{ fontSize: 12, color: C.muted }}>{u.email}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 10, color: u.role === 'ADMIN' ? C.accent : C.blue, background: u.role === 'ADMIN' ? C.accentDim : 'rgba(96,165,250,0.1)', border: `1px solid ${u.role === 'ADMIN' ? 'rgba(245,158,11,0.3)' : 'rgba(96,165,250,0.25)'}`, borderRadius: 5, padding: '3px 9px', textTransform: 'uppercase', fontWeight: 700 }}>{u.role}</span>
                    <span style={{ fontSize: 11, color: C.muted }}>Joined {new Date(u.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        {tab === 4 && (
          <div>
            <SectionHeader title="Notifications" subtitle={`${unread} unread`} action={unread > 0 ? <Btn variant="ghost" onClick={markAllRead}>Mark all read</Btn> : undefined} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notifs.length === 0 && <div style={{ textAlign: 'center', padding: 60, color: C.muted, background: C.surface, borderRadius: 12, border: '1px solid var(--c-divider)' }}>No notifications yet</div>}
              {notifs.map(n => (
                <div key={n.id} style={{ background: n.readAt ? C.surface : `${C.accent}08`, border: `1px solid ${n.readAt ? 'var(--c-divider)' : `${C.accent}20`}`, borderLeft: `3px solid ${n.readAt ? 'transparent' : C.accent}`, borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: C.text, fontSize: 14, fontWeight: n.readAt ? 400 : 600 }}>{n.message}</div>
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{n.type.replace(/_/g, ' ')} · {new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                  {!n.readAt
                    ? <Btn variant="ghost" onClick={() => markRead(n.id)} style={{ padding: '4px 12px', fontSize: 12 }}>Mark read</Btn>
                    : <Badge label="Read" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {tab === 5 && (() => {
          const resolved = tickets.filter(t => (t.status === 'RESOLVED' || t.status === 'CLOSED') && t.createdAt && t.updatedAt)
          const toHours = (t: Ticket) => {
            const ms = new Date(t.updatedAt!).getTime() - new Date(t.createdAt!).getTime()
            return Math.max(0, Math.round(ms / 36000) / 100)
          }

          // By category
          const cats: TkCategory[] = ['ELECTRICAL', 'NETWORK', 'PROJECTOR', 'HVAC', 'FURNITURE', 'SECURITY', 'OTHER']
          const catData = cats.map(cat => {
            const group = resolved.filter(t => t.category === cat)
            const avg = group.length ? group.reduce((s, t) => s + toHours(t), 0) / group.length : 0
            return { name: cat.charAt(0) + cat.slice(1).toLowerCase(), avg: +avg.toFixed(1), count: group.length }
          }).filter(d => d.count > 0)

          // By priority
          const pris: TkPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
          const priColors = ['#34d399', '#fbbf24', '#fb923c', '#f87171']
          const priData = pris.map((p, i) => {
            const group = resolved.filter(t => t.priority === p)
            const avg = group.length ? group.reduce((s, t) => s + toHours(t), 0) / group.length : 0
            return { name: p, value: group.length, avg: +avg.toFixed(1), fill: priColors[i] }
          }).filter(d => d.value > 0)

          // Trend over last 30 days
          const now = Date.now()
          const trendMap: Record<string, number[]> = {}
          resolved.forEach(t => {
            const d = new Date(t.createdAt!)
            const daysAgo = Math.floor((now - d.getTime()) / 86400000)
            if (daysAgo < 30) {
              const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              if (!trendMap[label]) trendMap[label] = []
              trendMap[label].push(toHours(t))
            }
          })
          const trendData = Object.entries(trendMap).map(([date, hrs]) => ({
            date,
            avg: +(hrs.reduce((s, h) => s + h, 0) / hrs.length).toFixed(1),
            count: hrs.length,
          })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

          const allHours = resolved.map(toHours)
          const avgAll = allHours.length ? allHours.reduce((s, h) => s + h, 0) / allHours.length : 0
          const minH = allHours.length ? Math.min(...allHours) : 0
          const maxH = allHours.length ? Math.max(...allHours) : 0

          const statCardStyle: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 24px', flex: 1, minWidth: 140 }

          return (
            <div>
              <SectionHeader title="Analytics" subtitle="Ticket resolution performance" />

              {/* Summary stats */}
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
                <div style={statCardStyle}>
                  <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Resolved Tickets</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: C.success }}>{resolved.length}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>of {tickets.length} total</div>
                </div>
                <div style={statCardStyle}>
                  <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Avg Response Time</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: C.accent }}>{avgAll.toFixed(1)}h</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>from open to resolved</div>
                </div>
                <div style={statCardStyle}>
                  <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Fastest Resolution</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: C.blue }}>{minH.toFixed(1)}h</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>best case</div>
                </div>
                <div style={statCardStyle}>
                  <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Slowest Resolution</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: C.danger }}>{maxH.toFixed(1)}h</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>worst case</div>
                </div>
              </div>

              {resolved.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: C.muted, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  No resolved tickets yet — data will appear here once tickets are resolved or closed.
                </div>
              ) : (
                <>
                  {/* Avg response time by category */}
                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '22px 24px', marginBottom: 22 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>Avg. Resolution Time by Category</div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>Hours from ticket submission to resolution</div>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={catData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--c-divider)" />
                        <XAxis dataKey="name" tick={{ fill: C.sub, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: C.sub, fontSize: 11 }} axisLine={false} tickLine={false} unit="h" />
                        <Tooltip
                          contentStyle={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.text }}
                          labelStyle={{ color: C.accent, fontWeight: 600 }}
                          formatter={(v: number, n: string) => [`${v}h`, n === 'avg' ? 'Avg Time' : n]}
                        />
                        <Bar dataKey="avg" fill={C.accent} radius={[5, 5, 0, 0]} maxBarSize={48} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 22 }}>
                    {/* Resolution by priority pie */}
                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '22px 24px', flex: 1, minWidth: 260 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>Resolved by Priority</div>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>Distribution of resolved tickets</div>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={priData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={42} paddingAngle={3}>
                            {priData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          </Pie>
                          <Tooltip
                            contentStyle={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.text }}
                            formatter={(v: number, n: string) => [v, n]}
                          />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: C.sub }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Avg time by priority */}
                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '22px 24px', flex: 1, minWidth: 260 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>Avg. Time by Priority</div>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>Hours to resolve per priority level</div>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={priData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--c-divider)" />
                          <XAxis dataKey="name" tick={{ fill: C.sub, fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: C.sub, fontSize: 11 }} axisLine={false} tickLine={false} unit="h" />
                          <Tooltip
                            contentStyle={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.text }}
                            labelStyle={{ color: C.text, fontWeight: 600 }}
                            formatter={(v: number) => [`${v}h`, 'Avg Time']}
                          />
                          <Bar dataKey="avg" radius={[5, 5, 0, 0]} maxBarSize={48}>
                            {priData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Trend line */}
                  {trendData.length > 1 && (
                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '22px 24px' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>Response Time Trend (Last 30 Days)</div>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>Daily average resolution time</div>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={trendData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--c-divider)" />
                          <XAxis dataKey="date" tick={{ fill: C.sub, fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: C.sub, fontSize: 11 }} axisLine={false} tickLine={false} unit="h" />
                          <Tooltip
                            contentStyle={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.text }}
                            labelStyle={{ color: C.accent, fontWeight: 600 }}
                            formatter={(v: number, n: string) => [n === 'avg' ? `${v}h` : v, n === 'avg' ? 'Avg Time' : 'Tickets']}
                          />
                          <Line type="monotone" dataKey="avg" stroke={C.accent} strokeWidth={2} dot={{ fill: C.accent, r: 3 }} activeDot={{ r: 5 }} />
                          <Line type="monotone" dataKey="count" stroke={C.blue} strokeWidth={2} dot={{ fill: C.blue, r: 3 }} strokeDasharray="4 2" />
                          <Legend iconType="plainline" wrapperStyle={{ fontSize: 11, color: C.sub }} formatter={(v) => v === 'avg' ? 'Avg Time (h)' : 'Ticket Count'} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })()}

        {/* ── BOOKING ANALYSIS ── */}
        {tab === 6 && (() => {
          // Load fresh unfiltered bookings when this tab mounts
          const approved = allBookings.filter(b => b.status === 'APPROVED')
          const active   = allBookings.filter(b => b.status !== 'CANCELLED')

          // ── Top Resources ──────────────────────────────────────────────
          const resCountMap: Record<number, number> = {}
          active.forEach(b => { resCountMap[b.resourceId] = (resCountMap[b.resourceId] ?? 0) + 1 })
          const topResources = Object.entries(resCountMap)
            .map(([id, count]) => {
              const res = resources.find(r => r.id === Number(id))
              return { name: res ? res.name : `Resource #${id}`, count, type: res?.type ?? '' }
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 8)

          // ── Peak Booking Hours ─────────────────────────────────────────
          const hourMap: Record<number, number> = {}
          active.forEach(b => {
            const h = parseInt(b.startTime.split(':')[0], 10)
            if (!isNaN(h)) hourMap[h] = (hourMap[h] ?? 0) + 1
          })
          const peakHours = Array.from({ length: 24 }, (_, h) => ({
            hour: h < 12 ? `${h === 0 ? 12 : h} AM` : `${h === 12 ? 12 : h - 12} PM`,
            count: hourMap[h] ?? 0,
          })).filter(d => d.count > 0)

          // ── Status Distribution ────────────────────────────────────────
          const statusMap: Record<string, number> = {}
          allBookings.forEach(b => { statusMap[b.status] = (statusMap[b.status] ?? 0) + 1 })
          const statusDist = Object.entries(statusMap).map(([status, value]) => ({ status, value }))
          const statusPieColors: Record<string, string> = { APPROVED: C.success, PENDING: C.warning, REJECTED: C.danger, CANCELLED: C.muted }

          // ── Bookings by Day of Week ────────────────────────────────────
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          const dayMap: Record<number, number> = {}
          active.forEach(b => {
            const d = new Date(b.bookingDate).getDay()
            dayMap[d] = (dayMap[d] ?? 0) + 1
          })
          const dayData = days.map((name, i) => ({ name, count: dayMap[i] ?? 0 }))

          // ── Bookings by Resource Type ──────────────────────────────────
          const typeMap: Record<string, number> = {}
          active.forEach(b => {
            const res = resources.find(r => r.id === b.resourceId)
            const t = res?.type ?? 'UNKNOWN'
            typeMap[t] = (typeMap[t] ?? 0) + 1
          })
          const typeData = Object.entries(typeMap).map(([name, count]) => ({ name: name.replace(/_/g, ' '), count })).sort((a, b) => b.count - a.count)
          const typeColors = ['#818cf8', '#34d399', '#f59e0b', '#f87171', '#60a5fa']

          // ── Summary stats ─────────────────────────────────────────────
          const approvalRate = allBookings.length ? Math.round((approved.length / allBookings.length) * 100) : 0
          const topResource  = topResources[0]
          const busyHour     = peakHours.sort((a, b) => b.count - a.count)[0]

          const cardStyle: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 22px', flex: 1, minWidth: 130 }
          const panelStyle: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '22px 24px', marginBottom: 20 }

          return (
            <div>
              <SectionHeader title="Booking Analysis" subtitle="Resource utilization, demand patterns, and booking trends" />

              {allBookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: C.muted, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  No booking data yet — charts will appear once bookings are created.
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 22 }}>
                    <div style={cardStyle}>
                      <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Total Bookings</div>
                      <div style={{ fontSize: 30, fontWeight: 700, color: C.accent }}>{allBookings.length}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{approved.length} approved</div>
                    </div>
                    <div style={cardStyle}>
                      <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Approval Rate</div>
                      <div style={{ fontSize: 30, fontWeight: 700, color: C.success }}>{approvalRate}%</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>of all requests</div>
                    </div>
                    <div style={cardStyle}>
                      <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Most Booked</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.blue, marginTop: 4, lineHeight: 1.3 }}>{topResource?.name ?? '—'}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{topResource?.count ?? 0} bookings</div>
                    </div>
                    <div style={cardStyle}>
                      <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Peak Hour</div>
                      <div style={{ fontSize: 30, fontWeight: 700, color: C.warning }}>{busyHour?.hour ?? '—'}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{busyHour?.count ?? 0} bookings</div>
                    </div>
                  </div>

                  {/* Top Resources */}
                  <div style={panelStyle}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>Top Resources by Demand</div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>Number of booking requests per resource (excluding cancelled)</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={topResources} margin={{ top: 0, right: 10, left: -10, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--c-divider)" />
                        <XAxis dataKey="name" tick={{ fill: C.sub, fontSize: 10 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" interval={0} />
                        <YAxis tick={{ fill: C.sub, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.text }} labelStyle={{ color: C.accent, fontWeight: 600 }} formatter={(v: number) => [v, 'Bookings']} />
                        <Bar dataKey="count" fill={C.accent} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Peak Hours + Status side-by-side */}
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
                    <div style={{ ...panelStyle, flex: 2, minWidth: 280, marginBottom: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>Peak Booking Hours</div>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>Distribution of booking start times throughout the day</div>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={peakHours} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--c-divider)" />
                          <XAxis dataKey="hour" tick={{ fill: C.sub, fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: C.sub, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip contentStyle={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.text }} labelStyle={{ color: C.blue, fontWeight: 600 }} formatter={(v: number) => [v, 'Bookings']} />
                          <Bar dataKey="count" fill={C.blue} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={{ ...panelStyle, flex: 1, minWidth: 220, marginBottom: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>Status Breakdown</div>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>All bookings by current status</div>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={statusDist} dataKey="value" nameKey="status" cx="50%" cy="50%" outerRadius={72} innerRadius={38} paddingAngle={3}>
                            {statusDist.map((entry, i) => <Cell key={i} fill={statusPieColors[entry.status] ?? C.blue} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.text }} formatter={(v: number, _: string, p: { payload?: { status?: string } }) => [v, p.payload?.status ?? '']} />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: C.sub }} formatter={(v) => v} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Day of Week + Resource Type side-by-side */}
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{ ...panelStyle, flex: 1, minWidth: 260, marginBottom: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>Bookings by Day of Week</div>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>Which days see the most demand</div>
                      <ResponsiveContainer width="100%" height={190}>
                        <BarChart data={dayData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--c-divider)" />
                          <XAxis dataKey="name" tick={{ fill: C.sub, fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: C.sub, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip contentStyle={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.text }} labelStyle={{ color: C.success, fontWeight: 600 }} formatter={(v: number) => [v, 'Bookings']} />
                          <Bar dataKey="count" fill={C.success} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={{ ...panelStyle, flex: 1, minWidth: 260, marginBottom: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>Bookings by Resource Type</div>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>Demand distribution across facility categories</div>
                      <ResponsiveContainer width="100%" height={190}>
                        <BarChart data={typeData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--c-divider)" horizontal={false} />
                          <XAxis type="number" tick={{ fill: C.sub, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <YAxis type="category" dataKey="name" tick={{ fill: C.sub, fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                          <Tooltip contentStyle={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.text }} formatter={(v: number) => [v, 'Bookings']} />
                          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                            {typeData.map((_, i) => <Cell key={i} fill={typeColors[i % typeColors.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })()}

      </div>

      {/* ── MODALS ── */}

      {/* Create / Edit Resource */}
      <Modal title={resModal.mode === 'create' ? 'Add Resource' : 'Edit Resource'} open={resModal.open} onClose={() => { setResModal(m => ({ ...m, open: false })); setResImage(null); setResImagePreview('') }} width={580}>
        {/* Image upload area */}
        <Field label="Cover Image">
          <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '2px dashed rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.04)', cursor: 'pointer', marginBottom: 4 }}>
            <input type="file" accept="image/*" onChange={e => {
              const f = e.target.files?.[0] ?? null
              setResImage(f)
              if (f) { const url = URL.createObjectURL(f); setResImagePreview(url) }
              else setResImagePreview('')
            }} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 2 }} />
            {resImagePreview
              ? <div style={{ position: 'relative' }}>
                  <img src={resImagePreview} alt="preview" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Click to change image</span>
                  </div>
                </div>
              : <div style={{ height: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ fontSize: 28 }}>🖼️</span>
                  <span style={{ fontSize: 12, color: C.muted }}>Click to upload a cover image</span>
                  <span style={{ fontSize: 11, color: '#2d3748' }}>PNG, JPG, WEBP — max 5MB</span>
                </div>
            }
          </div>
          {resImage && <span style={{ fontSize: 11, color: C.success }}>✓ {resImage.name}</span>}
          {!resImage && resModal.data.imageUrl && <span style={{ fontSize: 11, color: C.muted }}>Current image will be kept</span>}
        </Field>

        <Field label="Resource Name"><Input value={resModal.data.name ?? ''} onChange={e => setResModal(m => ({ ...m, data: { ...m.data, name: e.target.value } }))} placeholder="e.g. Lecture Hall A" /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Type">
            <Select value={resModal.data.type ?? 'LECTURE_HALL'} onChange={e => setResModal(m => ({ ...m, data: { ...m.data, type: e.target.value as ResType } }))}>
              {(['LECTURE_HALL', 'LAB', 'MEETING_ROOM', 'EQUIPMENT'] as ResType[]).map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </Select>
          </Field>
          <Field label="Capacity"><Input type="number" min={1} value={resModal.data.capacity ?? ''} onChange={e => setResModal(m => ({ ...m, data: { ...m.data, capacity: Number(e.target.value) } }))} /></Field>
          <Field label="Availability Start"><Input type="time" value={resModal.data.availabilityStart ?? ''} onChange={e => setResModal(m => ({ ...m, data: { ...m.data, availabilityStart: e.target.value || undefined } }))} /></Field>
          <Field label="Availability End"><Input type="time" value={resModal.data.availabilityEnd ?? ''} onChange={e => setResModal(m => ({ ...m, data: { ...m.data, availabilityEnd: e.target.value || undefined } }))} /></Field>
        </div>
        <Field label="Location"><Input value={resModal.data.location ?? ''} onChange={e => setResModal(m => ({ ...m, data: { ...m.data, location: e.target.value } }))} placeholder="Block A, Floor 2" /></Field>
        <Field label="Status">
          <Select value={resModal.data.status ?? 'ACTIVE'} onChange={e => setResModal(m => ({ ...m, data: { ...m.data, status: e.target.value as ResStatus } }))}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="OUT_OF_SERVICE">OUT OF SERVICE</option>
          </Select>
        </Field>
        <Field label="Description (optional)"><Textarea value={resModal.data.description ?? ''} onChange={e => setResModal(m => ({ ...m, data: { ...m.data, description: e.target.value } }))} placeholder="Brief description…" /></Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => { setResModal(m => ({ ...m, open: false })); setResImage(null); setResImagePreview('') }}>Cancel</Btn>
          <Btn onClick={saveResource} disabled={busy}>{resModal.mode === 'create' ? 'Create Resource' : 'Save Changes'}</Btn>
        </div>
      </Modal>

      {/* Approve / Reject Booking */}
      <Modal title={decisionModal.approve ? '✓ Approve Booking' : '✕ Reject Booking'} open={decisionModal.open} onClose={() => setDecisionModal(m => ({ ...m, open: false }))}>
        {decisionModal.booking && (
          <div style={{ background: 'var(--c-faint)', border: '1px solid var(--c-border)', borderRadius: 9, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
            <div style={{ color: C.muted, marginBottom: 4 }}>Booking <strong style={{ color: C.text }}>#{decisionModal.booking.id}</strong></div>
            <div style={{ color: C.text }}>Resource #{decisionModal.booking.resourceId} · {decisionModal.booking.bookingDate}</div>
            <div style={{ color: C.muted, marginTop: 2 }}>{decisionModal.booking.startTime} – {decisionModal.booking.endTime}</div>
            <div style={{ color: C.text, marginTop: 4, fontStyle: 'italic' }}>{decisionModal.booking.purpose}</div>
          </div>
        )}
        <Field label={decisionModal.approve ? 'Note (optional)' : 'Rejection Reason *'}>
          <Textarea value={decisionReason} onChange={e => setDecisionReason(e.target.value)} placeholder={decisionModal.approve ? 'Optional message for the user…' : 'Explain why this booking is rejected…'} />
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => setDecisionModal(m => ({ ...m, open: false }))}>Cancel</Btn>
          <Btn variant={decisionModal.approve ? 'success' : 'danger'} onClick={submitDecision} disabled={busy}>
            {decisionModal.approve ? 'Confirm Approval' : 'Confirm Rejection'}
          </Btn>
        </div>
      </Modal>

      {/* Add Technician */}
      <Modal title="Add Technician" open={addTechModal} onClose={() => setAddTechModal(false)} width={520}>
        <Field label="Technician Email"><Input value={techForm.email} onChange={e => setTechForm(f => ({ ...f, email: e.target.value }))} placeholder="technician@example.com" /></Field>
        <Field label="Technician Name (optional)"><Input value={techForm.name} onChange={e => setTechForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" /></Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => setAddTechModal(false)}>Cancel</Btn>
          <Btn onClick={createTechnician} disabled={busy}>Save Technician</Btn>
        </div>
      </Modal>

      {/* Ticket Management */}
      <Modal title={`Ticket #${tkDetail?.id ?? ''} — Admin View`} open={tkDetailOpen} onClose={() => setTkDetailOpen(false)} width={680}>
        {tkDetail && (
          <div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <Badge label={tkDetail.status} /><Badge label={tkDetail.priority} /><Badge label={tkDetail.category} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', marginBottom: 14, fontSize: 13 }}>
              <div><span style={{ color: C.muted, fontSize: 11 }}>Reporter: </span><span style={{ color: C.text }}>User #{tkDetail.createdByUserId}</span></div>
              <div><span style={{ color: C.muted, fontSize: 11 }}>Assigned: </span><span style={{ color: C.text }}>{tkDetail.assignedToUserId ? `${users.find(u => u.id === tkDetail.assignedToUserId)?.name ?? `User #${tkDetail.assignedToUserId}`}` : 'Unassigned'}</span></div>
              <div><span style={{ color: C.muted, fontSize: 11 }}>Contact: </span><span style={{ color: C.text }}>{tkDetail.preferredContact}</span></div>
              <div><span style={{ color: C.muted, fontSize: 11 }}>Location: </span><span style={{ color: C.text }}>{tkDetail.location ?? (tkDetail.resourceId ? `Resource #${tkDetail.resourceId}` : '—')}</span></div>
            </div>
            <div style={{ background: 'var(--c-faint)', borderRadius: 9, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: C.text, lineHeight: 1.6, border: '1px solid var(--c-divider)' }}>{tkDetail.description}</div>

            {(tkDetail.attachments ?? []).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Evidence / Attachments</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(tkDetail.attachments ?? []).map(a => (
                    <a key={a.id} href={`${API}${a.downloadUrl}`} target="_blank" rel="noreferrer" style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 6, padding: '5px 12px', color: C.blue, fontSize: 12, textDecoration: 'none' }}>📎 {a.originalFileName}</a>
                  ))}
                </div>
              </div>
            )}

            {/* Admin controls */}
            <div style={{ background: `${C.accent}08`, border: `1px solid ${C.accent}20`, borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 14 }}>Update Ticket</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Status">
                  <Select value={tkStatusForm.status} onChange={e => setTkStatusForm(f => ({ ...f, status: e.target.value as TkStatus }))}>
                    {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'] as TkStatus[]).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </Select>
                </Field>
                <Field label="Assign To Technician">
                  <Select value={tkStatusForm.assignedToUserId} onChange={e => setTkStatusForm(f => ({ ...f, assignedToUserId: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {technicians.map(t => (
                      <option key={t.id} value={String(t.id)}>{`#${t.id} — ${t.name} (${t.email})`}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              {tkStatusForm.status === 'REJECTED' && <Field label="Rejection Reason *"><Textarea value={tkStatusForm.rejectionReason} onChange={e => setTkStatusForm(f => ({ ...f, rejectionReason: e.target.value }))} placeholder="Explain the rejection…" /></Field>}
              {(tkStatusForm.status === 'RESOLVED' || tkStatusForm.status === 'CLOSED') && <Field label="Resolution Notes *"><Textarea value={tkStatusForm.resolutionNotes} onChange={e => setTkStatusForm(f => ({ ...f, resolutionNotes: e.target.value }))} placeholder="Describe how the issue was resolved…" /></Field>}
              <Btn onClick={updateTicketStatus} disabled={busy}>Save Changes</Btn>
            </div>

            {/* Comments */}
            <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: 16 }}>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>Comments ({(tkDetail.comments ?? []).length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {(tkDetail.comments ?? []).length === 0 && <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: 12 }}>No comments yet</div>}
                {(tkDetail.comments ?? []).map(c => (
                  <div key={c.id} style={{ background: 'var(--c-faint)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--c-divider)' }}>
                    <div style={{ fontSize: 13, color: C.text, marginBottom: 6, lineHeight: 1.5 }}>{c.body}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: C.muted }}>User #{c.authorUserId} · {new Date(c.createdAt).toLocaleString()}</span>
                      <Btn variant="danger" onClick={() => deleteComment(c.id)} style={{ fontSize: 11, padding: '2px 8px' }}>Delete</Btn>
                    </div>
                  </div>
                ))}
              </div>
              <Field label="Add a comment"><Textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a note for the reporter…" /></Field>
              <Btn onClick={addComment} disabled={busy || !newComment.trim()} variant="ghost">Post Comment</Btn>
            </div>
          </div>
        )}
      </Modal>
      </div>
    </div>
  )
}
