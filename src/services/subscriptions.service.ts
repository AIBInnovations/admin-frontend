import { apiService, ApiResponse } from './api.service'
import type { ListResponse } from '@/types/api.types'

// Types
export interface SubscriptionUser {
  _id: string
  name: string
  email: string
  phone_number: string
  photo_url?: string | null
}

export type SubscriptionType = 'package' | 'session' | 'ebook'

export interface SubscriptionRecord {
  purchase_id: string
  type: SubscriptionType
  /** Package: validity end. Session: the session's date. Ebook: null (lifetime). */
  expires_at: string | null
  purchased_at: string
  is_active: boolean
  is_admin_granted: boolean
  tier_name: string | null
  amount_paid: number
  currency: string
  /** Only packages have a mutable expiry that can be extended. */
  extendable: boolean
  /** Name of the purchased item (package / session title / book title). */
  item_name: string
  user: SubscriptionUser
}

export type SubscriptionStatusFilter = 'expiring' | 'expired' | 'all'
export type SubscriptionTypeFilter = SubscriptionType | 'all'

export interface ExpiringListParams {
  page?: number
  limit?: number
  search?: string
  status?: SubscriptionStatusFilter
  type?: SubscriptionTypeFilter
  window_days?: number
  sort?: string
}

export interface ExtendValidityBody {
  days?: number
  new_expiry?: string
  reason?: string
}

export interface ExtendValidityResult {
  purchase_id: string
  package_name: string | null
  user: { name: string; email: string } | null
  previous_expiry: string
  new_expiry: string
  reason: string
  message: string
}

class SubscriptionsService {
  private basePath = 'admin/subscriptions'

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

  /** List package subscriptions by expiry window (expiring / expired / all). */
  async getExpiring(
    params: ExpiringListParams = {}
  ): Promise<ApiResponse<ListResponse<SubscriptionRecord>>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<ListResponse<SubscriptionRecord>>(`${this.basePath}/expiring${query}`)
  }

  /** Extend the validity of a single purchase by days or to an exact new_expiry date. */
  async extend(
    purchaseId: string,
    body: ExtendValidityBody
  ): Promise<ApiResponse<ExtendValidityResult>> {
    return apiService.post<ExtendValidityResult>(`${this.basePath}/${purchaseId}/extend`, body)
  }
}

export const subscriptionsService = new SubscriptionsService()
