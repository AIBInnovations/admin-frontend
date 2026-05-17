import { BaseCrudService } from './base.service'
import { apiService, ApiResponse } from './api.service'
import type { BaseListParams, PopulatedRef, PublishStatus } from '@/types/api.types'

// Types
export interface Series {
  _id: string
  package_id: PopulatedRef
  name: string
  description: string
  thumbnail_url: string | null
  thumbnail_s3_key: string | null
  display_order: number
  is_active: boolean
  publish_status: PublishStatus
  createdAt: string
  updatedAt: string
}

export interface SeriesFormData {
  package_id: string
  name: string
  description: string
  thumbnail_url?: string | null
  thumbnail_s3_key?: string | null
  display_order?: number
  is_active?: boolean
  publish_status?: PublishStatus
}

export interface SeriesListParams extends BaseListParams {
  package_id?: string
  is_active?: boolean | null
  publish_status?: string | null
}

class SeriesService extends BaseCrudService<Series, SeriesFormData, SeriesListParams> {
  constructor() {
    super('admin/series', 'series')
  }

  /**
   * Get presigned S3 URL for thumbnail upload
   */
  async getThumbnailUploadUrl(mimeType: string): Promise<ApiResponse<{ uploadUrl: string; s3Key: string; thumbnailUrl: string }>> {
    return apiService.post<{ uploadUrl: string; s3Key: string; thumbnailUrl: string }>(
      `${this.basePath}/thumbnail-upload-url`,
      { mimeType }
    )
  }

  /**
   * Confirm thumbnail upload after S3 upload
   */
  async confirmThumbnailUpload(seriesId: string, s3Key: string, thumbnailUrl: string): Promise<ApiResponse<Series>> {
    const response = await apiService.post<Record<string, Series>>(
      `${this.basePath}/${seriesId}/thumbnail-confirm`,
      { s3Key, thumbnailUrl }
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

  /**
   * Bulk reorder series — sends full ordered list, rewrites display_order as 1..N
   */
  async reorder(orderedIds: string[]): Promise<ApiResponse<void>> {
    return apiService.patch<void>(`${this.basePath}/reorder`, { ordered_ids: orderedIds })
  }
}

export const seriesService = new SeriesService()
