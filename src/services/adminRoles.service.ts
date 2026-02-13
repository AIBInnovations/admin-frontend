import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams } from '@/types/api.types'

// Types
export interface AdminRole {
  _id: string
  name: string
  permissions: string[] | string
  createdAt: string
  updatedAt: string
}

export interface AdminRoleFormData {
  name: string
  permissions: string[]
}

export type AdminRolesListParams = BaseListParams

class AdminRolesService {
  private basePath = 'admin/admin-roles'

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
   * Parse permissions from backend format (may be JSON string or array)
   */
  private parsePermissions(role: AdminRole): AdminRole {
    if (typeof role.permissions === 'string') {
      try {
        role.permissions = JSON.parse(role.permissions)
      } catch {
        role.permissions = []
      }
    }
    return role
  }

  /**
   * Get all admin roles with pagination
   */
  async getAll(params: AdminRolesListParams = {}): Promise<ApiResponse<ListResponse<AdminRole>>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    const response = await apiService.get<ListResponse<AdminRole>>(`${this.basePath}${query}`)
    if (response.success && response.data?.entities) {
      response.data.entities = response.data.entities.map((r) => this.parsePermissions(r))
    }
    return response
  }

  /**
   * Get single role by ID
   */
  async getById(roleId: string): Promise<ApiResponse<AdminRole>> {
    const response = await apiService.get<{ admin_role: AdminRole }>(`${this.basePath}/${roleId}`)
    if (response.success && response.data) {
      return { ...response, data: this.parsePermissions(response.data.admin_role) }
    }
    return response as ApiResponse<AdminRole>
  }

  /**
   * Create new role
   */
  async create(data: AdminRoleFormData): Promise<ApiResponse<AdminRole>> {
    const response = await apiService.post<{ admin_role: AdminRole }>(this.basePath, data)
    if (response.success && response.data) {
      return { ...response, data: this.parsePermissions(response.data.admin_role) }
    }
    return response as ApiResponse<AdminRole>
  }

  /**
   * Update role
   */
  async update(roleId: string, data: Partial<AdminRoleFormData>): Promise<ApiResponse<AdminRole>> {
    const response = await apiService.put<{ admin_role: AdminRole }>(`${this.basePath}/${roleId}`, data)
    if (response.success && response.data) {
      return { ...response, data: this.parsePermissions(response.data.admin_role) }
    }
    return response as ApiResponse<AdminRole>
  }

  /**
   * Delete role (fails if admin users are assigned to it)
   */
  async delete(roleId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`${this.basePath}/${roleId}`)
  }
}

export const adminRolesService = new AdminRolesService()
