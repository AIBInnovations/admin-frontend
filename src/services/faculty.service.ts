import { apiService, ApiResponse } from './api.service'
import { BaseCrudService } from './base.service'
import type { BaseListParams } from '@/types/api.types'

// Types
export interface Faculty {
  _id: string
  name: string
  email: string
  phone: string | null
  photo_url: string | null
  bio: string | null
  qualifications: string | null
  experience_years: number | null
  specialization: string
  is_active: boolean
  is_verified: boolean
  last_login: string | null
  video_count?: number
  live_session_count?: number
  createdAt: string
  updatedAt: string
}

export interface FacultyFormData {
  name: string
  specialization: string
  email?: string
  phone?: string
  photo_url?: string
  bio?: string
  qualifications?: string
  experience_years?: number
  is_active?: boolean
}

export interface FacultyListParams extends BaseListParams {
  specialization?: string
  is_active?: boolean | null
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
}

export const facultyService = new FacultyService()
