import { apiService, ApiResponse } from './api.service'
import { BaseCrudService } from './base.service'
import type { BaseListParams, PopulatedRef, PublishStatus } from '@/types/api.types'

// Types
export interface Module {
  _id: string
  series_id: PopulatedRef
  name: string
  description: string
  display_order: number
  lesson_count: number
  estimated_duration_minutes: number
  is_active: boolean
  publish_status: PublishStatus
  createdAt: string
  updatedAt: string
}

export interface ModuleFormData {
  series_id: string
  name: string
  description: string
  display_order?: number
  lesson_count?: number
  estimated_duration_minutes?: number
  is_active?: boolean
  publish_status?: PublishStatus
}

export interface ModulesListParams extends BaseListParams {
  series_id?: string
  is_active?: boolean | null
  publish_status?: string | null
}

class ModulesService extends BaseCrudService<Module, ModuleFormData, ModulesListParams> {
  constructor() {
    super('admin/modules', 'module')
  }

  /**
   * Recalculate module statistics (lesson count + duration) from videos
   */
  async recalculateStats(moduleId: string): Promise<ApiResponse<Module>> {
    const response = await apiService.post<Record<string, Module>>(
      `${this.basePath}/${moduleId}/recalculate`,
    )
    if (response.success && response.data) {
      return { ...response, data: response.data.module }
    }
    return response as ApiResponse<Module>
  }

  /**
   * Bulk reorder modules — sends full ordered list, rewrites display_order as 1..N
   */
  async reorder(orderedIds: string[]): Promise<ApiResponse<void>> {
    return apiService.patch<void>(`${this.basePath}/reorder`, { ordered_ids: orderedIds })
  }
}

export const modulesService = new ModulesService()
