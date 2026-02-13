import { apiService, ApiResponse } from './api.service'

// Types
export type AppSettings = Record<string, string | number | boolean>

class AppSettingsService {
  async getAll(): Promise<ApiResponse<{ settings: AppSettings }>> {
    return apiService.get<{ settings: AppSettings }>('app-settings')
  }
}

export const appSettingsService = new AppSettingsService()
