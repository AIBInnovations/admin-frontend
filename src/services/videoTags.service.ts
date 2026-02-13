import { apiService, ApiResponse } from './api.service'
import { BaseCrudService } from './base.service'
import type { BaseListParams, ListResponse } from '@/types/api.types'
import type { Video } from './videos.service'

// Types — matches actual backend VideoTag model (name + category only)
export interface VideoTag {
  _id: string
  name: string
  category: string | null
  video_count?: number
  createdAt: string
  updatedAt: string
}

export interface VideoTagFormData {
  name: string
  category?: string
}

export interface VideoTagsListParams extends BaseListParams {
  category?: string
}

class VideoTagsService extends BaseCrudService<VideoTag, VideoTagFormData, VideoTagsListParams> {
  constructor() {
    super('admin/video-tags', 'tag')
  }

  /**
   * Get all videos for a specific tag
   */
  async getTagVideos(
    tagId: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<ApiResponse<ListResponse<Video>>> {
    const query = new URLSearchParams()
    if (params.page) query.append('page', String(params.page))
    if (params.limit) query.append('limit', String(params.limit))
    const str = query.toString()
    return apiService.get<ListResponse<Video>>(
      `${this.basePath}/${tagId}/videos${str ? `?${str}` : ''}`,
    )
  }
}

export const videoTagsService = new VideoTagsService()
