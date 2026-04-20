import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

// ─── API BASE ───────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081'

const apiFetch = (path: string, opts: RequestInit = {}) =>
  fetch(`${API}${path}`, { credentials: 'include', ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}) } })

// ─── TYPES ──────────────────────────────────────────────────────────────────
type ResourceType = 'LECTURE_HALL' | 'LAB' | 'MEETING_ROOM' | 'EQUIPMENT'
type ResourceStatus = 'ACTIVE' | 'OUT_OF_SERVICE'
interface Resource {
  id: number; name: string; type: ResourceType; capacity: number
  location: string; status: ResourceStatus; description?: string
  availabilityStart?: string; availabilityEnd?: string
}

type BookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
interface Booking {
  id: number; resourceId: number; resourceName?: string
  requestedByUserId: number; bookingDate: string
  startTime: string; endTime: string; purpose: string
  status: BookingStatus; rejectionReason?: string; attendees?: number
}

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REJECTED'
type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
type TicketCategory = 'ELECTRICAL' | 'NETWORK' | 'PROJECTOR' | 'HVAC' | 'FURNITURE' | 'SECURITY' | 'OTHER'
interface Ticket {
  id: number; resourceId?: number; location?: string; category: TicketCategory
  priority: TicketPriority; description: string; status: TicketStatus
  preferredContact: string; reportedByUserId?: number; assignedToUserId?: number
  rejectionReason?: string; resolutionNotes?: string; createdAt?: string
  comments?: Comment[]; attachments?: Attachment[]
}
interface Comment { id: number; authorUserId: number; body: string; createdAt: string }
interface Attachment { id: number; downloadUrl: string; originalFileName: string }
interface Notification { id: number; message: string; type: string; readAt?: string; createdAt: string }

// ─── HELPERS ────────────────────────────────────────────────────────────────
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) }

