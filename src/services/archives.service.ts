import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams } from '@/types/api.types'

export type ArchivedType = 'video' | 'document' | 'banner' | 'live_session' | 'workshop'

export interface ArchivedItem {
  _id: string
  _type: ArchivedType
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
  // Live session-specific
  scheduled_start_time?: string
  status?: string
  platform?: string
  // Workshop-specific (its days are archived with it and are not listed alone)
  start_date?: string
  end_date?: string
  day_count?: number
}

export interface ArchiveCounts {
  video: number
  document: number
  banner: number
  live_session: number
  /** Older API versions leave it out. */
  workshop?: number
  total: number
}

export interface ArchivesListParams extends BaseListParams {
  type?: ArchivedType | 'all'
}

/** Where each type's restore, delete and delete-impact endpoints live. */
export const ARCHIVE_PATH: Record<ArchivedType, string> = {
  video: 'videos',
  document: 'documents',
  banner: 'banners',
  live_session: 'live-sessions',
  workshop: 'workshops',
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

  async restore(type: ArchivedType, id: string): Promise<ApiResponse<void>> {
    return apiService.patch<void>(`admin/${ARCHIVE_PATH[type]}/${id}/restore`, {})
  }

  async permanentDelete(type: ArchivedType, id: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`admin/${ARCHIVE_PATH[type]}/${id}`)
  }
}

export const archivesService = new ArchivesService()
