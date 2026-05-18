import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams, PopulatedRef } from '@/types/api.types'

// Types
export interface SubjectSelection {
  subject_id: PopulatedRef & { icon_url?: string }
  selected_at: string
  is_primary: boolean
}

export interface UserPurchase {
  _id: string
  package_id: { _id: string; name: string; price: number; duration_days: number }
  payment_gateway: 'zoho_payments' | 'razorpay'
  zoho_payment_id: string | null
  zoho_invoice_id?: string | null
  amount_paid: number
  currency: string
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
  purchased_at: string
  expires_at: string
  is_active: boolean
  is_admin_granted?: boolean
  admin_grant_reason?: string | null
  is_revoked?: boolean
  revoked_reason?: string | null
  revoked_at?: string | null
  auto_renewal_enabled: boolean
  createdAt: string
}

export interface DeviceSession {
  _id: string
  device_id: string
  device_name: string
  device_type: 'iOS' | 'Android' | 'Web' | 'Tablet'
  login_time: string
  last_active: string
  is_active: boolean
  fcm_token: string | null
}

export interface UserPreferences {
  dark_mode_enabled: boolean
  push_notifications_enabled: boolean
  video_quality_preference: 'auto' | '360p' | '480p' | '720p' | '1080p'
  playback_speed_default: number
  language: 'en' | 'hi'
}

export interface User {
  _id: string
  phone_number: string
  name: string
  email: string
  photo_url: string | null
  address: string | null
  date_of_birth: string | null
  gender: 'male' | 'female' | 'other' | null
  student_id: string | null
  ug_college: string | null
  pg_college: string | null
  affiliated_organisation: string | null
  current_designation: string | null
  timezone: string
  profile_completion_percentage: number
  last_login: string | null
  last_activity_at: string | null
  is_active: boolean
  onboarding_completed: boolean
  subject_selections: SubjectSelection[]
  total_purchases_count?: number
  active_purchases_count?: number
  email_excluded?: boolean
  email_excluded_at?: string | null
  email_excluded_reason?: 'user_unsubscribed' | 'admin_excluded' | null
  email_excluded_by?: { _id: string; name?: string; email?: string } | string | null
  createdAt: string
  updatedAt: string
}

export interface CreateUserData {
  phone_number: string
  name?: string
  email?: string
  gender?: 'male' | 'female' | 'other'
  date_of_birth?: string
  address?: string
  ug_college?: string
  pg_college?: string
  affiliated_organisation?: string
  current_designation?: string
  skip_onboarding?: boolean
}

export interface UpdateUserData {
  name?: string
  email?: string
  phone_number?: string
  gender?: 'male' | 'female' | 'other'
  date_of_birth?: string
  address?: string
  ug_college?: string
  pg_college?: string
  affiliated_organisation?: string
  current_designation?: string
}

export interface GrantPackageData {
  package_id: string
  duration_days: number
  tier_index?: number
  create_invoice?: boolean
  invoice_amount?: number
  is_inclusive_tax?: boolean
  reason?: string
  notes?: string
}

export interface GrantEbookData {
  book_id: string
  create_invoice?: boolean
  invoice_amount?: number
  is_inclusive_tax?: boolean
  reason?: string
  notes?: string
}

export interface GrantSessionData {
  session_id: string
  create_invoice?: boolean
  invoice_amount?: number
  is_inclusive_tax?: boolean
  reason?: string
  notes?: string
}

export interface UsersListParams extends BaseListParams {
  search?: string
  is_active?: boolean | null
  has_active_purchase?: boolean | null
  email_excluded?: boolean | null
}

export interface SessionPurchase {
  _id: string
  session_id: { _id: string; title: string; scheduled_start_time: string; price: number } | string
  payment_gateway: 'zoho_payments' | 'razorpay'
  zoho_payment_id: string | null
  zoho_invoice_id?: string | null
  amount_paid: number
  currency: string
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
  purchased_at: string
  is_active: boolean
  is_admin_granted?: boolean
  admin_grant_reason?: string | null
  is_revoked?: boolean
  revoked_reason?: string | null
  revoked_at?: string | null
  createdAt: string
}

export interface EbookPurchase {
  _id: string
  book_id: { _id: string; title: string; author?: string; price: number; ebook: boolean; thumbnail_url?: string } | string
  payment_gateway: 'zoho_payments'
  zoho_payment_id: string | null
  zoho_invoice_id?: string | null
  amount_paid: number
  currency: string
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
  purchased_at: string
  is_active: boolean
  is_admin_granted?: boolean
  admin_grant_reason?: string | null
  is_revoked?: boolean
  revoked_reason?: string | null
  revoked_at?: string | null
  createdAt: string
}

export interface BookOrderItem {
  book_id: string
  title: string
  quantity: number
  price_at_purchase: number
}

export interface BookOrder {
  _id: string
  order_number: string
  items: BookOrderItem[]
  total_amount: number
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
  order_status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  tracking_number: string | null
  courier_name: string | null
  createdAt: string
}

export interface UserDetail extends User {
  purchases: UserPurchase[]
  session_purchases: SessionPurchase[]
  ebook_purchases: EbookPurchase[]
  book_orders: BookOrder[]
  device_sessions: DeviceSession[]
  preferences: UserPreferences | null
}

