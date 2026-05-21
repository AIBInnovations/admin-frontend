import { apiService, ApiResponse } from './api.service'
import type { BaseListParams } from '@/types/api.types'

// ─── Shared sub-types ────────────────────────────────────────────────────────

export interface ReviewUser {
  _id: string
  name: string
  phone_number: string
  photo_url?: string | null
}

export interface ReviewVideo {
  _id: string
  title: string
  thumbnail_url: string | null
  duration_seconds: number
  // View metrics (present on by-video summaries)
  view_count?: number
  unique_viewer_count?: number
  total_watch_seconds?: number
  createdAt?: string
}

export interface ReviewFaculty {
  _id: string
  name: string
  photo_url?: string | null
}

export interface ReviewModule {
  _id: string
  name: string
}

export interface ReviewSeries {
  _id: string
  name: string
}

export interface ReviewPackage {
  _id: string
  name: string
}

// ─── Review item (flat list) ─────────────────────────────────────────────────

export interface VideoReview {
  _id: string
  rating: number | null
  rating_submitted_at: string | null
  feedback: string | null
  feedback_submitted_at: string | null
  createdAt: string
  user: ReviewUser
  video: ReviewVideo
  faculty: ReviewFaculty | null
  module: ReviewModule
  series: ReviewSeries
  package: ReviewPackage
}

// ─── Grouped summary cards ────────────────────────────────────────────────────

export interface VideoSummary {
  video: ReviewVideo
  faculty: ReviewFaculty | null
  module: ReviewModule
  series: ReviewSeries
  package: ReviewPackage
  avg_rating: number | null
  review_count: number
  rating_count: number
  feedback_count: number
  latest_at: string
}

export interface TeacherSummary {
  faculty: ReviewFaculty
  avg_rating: number | null
  review_count: number
  rating_count: number
  feedback_count: number
  video_count: number
  latest_at: string
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface ReviewPagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface ReviewListResponse {
  reviews: VideoReview[]
  pagination: ReviewPagination
}

export interface ByVideoResponse {
  videos: VideoSummary[]
  pagination: ReviewPagination
}

export interface ByTeacherResponse {
  teachers: TeacherSummary[]
  pagination: ReviewPagination
}

// ─── Params ───────────────────────────────────────────────────────────────────

export interface ReviewListParams extends BaseListParams {
  video_id?: string
  faculty_id?: string
  has_rating?: boolean
  has_feedback?: boolean
}

export interface ByVideoParams extends BaseListParams {
  faculty_id?: string
  subject_id?: string
  package_id?: string
  series_id?: string
  module_id?: string
  // sort_by: 'default' | 'upload_date' | 'most_views' | 'most_rated' (via BaseListParams.sort_by)
}

// ─── Service ──────────────────────────────────────────────────────────────────

class VideoReviewsService {
  private basePath = 'admin/video-reviews'

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

  /** Flat paginated list of all reviews. */
  async getList(params: ReviewListParams = {}): Promise<ApiResponse<ReviewListResponse>> {
    return apiService.get<ReviewListResponse>(
      `${this.basePath}${this.buildQuery(params as Record<string, unknown>)}`
    )
  }

  /** Grouped by video — summary cards. */
  async getByVideo(params: ByVideoParams = {}): Promise<ApiResponse<ByVideoResponse>> {
    return apiService.get<ByVideoResponse>(
      `${this.basePath}/by-video${this.buildQuery(params as Record<string, unknown>)}`
    )
  }

  /** Grouped by teacher — summary cards. */
  async getByTeacher(params: BaseListParams = {}): Promise<ApiResponse<ByTeacherResponse>> {
    return apiService.get<ByTeacherResponse>(
      `${this.basePath}/by-teacher${this.buildQuery(params as Record<string, unknown>)}`
    )
  }

  /** Drill-down: all reviews for a specific video. */
  async getVideoReviews(videoId: string, params: BaseListParams = {}): Promise<ApiResponse<ReviewListResponse>> {
    return apiService.get<ReviewListResponse>(
      `${this.basePath}/by-video/${videoId}/reviews${this.buildQuery(params as Record<string, unknown>)}`
    )
  }

  /** Drill-down: all reviews for a specific teacher's videos. */
  async getTeacherReviews(facultyId: string, params: BaseListParams = {}): Promise<ApiResponse<ReviewListResponse>> {
    return apiService.get<ReviewListResponse>(
      `${this.basePath}/by-teacher/${facultyId}/reviews${this.buildQuery(params as Record<string, unknown>)}`
    )
  }
}

export const videoReviewsService = new VideoReviewsService()
