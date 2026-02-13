import { BaseCrudService } from './base.service'
import { apiService, ApiResponse } from './api.service'
import type { BaseListParams } from '@/types/api.types'

// Types
export interface PackageType {
  _id: string
  name: string
  description: string
  trailer_video_url: string | null
  thumbnail_url: string | null
  createdAt: string
  updatedAt: string
}

export interface PackageTypeFormData {
  name: string
  description: string
  trailer_video_url?: string | null
  thumbnail_url?: string | null
}

interface RawPackageType {
  type_id: string
  name: string
  description: string
  trailer_video_url: string | null
  thumbnail_url: string | null
}

class PackageTypesService extends BaseCrudService<PackageType, PackageTypeFormData, BaseListParams> {
  constructor() {
    super('admin/package-types', 'packageType')
  }

  /**
   * Get all package types from public endpoint (used by PackageFormModal dropdown).
   * Backend returns type_id instead of _id, so we map it here.
   */
  async getAllPublic(): Promise<ApiResponse<PackageType[]>> {
    const response = await apiService.get<{ packageTypes: RawPackageType[] }>('package-types')
    if (response.success && response.data) {
      const mapped = response.data.packageTypes.map((t) => ({
        ...t,
        _id: t.type_id,
      })) as PackageType[]
      return { ...response, data: mapped }
    }
    return response as ApiResponse<PackageType[]>
  }
}

export const packageTypesService = new PackageTypesService()
