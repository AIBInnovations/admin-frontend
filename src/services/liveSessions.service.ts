import axios from 'axios'
import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams, PopulatedRef, DeleteImpactResponse, PublishStatus } from '@/types/api.types'

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
  enrollment_count: number
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
  publish_status: PublishStatus
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
  publish_status?: PublishStatus
}

export interface EnrolleeUser {
  _id: string
  name: string
  email: string
  phone_number: string
  student_id: string | null
  ug_college: string | null
  pg_college: string | null
}

export interface Enrollee {
  _id: string
  session_id: string
  user_id: EnrolleeUser
  enrollment_type: 'paid' | 'free' | 'admin_override'
  enrollment_status: 'confirmed' | 'waitlisted' | 'cancelled'
  has_guaranteed_seat: boolean
  enrolled_at: string
  purchase_id: { amount_paid: number; purchased_at: string } | null
}

export interface EnrolleesResponse {
  session: { _id: string; title: string; scheduled_start_time: string; max_attendees: number | null }
  total_enrollees: number
  by_status: { confirmed: number; waitlisted: number; cancelled: number }
  enrollees: Enrollee[]
}

export interface LiveSessionsListParams extends BaseListParams {
  subject_id?: string
  status?: string
  upcoming?: boolean
  publish_status?: string | null
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

  async getEnrollees(sessionId: string, enrollmentStatus?: string): Promise<ApiResponse<EnrolleesResponse>> {
    const query = enrollmentStatus ? `?enrollment_status=${enrollmentStatus}` : ''
    return apiService.get<EnrolleesResponse>(`admin/session-enrollments/${sessionId}/enrollees${query}`)
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

  async getNotificationPreview(sessionId: string): Promise<ApiResponse<{
    title: string
    message: string
    audience_label: string
    user_count: number
    visible_to: VisibleTo
  }>> {
    return apiService.get(`${this.basePath}/${sessionId}/notification-preview`)
  }

  async sendNotification(sessionId: string, data: { title: string; message: string }): Promise<ApiResponse<{
    sent: number
    failed: number
    total: number
  }>> {
    return apiService.post(`${this.basePath}/${sessionId}/send-notification`, data)
  }

  async getBannerStatus(sessionId: string): Promise<ApiResponse<{ has_active_banner: boolean; banner_id: string | null }>> {
    return apiService.get(`${this.basePath}/${sessionId}/banner-status`)
  }

  async createBanner(sessionId: string): Promise<ApiResponse<{ banner: any }>> {
    return apiService.post(`${this.basePath}/${sessionId}/create-banner`)
  }

  async hideBanner(sessionId: string): Promise<ApiResponse<{ banner: any }>> {
    return apiService.post(`${this.basePath}/${sessionId}/hide-banner`)
  }

  async convertToPackage(
    sessionId: string,
    data: { package_type_id: string; price?: number; duration_days?: number },
  ): Promise<ApiResponse<{ package_id: string; package_name: string; series_count: number; module_count: number; video_count: number; purchases_migrated: number }>> {
    return apiService.post(`${this.basePath}/${sessionId}/convert-to-package`, data)
  }
}

export const liveSessionsService = new LiveSessionsService()
