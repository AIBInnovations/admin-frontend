import axios from 'axios'
import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams, PopulatedRef } from '@/types/api.types'

// Types
export interface Recording {
  _id: string
  session_id: (PopulatedRef & { scheduled_start_time?: string }) | null
  title: string
  description: string
  video_url: string
  hls_manifest_url: string | null
  thumbnail_url: string | null
  duration_seconds: number
  file_size_mb: number
  processing_status: 'uploading' | 'processing' | 'ready' | 'failed'
  processing_error: string | null
  storage_provider: 'cloudinary' | 'aws'
  is_active: boolean
  createdAt: string
  updatedAt: string
}

export interface RecordingFormData {
  title: string
  description: string
  session_id?: string
}

export interface RecordingsListParams extends BaseListParams {
  session_id?: string
  processing_status?: string
}

class RecordingsService {
  private basePath = 'admin/recordings'
  private readonly MULTIPART_THRESHOLD = 100 * 1024 * 1024 // 100MB
  private readonly CONCURRENT_UPLOADS = 5

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

  /**
   * Get all recordings with pagination and filters
   */
  async getAll(params: RecordingsListParams = {}): Promise<ApiResponse<ListResponse<Recording>>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<ListResponse<Recording>>(`${this.basePath}${query}`)
  }

  /**
   * Get recording by ID
   */
  async getById(id: string): Promise<ApiResponse<Recording>> {
    const response = await apiService.get<{ recording: Recording }>(`${this.basePath}/${id}`)
    if (response.success && response.data) {
      return { ...response, data: response.data.recording }
    }
    return response as ApiResponse<Recording>
  }

  /**
   * Upload new recording via presigned S3 URL
   */
  async upload(
    data: RecordingFormData,
    videoFile: File,
    onProgress?: (percent: number) => void,
  ): Promise<ApiResponse<{ recording_id: string }>> {
    const mimeType = videoFile.type || 'video/mp4'
    let s3Key: string

    if (videoFile.size <= this.MULTIPART_THRESHOLD) {
      s3Key = await this.uploadSinglePart(videoFile, mimeType, onProgress)
    } else {
      s3Key = await this.uploadMultipart(videoFile, mimeType, onProgress)
    }

    return apiService.post<{ recording_id: string }>(`${this.basePath}/confirm-upload`, {
      s3Key,
      title: data.title,
      description: data.description,
      session_id: data.session_id || undefined,
      fileSize: videoFile.size,
      mimeType,
    })
  }

  /**
   * Single-part upload for small files (<=100MB)
   */
  private async uploadSinglePart(
    videoFile: File,
    mimeType: string,
    onProgress?: (percent: number) => void,
  ): Promise<string> {
    const urlRes = await apiService.post<{ uploadUrl: string; s3Key: string }>(
      `${this.basePath}/upload-url`,
      { mimeType },
    )
    if (!urlRes.success || !urlRes.data) {
      throw new Error(urlRes.message || 'Failed to get upload URL')
    }
    const { uploadUrl, s3Key } = urlRes.data

    await axios.put(uploadUrl, videoFile, {
      headers: { 'Content-Type': mimeType },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })

    return s3Key
  }

  /**
   * Multipart upload for large files (>100MB)
   */
  private async uploadMultipart(
    videoFile: File,
    mimeType: string,
    onProgress?: (percent: number) => void,
  ): Promise<string> {
    const initRes = await apiService.post<{
      uploadId: string
      s3Key: string
      partUrls: string[]
      chunkSize: number
      totalParts: number
    }>(`${this.basePath}/upload-url/multipart/initiate`, {
      mimeType,
      fileSize: videoFile.size,
    })
    if (!initRes.success || !initRes.data) {
      throw new Error(initRes.message || 'Failed to initiate multipart upload')
    }
    const { uploadId, s3Key, partUrls, chunkSize } = initRes.data

    const partProgress = new Array(partUrls.length).fill(0)
    const completedParts: { ETag: string; PartNumber: number }[] = []

    const updateProgress = () => {
      if (!onProgress) return
      const totalLoaded = partProgress.reduce((sum, p) => sum + p, 0)
      onProgress(Math.round((totalLoaded / videoFile.size) * 100))
    }

    const uploadPart = async (partIndex: number): Promise<void> => {
      const start = partIndex * chunkSize
      const end = Math.min(start + chunkSize, videoFile.size)
      const blob = videoFile.slice(start, end)
      const partSize = end - start

      const response = await axios.put(partUrls[partIndex], blob, {
        headers: { 'Content-Type': 'application/octet-stream' },
        onUploadProgress: (e) => {
          partProgress[partIndex] = Math.min(e.loaded, partSize)
          updateProgress()
        },
      })

      const etag = response.headers['etag'] || response.headers['ETag']
      if (!etag) {
        throw new Error(`S3 did not return ETag for part ${partIndex + 1}`)
      }
      completedParts.push({ ETag: etag, PartNumber: partIndex + 1 })
    }

    try {
      for (let i = 0; i < partUrls.length; i += this.CONCURRENT_UPLOADS) {
        const batch = partUrls
          .slice(i, i + this.CONCURRENT_UPLOADS)
          .map((_, idx) => uploadPart(i + idx))
        await Promise.all(batch)
      }

      await apiService.post(`${this.basePath}/upload-url/multipart/complete`, {
        s3Key,
        uploadId,
        parts: completedParts,
      })

      return s3Key
    } catch (error) {
      try {
        await apiService.post(`${this.basePath}/upload-url/multipart/abort`, {
          s3Key,
          uploadId,
        })
      } catch {
        // Ignore abort errors
      }
      throw error
    }
  }

  /**
   * Update recording metadata
   */
  async update(id: string, data: Partial<RecordingFormData>): Promise<ApiResponse<Recording>> {
    const response = await apiService.put<{ recording: Recording }>(`${this.basePath}/${id}`, data)
    if (response.success && response.data) {
      return { ...response, data: response.data.recording }
    }
    return response as ApiResponse<Recording>
  }

  /**
   * Delete recording
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`${this.basePath}/${id}`)
  }
}

export const recordingsService = new RecordingsService()
