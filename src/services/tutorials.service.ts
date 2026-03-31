import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams, PopulatedRef, PublishStatus } from '@/types/api.types'

// Types
export interface Tutorial {
  _id: string
  title: string
  url: string
  type: 'video' | 'pdf'
  subject_id: PopulatedRef | string | null
  description: string | null
  display_order: number
  is_active: boolean
  publish_status: PublishStatus
  createdAt: string
  updatedAt: string
}

export interface TutorialFormData {
  title: string
  url: string
  type: 'video' | 'pdf'
  subject_id?: string | null
  description?: string
  display_order?: number
  is_active?: boolean
  publish_status?: PublishStatus
}

export interface TutorialsListParams extends BaseListParams {
  type?: string | null
  is_active?: boolean | null
  publish_status?: string | null
}

class TutorialsService {
  private basePath = 'admin/tutorials'

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

  async getAll(params: TutorialsListParams = {}): Promise<ApiResponse<ListResponse<Tutorial>>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<ListResponse<Tutorial>>(`${this.basePath}${query}`)
  }

  async getById(tutorialId: string): Promise<ApiResponse<Tutorial>> {
    const response = await apiService.get<{ tutorial: Tutorial }>(`${this.basePath}/${tutorialId}`)
    if (response.success && response.data) {
      return { ...response, data: response.data.tutorial }
    }
    return response as ApiResponse<Tutorial>
  }

  async create(data: TutorialFormData): Promise<ApiResponse<Tutorial>> {
    const response = await apiService.post<{ tutorial: Tutorial }>(this.basePath, data)
    if (response.success && response.data) {
      return { ...response, data: response.data.tutorial }
    }
    return response as ApiResponse<Tutorial>
  }

  async update(tutorialId: string, data: Partial<TutorialFormData>): Promise<ApiResponse<Tutorial>> {
    const response = await apiService.put<{ tutorial: Tutorial }>(`${this.basePath}/${tutorialId}`, data)
    if (response.success && response.data) {
      return { ...response, data: response.data.tutorial }
    }
    return response as ApiResponse<Tutorial>
  }

  async delete(tutorialId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`${this.basePath}/${tutorialId}`)
  }
}

export const tutorialsService = new TutorialsService()
