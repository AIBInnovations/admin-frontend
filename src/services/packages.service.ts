import { BaseCrudService } from './base.service'
import { apiService, ApiResponse } from './api.service'
import type { BaseListParams, PopulatedRef, PublishStatus } from '@/types/api.types'

// Types
export interface PackageTier {
  name: string
  duration_days: number
  price: number
  original_price?: number | null
  display_order: number
}

export interface Package {
  _id: string
  subject_id: PopulatedRef
  package_type_id: PopulatedRef
  name: string
  description: string
  price: number
  original_price: number | null
  is_on_sale: boolean
  sale_price: number | null
  sale_end_date: string | null
  sale_discount_percent: number | null
  duration_days: number
  trailer_video_id: string | null
  trailer_video_url: string | null
  thumbnail_url: string | null
  video_lectures_thumbnail_url: string | null
  notes_thumbnail_url: string | null
  features: string
  rich_description: string | null
  is_active: boolean
  publish_status: PublishStatus
  display_order: number
  tiers: PackageTier[]
  series_count?: number
  createdAt: string
  updatedAt: string
}

export interface PackageDetailVideo {
  _id: string
  title: string
  description: string
  duration_seconds: number
  is_free: boolean
  display_order: number
  view_count: number
  processing_status: 'uploading' | 'processing' | 'ready' | 'failed' | 'upcoming'
  thumbnail_url: string
  is_active: boolean
  module_id: string
  faculty_id: { _id: string; name: string } | null
  scheduled_release_at?: string | null
  createdAt: string
}

export interface PackageDetailModule {
  _id: string
  name: string
  description: string
  display_order: number
  lesson_count: number
  estimated_duration_minutes: number
  is_active: boolean
  series_id: string
  videos: PackageDetailVideo[]
  video_count: number
  createdAt: string
}

export interface PackageDetailDocument {
  _id: string
  title: string
  description: string
  file_url: string
  file_format: 'pdf' | 'epub' | 'doc' | 'docx' | 'ppt' | 'pptx'
  preview_url: string | null
  file_size_mb: number
  page_count: number | null
  is_free: boolean
  display_order: number
  download_count: number
  series_id: string
  createdAt: string
}

export interface PackageDetailSeries {
  _id: string
  name: string
  description: string
  display_order: number
  is_active: boolean
  package_id: string
  modules: PackageDetailModule[]
  module_count: number
  documents: PackageDetailDocument[]
  document_count: number
  createdAt: string
}

export interface PackageDetail extends Package {
  series_count: number
  series: PackageDetailSeries[]
}

export interface PackageFormData {
  subject_id: string
  package_type_id: string
  name: string
  description: string
  price: number
  original_price?: number | null
  is_on_sale?: boolean
  sale_price?: number | null
  sale_end_date?: string | null
  sale_discount_percent?: number | null
  duration_days: number
  trailer_video_id?: string | null
  thumbnail_url?: string | null
  features?: string
  rich_description?: string
  display_order?: number
  is_active?: boolean
  publish_status?: PublishStatus
  tiers?: PackageTier[]
}

export interface PackagesListParams extends BaseListParams {
  subject_id?: string
  is_active?: boolean | null
  is_on_sale?: boolean | null
  publish_status?: string | null
}

class PackagesService extends BaseCrudService<Package, PackageFormData, PackagesListParams> {
  constructor() {
    super('admin/packages', 'package')
  }

  async getDetail(id: string): Promise<ApiResponse<PackageDetail>> {
    const response = await apiService.get<Record<string, PackageDetail>>(`${this.basePath}/${id}`)
    if (response.success && response.data) {
      return { ...response, data: response.data[this.entityKey] }
    }
    return response as unknown as ApiResponse<PackageDetail>
  }

