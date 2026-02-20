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
  notifications_created: number
  push_results: { success: number; failure: number }
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

export interface SendEmailResult {
  sent: number
  failed: number
  total: number
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

  async sendToAll(data: { title: string; message: string; click_url?: string; image_url?: string }): Promise<ApiResponse<SendResult>> {
    return apiService.post<SendResult>(`${this.basePath}/send-all`, data)
  }

  async sendToSubject(data: { subject_id: string; title: string; message: string; click_url?: string; image_url?: string }): Promise<ApiResponse<SendResult>> {
    return apiService.post<SendResult>(`${this.basePath}/send-subject`, data)
  }

  async sendToUsers(data: { user_ids: string[]; title: string; message: string; click_url?: string; image_url?: string }): Promise<ApiResponse<SendResult>> {
    return apiService.post<SendResult>(`${this.basePath}/send-users`, data)
  }

  async getAttachmentUploadUrl(mimeType: string, filename: string): Promise<ApiResponse<AttachmentUploadResult>> {
    return apiService.post<AttachmentUploadResult>(`${this.basePath}/upload-attachment`, { mimeType, filename })
  }

  async sendEmailToAll(data: { subject: string; body: string; header?: string; footer?: string; attachments?: EmailAttachment[] }): Promise<ApiResponse<SendEmailResult>> {
    return apiService.post<SendEmailResult>(`${this.basePath}/send-email-all`, data)
  }

  async sendEmailToSubject(data: { subject_id: string; subject: string; body: string; header?: string; footer?: string; attachments?: EmailAttachment[] }): Promise<ApiResponse<SendEmailResult>> {
    return apiService.post<SendEmailResult>(`${this.basePath}/send-email-subject`, data)
  }

  async sendEmailToUsers(data: { user_ids: string[]; subject: string; body: string; header?: string; footer?: string; attachments?: EmailAttachment[] }): Promise<ApiResponse<SendEmailResult>> {
    return apiService.post<SendEmailResult>(`${this.basePath}/send-email-users`, data)
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
}

export const notificationsService = new NotificationsService()
