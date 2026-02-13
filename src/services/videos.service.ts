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

  /**
   * Upload new video via presigned S3 URL (3-step flow):
   * 1. Get presigned upload URL from backend
   * 2. PUT file directly to S3
   * 3. Confirm upload with backend to create DB record + trigger transcoding
   */
  async upload(
    data: VideoFormData,
    videoFile: File,
    onProgress?: (percent: number) => void,
  ): Promise<ApiResponse<{ video_id: string }>> {
    const mimeType = videoFile.type || 'video/mp4'

    // Step 1: Get presigned upload URL
    const urlRes = await apiService.post<{ uploadUrl: string; s3Key: string }>(
      `${this.basePath}/upload-url`,
      { mimeType },
    )
    if (!urlRes.success || !urlRes.data) {
      throw new Error(urlRes.message || 'Failed to get upload URL')
    }
    const { uploadUrl, s3Key } = urlRes.data

    // Step 2: Upload directly to S3 (raw axios, no auth header)
    await axios.put(uploadUrl, videoFile, {
      headers: { 'Content-Type': mimeType },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })

    // Step 3: Confirm upload with backend
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
