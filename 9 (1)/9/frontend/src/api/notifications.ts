import { api } from './http'

export type NotificationType = 'TICKET_STATUS_CHANGED' | 'TICKET_COMMENT_ADDED'

export type Notification = {
  id: number
  type: NotificationType
  message: string
  relatedTicketId?: number | null
  createdAt: string
  readAt?: string | null
}

export async function fetchMyNotifications() {
  const res = await api.get<Notification[]>('/api/notifications/my')
  return res.data
}

export async function markNotificationRead(id: number) {
  const res = await api.put<Notification>(`/api/notifications/${id}/read`, {})
  return res.data
}

