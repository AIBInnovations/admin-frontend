import axios from 'axios'
import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams, DeleteImpactResponse, PublishStatus } from '@/types/api.types'

// Types
export type BannerType = 'generic' | 'theory_package' | 'practical_package' | 'ebook'
export type LinkType = 'internal' | 'external' | 'none'
export type VisibleTo = 'all' | 'subject' | 'package'

export interface Banner {
  _id: string
  title: string
  subtitle: string | null
  image_url: string
  image_s3_key: string | null
  click_url: string | null
  link_type: LinkType
  banner_type: BannerType
  target_package_id: string | null
  target_book_id: string | null
  visible_to: VisibleTo
  visible_to_subjects: string[]
  visible_to_packages: string[]
  display_order: number
  is_active: boolean
  publish_status: PublishStatus
  start_date: string
  end_date: string | null
  createdAt: string
  updatedAt: string
}

export interface BannerFormData {
  title: string
  subtitle?: string
  image_url: string
  image_s3_key?: string
  click_url?: string
  link_type?: LinkType
  banner_type?: BannerType
  target_package_id?: string | null
  target_book_id?: string | null
  visible_to?: VisibleTo
  visible_to_subjects?: string[]
  visible_to_packages?: string[]
  display_order?: number
  is_active?: boolean
  publish_status?: PublishStatus
  start_date: string
  end_date?: string
}

export interface BannersListParams extends BaseListParams {
  is_active?: boolean | null
  publish_status?: string | null
}

class BannersService {
  private basePath = 'admin/banners'

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

  async getAll(params: BannersListParams = {}): Promise<ApiResponse<ListResponse<Banner>>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<ListResponse<Banner>>(`${this.basePath}${query}`)
  }

  async getById(bannerId: string): Promise<ApiResponse<Banner>> {
    const response = await apiService.get<{ banner: Banner }>(`${this.basePath}/${bannerId}`)
    if (response.success && response.data) {
      return { ...response, data: response.data.banner }
    }
    return response as unknown as ApiResponse<Banner>
  }

  async create(data: BannerFormData): Promise<ApiResponse<Banner>> {
    const response = await apiService.post<{ banner: Banner }>(this.basePath, data)
    if (response.success && response.data) {
      return { ...response, data: response.data.banner }
    }
    return response as unknown as ApiResponse<Banner>
  }

  async update(bannerId: string, data: Partial<BannerFormData>): Promise<ApiResponse<Banner>> {
    const response = await apiService.put<{ banner: Banner }>(`${this.basePath}/${bannerId}`, data)
    if (response.success && response.data) {
      return { ...response, data: response.data.banner }
    }
    return response as unknown as ApiResponse<Banner>
  }

  /**
   * Get delete impact — checks what depends on this entity before deletion
   */
  async getDeleteImpact(bannerId: string): Promise<ApiResponse<DeleteImpactResponse>> {
    return apiService.get<DeleteImpactResponse>(`${this.basePath}/${bannerId}/delete-impact`)
  }

  /**
   * Archive banner (soft delete)
   */
  async archive(bannerId: string): Promise<ApiResponse<void>> {
    return apiService.patch<void>(`${this.basePath}/${bannerId}/archive`, {})
  }

  /**
   * Delete banner (permanent - only works on archived items)
   */
  async delete(bannerId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`${this.basePath}/${bannerId}`)
  }

  /**
   * Upload banner image to S3.
   * 3-step flow: get presigned URL -> upload to S3 -> return image URL & s3 key.
   */
  async uploadImage(
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<{ imageUrl: string; s3Key: string }> {
    // Step 1: Get presigned upload URL
    const urlRes = await apiService.post<{ uploadUrl: string; s3Key: string; imageUrl: string }>(
      `${this.basePath}/image-upload-url`,
      { mimeType: file.type || 'image/jpeg' },
    )
    if (!urlRes.success || !urlRes.data) {
      throw new Error(urlRes.message || 'Failed to get upload URL')
    }
    const { uploadUrl, s3Key, imageUrl } = urlRes.data

    // Step 2: Upload directly to S3
    await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type || 'image/jpeg' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })

    return { imageUrl, s3Key }
  }
}

export const bannersService = new BannersService()
