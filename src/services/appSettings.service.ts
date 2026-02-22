import { apiService, ApiResponse } from './api.service'

// Types
export type AppSettings = Record<string, string | number | boolean>

export interface AppSettingRecord {
  _id: string
  key: string
  value: string
  description: string | null
  createdAt: string
  updatedAt: string
}

class AppSettingsService {
  // Public endpoint (flat key-value)
  async getAll(): Promise<ApiResponse<{ settings: AppSettings }>> {
    return apiService.get<{ settings: AppSettings }>('app-settings')
  }

  // Admin endpoints (full records)
  async getAdminAll(): Promise<ApiResponse<{ settings: AppSettingRecord[] }>> {
    return apiService.get<{ settings: AppSettingRecord[] }>('admin/app-settings')
  }

  async updateSetting(key: string, value: string, description?: string): Promise<ApiResponse<{ setting: AppSettingRecord }>> {
    return apiService.put<{ setting: AppSettingRecord }>(`admin/app-settings/${key}`, { value, description })
  }

  async bulkUpdate(settings: { key: string; value: string; description?: string }[]): Promise<ApiResponse<{ updated: number }>> {
    return apiService.put<{ updated: number }>('admin/app-settings', { settings })
  }

  async deleteSetting(key: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`admin/app-settings/${key}`)
  }
}

export const appSettingsService = new AppSettingsService()
