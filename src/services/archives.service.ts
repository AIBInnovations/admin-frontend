import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams } from '@/types/api.types'

export interface ArchivedItem {
  _id: string
  _type: 'video' | 'document' | 'banner'
  title: string
  archivedAt: string
  createdAt: string
  // Video-specific
  thumbnail_url?: string
  processing_status?: string
  module_id?: { _id: string; name: string } | null
  faculty_id?: { _id: string; name: string } | null
  // Document-specific
  file_format?: string
  file_size_mb?: number
  series_id?: { _id: string; name: string } | null
  subject_id?: { _id: string; name: string } | null
  // Banner-specific
  image_url?: string
  is_active?: boolean
}

export interface ArchiveCounts {
  video: number
  document: number
  banner: number
  total: number
}

export interface ArchivesListParams extends BaseListParams {
  type?: 'video' | 'document' | 'banner' | 'all'
}

class ArchivesService {
  private basePath = 'admin/archives'

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

  async getAll(params: ArchivesListParams = {}): Promise<ApiResponse<ListResponse<ArchivedItem>>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<ListResponse<ArchivedItem>>(`${this.basePath}${query}`)
  }

  async getCounts(): Promise<ApiResponse<ArchiveCounts>> {
    return apiService.get<ArchiveCounts>(`${this.basePath}/counts`)
  }

  async restore(type: 'video' | 'document' | 'banner', id: string): Promise<ApiResponse<void>> {
    const typePathMap = { video: 'videos', document: 'documents', banner: 'banners' }
    return apiService.patch<void>(`admin/${typePathMap[type]}/${id}/restore`, {})
  }

  async permanentDelete(type: 'video' | 'document' | 'banner', id: string): Promise<ApiResponse<void>> {
    const typePathMap = { video: 'videos', document: 'documents', banner: 'banners' }
    return apiService.delete<void>(`admin/${typePathMap[type]}/${id}`)
  }
}

export const archivesService = new ArchivesService()
