import { BaseCrudService } from './base.service'
import type { BaseListParams, PopulatedRef } from '@/types/api.types'

// Types
export interface Series {
  _id: string
  package_id: PopulatedRef
  name: string
  description: string
  display_order: number
  is_active: boolean
  createdAt: string
  updatedAt: string
}

export interface SeriesFormData {
  package_id: string
  name: string
  description: string
  display_order?: number
  is_active?: boolean
}

export interface SeriesListParams extends BaseListParams {
  package_id?: string
  is_active?: boolean | null
}

class SeriesService extends BaseCrudService<Series, SeriesFormData, SeriesListParams> {
  constructor() {
    super('admin/series', 'series')
  }
}

export const seriesService = new SeriesService()
