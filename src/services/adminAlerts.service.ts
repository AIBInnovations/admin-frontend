import { apiService, ApiResponse } from './api.service'

export interface AdminAlert {
  id: string
  kind: 'payment_case' | 'feedback' | 'delivery_note' | 'video' | 'zoho_item' | 'career_application'
  severity: 'high' | 'normal'
  title: string
  description: string
  count: number
  href: string
  latest_at: string | null
}

/** Things waiting for a person, counted across the panel. */
export const adminAlertsService = {
  list(): Promise<ApiResponse<{ alerts: AdminAlert[]; total: number }>> {
    return apiService.get('admin/alerts')
  },
}