const statusColor: Record<string, string> = {
  ACTIVE: '#22c55e', OUT_OF_SERVICE: '#ef4444',
  PENDING: '#f59e0b', APPROVED: '#22c55e', REJECTED: '#ef4444', CANCELLED: '#64748b',
  OPEN: '#3b82f6', IN_PROGRESS: '#f59e0b', RESOLVED: '#22c55e', CLOSED: '#64748b',
  LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444',
}
const Badge = ({ label }: { label: string }) => (
  <span style={{ background: `${statusColor[label] ?? '#6366f1'}22`, color: statusColor[label] ?? '#6366f1', border: `1px solid ${statusColor[label] ?? '#6366f1'}44`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>{label}</span>
)

// ─── MODAL ──────────────────────────────────────────────────────────────────
const Modal = ({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) => {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} />
      <div style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', position: 'relative', zIndex: 1, boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: 18, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── FORM FIELD ─────────────────────────────────────────────────────────────
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
    {children}
  </div>
)
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box', ...props.style }} />
)
const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} rows={3} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#f1f5f9', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box', ...props.style }} />
)
const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} style={{ width: '100%', background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box', ...props.style }} />
)
const Btn = ({ children, variant = 'primary', onClick, disabled, style }: { children: React.ReactNode; variant?: 'primary' | 'danger' | 'ghost' | 'success'; onClick?: () => void; disabled?: boolean; style?: React.CSSProperties }) => {
  const bg = { primary: '#6366f1', danger: '#ef4444', ghost: 'rgba(255,255,255,0.06)', success: '#22c55e' }
  return <button onClick={onClick} disabled={disabled} style={{ background: bg[variant], color: variant === 'ghost' ? '#94a3b8' : '#fff', border: '1px solid ' + (variant === 'ghost' ? 'rgba(255,255,255,0.1)' : 'transparent'), borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap', transition: 'opacity 0.15s', ...style }}>{children}</button>
}

// ─── TABLE ───────────────────────────────────────────────────────────────────
const Table = ({ cols, rows }: { cols: string[]; rows: React.ReactNode[][] }) => (
  <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
          {cols.map(c => <th key={c} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{c}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0
          ? <tr><td colSpan={cols.length} style={{ padding: '32px', textAlign: 'center', color: '#334155' }}>No records found</td></tr>
          : rows.map((row, i) => (
            <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
              {row.map((cell, j) => <td key={j} style={{ padding: '10px 14px', color: '#cbd5e1', verticalAlign: 'middle' }}>{cell}</td>)}
            </tr>
          ))}
      </tbody>
    </table>
  </div>
)

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [tab, setTab] = useState(0)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  // ── Resources ──
  const [resources, setResources] = useState<Resource[]>([])
  const [resourceFilter, setResourceFilter] = useState({ type: '', status: '', location: '', minCapacity: '' })
  const [resourceModal, setResourceModal] = useState<{ open: boolean; mode: 'create' | 'edit'; data: Partial<Resource> }>({ open: false, mode: 'create', data: {} })

  // ── Bookings ──
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingFilter, setBookingFilter] = useState<BookingStatus | ''>('')
  const [bookingModal, setBookingModal] = useState(false)
  const [bookingForm, setBookingForm] = useState({ resourceId: '', bookingDate: tomorrow(), startTime: '09:00', endTime: '10:00', purpose: '', attendees: '' })
  const [decisionModal, setDecisionModal] = useState<{ open: boolean; booking: Booking | null; approve: boolean }>({ open: false, booking: null, approve: true })
  const [decisionReason, setDecisionReason] = useState('')

  // ── Tickets ──
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [ticketModal, setTicketModal] = useState(false)
  const [ticketForm, setTicketForm] = useState({ resourceId: '', location: '', category: 'OTHER' as TicketCategory, priority: 'MEDIUM' as TicketPriority, description: '', preferredContact: user?.email ?? '', images: [] as File[] })
  const [ticketDetailModal, setTicketDetailModal] = useState<{ open: boolean; ticket: Ticket | null }>({ open: false, ticket: null })
  const [ticketComment, setTicketComment] = useState('')
  const [adminTicketForm, setAdminTicketForm] = useState({ status: 'OPEN' as TicketStatus, assignedToUserId: '', rejectionReason: '', resolutionNotes: '' })
  const [editCommentId, setEditCommentId] = useState<number | null>(null)
  const [editCommentBody, setEditCommentBody] = useState('')

  // ── Notifications ──
  const [notifications, setNotifications] = useState<Notification[]>([])
  const unread = notifications.filter(n => !n.readAt).length

  // ─── LOADERS ──────────────────────────────────────────────────────────────
  const loadResources = useCallback(async () => {
    const params = new URLSearchParams()
    if (resourceFilter.type) params.set('type', resourceFilter.type)
    if (resourceFilter.status) params.set('status', resourceFilter.status)
    if (resourceFilter.location) params.set('location', resourceFilter.location)
    if (resourceFilter.minCapacity) params.set('minCapacity', resourceFilter.minCapacity)
    const r = await apiFetch(`/api/resources?${params}`)
    if (r.ok) setResources(await r.json())
  }, [resourceFilter])

  const loadBookings = useCallback(async () => {
    const url = isAdmin
      ? `/api/bookings${bookingFilter ? `?status=${bookingFilter}` : ''}`
      : '/api/bookings/my'
    const r = await apiFetch(url)
    if (r.ok) setBookings(await r.json())
  }, [isAdmin, bookingFilter])

  const loadTickets = useCallback(async () => {
    const r = await apiFetch(isAdmin ? '/api/tickets' : '/api/tickets/my')
    if (r.ok) setTickets(await r.json())
  }, [isAdmin])

  const loadNotifications = useCallback(async () => {
    const r = await apiFetch('/api/notifications/my')
    if (r.ok) setNotifications(await r.json())
  }, [])

  useEffect(() => {
    ;(async () => {
      setBusy(true)
      await Promise.all([loadResources(), loadBookings(), loadTickets(), loadNotifications()])
      setBusy(false)
    })()
  }, [])

  // ─── RESOURCE CRUD ────────────────────────────────────────────────────────
  const openCreateResource = () => setResourceModal({ open: true, mode: 'create', data: { type: 'LECTURE_HALL', status: 'ACTIVE', capacity: 30 } })
  const openEditResource = (r: Resource) => setResourceModal({ open: true, mode: 'edit', data: { ...r } })

  const saveResource = async () => {
    const d = resourceModal.data
    const method = resourceModal.mode === 'create' ? 'POST' : 'PUT'
    const url = resourceModal.mode === 'create' ? '/api/resources' : `/api/resources/${d.id}`
    setBusy(true)
    const r = await apiFetch(url, { method, body: JSON.stringify(d) })
    setBusy(false)
    if (r.ok) { showToast(resourceModal.mode === 'create' ? 'Resource created!' : 'Resource updated!'); setResourceModal(m => ({ ...m, open: false })); await loadResources() }
    else { const e = await r.json().catch(() => ({})); showToast(e.message ?? 'Failed', false) }
  }

  const deleteResource = async (id: number) => {
    if (!confirm('Delete this resource?')) return
    setBusy(true)
    const r = await apiFetch(`/api/resources/${id}`, { method: 'DELETE' })
    setBusy(false)
    if (r.ok) { showToast('Resource deleted'); await loadResources() }
    else showToast('Cannot delete resource', false)
  }

  const toggleResourceStatus = async (res: Resource) => {
    const newStatus: ResourceStatus = res.status === 'ACTIVE' ? 'OUT_OF_SERVICE' : 'ACTIVE'
    setBusy(true)
    const r = await apiFetch(`/api/resources/${res.id}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) })
    setBusy(false)
    if (r.ok) { showToast(`Status set to ${newStatus}`); await loadResources() }
    else showToast('Update failed', false)
  }

  // ─── BOOKING CRUD ─────────────────────────────────────────────────────────
  const createBooking = async () => {
    if (!bookingForm.resourceId || !bookingForm.purpose) { showToast('Fill in resource ID and purpose', false); return }
    setBusy(true)
    const r = await apiFetch('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        resourceId: Number(bookingForm.resourceId),
        bookingDate: bookingForm.bookingDate,
        startTime: bookingForm.startTime + ':00',
        endTime: bookingForm.endTime + ':00',
        purpose: bookingForm.purpose,
        attendees: bookingForm.attendees ? Number(bookingForm.attendees) : undefined,
      }),
    })
    setBusy(false)
    if (r.ok) { showToast('Booking submitted!'); setBookingModal(false); setBookingForm(f => ({ ...f, purpose: '', attendees: '' })); await loadBookings() }
    else { const e = await r.json().catch(() => ({})); showToast(e.message ?? 'Booking failed', false) }
  }

  const cancelBooking = async (id: number) => {
    if (!confirm('Cancel this booking?')) return
    setBusy(true)
    const r = await apiFetch(`/api/bookings/${id}/cancel`, { method: 'POST' })
    setBusy(false)
    if (r.ok) { showToast('Booking cancelled'); await loadBookings() }
    else showToast('Cancel failed', false)
  }

  const openDecision = (b: Booking, approve: boolean) => { setDecisionModal({ open: true, booking: b, approve }); setDecisionReason('') }

  const submitDecision = async () => {
    if (!decisionModal.booking) return
    setBusy(true)
    const r = await apiFetch(`/api/bookings/${decisionModal.booking.id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ approved: decisionModal.approve, reason: decisionReason || undefined }),
    })
    setBusy(false)
    if (r.ok) { showToast(decisionModal.approve ? 'Booking approved' : 'Booking rejected'); setDecisionModal(m => ({ ...m, open: false })); await loadBookings(); await loadNotifications() }
    else showToast('Decision failed', false)
  }

  // ─── TICKET CRUD ──────────────────────────────────────────────────────────
  const createTicket = async () => {
    if (!ticketForm.description) { showToast('Description is required', false); return }
    const fd = new FormData()
    const payload = {
      resourceId: ticketForm.resourceId ? Number(ticketForm.resourceId) : undefined,
      location: ticketForm.location || undefined,
      category: ticketForm.category,
      priority: ticketForm.priority,
      description: ticketForm.description,
      preferredContact: ticketForm.preferredContact,
    }
    fd.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
    ticketForm.images.slice(0, 3).forEach(f => fd.append('images', f))
    setBusy(true)
    const r = await fetch(`${API}/api/tickets`, { method: 'POST', credentials: 'include', body: fd })
    setBusy(false)
    if (r.ok) { showToast('Ticket created!'); setTicketModal(false); setTicketForm(f => ({ ...f, description: '', images: [], resourceId: '', location: '' })); await loadTickets() }
    else { const e = await r.json().catch(() => ({})); showToast(e.message ?? 'Ticket failed', false) }
  }

  const openTicketDetail = async (t: Ticket) => {
    setBusy(true)
    const r = await apiFetch(`/api/tickets/${t.id}`)
    setBusy(false)
    if (r.ok) {
      const full = await r.json()
      setTicketDetailModal({ open: true, ticket: full })
      setAdminTicketForm({ status: full.status, assignedToUserId: full.assignedToUserId ? String(full.assignedToUserId) : '', rejectionReason: full.rejectionReason ?? '', resolutionNotes: full.resolutionNotes ?? '' })
      setTicketComment(''); setEditCommentId(null)
    } else showToast('Failed to load ticket', false)
  }

  const updateTicketStatus = async () => {
    if (!ticketDetailModal.ticket) return
    setBusy(true)
    const r = await apiFetch(`/api/tickets/${ticketDetailModal.ticket.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ ...adminTicketForm, assignedToUserId: adminTicketForm.assignedToUserId ? Number(adminTicketForm.assignedToUserId) : undefined }),
    })
    setBusy(false)
    if (r.ok) { showToast('Ticket updated'); setTicketDetailModal(m => ({ ...m, open: false })); await loadTickets() }
    else showToast('Update failed', false)
  }

  const addComment = async () => {
    if (!ticketDetailModal.ticket || !ticketComment.trim()) return
    setBusy(true)
    const r = await apiFetch(`/api/tickets/${ticketDetailModal.ticket.id}/comments`, { method: 'POST', body: JSON.stringify({ body: ticketComment }) })
    setBusy(false)
    if (r.ok) { showToast('Comment added'); setTicketComment(''); await openTicketDetail(ticketDetailModal.ticket) }
    else showToast('Comment failed', false)
  }

  const deleteComment = async (ticketId: number, commentId: number) => {
    if (!confirm('Delete comment?')) return
    setBusy(true)
    const r = await apiFetch(`/api/tickets/${ticketId}/comments/${commentId}`, { method: 'DELETE' })
    setBusy(false)
    if (r.ok) { showToast('Comment deleted'); const t = ticketDetailModal.ticket; if (t) await openTicketDetail(t) }
    else showToast('Delete failed', false)
  }

  const saveEditComment = async (ticketId: number, commentId: number) => {
    setBusy(true)
    const r = await apiFetch(`/api/tickets/${ticketId}/comments/${commentId}`, { method: 'PUT', body: JSON.stringify({ body: editCommentBody }) })
    setBusy(false)
    if (r.ok) { showToast('Comment updated'); setEditCommentId(null); const t = ticketDetailModal.ticket; if (t) await openTicketDetail(t) }
    else showToast('Update failed', false)
  }

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
  const markRead = async (id: number) => {
    const r = await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
    if (r.ok) await loadNotifications()
  }

  const markAllRead = async () => {
    await apiFetch('/api/notifications/read-all', { method: 'PATCH' })
    await loadNotifications()
  }

  // ─── TAB LABELS ───────────────────────────────────────────────────────────
  const tabs = ['Resources', 'Bookings', 'Tickets', `Notifications${unread ? ` (${unread})` : ''}`]

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0f0f13', fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: '#cbd5e1' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.ok ? '#22c55e' : '#ef4444', color: '#fff', borderRadius: 10, padding: '12px 18px', fontSize: 14, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', maxWidth: 320 }}>
          {toast.ok ? '✓ ' : '✕ '}{toast.msg}
        </div>
      )}

      {/* Top Bar */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', height: 60, gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: isAdmin ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)', border: `1px solid ${isAdmin ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
              {isAdmin ? '🛡️' : '🎓'}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{isAdmin ? 'Admin Hub' : 'Smart Campus'}</div>
              <div style={{ fontSize: 11, color: '#475569' }}>{user?.email}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            {tabs.map((t, i) => (
              <button key={i} onClick={() => setTab(i)} style={{ background: tab === i ? 'rgba(99,102,241,0.2)' : 'none', border: tab === i ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent', borderRadius: 8, padding: '6px 14px', color: tab === i ? '#818cf8' : '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {t}
              </button>
            ))}
          </div>

          <Btn variant="danger" onClick={logout} style={{ fontSize: 12, padding: '7px 14px' }}>Sign out</Btn>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px' }}>

        {/* ── RESOURCES TAB ── */}
        {tab === 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Facilities & Assets</h2>
              {isAdmin && <Btn onClick={openCreateResource}>+ Add Resource</Btn>}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              <Select value={resourceFilter.type} onChange={e => setResourceFilter(f => ({ ...f, type: e.target.value }))} style={{ width: 180 }}>
                <option value="">All Types</option>
                {(['LECTURE_HALL', 'LAB', 'MEETING_ROOM', 'EQUIPMENT'] as ResourceType[]).map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </Select>
              <Select value={resourceFilter.status} onChange={e => setResourceFilter(f => ({ ...f, status: e.target.value }))} style={{ width: 160 }}>
                <option value="">All Status</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="OUT_OF_SERVICE">OUT OF SERVICE</option>
              </Select>
              <Input placeholder="Location" value={resourceFilter.location} onChange={e => setResourceFilter(f => ({ ...f, location: e.target.value }))} style={{ width: 160 }} />
              <Input placeholder="Min Capacity" type="number" value={resourceFilter.minCapacity} onChange={e => setResourceFilter(f => ({ ...f, minCapacity: e.target.value }))} style={{ width: 130 }} />
              <Btn onClick={loadResources} disabled={busy} variant="ghost">Apply</Btn>
              <Btn onClick={() => { setResourceFilter({ type: '', status: '', location: '', minCapacity: '' }); setTimeout(loadResources, 50) }} variant="ghost">Clear</Btn>
            </div>

            <Table
              cols={['ID', 'Name', 'Type', 'Capacity', 'Location', 'Hours', 'Status', ...(isAdmin ? ['Actions'] : [])]}
              rows={resources.map(r => [
                <span style={{ color: '#475569', fontFamily: 'monospace' }}>#{r.id}</span>,
                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{r.name}</span>,
                r.type.replace('_', ' '),
                r.capacity,
                r.location,
                r.availabilityStart && r.availabilityEnd ? `${r.availabilityStart}–${r.availabilityEnd}` : '—',
                <Badge label={r.status} />,
                ...(isAdmin ? [
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn variant="ghost" onClick={() => openEditResource(r)} style={{ padding: '5px 10px', fontSize: 12 }}>Edit</Btn>
                    <Btn variant="ghost" onClick={() => toggleResourceStatus(r)} style={{ padding: '5px 10px', fontSize: 12 }}>{r.status === 'ACTIVE' ? 'Disable' : 'Enable'}</Btn>
                    <Btn variant="danger" onClick={() => deleteResource(r.id)} style={{ padding: '5px 10px', fontSize: 12 }}>Delete</Btn>
                  </div>
                ] : []),
              ])}
            />
          </div>
        )}

        {/* ── BOOKINGS TAB ── */}
        {tab === 1 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{isAdmin ? 'All Bookings' : 'My Bookings'}</h2>
              {!isAdmin && <Btn onClick={() => setBookingModal(true)}>+ New Booking</Btn>}
            </div>

            {isAdmin && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <Select value={bookingFilter} onChange={e => setBookingFilter(e.target.value as BookingStatus | '')} style={{ width: 180 }}>
                  <option value="">All Status</option>
                  {(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as BookingStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
                <Btn onClick={loadBookings} disabled={busy} variant="ghost">Apply</Btn>
              </div>
            )}

            <Table
              cols={['ID', 'Resource', ...(isAdmin ? ['User'] : []), 'Date', 'Time', 'Purpose', 'Status', 'Actions']}
              rows={bookings.map(b => [
                <span style={{ color: '#475569', fontFamily: 'monospace' }}>#{b.id}</span>,
                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Resource #{b.resourceId}</span>,
                ...(isAdmin ? [<span style={{ color: '#94a3b8' }}>User #{b.requestedByUserId}</span>] : []),
                b.bookingDate,
                `${b.startTime} → ${b.endTime}`,
                <span style={{ maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.purpose}</span>,
                <div><Badge label={b.status} />{b.rejectionReason && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{b.rejectionReason}</div>}</div>,
                <div style={{ display: 'flex', gap: 6 }}>
                  {!isAdmin && (b.status === 'PENDING' || b.status === 'APPROVED') && (
                    <Btn variant="danger" onClick={() => cancelBooking(b.id)} style={{ padding: '5px 10px', fontSize: 12 }}>Cancel</Btn>
                  )}
                  {isAdmin && b.status === 'PENDING' && (
                    <>
                      <Btn variant="success" onClick={() => openDecision(b, true)} style={{ padding: '5px 10px', fontSize: 12 }}>Approve</Btn>
                      <Btn variant="danger" onClick={() => openDecision(b, false)} style={{ padding: '5px 10px', fontSize: 12 }}>Reject</Btn>
                    </>
                  )}
                </div>,
              ])}
            />
          </div>
        )}

        {/* ── TICKETS TAB ── */}
        {tab === 2 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{isAdmin ? 'All Tickets' : 'My Tickets'}</h2>
              <Btn onClick={() => setTicketModal(true)}>+ New Ticket</Btn>
            </div>

            <Table
              cols={['ID', 'Category', 'Priority', 'Location', 'Status', ...(isAdmin ? ['Reporter'] : []), 'Created', 'Actions']}
              rows={tickets.map(t => [
                <span style={{ color: '#475569', fontFamily: 'monospace' }}>#{t.id}</span>,
                t.category,
                <Badge label={t.priority} />,
                t.location ?? (t.resourceId ? `Resource #${t.resourceId}` : '—'),
                <Badge label={t.status} />,
                ...(isAdmin ? [<span style={{ color: '#94a3b8' }}>User #{t.reportedByUserId}</span>] : []),
                t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—',
                <Btn variant="ghost" onClick={() => openTicketDetail(t)} style={{ padding: '5px 10px', fontSize: 12 }}>Details →</Btn>,
              ])}
            />
          </div>
        )}

        {/* ── NOTIFICATIONS TAB ── */}
        {tab === 3 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Notifications</h2>
              {unread > 0 && <Btn variant="ghost" onClick={markAllRead}>Mark all read</Btn>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notifications.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: '#334155' }}>No notifications yet</div>}
              {notifications.map(n => (
                <div key={n.id} style={{ background: n.readAt ? 'rgba(255,255,255,0.02)' : 'rgba(99,102,241,0.08)', border: `1px solid ${n.readAt ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.25)'}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: n.readAt ? 400 : 600 }}>{n.message}</div>
                    <div style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>{n.type} · {new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                  {!n.readAt && <Btn variant="ghost" onClick={() => markRead(n.id)} style={{ padding: '5px 12px', fontSize: 12 }}>Mark read</Btn>}
                  {n.readAt && <Badge label="Read" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}

      {/* Resource Create/Edit */}
      <Modal title={resourceModal.mode === 'create' ? 'Add Resource' : 'Edit Resource'} open={resourceModal.open} onClose={() => setResourceModal(m => ({ ...m, open: false }))}>
        <Field label="Name">
          <Input value={resourceModal.data.name ?? ''} onChange={e => setResourceModal(m => ({ ...m, data: { ...m.data, name: e.target.value } }))} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Type">
            <Select value={resourceModal.data.type ?? 'LECTURE_HALL'} onChange={e => setResourceModal(m => ({ ...m, data: { ...m.data, type: e.target.value as ResourceType } }))}>
              {(['LECTURE_HALL', 'LAB', 'MEETING_ROOM', 'EQUIPMENT'] as ResourceType[]).map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </Select>
          </Field>
          <Field label="Capacity">
            <Input type="number" value={resourceModal.data.capacity ?? ''} onChange={e => setResourceModal(m => ({ ...m, data: { ...m.data, capacity: Number(e.target.value) } }))} />
          </Field>
          <Field label="Available From">
            <Input type="time" value={resourceModal.data.availabilityStart ?? ''} onChange={e => setResourceModal(m => ({ ...m, data: { ...m.data, availabilityStart: e.target.value } }))} />
          </Field>
          <Field label="Available To">
            <Input type="time" value={resourceModal.data.availabilityEnd ?? ''} onChange={e => setResourceModal(m => ({ ...m, data: { ...m.data, availabilityEnd: e.target.value } }))} />
          </Field>
        </div>
        <Field label="Location">
          <Input value={resourceModal.data.location ?? ''} onChange={e => setResourceModal(m => ({ ...m, data: { ...m.data, location: e.target.value } }))} />
        </Field>
        <Field label="Status">
          <Select value={resourceModal.data.status ?? 'ACTIVE'} onChange={e => setResourceModal(m => ({ ...m, data: { ...m.data, status: e.target.value as ResourceStatus } }))}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="OUT_OF_SERVICE">OUT OF SERVICE</option>
          </Select>
        </Field>
        <Field label="Description (optional)">
          <Textarea value={resourceModal.data.description ?? ''} onChange={e => setResourceModal(m => ({ ...m, data: { ...m.data, description: e.target.value } }))} />
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
          <Btn variant="ghost" onClick={() => setResourceModal(m => ({ ...m, open: false }))}>Cancel</Btn>
          <Btn onClick={saveResource} disabled={busy}>Save</Btn>
        </div>
      </Modal>

      {/* New Booking */}
      <Modal title="Request Booking" open={bookingModal} onClose={() => setBookingModal(false)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Resource ID">
            <Input type="number" value={bookingForm.resourceId} onChange={e => setBookingForm(f => ({ ...f, resourceId: e.target.value }))} placeholder="e.g. 1" />
          </Field>
          <Field label="Attendees (optional)">
            <Input type="number" value={bookingForm.attendees} onChange={e => setBookingForm(f => ({ ...f, attendees: e.target.value }))} />
          </Field>
          <Field label="Date">
            <Input type="date" value={bookingForm.bookingDate} onChange={e => setBookingForm(f => ({ ...f, bookingDate: e.target.value }))} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Start">
              <Input type="time" value={bookingForm.startTime} onChange={e => setBookingForm(f => ({ ...f, startTime: e.target.value }))} />
            </Field>
            <Field label="End">
              <Input type="time" value={bookingForm.endTime} onChange={e => setBookingForm(f => ({ ...f, endTime: e.target.value }))} />
            </Field>
          </div>
        </div>
        <Field label="Purpose">
          <Textarea value={bookingForm.purpose} onChange={e => setBookingForm(f => ({ ...f, purpose: e.target.value }))} placeholder="Describe the purpose of this booking…" />
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
          <Btn variant="ghost" onClick={() => setBookingModal(false)}>Cancel</Btn>
          <Btn onClick={createBooking} disabled={busy}>Submit Request</Btn>
        </div>
      </Modal>

      {/* Approve/Reject */}
      <Modal title={decisionModal.approve ? '✓ Approve Booking' : '✕ Reject Booking'} open={decisionModal.open} onClose={() => setDecisionModal(m => ({ ...m, open: false }))}>
        {decisionModal.booking && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, fontSize: 13, color: '#94a3b8' }}>
            Booking <strong style={{ color: '#e2e8f0' }}>#{decisionModal.booking.id}</strong> · Resource #{decisionModal.booking.resourceId} · {decisionModal.booking.bookingDate}
          </div>
        )}
        <Field label={decisionModal.approve ? 'Reason (optional)' : 'Rejection reason (recommended)'}>
          <Textarea value={decisionReason} onChange={e => setDecisionReason(e.target.value)} placeholder="Enter reason…" />
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
          <Btn variant="ghost" onClick={() => setDecisionModal(m => ({ ...m, open: false }))}>Cancel</Btn>
          <Btn variant={decisionModal.approve ? 'success' : 'danger'} onClick={submitDecision} disabled={busy}>
            {decisionModal.approve ? 'Confirm Approval' : 'Confirm Rejection'}
          </Btn>
        </div>
      </Modal>

      {/* New Ticket */}
      <Modal title="Report Issue / Ticket" open={ticketModal} onClose={() => setTicketModal(false)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Resource ID (optional)">
            <Input type="number" value={ticketForm.resourceId} onChange={e => setTicketForm(f => ({ ...f, resourceId: e.target.value }))} />
          </Field>
          <Field label="Location (optional)">
            <Input value={ticketForm.location} onChange={e => setTicketForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Block A, Room 201" />
          </Field>
          <Field label="Category">
            <Select value={ticketForm.category} onChange={e => setTicketForm(f => ({ ...f, category: e.target.value as TicketCategory }))}>
              {(['ELECTRICAL', 'NETWORK', 'PROJECTOR', 'HVAC', 'FURNITURE', 'SECURITY', 'OTHER'] as TicketCategory[]).map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={ticketForm.priority} onChange={e => setTicketForm(f => ({ ...f, priority: e.target.value as TicketPriority }))}>
              {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as TicketPriority[]).map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Preferred Contact">
          <Input value={ticketForm.preferredContact} onChange={e => setTicketForm(f => ({ ...f, preferredContact: e.target.value }))} />
        </Field>
        <Field label="Description">
          <Textarea value={ticketForm.description} onChange={e => setTicketForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the issue in detail…" rows={4} />
        </Field>
        <Field label="Attach Images (max 3)">
          <div style={{ border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 8, padding: '16px', textAlign: 'center', cursor: 'pointer', position: 'relative' }}>
            <input type="file" accept="image/*" multiple onChange={e => setTicketForm(f => ({ ...f, images: Array.from(e.target.files ?? []).slice(0, 3) }))} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            <div style={{ color: '#64748b', fontSize: 13 }}>
              {ticketForm.images.length ? ticketForm.images.map(f => f.name).join(', ') : '📎 Click to attach images'}
            </div>
          </div>
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
          <Btn variant="ghost" onClick={() => setTicketModal(false)}>Cancel</Btn>
          <Btn onClick={createTicket} disabled={busy}>Submit Ticket</Btn>
        </div>
      </Modal>

      {/* Ticket Detail */}
      <Modal title={`Ticket #${ticketDetailModal.ticket?.id}`} open={ticketDetailModal.open} onClose={() => setTicketDetailModal(m => ({ ...m, open: false }))}>
        {ticketDetailModal.ticket && (
          <div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <Badge label={ticketDetailModal.ticket.status} />
              <Badge label={ticketDetailModal.ticket.priority} />
              <Badge label={ticketDetailModal.ticket.category} />
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '14px', marginBottom: 16, fontSize: 14, color: '#cbd5e1', lineHeight: 1.6 }}>
              {ticketDetailModal.ticket.description}
            </div>

            {/* Attachments */}
            {(ticketDetailModal.ticket.attachments ?? []).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Attachments</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(ticketDetailModal.ticket.attachments ?? []).map(a => (
                    <a key={a.id} href={`${API}${a.downloadUrl}`} target="_blank" rel="noreferrer" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 6, padding: '5px 12px', color: '#818cf8', fontSize: 12, textDecoration: 'none' }}>
                      📎 {a.originalFileName}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Controls */}
            {isAdmin && (
              <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#f87171', fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>Admin Controls</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Status">
                    <Select value={adminTicketForm.status} onChange={e => setAdminTicketForm(f => ({ ...f, status: e.target.value as TicketStatus }))}>
                      {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'] as TicketStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </Field>
                  <Field label="Assign to User ID">
                    <Input value={adminTicketForm.assignedToUserId} onChange={e => setAdminTicketForm(f => ({ ...f, assignedToUserId: e.target.value }))} placeholder="User ID" />
                  </Field>
                </div>
                {adminTicketForm.status === 'REJECTED' && (
                  <Field label="Rejection Reason">
                    <Textarea value={adminTicketForm.rejectionReason} onChange={e => setAdminTicketForm(f => ({ ...f, rejectionReason: e.target.value }))} />
                  </Field>
                )}
                {(adminTicketForm.status === 'RESOLVED' || adminTicketForm.status === 'CLOSED') && (
                  <Field label="Resolution Notes">
                    <Textarea value={adminTicketForm.resolutionNotes} onChange={e => setAdminTicketForm(f => ({ ...f, resolutionNotes: e.target.value }))} />
                  </Field>
                )}
                <Btn onClick={updateTicketStatus} disabled={busy}>Save Changes</Btn>
              </div>
            )}

            {/* Comments */}
            <div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>Comments</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {(ticketDetailModal.ticket.comments ?? []).length === 0 && <div style={{ color: '#334155', fontSize: 13, textAlign: 'center', padding: 16 }}>No comments yet</div>}
                {(ticketDetailModal.ticket.comments ?? []).map(c => (
                  <div key={c.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px' }}>
                    {editCommentId === c.id ? (
                      <div>
                        <Textarea value={editCommentBody} onChange={e => setEditCommentBody(e.target.value)} />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <Btn onClick={() => saveEditComment(ticketDetailModal.ticket!.id, c.id)} disabled={busy} style={{ fontSize: 12, padding: '5px 12px' }}>Save</Btn>
                          <Btn variant="ghost" onClick={() => setEditCommentId(null)} style={{ fontSize: 12, padding: '5px 12px' }}>Cancel</Btn>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>{c.body}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: '#475569' }}>User #{c.authorUserId} · {new Date(c.createdAt).toLocaleString()}</span>
                          {c.authorUserId === user?.userId && (
                            <>
                              <Btn variant="ghost" onClick={() => { setEditCommentId(c.id); setEditCommentBody(c.body) }} style={{ fontSize: 11, padding: '2px 8px' }}>Edit</Btn>
                              <Btn variant="danger" onClick={() => deleteComment(ticketDetailModal.ticket!.id, c.id)} style={{ fontSize: 11, padding: '2px 8px' }}>Delete</Btn>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <Field label="Add Comment">
                <Textarea value={ticketComment} onChange={e => setTicketComment(e.target.value)} placeholder="Write a comment…" />
              </Field>
              <Btn onClick={addComment} disabled={busy || !ticketComment.trim()} variant="ghost">Post Comment</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}