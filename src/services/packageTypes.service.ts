import { apiService, ApiResponse } from './api.service'

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

interface RawPackageType {
  type_id: string
  name: string
  description: string
  trailer_video_url: string | null
  thumbnail_url: string | null
}

class PackageTypesService {
  /**
   * Get all package types (public endpoint, read-only)
   * Backend returns type_id instead of _id, so we map it here.
   */
  async getAll(): Promise<ApiResponse<PackageType[]>> {
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
