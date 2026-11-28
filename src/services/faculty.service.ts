import axios from 'axios'
import { apiService, ApiResponse } from './api.service'
import { BaseCrudService } from './base.service'
import type { BaseListParams } from '@/types/api.types'

// Types
export interface FacultySubject {
  _id: string
  name: string
  icon_url?: string | null
  is_active?: boolean
}

export interface FacultyRating {
  average: number | null
  rating_count: number
  review_count?: number
  open_count: number
}

export interface Faculty {
  _id: string
  /** PGMEF001: given on create, never changed or reused. Null on a row from before codes (until the backfill runs) or from an older backend. */
  faculty_code?: string | null
  name: string
  email: string | null
  phone: string | null
  photo_url: string | null
  photo_s3_key: string | null
  bio: string | null
  qualifications: string | null
  experience_years: number | null
  specialization: string
  /** The primary subject (populated in lists, an id in the detail). */
  subject_id: { _id: string; name: string; icon_url?: string } | string | null
  /** Every subject, primary first. Absent on a backend older than multiple subjects. */
  subject_ids?: string[]
  subjects?: FacultySubject[]
  /** Only with `with_rating`, and only for admins who may read videos. */
  rating?: FacultyRating
  display_order: number
  is_active: boolean
  is_verified: boolean
  last_login: string | null
  video_count?: number
  live_session_count?: number
  workshop_count?: number
  has_password?: boolean
  createdAt: string
  updatedAt: string
}

/** `null` clears an optional field. */
export interface FacultyFormData {
  name: string
  specialization?: string | null
  subject_id?: string | null
  subject_ids?: string[]
  display_order?: number
  email?: string | null
  phone?: string | null
  photo_url?: string | null
  photo_s3_key?: string | null
  bio?: string | null
  qualifications?: string | null
  experience_years?: number | null
  is_active?: boolean
}

export interface FacultyListParams extends BaseListParams {
  specialization?: string
  /** Teaches this subject, as the primary or as one of several. */
  subject_id?: string
  is_active?: boolean | null
  with_rating?: boolean
}

export interface FacultyVideo {
  _id: string
  title: string
  thumbnail_url: string | null
  duration_seconds: number
  view_count: number
  publish_status: 'draft' | 'published'
  archivedAt: string | null
  module: { _id: string; name: string } | null
  series: { _id: string; name: string } | null
  package: { _id: string; name: string } | null
  subject_id: string | null
  rating?: FacultyRating
}

export interface FacultySession {
  _id: string
  title: string
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  scheduled_start_time: string
  duration_minutes: number
  subject_id: { _id: string; name: string } | null
  workshop_id: { _id: string; title: string } | null
  workshop_day: number | null
}

export interface FacultyPageResult<T> {
  entities: T[]
  pagination: { total: number; page: number; limit: number; totalPages: number }
}

/** Every subject of a faculty member, primary first, whatever the backend version. */
export function subjectsOf(f: Faculty): FacultySubject[] {
  if (f.subjects) return f.subjects
  return f.subject_id && typeof f.subject_id === 'object' ? [f.subject_id] : []
}

class FacultyService extends BaseCrudService<Faculty, FacultyFormData, FacultyListParams> {
  constructor() {
    super('admin/faculty', 'faculty')
  }

  /**
   * Verify or unverify a faculty member
   */
  async verifyFaculty(
    facultyId: string,
    isVerified: boolean,
  ): Promise<ApiResponse<{ faculty_id: string; is_verified: boolean; message: string }>> {
    return apiService.put(`${this.basePath}/${facultyId}/verify`, { is_verified: isVerified })
  }

  /**
   * Get faculty performance analytics
   */
  async getPerformance(facultyId: string): Promise<ApiResponse<any>> {
    return apiService.get(`${this.basePath}/${facultyId}/performance`)
  }

  /**
   * Get faculty schedule
   */
  async getSchedule(
    facultyId: string,
    params?: { start_date?: string; end_date?: string },
  ): Promise<ApiResponse<any>> {
    const query = new URLSearchParams()
    if (params?.start_date) query.append('start_date', params.start_date)
    if (params?.end_date) query.append('end_date', params.end_date)
    const str = query.toString()
    return apiService.get(`${this.basePath}/${facultyId}/schedule${str ? `?${str}` : ''}`)
  }

  /** One page of this lecturer's videos, with their place in the course and their rating. */
  async getVideos(facultyId: string, params: { page?: number; limit?: number; search?: string } = {}): Promise<ApiResponse<FacultyPageResult<FacultyVideo>>> {
    return apiService.get(`${this.basePath}/${facultyId}/videos${this.buildQuery(params)}`)
  }

  /** One page of this lecturer's live sessions, workshop days included. */
  async getSessions(
    facultyId: string,
    params: { page?: number; limit?: number; when?: 'upcoming' | 'past' } = {},
  ): Promise<ApiResponse<FacultyPageResult<FacultySession> & { upcoming_count: number }>> {
    return apiService.get(`${this.basePath}/${facultyId}/sessions${this.buildQuery(params)}`)
  }

  /**
   * Upload faculty photo to S3.
   * 3-step flow: get presigned URL -> upload to S3 -> return photo URL & s3 key.
   */
  async uploadPhoto(
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<{ photoUrl: string; s3Key: string }> {
    // Step 1: Get presigned upload URL
    const urlRes = await apiService.post<{ uploadUrl: string; s3Key: string; photoUrl: string }>(
      `${this.basePath}/photo-upload-url`,
      { mimeType: file.type || 'image/jpeg' },
    )
    if (!urlRes.success || !urlRes.data) {
      throw new Error(urlRes.message || 'Failed to get upload URL')
    }
    const { uploadUrl, s3Key, photoUrl } = urlRes.data

    // Step 2: Upload directly to S3
    await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type || 'image/jpeg' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })

    return { photoUrl, s3Key }
  }
}

export const facultyService = new FacultyService()
