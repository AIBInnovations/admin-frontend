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
  amount_paid: number
  currency: string
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
  purchased_at: string
  expires_at: string
  is_active: boolean
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
  timezone: string
  profile_completion_percentage: number
  last_login: string | null
  last_activity_at: string | null
  is_active: boolean
  onboarding_completed: boolean
  subject_selections: SubjectSelection[]
  total_purchases_count?: number
  active_purchases_count?: number
  createdAt: string
  updatedAt: string
}

export interface UsersListParams extends BaseListParams {
  search?: string
  is_active?: boolean | null
  has_active_purchase?: boolean | null
}

export interface SessionPurchase {
  _id: string
  session_id: { _id: string; title: string; scheduled_start_time: string; price: number } | string
  payment_gateway: 'zoho_payments' | 'razorpay'
  zoho_payment_id: string | null
  amount_paid: number
  currency: string
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
  purchased_at: string
  is_active: boolean
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
}

export const usersService = new UsersService()
