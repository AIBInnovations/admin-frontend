import { apiService, ApiResponse } from './api.service'
import type { ListResponse } from '@/types/api.types'

// Types
export interface SubscriptionUser {
  _id: string
  name: string
  email: string
  phone_number: string
  photo_url?: string | null
  student_id?: string | null
}

export type SubscriptionType = 'package' | 'session' | 'workshop' | 'ebook' | 'form'

export interface SubscriptionRecord {
  purchase_id: string
  type: SubscriptionType
  /** Package: validity end. Session: the session's date. Ebook: null (lifetime). */
  expires_at: string | null
  purchased_at: string
  is_active: boolean
  is_admin_granted: boolean
  tier_name: string | null
  /** Length of the tier bought; returned by newer backends. */
  tier_duration_days?: number | null
  amount_paid: number
  currency: string
  /** Only packages have a mutable expiry that can be extended. */
  extendable: boolean
  /** Name of the purchased item (package / session title / book title). */
  item_name: string
  user: SubscriptionUser
  /** A later purchase already covers it. */
  renewed?: boolean
  /** Came with a combo. */
  from_combo?: boolean
  dispute_status?: 'open' | 'won' | 'lost' | null
  /** A tester's INR 1 order (27 Nov 2026) */
  is_test?: boolean
  /** The newest expiry reminder, scheduled or sent by hand (28 Nov 2026; absent on an older backend). */
  last_reminder?: LastReminder | null
}

export interface LastReminder {
  at: string
  triggered_by: 'cron' | 'admin' | 'manual'
  sent_by_admin_name: string | null
  status: 'claimed' | 'sent' | 'partial' | 'failed'
  days_left: number | null
  count: number
}

/** The kinds of purchase an expiry reminder can be about. */
export type RemindableType = 'package' | 'session' | 'workshop'
export interface ReminderItem { type: RemindableType; purchase_id: string }
export interface ReminderChannels { email: boolean; push: boolean; in_app: boolean }
export type ChannelState = 'sent' | 'failed' | 'skipped' | 'pending'

export interface ReminderRecent {
  at: string
  triggered_by: 'cron' | 'admin' | 'manual'
  sent_by_admin_name: string | null
  status: string
}

export interface ReminderCandidate {
  type: RemindableType
  purchase_id: string
  item_name: string | null
  tier_name: string | null
  expires_at: string | null
  days_left: number | null
  student: { user_id: string; name: string | null; student_id: string | null } | null
  can_send: boolean
  problem: string | null
  problem_label: string | null
  has_email: boolean
  email_unsubscribed: boolean
  recent: ReminderRecent | null
}

export interface ReminderCheck {
  defaults: ReminderChannels
  push_configured: boolean
  timezone: string
  items: ReminderCandidate[]
}

export interface ReminderResult extends ReminderCandidate {
  status: 'sent' | 'partial' | 'failed' | 'skipped'
  channels: { email: ChannelState; push: ChannelState; in_app: ChannelState } | null
  notes: { email: string | null; push: string | null; in_app: string | null } | null
  note_labels?: { email: string | null; push: string | null; in_app: string | null }
  reminder_id: string | null
}

export interface ReminderSendResult {
  channels: ReminderChannels
  push_configured: boolean
  totals: { requested: number; sent: number; partial: number; failed: number; skipped: number }
  results: ReminderResult[]
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
  /** Include workshops and forms in "All types". */
  all_types?: 1
  /** Testers' INR 1 orders: hidden unless 'include' or 'only' (27 Nov 2026) */
  test?: 'hide' | 'include' | 'only'
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
  bundled_rows_extended?: number
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

  /** "Send reminder now", without sending: who can get one, who was reminded in the last hour, the default channels. */
  async checkReminders(items: ReminderItem[]): Promise<ApiResponse<ReminderCheck>> {
    return apiService.post<ReminderCheck>(`${this.basePath}/expiry-reminders/send/check`, { items })
  }

  /**
   * "Send reminder now". Throws with code REMINDER_SENT_RECENTLY (409, nothing
   * sent, `details.recent`) when one was reminded less than an hour ago and
   * `confirm_recent` is not set.
   */
  async sendReminders(body: { items: ReminderItem[]; channels: ReminderChannels; confirm_recent?: boolean }): Promise<ApiResponse<ReminderSendResult>> {
    return apiService.post<ReminderSendResult>(`${this.basePath}/expiry-reminders/send`, body)
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
