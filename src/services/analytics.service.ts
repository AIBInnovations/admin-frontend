import { apiService, ApiResponse } from './api.service'

// Types
export interface DashboardAnalytics {
  users: {
    total: number
    active_30_days: number
    new_this_month: number
  }
  revenue: {
    total: number
    this_month: number
  }
  content: {
    most_viewed_videos: Array<{
      video_id: string
      title: string
      view_count: number
      thumbnail_url: string | null
    }>
    popular_subjects: Array<{
      subject_id: string
      name: string
      icon_url: string | null
      purchase_count: number
    }>
  }
  events: {
    last_30_days: Array<{
      event_type: string
      count: number
    }>
  }
}

class AnalyticsService {
  async getDashboard(): Promise<ApiResponse<DashboardAnalytics>> {
    return apiService.get<DashboardAnalytics>('admin/analytics/dashboard')
  }
}

export const analyticsService = new AnalyticsService()
