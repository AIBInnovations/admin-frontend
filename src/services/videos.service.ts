import axios from 'axios'
import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams, PopulatedRef, DeleteImpactResponse, PublishStatus } from '@/types/api.types'

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
  processing_status: 'uploading' | 'processing' | 'ready' | 'failed' | 'upcoming'
  processing_error: string | null
  video_urls: VideoUrls
  file_size_mb: number
  scheduled_release_at?: string | null
  publish_status: PublishStatus
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
  publish_status?: PublishStatus
  scheduled_release_at?: string | null
}

export type ReleaseMode = 'immediate' | 'scheduled'

export interface UpcomingVideoFormData {
  title: string
  description: string
  module_id: string
  faculty_id?: string
  is_free?: boolean
  display_order?: number
  scheduled_release_at: string
}

export interface VideosListParams extends BaseListParams {
  module_id?: string
  processing_status?: string
  is_free?: boolean | null
  publish_status?: string | null
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
  // Longer timeout for S3 assembly & DB confirmation (default 30s is too short for large files)
  private readonly UPLOAD_API_TIMEOUT = 5 * 60 * 1000 // 5 minutes

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
    onPhaseChange?: (phase: 'uploading' | 'completing' | 'confirming') => void,
  ): Promise<ApiResponse<{ video_id: string }>> {
    const mimeType = videoFile.type || 'video/mp4'
    let s3Key: string

    console.log('[upload] Starting video upload:', { fileName: videoFile.name, fileSize: videoFile.size, mimeType })

    if (videoFile.size <= this.MULTIPART_THRESHOLD) {
      s3Key = await this.uploadSinglePart(videoFile, mimeType, onProgress, onPhaseChange)
    } else {
      s3Key = await this.uploadMultipart(videoFile, mimeType, onProgress, onPhaseChange)
    }

    // Confirm upload with backend (same for both paths)
    console.log('[upload] Confirming upload with backend:', { s3Key })
    onPhaseChange?.('confirming')
    try {
      return await apiService.post<{ video_id: string }>(`${this.basePath}/confirm-upload`, {
        s3Key,
        title: data.title,
        description: data.description,
        module_id: data.module_id,
        faculty_id: data.faculty_id || undefined,
        is_free: data.is_free,
        display_order: data.display_order,
        fileSize: videoFile.size,
        mimeType,
      }, { timeout: this.UPLOAD_API_TIMEOUT })
    } catch (error: any) {
      console.error('[upload] Confirm-upload failed:', { s3Key, error: error.message })
      throw new Error(`Upload failed while saving record: ${error.message}`)
    }
  }

  /**
   * Single-part upload for small files (<=100MB)
   */
  private async uploadSinglePart(
    videoFile: File,
    mimeType: string,
    onProgress?: (percent: number) => void,
    onPhaseChange?: (phase: 'uploading' | 'completing' | 'confirming') => void,
  ): Promise<string> {
    const urlRes = await apiService.post<{ uploadUrl: string; s3Key: string }>(
      `${this.basePath}/upload-url`,
      { mimeType },
    )
    if (!urlRes.success || !urlRes.data) {
      throw new Error(urlRes.message || 'Failed to get upload URL')
    }
    const { uploadUrl, s3Key } = urlRes.data

    onPhaseChange?.('uploading')
    try {
      await axios.put(uploadUrl, videoFile, {
        headers: { 'Content-Type': mimeType },
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(Math.round((e.loaded / e.total) * 100))
          }
        },
      })
    } catch (error: any) {
      console.error('[upload] Single-part upload failed:', { s3Key, error: error.message })
      throw new Error(`Upload failed during upload: ${error.message}`)
    }

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
    onPhaseChange?: (phase: 'uploading' | 'completing' | 'confirming') => void,
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
    console.log('[upload] Multipart upload initiated:', { s3Key, uploadId, totalParts: partUrls.length, chunkSize })

    // Step 2: Upload parts in parallel with progress tracking
    onPhaseChange?.('uploading')
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

      try {
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
      } catch (error: any) {
        console.error(`[upload] Part ${partIndex + 1}/${partUrls.length} failed:`, { s3Key, error: error.message })
        throw new Error(`Upload failed on part ${partIndex + 1} of ${partUrls.length}: ${error.message}`)
      }
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
      console.log('[upload] All parts uploaded, completing multipart upload:', { s3Key, partCount: completedParts.length })
      onPhaseChange?.('completing')
      try {
        await apiService.post(`${this.basePath}/upload-url/multipart/complete`, {
          s3Key,
          uploadId,
          parts: completedParts,
        }, { timeout: this.UPLOAD_API_TIMEOUT })
      } catch (error: any) {
        console.error('[upload] Complete multipart upload failed:', { s3Key, uploadId, error: error.message })
        throw new Error(`Upload failed while assembling file: ${error.message}`)
      }

      return s3Key
    } catch (error: any) {
      // Abort on failure to clean up incomplete parts
      try {
        await apiService.post(`${this.basePath}/upload-url/multipart/abort`, {
          s3Key,
          uploadId,
        })
        console.log('[upload] Multipart upload aborted after failure:', { s3Key })
      } catch (abortError: any) {
        console.error('[upload] Failed to abort multipart upload:', { s3Key, uploadId, abortError: abortError.message })
      }
      throw error
    }
  }

  /**
   * Create an upcoming video placeholder (no file upload)
   */
  async createUpcoming(data: UpcomingVideoFormData): Promise<ApiResponse<{ video_id: string }>> {
    return apiService.post<{ video_id: string }>(`${this.basePath}/create-upcoming`, {
      title: data.title,
      description: data.description,
      module_id: data.module_id,
      faculty_id: data.faculty_id || undefined,
      is_free: data.is_free,
      display_order: data.display_order,
      scheduled_release_at: data.scheduled_release_at,
    })
  }

  /**
   * Upload file for an existing upcoming video.
   * Reuses the same S3 upload logic, then calls the upload-file endpoint
   * instead of confirm-upload.
   *
   * release_mode:
   *   'immediate' (default) — clears scheduled_release_at so the video goes
   *     live as soon as processing completes.
   *   'scheduled' — preserves scheduled_release_at; the video stays hidden
   *     from students until that date even after processing completes.
   */
  async uploadFileForExisting(
    videoId: string,
    videoFile: File,
    opts: {
      onProgress?: (percent: number) => void
      onPhaseChange?: (phase: 'uploading' | 'completing' | 'confirming') => void
      release_mode?: ReleaseMode
      scheduled_release_at?: string | null
    } = {},
  ): Promise<ApiResponse<{ video_id: string }>> {
    const { onProgress, onPhaseChange, release_mode, scheduled_release_at } = opts
    const mimeType = videoFile.type || 'video/mp4'
    let s3Key: string

    if (videoFile.size <= this.MULTIPART_THRESHOLD) {
      s3Key = await this.uploadSinglePart(videoFile, mimeType, onProgress, onPhaseChange)
    } else {
      s3Key = await this.uploadMultipart(videoFile, mimeType, onProgress, onPhaseChange)
    }

    onPhaseChange?.('confirming')
    try {
      return await apiService.post<{ video_id: string }>(
        `${this.basePath}/${videoId}/upload-file`,
        {
          s3Key,
          fileSize: videoFile.size,
          mimeType,
          release_mode: release_mode || 'immediate',
          ...(release_mode === 'scheduled' && scheduled_release_at
            ? { scheduled_release_at }
            : {}),
        },
        { timeout: this.UPLOAD_API_TIMEOUT },
      )
    } catch (error: any) {
      throw new Error(`Upload failed while saving record: ${error.message}`)
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
   * Get delete impact — checks what depends on this entity before deletion
   */
  async getDeleteImpact(videoId: string): Promise<ApiResponse<DeleteImpactResponse>> {
    return apiService.get<DeleteImpactResponse>(`${this.basePath}/${videoId}/delete-impact`)
  }

  /**
   * Archive video (soft delete)
   */
  async archive(videoId: string): Promise<ApiResponse<void>> {
    return apiService.patch<void>(`${this.basePath}/${videoId}/archive`, {})
  }

  /**
   * Delete video (permanent - only works on archived items)
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
   * Upload a manual thumbnail (overrides the auto-generated one) via presigned S3 URL.
   */
  async uploadThumbnail(videoId: string, file: File): Promise<ApiResponse<Video>> {
    const mimeType = file.type || 'image/jpeg'
    const urlRes = await apiService.post<{ uploadUrl: string; s3Key: string; thumbnailUrl: string }>(
      `${this.basePath}/${videoId}/thumbnail-upload-url`,
      { mimeType },
    )
    if (!urlRes.success || !urlRes.data) {
      throw new Error(urlRes.message || 'Failed to get thumbnail upload URL')
    }
    const { uploadUrl, s3Key, thumbnailUrl } = urlRes.data
    await axios.put(uploadUrl, file, { headers: { 'Content-Type': mimeType } })
    const res = await apiService.post<{ video: Video }>(
      `${this.basePath}/${videoId}/thumbnail-confirm`,
      { s3Key, thumbnailUrl },
    )
    if (res.success && res.data) return { ...res, data: res.data.video }
    return res as ApiResponse<Video>
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

  /**
   * Bulk reorder videos — sends full ordered list, rewrites display_order as 1..N
   */
  async reorder(orderedIds: string[]): Promise<ApiResponse<void>> {
    return apiService.patch<void>(`${this.basePath}/reorder`, { ordered_ids: orderedIds })
  }

  /**
   * Retry MediaConvert transcoding for a video stuck in 'failed' status.
   * Reuses existing s3Key — no re-upload needed.
   */
  async retryTranscoding(
    videoId: string,
  ): Promise<ApiResponse<{ video_id: string; processing_status: string; mcJobId: string }>> {
    return apiService.post<{ video_id: string; processing_status: string; mcJobId: string }>(
      `${this.basePath}/${videoId}/retry-transcoding`,
      {},
    )
  }
}

export const videosService = new VideosService()
