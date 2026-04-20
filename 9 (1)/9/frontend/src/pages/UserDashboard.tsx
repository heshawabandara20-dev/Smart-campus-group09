import React, { useCallback, useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081'

const get  = (path: string) => fetch(`${API}${path}`, { credentials: 'include' })
const del  = (path: string) => fetch(`${API}${path}`, { method: 'DELETE', credentials: 'include' })
const post = (path: string, body: unknown) =>
  fetch(`${API}${path}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const put  = (path: string, body?: unknown) =>
  fetch(`${API}${path}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })

// ── Types ──────────────────────────────────────────────────────────────────
type ResType    = 'LECTURE_HALL' | 'LAB' | 'MEETING_ROOM' | 'EQUIPMENT'
type ResStatus  = 'ACTIVE' | 'OUT_OF_SERVICE'
interface Resource { id: number; name: string; type: ResType; capacity: number; location: string; status: ResStatus; description?: string; availabilityStart?: string; availabilityEnd?: string; imageUrl?: string }
type BkStatus   = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
interface Booking { id: number; resourceId: number; bookingDate: string; startTime: string; endTime: string; purpose: string; status: BkStatus; adminDecisionReason?: string }
type TkStatus   = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REJECTED'
type TkPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
type TkCategory = 'ELECTRICAL' | 'NETWORK' | 'PROJECTOR' | 'HVAC' | 'FURNITURE' | 'SECURITY' | 'OTHER'
interface Ticket { id: number; resourceId?: number; location?: string; category: TkCategory; priority: TkPriority; description: string; status: TkStatus; preferredContact: string; createdByUserId: number; assignedToUserId?: number; rejectionReason?: string; resolutionNotes?: string; createdAt?: string; comments?: Comment[]; attachments?: Attachment[] }
interface Comment    { id: number; authorUserId: number; body: string; createdAt: string; updatedAt?: string }
interface Attachment { id: number; downloadUrl: string; originalFileName: string; contentType: string }
interface Notif      { id: number; message: string; type: string; readAt?: string; createdAt: string }

const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) }

// ── Design tokens — indigo theme ────────────────────────────────────────────
const USER_DARK = {
  '--c-bg':          '#07080c',
  '--c-surface':     '#0e1018',
  '--c-surface-alt': '#13151e',
  '--c-border':      'var(--c-border)',
  '--c-divider':     'var(--c-divider)',
  '--c-faint':       'var(--c-faint)',
  '--c-text':        '#e2e8f0',
  '--c-sub':         '#94a3b8',
  '--c-muted':       '#475569',
}
const USER_LIGHT = {
  '--c-bg':          '#f8fafc',
  '--c-surface':     '#ffffff',
  '--c-surface-alt': '#f1f5f9',
  '--c-border':      'rgba(0,0,0,0.09)',
  '--c-divider':     'rgba(0,0,0,0.07)',
  '--c-faint':       'rgba(0,0,0,0.04)',
  '--c-text':        '#1e293b',
  '--c-sub':         '#334155',
  '--c-muted':       '#94a3b8',
}

const C = {
  bg:        'var(--c-bg)',
  surface:   'var(--c-surface)',
  surfaceAlt:'var(--c-surface-alt)',
  border:    'var(--c-border)',
  divider:   'var(--c-divider)',
  faint:     'var(--c-faint)',
  accent:    '#818cf8',
  accentDim: 'rgba(129,140,248,0.1)',
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
  OPEN: C.accent, IN_PROGRESS: C.warning, RESOLVED: C.success, CLOSED: '#94a3b8',
  LOW: C.success, MEDIUM: C.warning, HIGH: '#fb923c', CRITICAL: C.danger,
}

// ── Shared UI ──────────────────────────────────────────────────────────────
const Badge = ({ label }: { label: string }) => {
  const color = statusColor[label] ?? C.accent
  return <span style={{ background: `${color}18`, color, border: `1px solid ${color}30`, borderRadius: 5, padding: '3px 9px', fontSize: 11, fontWeight: 700, letterSpacing: '0.3px', whiteSpace: 'nowrap', display: 'inline-block' }}>{label}</span>
}