  /**
   * Upload trailer video using S3 presigned URL
   */
  async uploadTrailer(
    packageId: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<ApiResponse<Package>> {
    try {
      // 1. Get presigned URL
      const urlResponse = await apiService.post<{ uploadUrl: string; s3Key: string }>(
        `${this.basePath}/${packageId}/trailer-upload-url`,
        { mimeType: file.type }
      )

      if (!urlResponse.success || !urlResponse.data) {
        throw new Error('Failed to get upload URL')
      }

      const { uploadUrl, s3Key } = urlResponse.data

      // 2. Upload to S3 directly
      const xhr = new XMLHttpRequest()
      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100))
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            resolve()
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        })

        xhr.addEventListener('error', () => reject(new Error('Upload failed')))
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')))

        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })

      await uploadPromise

      // 3. Confirm upload
      const confirmResponse = await apiService.post<Record<string, Package>>(
        `${this.basePath}/${packageId}/trailer-confirm`,
        {
          s3Key,
          title: `Trailer - ${packageId}`,
          description: 'Package trailer video',
          fileSize: file.size,
        }
      )

      if (confirmResponse.success && confirmResponse.data) {
        return { ...confirmResponse, data: confirmResponse.data[this.entityKey] }
      }

      return confirmResponse as unknown as ApiResponse<Package>
    } catch (error) {
      console.error('Trailer upload error:', error)
      throw error
    }
  }

  /**
   * Delete trailer video from package
   */
  async deleteTrailer(packageId: string): Promise<ApiResponse<Package>> {
    const response = await apiService.delete<Record<string, Package>>(
      `${this.basePath}/${packageId}/trailer`
    )
    if (response.success && response.data) {
      return { ...response, data: response.data[this.entityKey] }
    }
    return response as unknown as ApiResponse<Package>
  }

  /**
   * Get presigned URL for package thumbnail upload
   */
  async getThumbnailUploadUrl(mimeType: string): Promise<ApiResponse<{ uploadUrl: string; s3Key: string; thumbnailUrl: string }>> {
    return apiService.post<{ uploadUrl: string; s3Key: string; thumbnailUrl: string }>(
      `${this.basePath}/thumbnail-upload-url`,
      { mimeType },
    )
  }

  /**
   * Upload thumbnail via presigned S3 URL (3-step flow)
   */
  async uploadThumbnail(packageId: string, file: File): Promise<ApiResponse<Package>> {
    const mimeType = file.type || 'image/jpeg'

    // Step 1: Get presigned URL
    const urlRes = await this.getThumbnailUploadUrl(mimeType)
    if (!urlRes.success || !urlRes.data) {
      throw new Error(urlRes.message || 'Failed to get thumbnail upload URL')
    }
    const { uploadUrl, s3Key, thumbnailUrl } = urlRes.data

    // Step 2: Upload to S3
    const axios = (await import('axios')).default
    await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': mimeType },
    })

    // Step 3: Confirm with backend
    const response = await apiService.post<Record<string, Package>>(
      `${this.basePath}/${packageId}/thumbnail-confirm`,
      { s3Key, thumbnailUrl },
    )

    if (response.success && response.data) {
      return { ...response, data: response.data[this.entityKey] }
    }
    return response as unknown as ApiResponse<Package>
  }

  /**
   * Delete thumbnail from package
   */
  async deleteThumbnail(packageId: string): Promise<ApiResponse<Package>> {
    const response = await apiService.delete<Record<string, Package>>(
      `${this.basePath}/${packageId}/thumbnail`
    )
    if (response.success && response.data) {
      return { ...response, data: response.data[this.entityKey] }
    }
    return response as unknown as ApiResponse<Package>
  }

  /**
   * Upload section thumbnail (video_lectures or notes) via presigned S3 URL
   */
  async uploadSectionThumbnail(packageId: string, file: File, section: 'video_lectures' | 'notes'): Promise<ApiResponse<Package>> {
    const mimeType = file.type || 'image/jpeg'

    // Step 1: Get presigned URL
    const urlRes = await apiService.post<{ uploadUrl: string; s3Key: string; thumbnailUrl: string }>(
      `${this.basePath}/section-thumbnail-upload-url`,
      { mimeType, section },
    )
    if (!urlRes.success || !urlRes.data) {
      throw new Error(urlRes.message || 'Failed to get upload URL')
    }
    const { uploadUrl, s3Key, thumbnailUrl } = urlRes.data

    // Step 2: Upload to S3
    const axios = (await import('axios')).default
    await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': mimeType },
    })

    // Step 3: Confirm with backend
    const response = await apiService.post<Record<string, Package>>(
      `${this.basePath}/${packageId}/section-thumbnail-confirm`,
      { s3Key, thumbnailUrl, section },
    )

    if (response.success && response.data) {
      return { ...response, data: response.data[this.entityKey] }
    }
    return response as unknown as ApiResponse<Package>
  }

  /**
   * Delete section thumbnail from package
   */
  async deleteSectionThumbnail(packageId: string, section: 'video_lectures' | 'notes'): Promise<ApiResponse<Package>> {
    const response = await apiService.delete<Record<string, Package>>(
      `${this.basePath}/${packageId}/section-thumbnail/${section}`
    )
    if (response.success && response.data) {
      return { ...response, data: response.data[this.entityKey] }
    }
    return response as unknown as ApiResponse<Package>
  }
}

export const packagesService = new PackagesService()
