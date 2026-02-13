import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams } from '@/types/api.types'

// Types
export interface Banner {
  _id: string
  title: string
  subtitle: string | null
  image_url: string
  click_url: string | null
  display_order: number
  is_active: boolean
  start_date: string
  end_date: string | null
  createdAt: string
  updatedAt: string
}

export interface BannerFormData {
  title: string
  subtitle?: string
  image_url: string
  click_url?: string
  display_order?: number
  is_active?: boolean
  start_date: string
  end_date?: string
}

export interface BannersListParams extends BaseListParams {
  is_active?: boolean | null
}

class BannersService {
  private basePath = 'admin/banners'

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

  async getAll(params: BannersListParams = {}): Promise<ApiResponse<ListResponse<Banner>>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<ListResponse<Banner>>(`${this.basePath}${query}`)
  }

  async getById(bannerId: string): Promise<ApiResponse<Banner>> {
    const response = await apiService.get<{ banner: Banner }>(`${this.basePath}/${bannerId}`)
    if (response.success && response.data) {
      return { ...response, data: response.data.banner }
    }
    return response as ApiResponse<Banner>
  }

  async create(data: BannerFormData): Promise<ApiResponse<Banner>> {
    const response = await apiService.post<{ banner: Banner }>(this.basePath, data)
    if (response.success && response.data) {
      return { ...response, data: response.data.banner }
    }
    return response as ApiResponse<Banner>
  }

  async update(bannerId: string, data: Partial<BannerFormData>): Promise<ApiResponse<Banner>> {
    const response = await apiService.put<{ banner: Banner }>(`${this.basePath}/${bannerId}`, data)
    if (response.success && response.data) {
      return { ...response, data: response.data.banner }
    }
    return response as ApiResponse<Banner>
  }

  async delete(bannerId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`${this.basePath}/${bannerId}`)
  }
}

export const bannersService = new BannersService()
