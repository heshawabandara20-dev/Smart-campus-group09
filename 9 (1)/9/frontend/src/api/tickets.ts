import { api } from './http'

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REJECTED'
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type TicketCategory = 'ELECTRICAL' | 'NETWORK' | 'PROJECTOR' | 'HVAC' | 'FURNITURE' | 'SECURITY' | 'OTHER'

export type TicketAttachment = {
  id: number
  originalFileName: string
  contentType: string
  sizeBytes: number
  downloadUrl: string
  createdAt: string
}

export type TicketComment = {
  id: number
  authorUserId: number
  body: string
  createdAt: string
  updatedAt: string
}

export type Ticket = {
  id: number
  resourceId?: number | null
  location: string
  category: TicketCategory
  priority: TicketPriority
  description: string
  preferredContact: string
  createdByUserId: number
  assignedToUserId?: number | null
  status: TicketStatus
  rejectionReason?: string | null
  resolutionNotes?: string | null
  createdAt: string
  updatedAt: string
  attachments?: TicketAttachment[]
  comments?: TicketComment[]
}

export async function createTicket(payload: {
  resourceId?: number
  location?: string
  category: TicketCategory
  priority: TicketPriority
  description: string
  preferredContact: string
  images?: File[]
}) {
  const fd = new FormData()
  if (payload.resourceId) fd.append('resourceId', String(payload.resourceId))
  if (payload.location) fd.append('location', payload.location)
  fd.append('category', payload.category)
  fd.append('priority', payload.priority)
  fd.append('description', payload.description)
  fd.append('preferredContact', payload.preferredContact)
  ;(payload.images ?? []).slice(0, 3).forEach((f) => fd.append('images', f))

  const res = await api.post<Ticket>('/api/tickets', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function fetchMyTickets() {
  const res = await api.get<Ticket[]>('/api/tickets/my')
  return res.data
}

export async function fetchAllTickets() {
  const res = await api.get<Ticket[]>('/api/tickets')
  return res.data
}

export async function fetchTicket(id: number) {
  const res = await api.get<Ticket>(`/api/tickets/${id}`)
  return res.data
}

export async function updateTicketStatus(
  id: number,
  payload: { status: TicketStatus; assignedToUserId?: number; rejectionReason?: string; resolutionNotes?: string },
) {
  const res = await api.put<Ticket>(`/api/tickets/${id}/status`, payload)
  return res.data
}

export async function addTicketComment(id: number, body: string) {
  const res = await api.post<TicketComment>(`/api/tickets/${id}/comments`, { body })
  return res.data
}

