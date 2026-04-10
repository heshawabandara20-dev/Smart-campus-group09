import React, { useCallback, useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081'

const get  = (path: string) => fetch(`${API}${path}`, { credentials: 'include' })
const post = (path: string, body: unknown) =>
  fetch(`${API}${path}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const put  = (path: string, body?: unknown) =>
  fetch(`${API}${path}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
const del  = (path: string) => fetch(`${API}${path}`, { method: 'DELETE', credentials: 'include' })

// ── Types ──────────────────────────────────────────────────────────────────
type TkStatus   = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REJECTED'
type TkPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
type TkCategory = 'ELECTRICAL' | 'NETWORK' | 'PROJECTOR' | 'HVAC' | 'FURNITURE' | 'SECURITY' | 'OTHER'
interface Ticket { id: number; resourceId?: number; location?: string; category: TkCategory; priority: TkPriority; description: string; status: TkStatus; preferredContact: string; createdByUserId: number; assignedToUserId?: number; resolutionNotes?: string; createdAt?: string; comments?: Comment[]; attachments?: Attachment[] }
interface Comment { id: number; authorUserId: number; body: string; createdAt: string; updatedAt?: string }
interface Attachment { id: number; downloadUrl: string; originalFileName: string; contentType: string }
interface Notif      { id: number; message: string; type: string; readAt?: string; createdAt: string }

// ── Design tokens — indigo theme ────────────────────────────────────────────
const TECH_DARK = {
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
const TECH_LIGHT = {
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
  OPEN: C.accent, IN_PROGRESS: C.warning, RESOLVED: C.success, CLOSED: '#94a3b8', REJECTED: C.danger,
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

const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} rows={3} style={{ width: '100%', background: 'var(--c-faint)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '8px 12px', color: C.text, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', ...props.style }} />
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

// ── Main Component ─────────────────────────────────────────────────────────
export default function TechnicianDashboard() {
  const { user, logout } = useAuth()
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifPopupOpen, setNotifPopupOpen] = useState(false)
  const [notifEnabled, setNotifEnabled] = useState(() => localStorage.getItem('notifEnabled') !== 'false')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') !== 'false')
  const profileRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const toggleNotif    = () => { const next = !notifEnabled; setNotifEnabled(next); localStorage.setItem('notifEnabled', String(next)) }
  const toggleDarkMode = () => { const next = !darkMode;    setDarkMode(next);    localStorage.setItem('darkMode',    String(next)) }
  const themeVars = darkMode ? TECH_DARK : TECH_LIGHT

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [tkFilter, setTkFilter] = useState<TkStatus | ''>('')
  const [tab, setTab] = useState(0)
  const [tkDetail, setTkDetail] = useState<Ticket | null>(null)
  const [tkDetailOpen, setTkDetailOpen] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [notesError, setNotesError] = useState(false)
  const notesSectionRef = useRef<HTMLDivElement>(null)
  const [editCommentId, setEditCommentId] = useState<number | null>(null)
  const [editCommentBody, setEditCommentBody] = useState('')
  const [notifs, setNotifs] = useState<Notif[]>([])
  const unread = notifs.filter(n => !n.readAt).length

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  const loadTickets = useCallback(async () => {
    const r = await get('/api/tickets/my')
    if (r.ok) {
      const data = await r.json()
      // Filter to only assigned tickets
      const assigned = data.filter((t: Ticket) => t.assignedToUserId === user?.userId)
      setTickets(assigned)
    }
  }, [user?.userId])

  const loadNotifs = useCallback(async () => {
    const r = await get('/api/notifications/my')
    if (r.ok) setNotifs(await r.json())
  }, [])

  useEffect(() => {
    setBusy(true)
    Promise.all([loadTickets(), loadNotifs()]).finally(() => setBusy(false))
  }, [loadTickets])

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifPopupOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const openTicketDetail = async (t: Ticket) => {
    setBusy(true)
    const r = await get(`/api/tickets/${t.id}`)
    setBusy(false)
    if (r.ok) {
      const detail = await r.json()
      setTkDetail(detail)
      setTkDetailOpen(true)
      setNewComment('')
      setResolutionNotes(detail.resolutionNotes || '')
      setNotesError(false)
      setEditCommentId(null)
    } else showToast('Failed to load ticket', false)
  }

  const updateStatus = async (status: TkStatus) => {
    if (!tkDetail) return
    if ((status === 'RESOLVED' || status === 'CLOSED') && !resolutionNotes.trim()) {
      setNotesError(true)
      notesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      showToast('Resolution notes are required to mark as ' + status, false)
      return
    }
    setNotesError(false)
    setBusy(true)
    const body: Record<string, unknown> = { status, assignedToUserId: tkDetail.assignedToUserId ?? undefined }
    if (status === 'RESOLVED' || status === 'CLOSED') body.resolutionNotes = resolutionNotes.trim()
    const r = await put(`/api/tickets/${tkDetail.id}/status`, body)
    setBusy(false)
    if (r.ok) {
      showToast('Status updated')
      await openTicketDetail(tkDetail)
      await loadTickets()
    } else {
      const e = await r.json().catch(() => ({}))
      showToast(e.message ?? 'Update failed', false)
    }
  }

  const addComment = async () => {
    if (!tkDetail || !newComment.trim()) return
    setBusy(true)
    const r = await post(`/api/tickets/${tkDetail.id}/comments`, { body: newComment })
    setBusy(false)
    if (r.ok) {
      showToast('Comment added')
      setNewComment('')
      await openTicketDetail(tkDetail)
    } else showToast('Comment failed', false)
  }

  const saveEditComment = async (commentId: number) => {
    if (!tkDetail) return
    setBusy(true)
    const r = await put(`/api/tickets/${tkDetail.id}/comments/${commentId}`, { body: editCommentBody })
    setBusy(false)
    if (r.ok) {
      showToast('Comment updated')
      setEditCommentId(null)
      await openTicketDetail(tkDetail)
    } else showToast('Update failed', false)
  }

  const deleteComment = async (commentId: number) => {
    if (!tkDetail || !confirm('Delete this comment?')) return
    setBusy(true)
    const r = await del(`/api/tickets/${tkDetail.id}/comments/${commentId}`)
    setBusy(false)
    if (r.ok) {
      showToast('Comment deleted')
      await openTicketDetail(tkDetail)
    } else showToast('Delete failed', false)
  }

  const saveResolutionNotes = async () => {
    if (!tkDetail) return
    setBusy(true)
    const r = await put(`/api/tickets/${tkDetail.id}/status`, { status: tkDetail.status, assignedToUserId: tkDetail.assignedToUserId ?? undefined, resolutionNotes: resolutionNotes.trim() || undefined })
    setBusy(false)
    if (r.ok) {
      showToast('Resolution notes saved')
      await openTicketDetail(tkDetail)
    } else showToast('Save failed', false)
  }

  const markRead    = async (id: number) => { const r = await put(`/api/notifications/${id}/read`); if (r.ok) await loadNotifs() }
  const markAllRead = async () => { const r = await put('/api/notifications/read-all'); if (r.ok) await loadNotifs() }

  const filteredTickets = tkFilter ? tickets.filter(t => t.status === tkFilter) : tickets
  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'OPEN').length,
    inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
    resolved: tickets.filter(t => t.status === 'RESOLVED').length,
  }

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
        <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid var(--c-divider)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, rgba(129,140,248,0.25), rgba(165,180,252,0.1))', border: '1px solid rgba(129,140,248,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>🔧</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.3px' }}>SmartCampus</div>
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Technician</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '16px 10px', overflowY: 'auto' }}>
          <div style={{ fontSize: 9, color: '#2d3748', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', padding: '0 10px', marginBottom: 10 }}>My Work</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button onClick={() => { setTab(0); setTkFilter('') }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, background: !tkFilter ? 'rgba(129,140,248,0.12)' : 'transparent', border: `1px solid ${!tkFilter ? 'rgba(129,140,248,0.2)' : 'transparent'}`, color: !tkFilter ? '#a5b4fc' : C.sub, fontSize: 13, fontWeight: !tkFilter ? 600 : 400, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
              <span>🎫</span>
              <span>All Tickets</span>
              <span style={{ marginLeft: 'auto', background: C.accentDim, color: C.accent, borderRadius: 20, padding: '1px 6px', fontSize: 10, fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{stats.total}</span>
            </button>
            {(['OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map(status => (
              <button key={status} onClick={() => { setTab(0); setTkFilter(status) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, background: tkFilter === status ? 'rgba(129,140,248,0.12)' : 'transparent', border: `1px solid ${tkFilter === status ? 'rgba(129,140,248,0.2)' : 'transparent'}`, color: tkFilter === status ? '#a5b4fc' : C.sub, fontSize: 13, fontWeight: tkFilter === status ? 600 : 400, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                <span>{status === 'OPEN' ? '📋' : status === 'IN_PROGRESS' ? '⚙️' : '✓'}</span>
                <span>{status.replace(/_/g, ' ')}</span>
                <span style={{ marginLeft: 'auto', background: C.accentDim, color: C.accent, borderRadius: 20, padding: '1px 6px', fontSize: 10, fontWeight: 700, minWidth: 18, textAlign: 'center' }}>
                  {status === 'OPEN' ? stats.open : status === 'IN_PROGRESS' ? stats.inProgress : stats.resolved}
                </span>
              </button>
            ))}
          </div>

          
          <button onClick={() => setTab(1)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, background: tab === 1 ? 'rgba(129,140,248,0.12)' : 'transparent', border: `1px solid ${tab === 1 ? 'rgba(129,140,248,0.2)' : 'transparent'}`, color: tab === 1 ? '#a5b4fc' : C.sub, fontSize: 13, fontWeight: tab === 1 ? 600 : 400, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
            <span>{notifEnabled ? '🔔' : '🔕'}</span>
            <span>Alerts</span>
            {notifEnabled && unread > 0 && (
              <span style={{ marginLeft: 'auto', background: C.danger, color: '#fff', borderRadius: 20, padding: '1px 6px', fontSize: 10, fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{unread > 99 ? '99+' : unread}</span>
            )}
          </button>
        </nav>

        <div style={{ padding: '0 10px 6px' }}>
          <button onClick={toggleDarkMode} title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: darkMode ? 'var(--c-faint)' : C.accentDim, border: `1px solid ${darkMode ? 'var(--c-divider)' : C.accent + '30'}`, color: darkMode ? C.sub : C.accent, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', marginBottom: 6 }}>
            <span style={{ fontSize: 15 }}>{darkMode ? '☀️' : '🌙'}</span>
            <span style={{ flex: 1, textAlign: 'left' }}>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>

        <div ref={notifRef} style={{ padding: '0 10px 6px', position: 'relative' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onMouseEnter={() => notifEnabled && setNotifPopupOpen(true)}
              onMouseLeave={() => setNotifPopupOpen(false)}
              onClick={() => setTab(1)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'transparent', border: '1px solid var(--c-divider)', color: C.muted, fontSize: 12, cursor: 'pointer', opacity: notifEnabled ? 1 : 0.45, transition: 'all 0.15s' }}>
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
                  <div key={n.id} onClick={() => { setTab(1); setNotifPopupOpen(false) }} style={{ padding: '10px 14px', borderBottom: '1px solid var(--c-faint)', cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(129,140,248,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>{n.message}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div style={{ padding: '12px', borderTop: '1px solid var(--c-divider)' }}>
          <div onClick={() => setProfileOpen(!profileOpen)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', borderRadius: 9, background: 'var(--c-faint)', border: '1px solid var(--c-divider)', marginBottom: 8, cursor: 'pointer', transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(129,140,248,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--c-divider)')}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(129,140,248,0.25), rgba(165,180,252,0.1))', border: '1px solid rgba(129,140,248,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#a5b4fc', flexShrink: 0 }}>
              {(user?.name || user?.email || 'T')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || user?.email?.split('@')[0]}</div>
              <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Technician</div>
            </div>
            <span style={{ fontSize: 9, color: C.muted, transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
          </div>
          {profileOpen && (
            <div style={{ background: C.surfaceAlt, border: '1px solid rgba(129,140,248,0.12)', borderRadius: 8, padding: '10px 12px', marginBottom: 8, fontSize: 12 }}>
              <div style={{ color: C.sub, marginBottom: 4, wordBreak: 'break-all' }}>{user?.email}</div>
              <span style={{ display: 'inline-block', fontSize: 10, color: C.accent, background: C.accentDim, border: `1px solid ${C.accent}30`, borderRadius: 4, padding: '2px 8px', textTransform: 'uppercase', fontWeight: 700 }}>TECHNICIAN</span>
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

        <div style={{ 
          flex: 1, 
          padding: '24px 28px', 
          overflowY: 'auto',
          width: '100%',
          boxSizing: 'border-box'
        } as React.CSSProperties}>
          <div style={{ width: '100%' }}>
            {tab === 0 ? (
              <>
                <div style={{ marginBottom: 28 }}>
                  <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: '-0.5px', marginBottom: 8 }}>Assigned Tickets</h1>
                  <p style={{ margin: 0, fontSize: 14, color: C.sub }}>Manage your assigned maintenance and repair tasks</p>
                </div>

                {tickets.length === 0 ? (
                  <div style={{ background: C.surface, border: '1px solid rgba(129,140,248,0.15)', borderRadius: 14, padding: 48, textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 4 }}>All caught up!</div>
                    <div style={{ fontSize: 13, color: C.sub }}>No assigned tickets at the moment</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 14 }}>
                    {filteredTickets.map(ticket => (
                      <div key={ticket.id} onClick={() => openTicketDetail(ticket)} style={{ background: C.surface, border: '1px solid rgba(129,140,248,0.15)', borderRadius: 14, padding: 18, cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(129,140,248,0.35)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(129,140,248,0.1)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(129,140,248,0.15)'; e.currentTarget.style.boxShadow = 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>Ticket #{ticket.id}</div>
                            <p style={{ margin: 0, fontSize: 13, color: C.sub, lineHeight: 1.5, maxWidth: 600 }}>{ticket.description}</p>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Badge label={ticket.status} />
                            <Badge label={ticket.priority} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: C.muted }}>
                          {ticket.location && <div>📍 {ticket.location}</div>}
                          <div>🏷️ {ticket.category}</div>
                          {ticket.createdAt && <div>📅 {new Date(ticket.createdAt).toLocaleDateString()}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: '-0.5px', marginBottom: 8 }}>Notifications</h1>
                    <p style={{ margin: 0, fontSize: 14, color: C.sub }}>Stay updated with system alerts and messages</p>
                  </div>
                  {unread > 0 && (
                    <Btn onClick={markAllRead} variant="ghost" style={{ justifyContent: 'center', fontSize: 12, padding: '8px 14px' }}>✓ Mark all read</Btn>
                  )}
                </div>

                {notifs.length === 0 ? (
                  <div style={{ background: C.surface, border: '1px solid rgba(129,140,248,0.15)', borderRadius: 14, padding: 48, textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 4 }}>All caught up!</div>
                    <div style={{ fontSize: 13, color: C.sub }}>No notifications at this time</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {notifs.map(notif => (
                      <div key={notif.id} onClick={() => markRead(notif.id)} style={{ background: C.surface, border: `1px solid ${notif.readAt ? 'rgba(129,140,248,0.1)' : 'rgba(129,140,248,0.3)'}`, borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'all 0.2s', opacity: notif.readAt ? 0.6 : 1 }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(129,140,248,0.5)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(129,140,248,0.1)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = `${notif.readAt ? 'rgba(129,140,248,0.1)' : 'rgba(129,140,248,0.3)'}`; e.currentTarget.style.boxShadow = 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span>{notif.type === 'ticket' ? '🎫' : '📢'}</span>
                              <span>{notif.message}</span>
                              {!notif.readAt && <span style={{ background: C.accent, width: 8, height: 8, borderRadius: '50%' }}></span>}
                            </div>
                            <div style={{ fontSize: 12, color: C.muted }}>{new Date(notif.createdAt).toLocaleString()}</div>
                          </div>
                          {notif.readAt && <div style={{ fontSize: 11, color: C.muted }}>✓ Read</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* ── Ticket Detail Modal ── */}
      <Modal title={`Ticket #${tkDetail?.id}`} open={tkDetailOpen} onClose={() => setTkDetailOpen(false)} width={700}>
        {tkDetail && (
          <div style={{ display: 'grid', gap: 20 }}>
            {/* Basic Info */}
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <Badge label={tkDetail.status} />
                <Badge label={tkDetail.priority} />
                <Badge label={tkDetail.category} />
              </div>
              <p style={{ margin: 0, fontSize: 14, color: C.text, lineHeight: 1.6 }}>{tkDetail.description}</p>
            </div>

            <div style={{ borderTop: '1px solid var(--c-divider)', paddingTop: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                {tkDetail.location && <div><span style={{ color: C.muted }}>Location:</span> <span style={{ color: C.text }}>{tkDetail.location}</span></div>}
                <div><span style={{ color: C.muted }}>Contact:</span> <span style={{ color: C.text }}>{tkDetail.preferredContact}</span></div>
                {tkDetail.createdAt && <div><span style={{ color: C.muted }}>Created:</span> <span style={{ color: C.text }}>{new Date(tkDetail.createdAt).toLocaleDateString()}</span></div>}
              </div>
            </div>

            {/* Resolution Notes */}
            <div ref={notesSectionRef} style={{ borderTop: '1px solid var(--c-divider)', paddingTop: 16 }}>
              <div style={{ fontSize: 12, color: notesError ? C.danger : C.muted, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>
                Resolution Notes {notesError && <span style={{ fontWeight: 400, fontSize: 11, textTransform: 'none' }}>— required to mark as RESOLVED / CLOSED</span>}
              </div>
              <Textarea
                placeholder="Describe the work done, repairs made, etc."
                value={resolutionNotes}
                onChange={e => { setResolutionNotes(e.target.value); if (e.target.value.trim()) setNotesError(false) }}
                style={{ borderColor: notesError ? C.danger : undefined }}
              />
              <Btn onClick={saveResolutionNotes} disabled={busy} style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}>💾 Save Notes</Btn>
            </div>

            {/* Status Update */}
            <div style={{ borderTop: '1px solid var(--c-divider)', paddingTop: 16 }}>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>Update Status</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map(status => (
                  <Btn
                    key={status}
                    variant={tkDetail.status === status ? 'primary' : 'ghost'}
                    onClick={() => updateStatus(status)}
                    disabled={busy}
                    style={{ justifyContent: 'center', fontSize: 12 }}>
                    {status.replace(/_/g, ' ')}
                  </Btn>
                ))}
              </div>
            </div>

            {/* Comments */}
            <div style={{ borderTop: '1px solid var(--c-divider)', paddingTop: 16 }}>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase' }}>Comments ({tkDetail.comments?.length || 0})</div>
              <div style={{ marginBottom: 16 }}>
                <Textarea placeholder="Add a comment..." value={newComment} onChange={e => setNewComment(e.target.value)} />
                <Btn onClick={addComment} disabled={busy} style={{ marginTop: 10, justifyContent: 'center', width: '100%' }}>💬 Comment</Btn>
              </div>
              {tkDetail.comments && tkDetail.comments.length > 0 && (
                <div style={{ display: 'grid', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
                  {tkDetail.comments.map(c => (
                    <div key={c.id} style={{ background: C.surfaceAlt, border: '1px solid var(--c-faint)', borderRadius: 8, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: C.muted }}>User #{c.authorUserId}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{new Date(c.createdAt).toLocaleString()}</div>
                      </div>
                      {editCommentId === c.id ? (
                        <div style={{ display: 'grid', gap: 8 }}>
                          <Textarea value={editCommentBody} onChange={e => setEditCommentBody(e.target.value)} />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Btn onClick={() => saveEditComment(c.id)} disabled={busy} variant="success" style={{ flex: 1, justifyContent: 'center' }}>Save</Btn>
                            <Btn onClick={() => setEditCommentId(null)} variant="ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</Btn>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p style={{ margin: '0 0 8px', fontSize: 13, color: C.text, lineHeight: 1.5 }}>{c.body}</p>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => { setEditCommentId(c.id); setEditCommentBody(c.body) }} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Edit</button>
                            <button onClick={() => deleteComment(c.id)} style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attachments */}
            {tkDetail.attachments && tkDetail.attachments.length > 0 && (
              <div style={{ borderTop: '1px solid var(--c-divider)', paddingTop: 16 }}>
                <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>Attachments</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {tkDetail.attachments.map(a => (
                    <a key={a.id} href={a.downloadUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: C.surfaceAlt, border: '1px solid rgba(129,140,248,0.15)', borderRadius: 6, color: C.accent, textDecoration: 'none', fontSize: 12, fontWeight: 600, transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(129,140,248,0.35)'; e.currentTarget.style.background = 'rgba(129,140,248,0.08)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(129,140,248,0.15)'; e.currentTarget.style.background = C.surfaceAlt }}>
                      📎 {a.originalFileName}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
