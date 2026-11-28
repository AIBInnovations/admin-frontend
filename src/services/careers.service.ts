import { apiService, type ApiResponse } from './api.service'

/** "pending" is shown as "New" everywhere in the panel. */
export type CareerStatus = 'pending' | 'reviewed' | 'accepted' | 'rejected'

/** What the careers form offers. "Examiner" is an old role some rows still have. */
export const CAREER_ROLES = ['Lecturer', 'Medical Editor', 'Subject Coordinator', 'Marketing & Growth', 'Operations & Support', 'Examiner'] as const

export interface AdminRef { _id: string; name: string | null; deleted?: boolean }

export interface CareerApplication {
  _id: string
  /** The student account it was sent from, or null for the guest form. */
  user: string | null
  name: string
  email: string
  phone_number: string
  wished_role: string
  subject: string | null
  portfolio_link: string | null
  representative_work: string | null
  status: CareerStatus
  reviewed_at: string | null
  createdAt: string
  updatedAt: string
}

export interface CareerStatusChange {
  status: CareerStatus
  from: CareerStatus | null
  at: string
  note: string | null
  by: AdminRef | null
}

export interface CareerApplicationDetail extends CareerApplication {
  message: string | null
  status_label: string
  student: { _id: string; name: string | null; student_id: string | null } | null
  /** The account it was sent from no longer exists. */
  student_deleted: boolean
  reviewed_by: AdminRef | null
  admin_note: string | null
  admin_note_updated_by: AdminRef | null
  admin_note_updated_at: string | null
  status_history: CareerStatusChange[]
}

export type CareerCounts = Record<CareerStatus | 'all', number>
export interface CareerPagination { total: number; page: number; limit: number; totalPages: number }

export interface CareerListParams {
  status?: string
  wished_role?: string
  q?: string
  /** IST calendar days, both included */
  from?: string
  to?: string
  sort?: string
  page?: number
  limit?: number
}

export interface CareerChange {
  status?: CareerStatus
  /** Kept in the history with the status change. */
  note?: string
  /** The internal note; '' clears it. */
  admin_note?: string
  /** The status this screen showed: a change someone else made first is refused (409). */
  expected_status?: CareerStatus
}

const clean = (params: object) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)]))

class CareersService {
  private base = 'admin/career-applications'

  list(params: CareerListParams): Promise<ApiResponse<{ applications: CareerApplication[]; pagination: CareerPagination; counts: CareerCounts }>> {
    return apiService.get(this.base, { params: clean(params) })
  }

  detail(id: string): Promise<ApiResponse<{ application: CareerApplicationDetail }>> {
    return apiService.get(`${this.base}/${encodeURIComponent(id)}`)
  }

  update(id: string, change: CareerChange): Promise<ApiResponse<{ application: CareerApplicationDetail; changed: boolean }>> {
    return apiService.patch(`${this.base}/${encodeURIComponent(id)}`, change)
  }

  remove(id: string): Promise<ApiResponse<{ deleted: boolean; _id: string }>> {
    return apiService.delete(`${this.base}/${encodeURIComponent(id)}`)
  }

  /** Downloads the filtered list (at most 5,000 rows) as a CSV file. */
  exportCsv(params: CareerListParams, filename: string) {
    return apiService.downloadBlob(`${this.base}/export`, clean(params), filename)
  }
}

export const careersService = new CareersService()
