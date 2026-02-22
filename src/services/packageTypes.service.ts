import { BaseCrudService } from './base.service'
import { apiService, ApiResponse } from './api.service'
import type { BaseListParams } from '@/types/api.types'

// Types
export interface PackageType {
  _id: string
  name: string
  description: string
  trailer_video_url: string | null
  thumbnail_url: string | null
  createdAt: string
  updatedAt: string
}

export interface PackageTypeFormData {
  name: string
  description: string
  trailer_video_url?: string | null
  thumbnail_url?: string | null
}

interface RawPackageType {
  type_id: string
  name: string
  description: string
  trailer_video_url: string | null
  thumbnail_url: string | null
}

class PackageTypesService extends BaseCrudService<PackageType, PackageTypeFormData, BaseListParams> {
  constructor() {
    super('admin/package-types', 'packageType')
  }

  /**
   * Get all package types from public endpoint (used by PackageFormModal dropdown).
   * Backend returns type_id instead of _id, so we map it here.
   */
  async getAllPublic(): Promise<ApiResponse<PackageType[]>> {
    const response = await apiService.get<{ packageTypes: RawPackageType[] }>('package-types')
    if (response.success && response.data) {
      const mapped = response.data.packageTypes.map((t) => ({
        ...t,
        _id: t.type_id,
      })) as PackageType[]
      return { ...response, data: mapped }
    }
    return response as ApiResponse<PackageType[]>
  }

  /**
   * Upload trailer video using S3 presigned URL
   */
  async uploadTrailer(
    packageTypeId: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<ApiResponse<PackageType>> {
    try {
      // 1. Get presigned URL
      const urlResponse = await apiService.post<{ uploadUrl: string; s3Key: string }>(
        `${this.basePath}/${packageTypeId}/trailer-upload-url`,
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
      const confirmResponse = await apiService.post<Record<string, PackageType>>(
        `${this.basePath}/${packageTypeId}/trailer-confirm`,
        {
          s3Key,
          fileSize: file.size,
        }
      )

      if (confirmResponse.success && confirmResponse.data) {
        return { ...confirmResponse, data: confirmResponse.data[this.entityKey] }
      }

      return confirmResponse as unknown as ApiResponse<PackageType>
    } catch (error) {
      console.error('Trailer upload error:', error)
      throw error
    }
  }

  /**
   * Delete trailer video from package type
   */
  async deleteTrailer(packageTypeId: string): Promise<ApiResponse<PackageType>> {
    const response = await apiService.delete<Record<string, PackageType>>(
      `${this.basePath}/${packageTypeId}/trailer`
    )
    if (response.success && response.data) {
      return { ...response, data: response.data[this.entityKey] }
    }
    return response as unknown as ApiResponse<PackageType>
  }

  /**
   * Upload thumbnail image to Cloudinary
   */
  async uploadThumbnail(packageTypeId: string, file: File): Promise<ApiResponse<PackageType>> {
    const formData = new FormData()
    formData.append('thumbnail', file)

    const response = await apiService.post<Record<string, PackageType>>(
      `${this.basePath}/${packageTypeId}/thumbnail`,
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
    return response as unknown as ApiResponse<PackageType>
  }

  /**
   * Delete thumbnail from package type
   */
  async deleteThumbnail(packageTypeId: string): Promise<ApiResponse<PackageType>> {
    const response = await apiService.delete<Record<string, PackageType>>(
      `${this.basePath}/${packageTypeId}/thumbnail`
    )
    if (response.success && response.data) {
      return { ...response, data: response.data[this.entityKey] }
    }
    return response as unknown as ApiResponse<PackageType>
  }
}

export const packageTypesService = new PackageTypesService()
