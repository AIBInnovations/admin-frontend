import axios from 'axios'
import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams, PopulatedRef } from '@/types/api.types'

// Types
export interface VideoUrls {
  hls_manifest?: string
  resolutions?: {
    '360p'?: string
    '480p'?: string
    '720p'?: string
    '1080p'?: string
  }
  original?: string
}

export interface Video {
  _id: string
  module_id: PopulatedRef & { series_id?: string }
  faculty_id: (PopulatedRef & { photo_url?: string }) | null
  title: string
  description: string
  video_url: string
  thumbnail_url: string
  subtitle_url: string | null
  transcript_url: string | null
  duration_seconds: number
  is_free: boolean
  display_order: number
  view_count: number
  processing_status: 'uploading' | 'processing' | 'ready' | 'failed'
  processing_error: string | null
  video_urls: VideoUrls
  file_size_mb: number
  createdAt: string
  updatedAt: string
}

export interface VideoFormData {
  title: string
  description: string
  module_id: string
  faculty_id?: string
  is_free?: boolean
  display_order?: number
  subtitle_url?: string
  transcript_url?: string
  tag_ids?: string[]
}

export interface VideosListParams extends BaseListParams {
  module_id?: string
  processing_status?: string
  is_free?: boolean | null
}

export interface VideoStatus {
  video_id: string
  processing_status: string
  processing_error: string | null
  is_ready: boolean
  video_urls: VideoUrls
  duration_seconds: number
}

class VideosService {
  private basePath = 'admin/videos'

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
   * Get all videos with pagination and filters
   */
  async getAll(params: VideosListParams = {}): Promise<ApiResponse<ListResponse<Video>>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<ListResponse<Video>>(`${this.basePath}${query}`)
  }

  private readonly MULTIPART_THRESHOLD = 100 * 1024 * 1024 // 100MB
  private readonly CONCURRENT_UPLOADS = 5

  /**
   * Upload new video via presigned S3 URL.
   * - Files <= 100MB: single PUT presigned URL
   * - Files > 100MB: multipart upload (chunked, parallel)
   * Both paths end with the same confirm-upload call.
   */
  async upload(
    data: VideoFormData,
    videoFile: File,
    onProgress?: (percent: number) => void,
  ): Promise<ApiResponse<{ video_id: string }>> {
    const mimeType = videoFile.type || 'video/mp4'
    let s3Key: string

    if (videoFile.size <= this.MULTIPART_THRESHOLD) {
      s3Key = await this.uploadSinglePart(videoFile, mimeType, onProgress)
    } else {
      s3Key = await this.uploadMultipart(videoFile, mimeType, onProgress)
    }

    // Confirm upload with backend (same for both paths)
    return apiService.post<{ video_id: string }>(`${this.basePath}/confirm-upload`, {
      s3Key,
      title: data.title,
      description: data.description,
      module_id: data.module_id,
      faculty_id: data.faculty_id || undefined,
      is_free: data.is_free,
      display_order: data.display_order,
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
   * Splits file into chunks, uploads in parallel, then completes.
   */
  private async uploadMultipart(
    videoFile: File,
    mimeType: string,
    onProgress?: (percent: number) => void,
  ): Promise<string> {
    // Step 1: Initiate multipart upload
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

    // Step 2: Upload parts in parallel with progress tracking
    const partProgress = new Array(partUrls.length).fill(0)
    const completedParts: { ETag: string; PartNumber: number }[] = []

    const updateProgress = () => {
      if (!onProgress) return
      const totalLoaded = partProgress.reduce((sum, p) => sum + p, 0)
      onProgress(Math.round((totalLoaded / videoFile.size) * 100))
    }

    // Upload parts with concurrency limit
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
        throw new Error(
          `S3 did not return ETag for part ${partIndex + 1}. ` +
          'Ensure the S3 bucket CORS has "ETag" in ExposeHeaders.',
        )
      }
      completedParts.push({ ETag: etag, PartNumber: partIndex + 1 })
    }

    try {
      // Process parts in batches of CONCURRENT_UPLOADS
      for (let i = 0; i < partUrls.length; i += this.CONCURRENT_UPLOADS) {
        const batch = partUrls
          .slice(i, i + this.CONCURRENT_UPLOADS)
          .map((_, idx) => uploadPart(i + idx))
        await Promise.all(batch)
      }

      // Step 3: Complete multipart upload
      await apiService.post(`${this.basePath}/upload-url/multipart/complete`, {
        s3Key,
        uploadId,
        parts: completedParts,
      })

      return s3Key
    } catch (error) {
      // Abort on failure to clean up incomplete parts
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
   * Update video metadata (JSON)
   */
  async update(videoId: string, data: Partial<VideoFormData>): Promise<ApiResponse<Video>> {
    const response = await apiService.put<{ video: Video }>(`${this.basePath}/${videoId}`, data)
    if (response.success && response.data) {
      return { ...response, data: response.data.video }
    }
    return response as ApiResponse<Video>
  }

  /**
   * Delete video
   */
  async delete(videoId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`${this.basePath}/${videoId}`)
  }

  /**
   * Get video processing status
   */
  async getStatus(videoId: string): Promise<ApiResponse<VideoStatus>> {
    return apiService.get<VideoStatus>(`${this.basePath}/${videoId}/status`)
  }

  /**
   * Assign tags to a video
   */
  async assignTags(videoId: string, tagIds: string[]): Promise<ApiResponse<any>> {
    return apiService.post(`${this.basePath}/${videoId}/tags`, { tag_ids: tagIds })
  }

  /**
   * Remove tags from a video
   */
  async removeTags(videoId: string, tagIds: string[]): Promise<ApiResponse<any>> {
    return apiService.delete(`${this.basePath}/${videoId}/tags`, {
      data: { tag_ids: tagIds },
    })
  }

  /**
   * Get all tags for a video
   */
  async getVideoTags(videoId: string): Promise<ApiResponse<any>> {
    return apiService.get(`${this.basePath}/${videoId}/tags`)
  }
}

export const videosService = new VideosService()
