import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams, PopulatedRef } from '@/types/api.types'

// Types
export interface LiveSession {
  _id: string
  title: string
  description: string
  subject_id: PopulatedRef | string
  series_id: PopulatedRef | string | null
  faculty_id: PopulatedRef | string | null
  scheduled_start_time: string
  scheduled_end_time: string
  duration_minutes: number
  meeting_link: string | null
  platform: 'zoom' | 'agora' | 'teams' | 'other'
  zoom_meeting_id: string | null
  zoom_join_url: string | null
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  max_attendees: number | null
  current_attendees: number
  thumbnail_url: string | null
  price: number
  compare_at_price: number | null
  is_free: boolean
  enrollment_mode: 'open' | 'enrollment_required' | 'disabled'
  capacity_mode: 'limited' | 'unlimited'
  guaranteed_seats_for_paid: boolean
  allow_waitlist: boolean
  auto_admit_users: boolean
  allow_join_before_host: boolean
  createdAt: string
  updatedAt: string
}

export interface LiveSessionFormData {
  title: string
  description: string
  subject_id: string
  faculty_id?: string
  scheduled_start_time: string
  scheduled_end_time: string
  platform: 'zoom' | 'agora' | 'teams' | 'other'
  status?: string
  max_attendees?: number
  auto_admit_users?: boolean
  allow_join_before_host?: boolean
  meeting_link?: string
  thumbnail_url?: string
  price?: number
  is_free?: boolean
  enrollment_mode?: 'open' | 'enrollment_required' | 'disabled'
  capacity_mode?: 'limited' | 'unlimited'
  allow_waitlist?: boolean
  guaranteed_seats_for_paid?: boolean
}

export interface LiveSessionsListParams extends BaseListParams {
  subject_id?: string
  status?: string
  upcoming?: boolean
}

class LiveSessionsService {
  private basePath = 'admin/live-sessions'

  private buildQuery(params: Record<string, unknown>): string {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== '') {
        query.append(key, String(value))
      }
    }
    const str = query.toString()
    return str ? `?${str}` : ''
  }

  async getAll(params: LiveSessionsListParams = {}): Promise<ApiResponse<ListResponse<LiveSession>>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    const response = await apiService.get<{ sessions: LiveSession[]; pagination: ListResponse<LiveSession>['pagination'] }>(`${this.basePath}${query}`)
    if (response.success && response.data) {
      return {
        ...response,
        data: {
          entities: response.data.sessions || [],
          pagination: response.data.pagination,
        },
      }
    }
    return response as ApiResponse<ListResponse<LiveSession>>
  }

  async getById(sessionId: string): Promise<ApiResponse<LiveSession>> {
    const response = await apiService.get<{ session: LiveSession }>(`${this.basePath}/${sessionId}`)
    if (response.success && response.data) {
      return { ...response, data: response.data.session }
    }
    return response as ApiResponse<LiveSession>
  }

  async create(data: LiveSessionFormData): Promise<ApiResponse<LiveSession>> {
    const response = await apiService.post<{ session: LiveSession }>(this.basePath, data)
    if (response.success && response.data) {
      return { ...response, data: response.data.session }
    }
    return response as ApiResponse<LiveSession>
  }

  async update(sessionId: string, data: Partial<LiveSessionFormData>): Promise<ApiResponse<LiveSession>> {
    const response = await apiService.put<{ session: LiveSession }>(`${this.basePath}/${sessionId}`, data)
    if (response.success && response.data) {
      return { ...response, data: response.data.session }
    }
    return response as ApiResponse<LiveSession>
  }

  async cancel(sessionId: string): Promise<ApiResponse<LiveSession>> {
    const response = await apiService.post<{ session: LiveSession }>(`${this.basePath}/${sessionId}/cancel`)
    if (response.success && response.data) {
      return { ...response, data: response.data.session }
    }
    return response as ApiResponse<LiveSession>
  }

  async delete(sessionId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`${this.basePath}/${sessionId}`)
  }
}

export const liveSessionsService = new LiveSessionsService()
