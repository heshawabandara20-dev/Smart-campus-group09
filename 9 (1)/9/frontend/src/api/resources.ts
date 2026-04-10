import { api } from './http'

export type ResourceType = 'LECTURE_HALL' | 'LAB' | 'MEETING_ROOM' | 'EQUIPMENT'
export type ResourceStatus = 'ACTIVE' | 'OUT_OF_SERVICE'

export type Resource = {
  id: number
  name: string
  type: ResourceType
  capacity: number
  location: string
  status: ResourceStatus
  createdAt: string
  updatedAt: string
}

export async function fetchResources(params?: {
  type?: ResourceType
  minCapacity?: number
  location?: string
  status?: ResourceStatus
}) {
  const res = await api.get<Resource[]>('/api/resources', { params })
  return res.data
}

