import { api } from './http'

export type BookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export type Booking = {
  id: number
  resourceId: number
  requestedByUserId: number
  bookingDate: string
  startTime: string
  endTime: string
  purpose: string
  status: BookingStatus
  adminDecisionReason?: string | null
  createdAt: string
  updatedAt: string
}

export async function createBooking(payload: {
  resourceId: number
  bookingDate: string
  startTime: string
  endTime: string
  purpose: string
}) {
  const res = await api.post<Booking>('/api/bookings', payload)
  return res.data
}

export async function fetchMyBookings() {
  const res = await api.get<Booking[]>('/api/bookings/my')
  return res.data
}

export async function fetchAllBookings(status?: BookingStatus) {
  const res = await api.get<Booking[]>('/api/bookings', { params: status ? { status } : undefined })
  return res.data
}

export async function decideBooking(id: number, payload: { approved: boolean; reason?: string }) {
  const res = await api.put<Booking>(`/api/bookings/${id}/status`, payload)
  return res.data
}

export async function cancelBooking(id: number) {
  await api.delete(`/api/bookings/${id}`)
}

