import axios from 'axios'
import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams, PopulatedRef, DeleteImpactResponse, PublishStatus } from '@/types/api.types'
import type { VisibleTo } from './liveSessions.service'

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type WorkshopStatus = 'scheduled' | 'live' | 'completed' | 'cancelled'
export type EnrollmentMode = 'open' | 'enrollment_required' | 'disabled'
export type CapacityMode = 'limited' | 'unlimited'

/** One day of a workshop, as returned by the admin detail endpoint. */
export interface WorkshopDay {
  session_id: string
  day_number: number
  title: string
  description: string
  scheduled_start_time: string
  scheduled_end_time: string
  duration_minutes: number
  status: WorkshopStatus
  faculty_id: string | null
  faculty_name: string | null
  zoom_meeting_id: string | null
  zoom_join_url: string | null
  zoom_host_url: string | null
  attendee_count: number
  recording_count: number
}

/** A day as submitted by the form. `session_id` present = update an existing day. */
export interface WorkshopDayInput {
  session_id?: string | null
  title: string
  description?: string
  faculty_id?: string | null
  scheduled_start_time: string
  scheduled_end_time: string
}

export interface Workshop {
  _id: string
  title: string
  description: string
  subject_id: PopulatedRef | string
  faculty_ids: PopulatedRef[] | string[]
  thumbnail_url: string | null
  thumbnail_s3_key: string | null
  /** Brochure PDF — a separate artefact from the thumbnail image above. */
  brochure_url: string | null
  brochure_s3_key: string | null
  brochure_filename: string | null
  start_date: string
  end_date: string
  day_count: number
  total_duration_minutes: number
  price: number
  compare_at_price: number | null
  is_free: boolean
  zoho_item_id: string | null
  registration_closes_at: string | null
  enrollment_mode: EnrollmentMode
  capacity_mode: CapacityMode
  max_seats: number | null
  allow_waitlist: boolean
  guaranteed_seats_for_paid: boolean
  visible_to: VisibleTo
  visible_to_subjects: string[]
  visible_to_packages: string[]
  certificate_enabled: boolean
  certificate_min_days_attended: number | null
  certificate_signatory_name: string | null
  certificate_signatory_title: string | null
  platform: 'zoom' | 'agora' | 'teams' | 'other'
  auto_admit_users: boolean
  allow_join_before_host: boolean
  status: WorkshopStatus
  publish_status: PublishStatus
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  // Enriched by the admin endpoints
  enrollment_count?: number
  waitlist_count?: number
  purchase_count?: number
  certificate_count?: number
  days?: WorkshopDay[]
}

export interface WorkshopFormData {
  title: string
  description: string
  subject_id: string
  faculty_ids?: string[]
  days?: WorkshopDayInput[]
  thumbnail_url?: string
  thumbnail_s3_key?: string
  /** Brochure PDF. Send null to clear it without touching the thumbnail. */
  brochure_url?: string | null
  brochure_s3_key?: string | null
  brochure_filename?: string | null
  platform?: 'zoom' | 'agora' | 'teams' | 'other'
  price?: number
  is_free?: boolean
  registration_closes_at?: string | null
  enrollment_mode?: EnrollmentMode
  capacity_mode?: CapacityMode
  max_seats?: number | null
  allow_waitlist?: boolean
  guaranteed_seats_for_paid?: boolean
  auto_admit_users?: boolean
  allow_join_before_host?: boolean
  visible_to?: VisibleTo
  visible_to_subjects?: string[]
  visible_to_packages?: string[]
  certificate_enabled?: boolean
  certificate_min_days_attended?: number | null
  certificate_signatory_name?: string | null
  certificate_signatory_title?: string | null
  publish_status?: PublishStatus
}

export interface WorkshopEnrolleeUser {
  _id: string
  name: string
  email: string
  phone_number: string
  student_id: string | null
  ug_college: string | null
  pg_college: string | null
}

export interface WorkshopEnrollee {
  _id: string
  workshop_id: string
  user_id: WorkshopEnrolleeUser
  enrollment_type: 'paid' | 'free' | 'admin_override'
  enrollment_status: 'confirmed' | 'waitlisted' | 'cancelled'
  has_guaranteed_seat: boolean
  waitlist_position: number | null
  enrolled_at: string
  purchase_id: {
    _id: string
    amount_paid: number
    purchased_at: string
    is_revoked: boolean
    is_admin_granted: boolean
  } | null
  attended_day_numbers: number[]
  days_attended: number
  certificate: {
    certificate_number: string
    issued_at: string
    revoked: boolean
  } | null
}

export interface WorkshopEnrolleesResponse {
  workshop: {
    _id: string
    title: string
    start_date: string
    end_date: string
    day_count: number
    max_seats: number | null
  }
  days: Array<{ session_id: string; day_number: number; title: string; status: WorkshopStatus }>
  total_enrollees: number
  by_status: { confirmed: number; waitlisted: number; cancelled: number }
  enrollees: WorkshopEnrollee[]
}

export interface WorkshopsListParams extends BaseListParams {
  subject_id?: string
  status?: string
  upcoming?: boolean
  publish_status?: string | null
}

// ----------------------------------------------------------------------------
// Service
// ----------------------------------------------------------------------------

class WorkshopsService {
  private basePath = 'admin/workshops'

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

