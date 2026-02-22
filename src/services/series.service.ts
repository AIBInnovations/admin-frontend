import { BaseCrudService } from './base.service'
import { apiService, ApiResponse } from './api.service'
import type { BaseListParams, PopulatedRef } from '@/types/api.types'

// Types
export interface Series {
  _id: string
  package_id: PopulatedRef
  name: string
  description: string
  thumbnail_url: string | null
  display_order: number
  is_active: boolean
  createdAt: string
  updatedAt: string
}

export interface SeriesFormData {
  package_id: string
  name: string
  description: string
  thumbnail_url?: string | null
  display_order?: number
  is_active?: boolean
}

export interface SeriesListParams extends BaseListParams {
  package_id?: string
  is_active?: boolean | null
}

class SeriesService extends BaseCrudService<Series, SeriesFormData, SeriesListParams> {
  constructor() {
    super('admin/series', 'series')
  }

  /**
   * Upload thumbnail image to Cloudinary
   */
  async uploadThumbnail(seriesId: string, file: File): Promise<ApiResponse<Series>> {
    const formData = new FormData()
    formData.append('thumbnail', file)

    const response = await apiService.post<Record<string, Series>>(
      `${this.basePath}/${seriesId}/thumbnail`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )

    if (response.success && response.data) {
      return { ...response, data: response.data[this.entityKey] }
    }
    return response as unknown as ApiResponse<Series>
  }

  /**
   * Delete thumbnail from series
   */
  async deleteThumbnail(seriesId: string): Promise<ApiResponse<Series>> {
    const response = await apiService.delete<Record<string, Series>>(
      `${this.basePath}/${seriesId}/thumbnail`
    )
    if (response.success && response.data) {
      return { ...response, data: response.data[this.entityKey] }
    }
    return response as unknown as ApiResponse<Series>
  }
}

export const seriesService = new SeriesService()
