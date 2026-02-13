import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams, PopulatedRef } from '@/types/api.types'

// Types
export interface AdminUser {
  _id: string
  name: string
  email: string
  phone: string | null
  role_id: PopulatedRef
  is_active: boolean
  createdAt: string
  updatedAt: string
}

export interface AdminUserFormData {
  name: string
  email: string
  phone?: string
  password?: string
  role_id: string
}

export interface AdminUsersListParams extends BaseListParams {
  is_active?: boolean | null
  role_id?: string
}

class AdminUsersService {
  private basePath = 'admin/admin-users'

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

  /**
   * Get all admin users with pagination and filters
   */
  async getAll(params: AdminUsersListParams = {}): Promise<ApiResponse<ListResponse<AdminUser>>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<ListResponse<AdminUser>>(`${this.basePath}${query}`)
  }

  /**
   * Get single admin user by ID
   */
  async getById(adminUserId: string): Promise<ApiResponse<AdminUser>> {
    const response = await apiService.get<{ admin_user: AdminUser }>(`${this.basePath}/${adminUserId}`)
    if (response.success && response.data) {
      return { ...response, data: response.data.admin_user }
    }
    return response as ApiResponse<AdminUser>
  }

  /**
   * Create new admin user
   */
  async create(data: AdminUserFormData): Promise<ApiResponse<AdminUser>> {
    const response = await apiService.post<{ admin_user: AdminUser }>(this.basePath, data)
    if (response.success && response.data) {
      return { ...response, data: response.data.admin_user }
    }
    return response as ApiResponse<AdminUser>
  }

  /**
   * Update admin user
   */
  async update(adminUserId: string, data: Partial<AdminUserFormData>): Promise<ApiResponse<AdminUser>> {
    const response = await apiService.put<{ admin_user: AdminUser }>(`${this.basePath}/${adminUserId}`, data)
    if (response.success && response.data) {
      return { ...response, data: response.data.admin_user }
    }
    return response as ApiResponse<AdminUser>
  }

  /**
   * Delete admin user
   */
  async delete(adminUserId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`${this.basePath}/${adminUserId}`)
  }

  /**
   * Activate admin user
   */
  async activate(adminUserId: string): Promise<ApiResponse<{ admin_user_id: string; is_active: boolean; message: string }>> {
    return apiService.put(`${this.basePath}/${adminUserId}/activate`)
  }

  /**
   * Deactivate admin user
   */
  async deactivate(adminUserId: string): Promise<ApiResponse<{ admin_user_id: string; is_active: boolean; message: string }>> {
    return apiService.put(`${this.basePath}/${adminUserId}/deactivate`)
  }
}

export const adminUsersService = new AdminUsersService()
