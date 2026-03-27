import { apiService } from './api.service'

export type EntityType = 'package' | 'series' | 'module' | 'video' | 'document' | 'livesession' | 'book' | 'form' | 'banner' | 'homesection'

export interface PublishInfo {
  entity: { name: string; publish_status: string; is_active: boolean }
  parent_chain: Array<{ type: string; id: string; name: string; publish_status: string; is_active: boolean }>
  unpublished_ancestors: Array<{ type: string; id: string; name: string }>
  inactive_ancestors: Array<{ type: string; id: string; name: string }>
  children_summary: {
    draft_series: number; published_series: number
    draft_modules: number; published_modules: number
    draft_videos: number; published_videos: number
    draft_documents: number; published_documents: number
    inactive_items: number
  }
  active_purchases: number
  active_enrollments: number
  failed_videos: number
  processing_videos: number
}

export interface PublishOptions {
  cascade?: boolean
  activate_all?: boolean
  publish_ancestors?: boolean
}

export interface UnpublishOptions {
  cascade?: boolean
}

export const publishService = {
  getPublishInfo: async (entityType: EntityType, entityId: string) => {
    const response = await apiService.get(`/admin/publish/${entityType}/${entityId}/publish-info`)
    return response.data
  },

  publish: async (entityType: EntityType, entityId: string, options: PublishOptions = {}) => {
    const response = await apiService.put(`/admin/publish/${entityType}/${entityId}/publish`, options)
    return response.data
  },

  unpublish: async (entityType: EntityType, entityId: string, options: UnpublishOptions = {}) => {
    const response = await apiService.put(`/admin/publish/${entityType}/${entityId}/unpublish`, options)
    return response.data
  },
}
