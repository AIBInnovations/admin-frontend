import { apiService, ApiResponse } from './api.service'

export type FeedbackStatus = 'new' | 'in_review' | 'action_planned' | 'resolved' | 'dismissed'
export type FeedbackPriority = 'low' | 'normal' | 'high'
export type FeedbackAction = 'none' | 'talk_to_faculty' | 're_record' | 'edit_video' | 'reply_student'

export interface Ref { _id: string; name: string }
export interface FacultyRef { _id: string; name: string | null; photo_url?: string | null; is_active?: boolean; deleted?: boolean }
export interface CoursePath { module: Ref | null; series: Ref | null; package: Ref | null; subject: Ref | null }

export interface FeedbackReview extends CoursePath {
  _id: string
  rating: number | null
  rating_submitted_at: string | null
  feedback: string | null
  feedback_submitted_at: string | null
  createdAt: string
  updatedAt: string
  status: FeedbackStatus
  priority: FeedbackPriority
  action: FeedbackAction
  action_due_at: string | null
  overdue: boolean
  assigned_to: Ref | null
  resolution_note: string | null
  resolved_at: string | null
  resolved_by: Ref | null
  /** Phone and email only for admins who may read users. Null when the account is gone. */
  user: { _id: string; name: string; student_id?: string; photo_url?: string | null; phone_number?: string; email?: string } | null
  video: { _id: string; title: string; thumbnail_url: string | null; duration_seconds: number; archived: boolean } | null
  faculty: FacultyRef | null
}

export interface FeedbackActivity {
  at: string
  type: 'status' | 'assigned' | 'priority' | 'action' | 'due' | 'note' | 'reopened'
  by: 'admin' | 'student' | 'system'
  admin_name: string | null
  from: string | null
  to: string | null
  note: string
}

export interface FeedbackReviewDetail extends FeedbackReview {
  faculty_at_review: Ref | null
  activity: FeedbackActivity[]
  next_statuses: FeedbackStatus[]
}

export interface FeedbackFigures {
  average: number | null
  rating_count: number
  review_count: number
  comment_count: number
  low_count: number
  open_count: number
  attention_count: number
  overdue_count: number
  unassigned_count: number
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>
  latest_at: string | null
  previous: { from: string; to: string; average: number | null; rating_count: number; review_count: number; low_count: number } | null
  change: { average: number | null; review_count: number; low_count: number } | null
}

export interface TrendPoint { month: string; average: number; count: number }
export type FeedbackCounts = Record<FeedbackStatus | 'all' | 'open' | 'attention' | 'overdue', number>
export interface FeedbackPagination { total: number; page: number; limit: number; totalPages: number }

export interface FeedbackScope {
  subject_id?: string
  package_id?: string
  series_id?: string
  module_id?: string
  video_id?: string
  /** An id, or 'none' for videos without a lecturer */
  faculty_id?: string
  from?: string
  to?: string
}

export interface FeedbackListParams extends FeedbackScope {
  page?: number
  limit?: number
  search?: string
  status?: string
  rating?: string
  has_comment?: string
  attention?: string
  overdue?: string
  priority?: string
  assigned_to?: string
  exclude_id?: string
  sort?: string
}

export interface FeedbackGroupParams extends FeedbackScope { page?: number; limit?: number; search?: string; sort?: string }

export interface FacultyFeedbackRow extends FeedbackFigures {
  faculty: (FacultyRef & { subjects: Ref[] }) | null
  video_count: number
}

export interface FeedbackVideo {
  _id: string
  title: string
  thumbnail_url: string | null
  duration_seconds: number
  view_count: number
  unique_viewer_count: number
  total_watch_seconds: number
  archived: boolean
  createdAt: string
}

export interface VideoFeedbackRow extends FeedbackFigures, CoursePath {
  video_id: string
  video: FeedbackVideo | null
  faculty: FacultyRef | null
}

export interface FeedbackDetailResponse {
  review: FeedbackReviewDetail
  others: { reviews: FeedbackReview[]; total: number }
  video_summary: FeedbackFigures
  trend: TrendPoint[]
}

export interface FacultyFeedbackResponse {
  faculty: FacultyRef & { subjects: Ref[]; specialization?: string | null; qualifications?: string | null; video_count: number }
  summary: FeedbackFigures
  trend: TrendPoint[]
}

export interface VideoFeedbackResponse extends CoursePath {
  video: FeedbackVideo | null
  faculty: FacultyRef | null
  summary: FeedbackFigures
  trend: TrendPoint[]
}

export interface FeedbackChange {
  status?: FeedbackStatus
  priority?: FeedbackPriority
  assigned_to?: string | null
  action?: FeedbackAction
  /** A calendar day in IST, "2026-11-30" */
  action_due_at?: string | null
  note?: string
  expected_updated_at?: string
}

export interface BulkResult { requested: number; updated: number; unchanged: number; failed: { _id: string; message: string }[] }
export interface Assignee { _id: string; name: string; email: string; is_me: boolean }

class FeedbackService {
  private base = 'admin/feedback'

  private query(params: object): string {
    const q = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== '') q.append(key, String(value))
    }
    const str = q.toString()
    return str ? `?${str}` : ''
  }

  list(params: FeedbackListParams): Promise<ApiResponse<{ reviews: FeedbackReview[]; pagination: FeedbackPagination; counts: FeedbackCounts }>> {
    return apiService.get(`${this.base}${this.query(params)}`)
  }

  summary(params: FeedbackScope): Promise<ApiResponse<FeedbackFigures>> {
    return apiService.get(`${this.base}/summary${this.query(params)}`)
  }

  byFaculty(params: FeedbackGroupParams): Promise<ApiResponse<{ faculty: FacultyFeedbackRow[]; pagination: FeedbackPagination }>> {
    return apiService.get(`${this.base}/by-faculty${this.query(params)}`)
  }

  byVideo(params: FeedbackGroupParams): Promise<ApiResponse<{ videos: VideoFeedbackRow[]; pagination: FeedbackPagination }>> {
    return apiService.get(`${this.base}/by-video${this.query(params)}`)
  }

  faculty(id: string, range: { from?: string; to?: string } = {}): Promise<ApiResponse<FacultyFeedbackResponse>> {
    return apiService.get(`${this.base}/faculty/${id}${this.query(range)}`)
  }

  video(id: string, range: { from?: string; to?: string } = {}): Promise<ApiResponse<VideoFeedbackResponse>> {
    return apiService.get(`${this.base}/videos/${id}${this.query(range)}`)
  }

  detail(id: string): Promise<ApiResponse<FeedbackDetailResponse>> {
    return apiService.get(`${this.base}/${id}`)
  }

  update(id: string, change: FeedbackChange): Promise<ApiResponse<FeedbackDetailResponse>> {
    return apiService.patch(`${this.base}/${id}`, change)
  }

  bulk(ids: string[], change: FeedbackChange): Promise<ApiResponse<BulkResult>> {
    return apiService.post(`${this.base}/bulk`, { ids, ...change })
  }

  async assignees(): Promise<Assignee[]> {
    const res = await apiService.get<{ admins: Assignee[] }>(`${this.base}/assignees`)
    return res.data?.admins ?? []
  }

  exportCsv(params: FeedbackListParams) {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]))
    return apiService.downloadBlob(`${this.base}/export.csv`, clean, 'feedback.csv')
  }
}

export const feedbackService = new FeedbackService()
