import axios from 'axios'
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
  thumbnail_url: string | null
  thumbnail_s3_key: string | null
  media_url: string | null
  media_s3_key: string | null
  media_file_size_mb: number | null
  media_mime_type: string | null
  display_screens: string[]
  display_order: number
  is_active: boolean
  publish_status: PublishStatus
  createdAt: string
  updatedAt: string
}

export interface TutorialFormData {
  title: string
  url?: string
  type: 'video' | 'pdf'
  subject_id?: string | null
  description?: string
  thumbnail_url?: string | null
  thumbnail_s3_key?: string | null
  display_screens?: string[]
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

  /**
   * Upload thumbnail image to S3.
   * 2-step flow: get presigned URL → upload to S3
   */
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

  /**
   * Upload media file (PDF or video) to S3.
   * 3-step flow: get presigned URL → upload to S3 → confirm with backend
   */
  async uploadMedia(
    tutorialId: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<{ media_url: string; media_file_size_mb: number }> {
    // Step 1: Get presigned URL
    const urlRes = await apiService.post<{ uploadUrl: string; s3Key: string }>(
      `${this.basePath}/media-upload-url`,
      { mimeType: file.type || 'application/pdf' },
    )
    if (!urlRes.success || !urlRes.data) {
      throw new Error(urlRes.message || 'Failed to get upload URL')
    }
    const { uploadUrl, s3Key } = urlRes.data

    // Step 2: Upload to S3
    await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type || 'application/pdf' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })

    // Step 3: Confirm with backend
    const confirmRes = await apiService.post<{ media_url: string; media_file_size_mb: number }>(
      `${this.basePath}/${tutorialId}/media-confirm`,
      { s3Key, fileSize: file.size, mimeType: file.type },
    )
    if (!confirmRes.success || !confirmRes.data) {
      throw new Error(confirmRes.message || 'Failed to confirm upload')
    }

    return confirmRes.data
  }
}

export const tutorialsService = new TutorialsService()
