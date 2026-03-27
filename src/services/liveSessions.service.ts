import axios from 'axios'
import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams, PopulatedRef, DeleteImpactResponse } from '@/types/api.types'

export type VisibleTo = 'all' | 'subject' | 'package'

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
  zoom_host_url: string | null
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  max_attendees: number | null
  current_attendees: number
  thumbnail_url: string | null
  thumbnail_s3_key: string | null
  visible_to: VisibleTo
  visible_to_subjects: string[]
  visible_to_packages: string[]
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
  faculty_id?: string | null
  scheduled_start_time: string
  scheduled_end_time: string
  platform: 'zoom' | 'agora' | 'teams' | 'other'
  status?: string
  max_attendees?: number
  auto_admit_users?: boolean
  allow_join_before_host?: boolean
  meeting_link?: string
  thumbnail_url?: string
  thumbnail_s3_key?: string
  visible_to?: VisibleTo
  visible_to_subjects?: string[]
  visible_to_packages?: string[]
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

  /**
   * Get delete impact — checks what depends on this entity before deletion
   */
  async getDeleteImpact(sessionId: string): Promise<ApiResponse<DeleteImpactResponse>> {
    return apiService.get<DeleteImpactResponse>(`${this.basePath}/${sessionId}/delete-impact`)
  }

  async archive(sessionId: string): Promise<ApiResponse<void>> {
    return apiService.patch<void>(`${this.basePath}/${sessionId}/archive`, {})
  }

  async delete(sessionId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`${this.basePath}/${sessionId}`)
  }

  async uploadThumbnail(
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<{ thumbnailUrl: string; s3Key: string }> {
    const urlRes = await apiService.post<{ uploadUrl: string; s3Key: string; thumbnailUrl: string }>(
      `${this.basePath}/thumbnail-upload-url`,
      { mimeType: file.type || 'image/jpeg' },
    )
    if (!urlRes.success || !urlRes.data) {
      throw new Error(urlRes.message || 'Failed to get upload URL')
    }
    const { uploadUrl, s3Key, thumbnailUrl } = urlRes.data

    await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type || 'image/jpeg' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })

    return { thumbnailUrl, s3Key }
  }

  async convertToPackage(
    sessionId: string,
    data: { package_type_id: string; price?: number; duration_days?: number },
  ): Promise<ApiResponse<{ package_id: string; package_name: string; series_count: number; module_count: number; video_count: number; purchases_migrated: number }>> {
    return apiService.post(`${this.basePath}/${sessionId}/convert-to-package`, data)
  }
}

export const liveSessionsService = new LiveSessionsService()
