import { BaseCrudService } from './base.service'
import { apiService, ApiResponse } from './api.service'
import type { BaseListParams, PopulatedRef } from '@/types/api.types'

// Types
export interface PackageTier {
  name: string
  duration_days: number
  price: number
  display_order: number
}

export interface Package {
  _id: string
  subject_id: PopulatedRef
  package_type_id: PopulatedRef
  name: string
  description: string
  price: number
  original_price: number | null
  is_on_sale: boolean
  sale_price: number | null
  sale_end_date: string | null
  sale_discount_percent: number | null
  duration_days: number
  trailer_video_id: string | null
  thumbnail_url: string | null
  features: string
  is_active: boolean
  display_order: number
  tiers: PackageTier[]
  series_count?: number
  createdAt: string
  updatedAt: string
}

export interface PackageDetailVideo {
  _id: string
  title: string
  description: string
  duration_seconds: number
  is_free: boolean
  display_order: number
  view_count: number
  processing_status: 'uploading' | 'processing' | 'ready' | 'failed'
  thumbnail_url: string
  is_active: boolean
  module_id: string
  faculty_id: { _id: string; name: string } | null
  createdAt: string
}

export interface PackageDetailModule {
  _id: string
  name: string
  description: string
  display_order: number
  lesson_count: number
  estimated_duration_minutes: number
  is_active: boolean
  series_id: string
  videos: PackageDetailVideo[]
  video_count: number
  createdAt: string
}

export interface PackageDetailDocument {
  _id: string
  title: string
  description: string
  file_url: string
  file_format: 'pdf' | 'epub' | 'doc' | 'docx' | 'ppt' | 'pptx'
  preview_url: string | null
  file_size_mb: number
  page_count: number | null
  is_free: boolean
  display_order: number
  download_count: number
  series_id: string
  createdAt: string
}

export interface PackageDetailSeries {
  _id: string
  name: string
  description: string
  display_order: number
  is_active: boolean
  package_id: string
  modules: PackageDetailModule[]
  module_count: number
  documents: PackageDetailDocument[]
  document_count: number
  createdAt: string
}

export interface PackageDetail extends Package {
  series_count: number
  series: PackageDetailSeries[]
}

export interface PackageFormData {
  subject_id: string
  package_type_id: string
  name: string
  description: string
  price: number
  original_price?: number | null
  is_on_sale?: boolean
  sale_price?: number | null
  sale_end_date?: string | null
  sale_discount_percent?: number | null
  duration_days: number
  trailer_video_id?: string | null
  thumbnail_url?: string | null
  features?: string
  display_order?: number
  is_active?: boolean
  tiers?: PackageTier[]
}

export interface PackagesListParams extends BaseListParams {
  subject_id?: string
  is_active?: boolean | null
  is_on_sale?: boolean | null
}

class PackagesService extends BaseCrudService<Package, PackageFormData, PackagesListParams> {
  constructor() {
    super('admin/packages', 'package')
  }

  async getDetail(id: string): Promise<ApiResponse<PackageDetail>> {
    const response = await apiService.get<Record<string, PackageDetail>>(`${this.basePath}/${id}`)
    if (response.success && response.data) {
      return { ...response, data: response.data[this.entityKey] }
    }
    return response as unknown as ApiResponse<PackageDetail>
  }
}

export const packagesService = new PackagesService()
