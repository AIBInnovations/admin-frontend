import { apiService, ApiResponse } from './api.service'

// Date-range presets for events + most-viewed analytics
export type AnalyticsRange = 'week' | 'month' | 'year' | 'all'

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
      view_count: number // plays
      unique_viewer_count: number
      total_watch_seconds: number
      avg_watch_seconds: number
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
    range: AnalyticsRange
    by_range: Array<{
      event_type: string
      count: number
    }>
  }
}

class AnalyticsService {
  async getDashboard(range: AnalyticsRange = 'month'): Promise<ApiResponse<DashboardAnalytics>> {
    return apiService.get<DashboardAnalytics>(`admin/analytics/dashboard?range=${range}`)
  }
}

export const analyticsService = new AnalyticsService()
