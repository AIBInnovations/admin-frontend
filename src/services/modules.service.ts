import { apiService, ApiResponse } from './api.service'
import { BaseCrudService } from './base.service'
import type { BaseListParams, PopulatedRef } from '@/types/api.types'

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
}

export interface ModulesListParams extends BaseListParams {
  series_id?: string
  is_active?: boolean | null
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
}

export const modulesService = new ModulesService()