class UsersService {
  private basePath = 'admin/users'

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
   * Get all users with pagination and filters
   */
  async getAll(params: UsersListParams = {}): Promise<ApiResponse<ListResponse<User>>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<ListResponse<User>>(`${this.basePath}${query}`)
  }

  /**
   * Get single user by ID (with purchases, device sessions, preferences)
   */
  async getById(userId: string): Promise<ApiResponse<UserDetail>> {
    const response = await apiService.get<{ user: UserDetail }>(`${this.basePath}/${userId}`)
    if (response.success && response.data) {
      return { ...response, data: response.data.user }
    }
    return response as ApiResponse<UserDetail>
  }

  /**
   * Block user (deactivate account and sessions)
   */
  async blockUser(userId: string): Promise<ApiResponse<{ user_id: string; is_active: boolean; message: string }>> {
    return apiService.put(`${this.basePath}/${userId}/block`)
  }

  /**
   * Unblock user (reactivate account)
   */
  async unblockUser(userId: string): Promise<ApiResponse<{ user_id: string; is_active: boolean; message: string }>> {
    return apiService.put(`${this.basePath}/${userId}/unblock`)
  }

  /**
   * Create new user (admin)
   */
  async createUser(
    data: CreateUserData
  ): Promise<
    ApiResponse<{
      user_id: string
      phone_number: string
      name: string
      email: string
      student_id: string
      is_active: boolean
      onboarding_completed: boolean
      message: string
    }>
  > {
    return apiService.post(`${this.basePath}`, data)
  }

  /**
   * Update user profile (admin)
   */
  async updateUser(
    userId: string,
    data: UpdateUserData
  ): Promise<
    ApiResponse<{
      user_id: string
      phone_number: string
      name: string
      email: string
      student_id: string
      profile_completion_percentage: number
      message: string
    }>
  > {
    return apiService.put(`${this.basePath}/${userId}`, data)
  }

  /**
   * Grant package access to user (complimentary)
   */
  async grantPackageAccess(
    userId: string,
    data: GrantPackageData
  ): Promise<
    ApiResponse<{
      user_id: string
      user_name: string
      user_phone: string
      purchase_id: string
      package_id: string
      package_name: string
      subject_name: string
      tier_name: string
      duration_days: number
      amount_paid: number
      purchased_at: string
      expires_at: string
      reason: string
      notes: string
      message: string
    }>
  > {
    return apiService.post(`${this.basePath}/${userId}/grant-package`, data)
  }
  /**
   * Revoke package access for a user
   */
  async revokePackageAccess(
    userId: string,
    purchaseId: string,
    reason?: string
  ): Promise<
    ApiResponse<{
      user_id: string
      user_name: string
      purchase_id: string
      package_name: string
      revoked_at: string
      reason: string
      message: string
    }>
  > {
    return apiService.put(`${this.basePath}/${userId}/purchases/${purchaseId}/revoke`, { reason })
  }

  /**
   * Grant ebook access to user (complimentary)
   */
  async grantEbookAccess(
    userId: string,
    data: GrantEbookData
  ): Promise<ApiResponse<{ message: string }>> {
    return apiService.post(`${this.basePath}/${userId}/grant-ebook`, data)
  }

  /**
   * Revoke ebook access for a user
   */
  async revokeEbookAccess(
    userId: string,
    ebookPurchaseId: string,
    reason?: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiService.put(`${this.basePath}/${userId}/ebook-purchases/${ebookPurchaseId}/revoke`, { reason })
  }

  /**
   * Grant session access to user (complimentary)
   */
  async grantSessionAccess(
    userId: string,
    data: GrantSessionData
  ): Promise<ApiResponse<{ message: string }>> {
    return apiService.post(`${this.basePath}/${userId}/grant-session`, data)
  }

  /**
   * Revoke session access for a user
   */
  async revokeSessionAccess(
    userId: string,
    sessionPurchaseId: string,
    reason?: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiService.put(`${this.basePath}/${userId}/session-purchases/${sessionPurchaseId}/revoke`, { reason })
  }

  /**
   * Exclude user from bulk/marketing emails (admin action).
   */
  async excludeFromEmails(
    userId: string
  ): Promise<ApiResponse<{ user_id: string; email_excluded: boolean; message: string }>> {
    return apiService.put(`${this.basePath}/${userId}/email-exclude`)
  }

  /**
   * Re-include user in bulk/marketing emails.
   */
  async includeInEmails(
    userId: string
  ): Promise<ApiResponse<{ user_id: string; email_excluded: boolean; message: string }>> {
    return apiService.put(`${this.basePath}/${userId}/email-include`)
  }

  /**
   * List users currently excluded from emails.
   */
  async getExcludedUsers(
    params: { page?: number; limit?: number; reason?: 'user_unsubscribed' | 'admin_excluded' } = {}
  ): Promise<ApiResponse<ListResponse<User>>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<ListResponse<User>>(`${this.basePath}/email-excluded${query}`)
  }
}

export const usersService = new UsersService()