const Btn = ({ children, variant = 'primary', onClick, disabled, style }: { children: React.ReactNode; variant?: 'primary' | 'danger' | 'ghost' | 'success'; onClick?: () => void; disabled?: boolean; style?: React.CSSProperties }) => {
  const v = {
    primary: { bg: C.accent,   color: '#0e1018', border: C.accent },
    danger:  { bg: C.danger,   color: '#fff',     border: C.danger },
    ghost:   { bg: 'transparent', color: C.sub,  border: 'rgba(255,255,255,0.1)' },
    success: { bg: C.success,  color: '#0e1018', border: C.success },
  }[variant]
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: v.bg, color: v.color, border: `1px solid ${v.border}`, borderRadius: 7, padding: '7px 15px', fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, transition: 'opacity 0.15s, transform 0.15s', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6, ...style }}>
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
const Modal = ({ title, open, onClose, children, width = 520 }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode; width?: number }) => {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }} />
      <div style={{ background: C.surface, border: '1px solid rgba(129,140,248,0.15)', borderRadius: 14, padding: 28, width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto', position: 'relative', zIndex: 1, boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, paddingBottom: 16, borderBottom: '1px solid var(--c-divider)' }}>
          <h3 style={{ margin: 0, color: C.text, fontSize: 16, fontWeight: 700 }}>{title}</h3>
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
        <tr style={{ background: 'rgba(129,140,248,0.04)' }}>
          {cols.map(c => <th key={c} style={{ padding: '11px 16px', textAlign: 'left', color: C.muted, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.7px', whiteSpace: 'nowrap', borderBottom: '1px solid var(--c-border)' }}>{c}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0
          ? <tr><td colSpan={cols.length} style={{ padding: 48, textAlign: 'center', color: C.muted }}>No records found</td></tr>
          : rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--c-faint)', transition: 'background 0.12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(129,140,248,0.04)')}
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
const InfoBox = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div style={{ marginBottom: 9 }}>
    <span style={{ color: C.muted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}: </span>
    <span style={{ color: C.text, fontSize: 13 }}>{value}</span>
  </div>
)

// ── QR Code canvas component ───────────────────────────────────────────────
const QRCanvas = ({ value, size = 200 }: { value: string; size?: number }) => {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (ref.current) {
      QRCode.toCanvas(ref.current, value, {
        width: size,
        margin: 2,
        color: { dark: '#0e1018', light: '#ffffff' },
      })
    }
  }, [value, size])
  return <canvas ref={ref} style={{ borderRadius: 8, display: 'block' }} />
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function UserDashboard() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState(0)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifPopupOpen, setNotifPopupOpen] = useState(false)
  const [notifEnabled, setNotifEnabled] = useState(() => localStorage.getItem('notifEnabled') !== 'false')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') !== 'false')
  const profileRef = useRef<HTMLDivElement>(null)
  const notifRef   = useRef<HTMLDivElement>(null)
  const toggleNotif    = () => { const next = !notifEnabled; setNotifEnabled(next); localStorage.setItem('notifEnabled', String(next)) }
  const toggleDarkMode = () => { const next = !darkMode;    setDarkMode(next);    localStorage.setItem('darkMode',    String(next)) }
  const themeVars = darkMode ? USER_DARK : USER_LIGHT

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  const [resources, setResources]   = useState<Resource[]>([])
  const [resFilter, setResFilter]   = useState({ type: '', location: '', minCapacity: '', status: '' })
  const [bookings, setBookings]     = useState<Booking[]>([])
  const [bkFilter, setBkFilter]     = useState('')
  const [bkModal, setBkModal]       = useState(false)
  const [bkForm, setBkForm]         = useState({ resourceId: '', bookingDate: tomorrow(), startTime: '09:00', endTime: '10:00', purpose: '', attendees: '' })
  const [tickets, setTickets]       = useState<Ticket[]>([])
  const [tkModal, setTkModal]       = useState(false)
  const [tkForm, setTkForm]         = useState({ resourceId: '', location: '', category: 'OTHER' as TkCategory, priority: 'MEDIUM' as TkPriority, description: '', preferredContact: user?.email ?? '', images: [] as File[] })
  const [tkDetail, setTkDetail]     = useState<Ticket | null>(null)
  const [tkDetailOpen, setTkDetailOpen] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [editCommentId, setEditCommentId]   = useState<number | null>(null)
  const [editCommentBody, setEditCommentBody] = useState('')
  const [notifs, setNotifs]         = useState<Notif[]>([])
  const unread = notifs.filter(n => !n.readAt).length
  const [qrBooking, setQrBooking]   = useState<Booking | null>(null)

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
    const r = await get('/api/bookings/my')
    if (r.ok) setBookings(await r.json())
  }, [])

  const loadTickets = useCallback(async () => {
    const r = await get('/api/tickets/my')
    if (r.ok) setTickets(await r.json())
  }, [])

  const loadNotifs = useCallback(async () => {
    const r = await get('/api/notifications/my')
    if (r.ok) setNotifs(await r.json())
  }, [])

  useEffect(() => {
    setBusy(true)
    Promise.all([loadResources(), loadBookings(), loadTickets(), loadNotifs()]).finally(() => setBusy(false))
  }, [])

  useEffect(() => {
    if (user?.email) setTkForm(f => ({ ...f, preferredContact: f.preferredContact || user.email }))
  }, [user])

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setNotifPopupOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const submitBooking = async () => {
    if (!bkForm.resourceId || !bkForm.purpose.trim()) { showToast('Resource ID and purpose are required', false); return }
    setBusy(true)
    const r = await post('/api/bookings', { resourceId: Number(bkForm.resourceId), bookingDate: bkForm.bookingDate, startTime: bkForm.startTime + ':00', endTime: bkForm.endTime + ':00', purpose: bkForm.purpose, attendees: bkForm.attendees ? Number(bkForm.attendees) : undefined })
    setBusy(false)
    if (r.ok) { showToast('Booking submitted!'); setBkModal(false); setBkForm(f => ({ ...f, purpose: '', attendees: '', resourceId: '' })); await loadBookings() }
    else { const e = await r.json().catch(() => ({})); showToast(e.message ?? 'Booking failed', false) }
  }

  const cancelBooking = async (id: number) => {
    if (!confirm('Cancel this booking?')) return
    setBusy(true)
    const r = await del(`/api/bookings/${id}`)
    setBusy(false)
    if (r.ok) { showToast('Booking cancelled'); await loadBookings() }
    else showToast('Cancel failed', false)
  }

  const submitTicket = async () => {
    if (!tkForm.description.trim()) { showToast('Description is required', false); return }
    if (!tkForm.resourceId && !tkForm.location.trim()) { showToast('Provide a resource ID or location', false); return }
    const fd = new FormData()
    fd.append('category', tkForm.category); fd.append('priority', tkForm.priority)
    fd.append('description', tkForm.description); fd.append('preferredContact', tkForm.preferredContact || (user?.email ?? ''))
    if (tkForm.resourceId) fd.append('resourceId', tkForm.resourceId)
    if (tkForm.location.trim()) fd.append('location', tkForm.location)
    tkForm.images.slice(0, 3).forEach(f => fd.append('images', f))
    setBusy(true)
    const r = await fetch(`${API}/api/tickets`, { method: 'POST', credentials: 'include', body: fd })
    setBusy(false)
    if (r.ok) { showToast('Ticket submitted!'); setTkModal(false); setTkForm(f => ({ ...f, description: '', images: [], resourceId: '', location: '' })); await loadTickets() }
    else { const e = await r.json().catch(() => ({})); showToast(e.message ?? 'Ticket failed', false) }
  }

  const openTicketDetail = async (t: Ticket) => {
    setBusy(true)
    const r = await get(`/api/tickets/${t.id}`)
    setBusy(false)
    if (r.ok) { setTkDetail(await r.json()); setTkDetailOpen(true); setNewComment(''); setEditCommentId(null) }
    else showToast('Failed to load ticket', false)
  }

  const addComment = async () => {
    if (!tkDetail || !newComment.trim()) return
    setBusy(true)
    const r = await post(`/api/tickets/${tkDetail.id}/comments`, { body: newComment })
    setBusy(false)
    if (r.ok) { showToast('Comment added'); setNewComment(''); await openTicketDetail(tkDetail) }
    else showToast('Comment failed', false)
  }

  const saveEditComment = async (commentId: number) => {
    if (!tkDetail) return
    setBusy(true)
    const r = await put(`/api/tickets/${tkDetail.id}/comments/${commentId}`, { body: editCommentBody })
    setBusy(false)
    if (r.ok) { showToast('Comment updated'); setEditCommentId(null); await openTicketDetail(tkDetail) }
    else showToast('Update failed', false)
  }

  const deleteComment = async (commentId: number) => {
    if (!tkDetail || !confirm('Delete this comment?')) return
    setBusy(true)
    const r = await del(`/api/tickets/${tkDetail.id}/comments/${commentId}`)
    setBusy(false)
    if (r.ok) { showToast('Comment deleted'); await openTicketDetail(tkDetail) }
    else showToast('Delete failed', false)
  }

  const markRead = async (id: number) => { const r = await put(`/api/notifications/${id}/read`); if (r.ok) await loadNotifs() }
  const markAllRead = async () => { const r = await put('/api/notifications/read-all'); if (r.ok) await loadNotifs() }

  const filteredBookings = bkFilter ? bookings.filter(b => b.status === bkFilter) : bookings

  // ── Render ────────────────────────────────────────────────────────────────
  const navItems = [
    { label: 'Resources',    icon: '🏛️', count: resources.length },
    { label: 'My Bookings',  icon: '📅', count: bookings.length },
    { label: 'My Tickets',   icon: '🎫', count: tickets.length },
    { label: 'Notifications',icon: notifEnabled ? '🔔' : '🔕', count: notifEnabled ? unread : 0 },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, fontFamily: "'Inter', system-ui, sans-serif", color: C.text, ...themeVars } as React.CSSProperties}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.ok ? 'rgba(16,68,43,0.95)' : 'rgba(80,20,20,0.95)', border: `1px solid ${toast.ok ? '#34d39933' : '#f8717133'}`, color: toast.ok ? C.success : C.danger, borderRadius: 10, padding: '12px 18px', fontSize: 13, fontWeight: 600, boxShadow: '0 12px 40px rgba(0,0,0,0.6)', maxWidth: 340, display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.ok ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* ── Sidebar ── */}
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
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, rgba(129,140,248,0.25), rgba(165,180,252,0.1))', border: '1px solid rgba(129,140,248,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>🎓</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.3px' }}>SmartCampus</div>
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Student Portal</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 10px', overflowY: 'auto' }}>
          <div style={{ fontSize: 9, color: '#2d3748', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', padding: '0 10px', marginBottom: 10 }}>Menu</div>
          {navItems.map((item, i) => (
            <button key={i} onClick={() => setTab(i)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, background: tab === i ? 'rgba(129,140,248,0.12)' : 'transparent', border: `1px solid ${tab === i ? 'rgba(129,140,248,0.2)' : 'transparent'}`, color: tab === i ? '#a5b4fc' : C.sub, fontSize: 13, fontWeight: tab === i ? 600 : 400, cursor: 'pointer', marginBottom: 3, textAlign: 'left', transition: 'all 0.15s' }}>
              <span style={{ fontSize: 15, opacity: tab === i ? 1 : 0.6 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.count > 0 && i === 3 && (
                <span style={{ background: C.danger, color: '#fff', borderRadius: 20, padding: '1px 6px', fontSize: 10, fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{item.count > 99 ? '99+' : item.count}</span>
              )}
              {tab === i && <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.accent, flexShrink: 0 }} />}
            </button>
          ))}
        </nav>

        {/* Dark / Light toggle */}
        <div style={{ padding: '0 10px 6px' }}>
          <button onClick={toggleDarkMode} title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: darkMode ? 'var(--c-faint)' : C.accentDim, border: `1px solid ${darkMode ? 'var(--c-divider)' : C.accent + '30'}`, color: darkMode ? C.sub : C.accent, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', marginBottom: 6 }}>
            <span style={{ fontSize: 15 }}>{darkMode ? '☀️' : '🌙'}</span>
            <span style={{ flex: 1, textAlign: 'left' }}>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>

        {/* Notif popup */}
        <div ref={notifRef} style={{ padding: '0 10px 6px', position: 'relative' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onMouseEnter={() => notifEnabled && setNotifPopupOpen(true)}
              onMouseLeave={() => setNotifPopupOpen(false)}
              onClick={() => setTab(3)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'transparent', border: '1px solid var(--c-divider)', color: notifEnabled ? C.muted : C.muted, fontSize: 12, cursor: 'pointer', opacity: notifEnabled ? 1 : 0.45, transition: 'all 0.15s' }}>
              <span>{notifEnabled ? '🔔' : '🔕'}</span>
              <span style={{ flex: 1, textAlign: 'left' }}>{notifEnabled ? 'Quick Notifications' : 'Notifications Off'}</span>
              {notifEnabled && unread > 0 && <span style={{ background: C.danger, color: '#fff', borderRadius: 20, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{unread}</span>}
            </button>
            <button onClick={toggleNotif} title={notifEnabled ? 'Mute notifications' : 'Unmute notifications'}
              style={{ flexShrink: 0, padding: '8px 10px', borderRadius: 8, background: notifEnabled ? 'transparent' : 'rgba(129,140,248,0.1)', border: `1px solid ${notifEnabled ? 'var(--c-divider)' : 'rgba(129,140,248,0.25)'}`, color: notifEnabled ? C.muted : C.accent, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
              {notifEnabled ? '🔕' : '🔔'}
            </button>
          </div>
          {notifEnabled && notifPopupOpen && (
            <div onMouseEnter={() => setNotifPopupOpen(true)} onMouseLeave={() => setNotifPopupOpen(false)}
              style={{ position: 'absolute', bottom: '100%', left: 10, right: 10, marginBottom: 6, background: C.surface, border: '1px solid rgba(129,140,248,0.15)', borderRadius: 10, maxHeight: 320, overflowY: 'auto', zIndex: 100, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
              <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--c-divider)', fontSize: 12, fontWeight: 600, color: C.text }}>Unread ({unread})</div>
              {notifs.filter(n => !n.readAt).length === 0
                ? <div style={{ padding: '20px 14px', textAlign: 'center', color: C.muted, fontSize: 12 }}>All caught up!</div>
                : notifs.filter(n => !n.readAt).slice(0, 5).map(n => (
                  <div key={n.id} onClick={() => { setTab(3); setNotifPopupOpen(false) }} style={{ padding: '10px 14px', borderBottom: '1px solid var(--c-faint)', cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(129,140,248,0.06)')}
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
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(129,140,248,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--c-divider)')}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(129,140,248,0.25), rgba(165,180,252,0.1))', border: '1px solid rgba(129,140,248,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#a5b4fc', flexShrink: 0 }}>
              {(user?.name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || user?.email?.split('@')[0]}</div>
              <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{user?.role}</div>
            </div>
            <span style={{ fontSize: 9, color: C.muted, transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
          </div>

          {profileOpen && (
            <div style={{ background: C.surfaceAlt, border: '1px solid rgba(129,140,248,0.12)', borderRadius: 8, padding: '10px 12px', marginBottom: 8, fontSize: 12 }}>
              <div style={{ color: C.sub, marginBottom: 4, wordBreak: 'break-all' }}>{user?.email}</div>
              <span style={{ display: 'inline-block', fontSize: 10, color: C.accent, background: C.accentDim, border: `1px solid ${C.accent}30`, borderRadius: 4, padding: '2px 8px', textTransform: 'uppercase', fontWeight: 700 }}>{user?.role}</span>
            </div>
          )}

          <button onClick={logout} style={{ width: '100%', background: 'none', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 7, color: C.danger, fontSize: 12, padding: '8px 12px', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.07)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.15)' }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ 
        flex: 1, 
        marginLeft: 240, 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh'
      } as React.CSSProperties}>

        {/* Content */}
        <div style={{ 
          flex: 1, 
          padding: '24px 28px', 
          width: '100%',
          overflowY: 'auto',
          boxSizing: 'border-box'
        } as React.CSSProperties}>

          {/* ── RESOURCES ── */}
          {tab === 0 && (
            <div>
              <SectionHeader title="Facilities & Assets" subtitle="Browse available campus resources and book them" />
              <div style={{ background: C.surface, border: '1px solid var(--c-divider)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 12 }}>Filter</div>
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
                <div style={{ textAlign: 'center', padding: 60, color: C.muted, background: C.surface, borderRadius: 12, border: '1px solid var(--c-divider)' }}>No resources found. Try adjusting filters.</div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
                {resources.map(r => {
                  const typeIcon: Record<string, string> = { LECTURE_HALL: '🏛️', LAB: '🔬', MEETING_ROOM: '🤝', EQUIPMENT: '⚙️' }
                  const isActive = r.status === 'ACTIVE'
                  return (
                    <div key={r.id} style={{ background: C.surface, border: `1px solid ${isActive ? 'var(--c-border)' : 'rgba(248,113,113,0.12)'}`, borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'border-color 0.2s, transform 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(129,140,248,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = isActive ? 'var(--c-border)' : 'rgba(248,113,113,0.12)'; e.currentTarget.style.transform = 'translateY(0)' }}>

                      {/* Image / Placeholder */}
                      <div style={{ position: 'relative', height: 160, background: r.imageUrl ? 'transparent' : 'linear-gradient(135deg, rgba(129,140,248,0.08), rgba(165,180,252,0.03))', overflow: 'hidden', flexShrink: 0 }}>
                        {r.imageUrl
                          ? <img src={r.imageUrl.startsWith('http') || r.imageUrl.startsWith('data:') ? r.imageUrl : `${API}${r.imageUrl}`} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52, opacity: 0.4 }}>{typeIcon[r.type] ?? '🏢'}</div>
                        }
                        <div style={{ position: 'absolute', top: 10, right: 10 }}><Badge label={r.status} /></div>
                        <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', borderRadius: 5, padding: '2px 8px', fontSize: 10, fontFamily: 'monospace', color: C.muted }}>#{r.id}</div>
                      </div>

                      {/* Body */}
                      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div>
                          <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: C.text }}>{r.name}</h3>
                          <span style={{ fontSize: 11, color: C.accent, background: C.accentDim, border: `1px solid ${C.accent}25`, borderRadius: 5, padding: '2px 8px', fontWeight: 600 }}>{r.type.replace(/_/g, ' ')}</span>
                        </div>

                        {r.description && <p style={{ margin: 0, fontSize: 12, color: C.sub, lineHeight: 1.5 }}>{r.description}</p>}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                            <span style={{ color: C.muted }}>📍</span>
                            <span style={{ color: C.sub }}>{r.location}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                            <span style={{ color: C.muted }}>👥</span>
                            <span style={{ color: C.sub }}>Capacity: <strong style={{ color: C.accent }}>{r.capacity}</strong></span>
                          </div>
                          {r.availabilityStart && r.availabilityEnd && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                              <span style={{ color: C.muted }}>🕐</span>
                              <span style={{ color: C.success }}>{r.availabilityStart} – {r.availabilityEnd}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Book button */}
                      {isActive && (
                        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--c-divider)' }}>
                          <button onClick={() => { setBkForm(f => ({ ...f, resourceId: String(r.id) })); setBkModal(true) }}
                            style={{ width: '100%', background: C.accentDim, border: `1px solid ${C.accent}25`, borderRadius: 8, color: C.accent, fontSize: 13, fontWeight: 600, padding: '8px 0', cursor: 'pointer', transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = `${C.accent}20`; e.currentTarget.style.borderColor = `${C.accent}50` }}
                            onMouseLeave={e => { e.currentTarget.style.background = C.accentDim; e.currentTarget.style.borderColor = `${C.accent}25` }}>
                            Book this Resource
                          </button>
                        </div>
                      )}
                      {!isActive && (
                        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--c-divider)' }}>
                          <div style={{ textAlign: 'center', fontSize: 12, color: C.danger, fontWeight: 600 }}>Currently unavailable</div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── MY BOOKINGS ── */}
          {tab === 1 && (
            <div>
              <SectionHeader title="My Bookings" subtitle="Your room and equipment reservations" action={<Btn onClick={() => setBkModal(true)}>+ New Booking</Btn>} />
              <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                <Select value={bkFilter} onChange={e => setBkFilter(e.target.value)} style={{ width: 200 }}>
                  <option value="">All Statuses</option>
                  {(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as BkStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>
              <Table
                cols={['ID', 'Resource', 'Date', 'Time', 'Purpose', 'Status', 'Reason', 'QR', 'Action']}
                rows={filteredBookings.map(b => [
                  <span style={{ color: C.muted, fontFamily: 'monospace', fontSize: 11 }}>#{b.id}</span>,
                  <span style={{ fontWeight: 600 }}>Resource #{b.resourceId}</span>,
                  <span style={{ color: C.sub }}>{b.bookingDate}</span>,
                  <span style={{ fontSize: 12, color: C.muted }}>{b.startTime} – {b.endTime}</span>,
                  <span style={{ maxWidth: 180, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.purpose}</span>,
                  <Badge label={b.status} />,
                  b.adminDecisionReason ? <span style={{ fontSize: 12, color: C.muted, maxWidth: 140, display: 'block' }}>{b.adminDecisionReason}</span> : <span style={{ color: C.muted }}>—</span>,
                  b.status === 'APPROVED'
                    ? <button onClick={() => setQrBooking(b)} style={{ background: C.accentDim, border: `1px solid ${C.accent}30`, borderRadius: 6, padding: '4px 10px', color: C.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span>⬛</span> View QR
                      </button>
                    : <span style={{ color: C.muted, fontSize: 12 }}>—</span>,
                  (b.status === 'PENDING' || b.status === 'APPROVED')
                    ? <Btn variant="danger" onClick={() => cancelBooking(b.id)} style={{ padding: '4px 10px', fontSize: 12 }}>Cancel</Btn>
                    : <span style={{ color: C.muted, fontSize: 12 }}>—</span>,
                ])}
              />
            </div>
          )}

          {/* ── MY TICKETS ── */}
          {tab === 2 && (
            <div>
              <SectionHeader title="My Tickets" subtitle={user?.role === 'TECHNICIAN' ? 'Assigned work items and tickets you submitted' : "Maintenance and incident reports you've submitted"} action={<Btn onClick={() => setTkModal(true)}>+ Report Issue</Btn>} />
              <Table
                cols={['ID', 'Category', 'Priority', 'Location', 'Status', 'Created', 'Action']}
                rows={tickets.map(t => [
                  <span style={{ color: C.muted, fontFamily: 'monospace', fontSize: 11 }}>#{t.id}</span>,
                  <span>{t.category}</span>,
                  <Badge label={t.priority} />,
                  <span style={{ fontSize: 12, color: C.sub }}>{t.location ?? (t.resourceId ? `Resource #${t.resourceId}` : '—')}</span>,
                  <Badge label={t.status} />,
                  <span style={{ fontSize: 12, color: C.muted }}>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}</span>,
                  <Btn variant="ghost" onClick={() => openTicketDetail(t)} style={{ padding: '4px 12px', fontSize: 12 }}>View →</Btn>,
                ])}
              />
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {tab === 3 && (
            <div>
              <SectionHeader title="Notifications" subtitle={`${unread} unread`} action={unread > 0 ? <Btn variant="ghost" onClick={markAllRead}>Mark all read</Btn> : undefined} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {notifs.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 60, color: C.muted, background: C.surface, borderRadius: 12, border: '1px solid var(--c-divider)' }}>
                    No notifications yet
                  </div>
                )}
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
        </div>
      </main>

      {/* ── QR Modal ── */}
      {qrBooking && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={() => setQrBooking(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)' }} />
          <div style={{ background: C.surface, border: `1px solid ${C.accent}25`, borderRadius: 16, padding: 28, position: 'relative', zIndex: 1, boxShadow: '0 32px 80px rgba(0,0,0,0.7)', width: 300, textAlign: 'center' }}>
            <button onClick={() => setQrBooking(null)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: '1px solid rgba(255,255,255,0.08)', color: C.muted, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '3px 8px', borderRadius: 6 }}>×</button>

            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>Booking #{qrBooking.id}</div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 18 }}>Resource #{qrBooking.resourceId} · {qrBooking.bookingDate}</div>

            {/* QR code */}
            <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: 16, padding: 12, background: '#fff', borderRadius: 10 }}>
              <QRCanvas
                value={JSON.stringify({ bookingId: qrBooking.id, resourceId: qrBooking.resourceId, date: qrBooking.bookingDate, start: qrBooking.startTime, end: qrBooking.endTime, purpose: qrBooking.purpose })}
                size={200}
              />
            </div>

            <div style={{ fontSize: 11, color: C.muted, marginBottom: 18, lineHeight: 1.5 }}>
              {qrBooking.startTime} – {qrBooking.endTime}<br />
              {qrBooking.purpose}
            </div>

            <button
              onClick={() => {
                const canvas = document.querySelector('canvas') as HTMLCanvasElement
                if (!canvas) return
                const a = document.createElement('a')
                a.download = `booking-${qrBooking.id}-qr.png`
                a.href = canvas.toDataURL('image/png')
                a.click()
              }}
              style={{ width: '100%', background: C.accentDim, border: `1px solid ${C.accent}30`, borderRadius: 8, color: C.accent, fontSize: 13, fontWeight: 600, padding: '9px 0', cursor: 'pointer' }}>
              ⬇ Download QR
            </button>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      <Modal title="Request a Booking" open={bkModal} onClose={() => setBkModal(false)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Resource ID"><Input type="number" placeholder="e.g. 3" value={bkForm.resourceId} onChange={e => setBkForm(f => ({ ...f, resourceId: e.target.value }))} /></Field>
          <Field label="Expected Attendees"><Input type="number" value={bkForm.attendees} onChange={e => setBkForm(f => ({ ...f, attendees: e.target.value }))} /></Field>
          <Field label="Date"><Input type="date" value={bkForm.bookingDate} onChange={e => setBkForm(f => ({ ...f, bookingDate: e.target.value }))} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Start"><Input type="time" value={bkForm.startTime} onChange={e => setBkForm(f => ({ ...f, startTime: e.target.value }))} /></Field>
            <Field label="End"><Input type="time" value={bkForm.endTime} onChange={e => setBkForm(f => ({ ...f, endTime: e.target.value }))} /></Field>
          </div>
        </div>
        <Field label="Purpose"><Textarea placeholder="Describe the purpose…" value={bkForm.purpose} onChange={e => setBkForm(f => ({ ...f, purpose: e.target.value }))} /></Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => setBkModal(false)}>Cancel</Btn>
          <Btn onClick={submitBooking} disabled={busy}>Submit</Btn>
        </div>
      </Modal>

      <Modal title="Report an Incident" open={tkModal} onClose={() => setTkModal(false)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Resource ID (optional)"><Input type="number" value={tkForm.resourceId} onChange={e => setTkForm(f => ({ ...f, resourceId: e.target.value }))} placeholder="e.g. 5" /></Field>
          <Field label="Location (optional)"><Input value={tkForm.location} onChange={e => setTkForm(f => ({ ...f, location: e.target.value }))} placeholder="Block A Room 201" /></Field>
          <Field label="Category">
            <Select value={tkForm.category} onChange={e => setTkForm(f => ({ ...f, category: e.target.value as TkCategory }))}>
              {(['ELECTRICAL', 'NETWORK', 'PROJECTOR', 'HVAC', 'FURNITURE', 'SECURITY', 'OTHER'] as TkCategory[]).map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={tkForm.priority} onChange={e => setTkForm(f => ({ ...f, priority: e.target.value as TkPriority }))}>
              {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as TkPriority[]).map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Preferred Contact"><Input value={tkForm.preferredContact} onChange={e => setTkForm(f => ({ ...f, preferredContact: e.target.value }))} placeholder="Phone or email" /></Field>
        <Field label="Description"><Textarea rows={4} placeholder="Describe the issue in detail…" value={tkForm.description} onChange={e => setTkForm(f => ({ ...f, description: e.target.value }))} /></Field>
        <Field label="Attach Images (max 3)">
          <div style={{ border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 8, padding: 14, position: 'relative', cursor: 'pointer', textAlign: 'center' }}>
            <input type="file" accept="image/*" multiple onChange={e => setTkForm(f => ({ ...f, images: Array.from(e.target.files ?? []).slice(0, 3) }))} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            <div style={{ color: C.muted, fontSize: 13 }}>{tkForm.images.length ? tkForm.images.map(f => f.name).join(', ') : '📎 Click to attach images'}</div>
          </div>
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => setTkModal(false)}>Cancel</Btn>
          <Btn onClick={submitTicket} disabled={busy}>Submit Ticket</Btn>
        </div>
      </Modal>

      <Modal title={`Ticket #${tkDetail?.id ?? ''}`} open={tkDetailOpen} onClose={() => setTkDetailOpen(false)} width={620}>
        {tkDetail && (
          <div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <Badge label={tkDetail.status} /><Badge label={tkDetail.priority} /><Badge label={tkDetail.category} />
            </div>
            <InfoBox label="Location" value={tkDetail.location ?? (tkDetail.resourceId ? `Resource #${tkDetail.resourceId}` : '—')} />
            <InfoBox label="Contact" value={tkDetail.preferredContact} />
            {tkDetail.assignedToUserId && <InfoBox label="Assigned To" value={`User #${tkDetail.assignedToUserId}`} />}
            <div style={{ background: 'var(--c-faint)', borderRadius: 9, padding: '12px 14px', marginBottom: 16, fontSize: 14, color: C.text, lineHeight: 1.6, border: '1px solid var(--c-divider)' }}>{tkDetail.description}</div>
            {tkDetail.rejectionReason && <div style={{ background: `${C.danger}0d`, border: `1px solid ${C.danger}25`, borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}><span style={{ color: C.danger, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Rejection: </span><span style={{ color: C.text, fontSize: 13 }}>{tkDetail.rejectionReason}</span></div>}
            {tkDetail.resolutionNotes && <div style={{ background: `${C.success}0d`, border: `1px solid ${C.success}25`, borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}><span style={{ color: C.success, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Resolution: </span><span style={{ color: C.text, fontSize: 13 }}>{tkDetail.resolutionNotes}</span></div>}
            {(tkDetail.attachments ?? []).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Attachments</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(tkDetail.attachments ?? []).map(a => (
                    <a key={a.id} href={`${API}${a.downloadUrl}`} target="_blank" rel="noreferrer" style={{ background: C.accentDim, border: `1px solid ${C.accent}25`, borderRadius: 6, padding: '5px 12px', color: C.accent, fontSize: 12, textDecoration: 'none' }}>📎 {a.originalFileName}</a>
                  ))}
                </div>
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: 16 }}>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>Comments ({(tkDetail.comments ?? []).length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {(tkDetail.comments ?? []).length === 0 && <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: 16 }}>No comments yet</div>}
                {(tkDetail.comments ?? []).map(c => (
                  <div key={c.id} style={{ background: 'var(--c-faint)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--c-divider)' }}>
                    {editCommentId === c.id ? (
                      <div>
                        <Textarea value={editCommentBody} onChange={e => setEditCommentBody(e.target.value)} style={{ marginBottom: 8 }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Btn onClick={() => saveEditComment(c.id)} disabled={busy} style={{ fontSize: 12, padding: '4px 12px' }}>Save</Btn>
                          <Btn variant="ghost" onClick={() => setEditCommentId(null)} style={{ fontSize: 12, padding: '4px 12px' }}>Cancel</Btn>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 13, color: C.text, marginBottom: 6, lineHeight: 1.5 }}>{c.body}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: C.muted }}>User #{c.authorUserId} · {new Date(c.createdAt).toLocaleString()}</span>
                          {c.authorUserId === user?.userId && (
                            <>
                              <Btn variant="ghost" onClick={() => { setEditCommentId(c.id); setEditCommentBody(c.body) }} style={{ fontSize: 11, padding: '2px 8px' }}>Edit</Btn>
                              <Btn variant="danger" onClick={() => deleteComment(c.id)} style={{ fontSize: 11, padding: '2px 8px' }}>Delete</Btn>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <Field label="Add a comment">
                <Textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a comment…" />
              </Field>
              <Btn onClick={addComment} disabled={busy || !newComment.trim()} variant="ghost">Post Comment</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
