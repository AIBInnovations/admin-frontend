import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams } from '@/types/api.types'

export interface Notification {
  _id: string
  user_id: { _id: string; name: string; email: string; phone?: string } | null
  title: string
  message: string
  notification_type: 'push' | 'in_app' | 'email' | 'sms'
  status: 'pending' | 'sent' | 'read' | 'failed'
  delivery_status: 'queued' | 'sent' | 'delivered' | 'failed'
  failed_reason: string | null
  sent_at: string | null
  read_at: string | null
  click_url: string | null
  createdAt: string
  updatedAt: string
}

export interface NotificationStats {
  total: number
  sent: number
  read: number
  failed: number
  pending: number
  delivered: number
  queued: number
  by_type: Record<string, number>
}

export interface NotificationsListParams extends BaseListParams {
  notification_type?: string
  status?: string
  delivery_status?: string
}

export interface SendResult {
  sent: number
  failed: number
  total: number
}

export interface PushPayload {
  title: string
  message: string
  click_url?: string
  link_type?: 'internal' | 'external' | 'none'
  external_url?: string
  internal_route?: string
  internal_params?: Record<string, string>
  image_url?: string
}

export interface NavigationTargetParam {
  name: string
  type: string
  required: boolean
  label: string
  options?: string[]
  autoFrom?: string
  filterPackageType?: string
}

export interface NavigationTarget {
  key: string
  label: string
  route: string
  params: NavigationTargetParam[]
}

export interface ImageUploadResult {
  uploadUrl: string
  s3Key: string
  imageUrl: string
}

export interface AttachmentUploadResult {
  uploadUrl: string
  s3Key: string
  fileUrl: string
  filename: string
}

export interface EmailAttachment {
  url: string
  filename: string
}

export interface FailedEmail {
  email: string
  error: string
}

export interface SendEmailResult {
  sent: number
  failed: number
  total: number
  failedEmails?: FailedEmail[]
  account?: 'primary' | 'fallback'
}

class NotificationsService {
  private basePath = 'admin/notifications'

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