  async getAll(params: WorkshopsListParams = {}): Promise<ApiResponse<ListResponse<Workshop>>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    const response = await apiService.get<{ workshops: Workshop[]; pagination: ListResponse<Workshop>['pagination'] }>(
      `${this.basePath}${query}`,
    )
    if (response.success && response.data) {
      return {
        ...response,
        data: {
          entities: response.data.workshops || [],
          pagination: response.data.pagination,
        },
      }
    }
    return response as unknown as ApiResponse<ListResponse<Workshop>>
  }

  async getById(workshopId: string): Promise<ApiResponse<Workshop>> {
    const response = await apiService.get<{ workshop: Workshop }>(`${this.basePath}/${workshopId}`)
    if (response.success && response.data) {
      return { ...response, data: response.data.workshop }
    }
    return response as unknown as ApiResponse<Workshop>
  }

  async create(data: WorkshopFormData): Promise<ApiResponse<Workshop>> {
    const response = await apiService.post<{ workshop: Workshop }>(this.basePath, data)
    if (response.success && response.data) {
      return { ...response, data: response.data.workshop }
    }
    return response as unknown as ApiResponse<Workshop>
  }

  async update(workshopId: string, data: Partial<WorkshopFormData>): Promise<ApiResponse<Workshop>> {
    const response = await apiService.put<{ workshop: Workshop }>(`${this.basePath}/${workshopId}`, data)
    if (response.success && response.data) {
      return { ...response, data: response.data.workshop }
    }
    return response as unknown as ApiResponse<Workshop>
  }

  async cancel(workshopId: string): Promise<ApiResponse<{ enrollments_cancelled: number; refunds_pending: number }>> {
    return apiService.post(`${this.basePath}/${workshopId}/cancel`)
  }

  async cancelDay(workshopId: string, sessionId: string): Promise<ApiResponse<{ workshop: Workshop }>> {
    return apiService.post(`${this.basePath}/${workshopId}/days/${sessionId}/cancel`)
  }

  async getDeleteImpact(workshopId: string): Promise<ApiResponse<DeleteImpactResponse>> {
    return apiService.get<DeleteImpactResponse>(`${this.basePath}/${workshopId}/delete-impact`)
  }

  async archive(workshopId: string): Promise<ApiResponse<void>> {
    return apiService.patch<void>(`${this.basePath}/${workshopId}/archive`, {})
  }

  async restore(workshopId: string): Promise<ApiResponse<void>> {
    return apiService.patch<void>(`${this.basePath}/${workshopId}/restore`, {})
  }

  async delete(workshopId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`${this.basePath}/${workshopId}`)
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
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    })

    return { thumbnailUrl, s3Key }
  }

  /**
   * Upload the workshop brochure PDF.
   *
   * Deliberately separate from uploadThumbnail: different endpoint, different
   * S3 folder, different accepted type. Replacing the brochure never touches
   * the thumbnail and vice versa.
   */
  async uploadBrochure(
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<{ brochureUrl: string; s3Key: string; filename: string }> {
    // The backend only accepts application/pdf. Some browsers report an empty
    // type for a file dragged in from certain sources, so fall back rather
    // than sending '' and getting a confusing 400.
    const mimeType = file.type || 'application/pdf'

    const urlRes = await apiService.post<{ uploadUrl: string; s3Key: string; brochureUrl: string }>(
      `${this.basePath}/brochure-upload-url`,
      { mimeType },
    )
    if (!urlRes.success || !urlRes.data) {
      throw new Error(urlRes.message || 'Failed to get upload URL')
    }
    const { uploadUrl, s3Key, brochureUrl } = urlRes.data

    await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': mimeType },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    })

    return { brochureUrl, s3Key, filename: file.name }
  }

  // --- Enrollees -------------------------------------------------------------

  async getEnrollees(workshopId: string, enrollmentStatus?: string): Promise<ApiResponse<WorkshopEnrolleesResponse>> {
    const query = enrollmentStatus ? `?enrollment_status=${enrollmentStatus}` : ''
    return apiService.get<WorkshopEnrolleesResponse>(`${this.basePath}/${workshopId}/enrollees${query}`)
  }

  async grantAccess(
    workshopId: string,
    data: { user_id: string; reason?: string; notes?: string },
  ): Promise<ApiResponse<{ enrollment_id: string }>> {
    return apiService.post(`${this.basePath}/${workshopId}/grant-access`, data)
  }

  async revokeEnrollment(
    workshopId: string,
    enrollmentId: string,
    reason?: string,
  ): Promise<ApiResponse<{ enrollment_id: string; workshop_id: string; message: string }>> {
    return apiService.put(`${this.basePath}/${workshopId}/enrollees/${enrollmentId}/revoke`, { reason })
  }

  // --- Notifications ---------------------------------------------------------

  async getNotificationPreview(workshopId: string): Promise<ApiResponse<{
    title: string
    message: string
    audience_label: string
    user_count: number
    visible_to: VisibleTo
  }>> {
    return apiService.get(`${this.basePath}/${workshopId}/notification-preview`)
  }

  async sendNotification(
    workshopId: string,
    data: { title: string; message: string },
  ): Promise<ApiResponse<{ sent: number; failed: number; total: number }>> {
    return apiService.post(`${this.basePath}/${workshopId}/send-notification`, data)
  }

  // --- Certificates ----------------------------------------------------------

  async issueCertificates(workshopId: string): Promise<ApiResponse<{
    issued: number
    skipped: number
    failed: number
    errors: string[]
  }>> {
    return apiService.post(`${this.basePath}/${workshopId}/certificates/issue`)
  }
}

export const workshopsService = new WorkshopsService()