  async getAll(params: NotificationsListParams = {}): Promise<ApiResponse<ListResponse<Notification>>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<ListResponse<Notification>>(`${this.basePath}${query}`)
  }

  async getById(id: string): Promise<ApiResponse<Notification>> {
    const response = await apiService.get<{ notification: Notification }>(`${this.basePath}/${id}`)
    if (response.success && response.data) {
      return { ...response, data: response.data.notification }
    }
    return response as ApiResponse<Notification>
  }

  async getStats(): Promise<ApiResponse<NotificationStats>> {
    const response = await apiService.get<{ stats: NotificationStats }>(`${this.basePath}/stats`)
    if (response.success && response.data) {
      return { ...response, data: response.data.stats }
    }
    return response as ApiResponse<NotificationStats>
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`${this.basePath}/${id}`)
  }

  async getImageUploadUrl(mimeType: string): Promise<ApiResponse<ImageUploadResult>> {
    return apiService.post<ImageUploadResult>(`${this.basePath}/upload-image`, { mimeType })
  }

  async getNavigationTargets(): Promise<ApiResponse<{ targets: NavigationTarget[] }>> {
    return apiService.get<{ targets: NavigationTarget[] }>(`${this.basePath}/navigation-targets`)
  }

  async sendToAll(data: PushPayload): Promise<ApiResponse<SendResult>> {
    return apiService.post<SendResult>(`${this.basePath}/send-all`, data)
  }

  async sendToSubject(data: PushPayload & { subject_id: string }): Promise<ApiResponse<SendResult>> {
    return apiService.post<SendResult>(`${this.basePath}/send-subject`, data)
  }

  async sendToUsers(data: PushPayload & { user_ids: string[] }): Promise<ApiResponse<SendResult>> {
    return apiService.post<SendResult>(`${this.basePath}/send-users`, data)
  }

  async getAttachmentUploadUrl(mimeType: string, filename: string): Promise<ApiResponse<AttachmentUploadResult>> {
    return apiService.post<AttachmentUploadResult>(`${this.basePath}/upload-attachment`, { mimeType, filename })
  }

  async sendEmailToAll(data: { subject: string; body: string; header?: string; footer?: string; attachments?: EmailAttachment[] }): Promise<ApiResponse<SendEmailResult>> {
    return apiService.post<SendEmailResult>(`${this.basePath}/send-email-all`, data, { timeout: 120000 })
  }

  async sendEmailToSubject(data: { subject_id: string; subject: string; body: string; header?: string; footer?: string; attachments?: EmailAttachment[] }): Promise<ApiResponse<SendEmailResult>> {
    return apiService.post<SendEmailResult>(`${this.basePath}/send-email-subject`, data, { timeout: 120000 })
  }

  async sendEmailToUsers(data: { user_ids: string[]; subject: string; body: string; header?: string; footer?: string; attachments?: EmailAttachment[] }): Promise<ApiResponse<SendEmailResult>> {
    return apiService.post<SendEmailResult>(`${this.basePath}/send-email-users`, data, { timeout: 120000 })
  }

  async sendSmsToAll(data: { message: string }): Promise<ApiResponse<SendEmailResult>> {
    return apiService.post<SendEmailResult>(`${this.basePath}/send-sms-all`, data)
  }

  async sendSmsToSubject(data: { subject_id: string; message: string }): Promise<ApiResponse<SendEmailResult>> {
    return apiService.post<SendEmailResult>(`${this.basePath}/send-sms-subject`, data)
  }

  async sendSmsToUsers(data: { user_ids: string[]; message: string }): Promise<ApiResponse<SendEmailResult>> {
    return apiService.post<SendEmailResult>(`${this.basePath}/send-sms-users`, data)
  }

  // ── Package & Series Targeting ──

  async sendToPackage(data: PushPayload & { package_id: string }): Promise<ApiResponse<SendResult>> {
    return apiService.post<SendResult>(`${this.basePath}/send-package`, data)
  }

  async sendToSeries(data: PushPayload & { series_id: string }): Promise<ApiResponse<SendResult>> {
    return apiService.post<SendResult>(`${this.basePath}/send-series`, data)
  }

  async sendEmailToPackage(data: { package_id: string; subject: string; body: string; header?: string; footer?: string; attachments?: EmailAttachment[] }): Promise<ApiResponse<SendEmailResult>> {
    return apiService.post<SendEmailResult>(`${this.basePath}/send-email-package`, data, { timeout: 120000 })
  }

  async sendEmailToSeries(data: { series_id: string; subject: string; body: string; header?: string; footer?: string; attachments?: EmailAttachment[] }): Promise<ApiResponse<SendEmailResult>> {
    return apiService.post<SendEmailResult>(`${this.basePath}/send-email-series`, data, { timeout: 120000 })
  }

  async sendSmsToPackage(data: { package_id: string; message: string }): Promise<ApiResponse<SendEmailResult>> {
    return apiService.post<SendEmailResult>(`${this.basePath}/send-sms-package`, data)
  }

  async sendSmsToSeries(data: { series_id: string; message: string }): Promise<ApiResponse<SendEmailResult>> {
    return apiService.post<SendEmailResult>(`${this.basePath}/send-sms-series`, data)
  }

  // ── Session Enrollee Targeting ──

  async sendToSession(data: PushPayload & { session_id: string }): Promise<ApiResponse<SendResult>> {
    return apiService.post<SendResult>(`${this.basePath}/send-session`, data)
  }

  async sendEmailToSession(data: { session_id: string; subject: string; body: string; header?: string; footer?: string; attachments?: EmailAttachment[] }): Promise<ApiResponse<SendEmailResult>> {
    return apiService.post<SendEmailResult>(`${this.basePath}/send-email-session`, data, { timeout: 120000 })
  }

  async sendSmsToSession(data: { session_id: string; message: string }): Promise<ApiResponse<SendEmailResult>> {
    return apiService.post<SendEmailResult>(`${this.basePath}/send-sms-session`, data)
  }

  // ── Scheduled Notifications ──

  async scheduleNotification(data: ScheduleNotificationPayload): Promise<ApiResponse<{ scheduled_notification: ScheduledNotification }>> {
    return apiService.post(`${this.basePath}/schedule`, data)
  }

  async listScheduledNotifications(params: { status?: string; channel?: string; page?: number; limit?: number } = {}): Promise<ApiResponse<ListResponse<ScheduledNotification>>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<ListResponse<ScheduledNotification>>(`${this.basePath}/scheduled${query}`)
  }

  async cancelScheduledNotification(id: string): Promise<ApiResponse<{ scheduled_notification: ScheduledNotification }>> {
    return apiService.delete(`${this.basePath}/scheduled/${id}`)
  }
}

// ── Scheduled Notification types ──

export type ScheduledChannel = 'push' | 'email' | 'sms'
export type ScheduledTargetType = 'all' | 'subject' | 'users' | 'package' | 'series' | 'session'
export type ScheduledStatus = 'pending' | 'sent' | 'failed' | 'cancelled'

export interface ScheduleNotificationPayload {
  channel: ScheduledChannel
  target_type: ScheduledTargetType
  target_id?: string
  user_ids?: string[]
  scheduled_at: string  // ISO

  // Push
  title?: string
  message?: string
  click_url?: string
  link_type?: 'internal' | 'external' | 'none'
  external_url?: string
  internal_route?: string
  internal_params?: Record<string, string>
  image_url?: string

  // Email
  email_subject?: string
  email_header?: string
  email_body?: string
  email_footer?: string
  email_attachments?: EmailAttachment[]

  // SMS
  sms_message?: string
}

export interface ScheduledNotification {
  _id: string
  channel: ScheduledChannel
  target_type: ScheduledTargetType
  target_id: string | null
  user_ids: string[]
  scheduled_at: string
  status: ScheduledStatus
  failure_reason: string | null
  sent_at: string | null
  result: { sent: number; failed: number; total: number } | null
  title: string | null
  message: string | null
  email_subject: string | null
  sms_message: string | null
  image_url: string | null
  created_by: { _id: string; name: string; email: string } | null
  createdAt: string
  updatedAt: string
}

export const notificationsService = new NotificationsService()
