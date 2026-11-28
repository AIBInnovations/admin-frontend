import { apiService } from '@/services/api.service'

/** GET /admin/users/:id carries this under `tester` (27 Nov 2026). */
export interface TesterSummary {
  is_tester: boolean
  set_at: string | null
  set_by: { _id: string; name: string } | null
  last_reset_at: string | null
  last_reset_by: { _id: string; name: string } | null
  /** Purchase rows a reset ended (kept for audit, hidden from the student) */
  ended_by_reset: number
  test_orders: number
  test_price: number
}

export type PurchaseType = 'package' | 'session' | 'workshop' | 'ebook' | 'form' | 'book'

export interface RealPurchase {
  purchase_type: PurchaseType
  purchase_id: string
  item_name: string
  tier_name: string | null
  amount: number
  purchased_at: string | null
  is_active: boolean
}

export interface ResetPreview {
  user_id: string
  is_tester: boolean
  purchases: Record<PurchaseType, number>
  purchases_total: number
  real_purchases: RealPurchase[]
  registrations: { sessions: number; workshops: number }
  attendance: number
  certificates: number
  progress: number
  library: number
  bookmarks: number
  highlights: number
  /** Video ratings and reviews (27 Nov 2026 follow-up) */
  reviews: number
  /** In-app notifications */
  notifications: number
  /** Form submissions still shown to the student */
  form_submissions: number
  keeps: string[]
  last_reset_at: string | null
}

export interface ResetResult {
  purchases_ended_total: number
  real_purchases: 'none' | 'kept' | 'ended'
  message: string
}

export const testerApi = {
  async set(userId: string, isTester: boolean) {
    const res = await apiService.put<{ tester: TesterSummary; changed: boolean; message: string }>(`admin/users/${userId}/tester`, { is_tester: isTester })
    return res.data!
  },
  async preview(userId: string) {
    const res = await apiService.get<ResetPreview>(`admin/users/${userId}/tester/reset-preview`)
    return res.data!
  },
  async reset(userId: string, realPurchases?: 'end' | 'keep') {
    const res = await apiService.post<ResetResult>(`admin/users/${userId}/tester/reset`, realPurchases ? { real_purchases: realPurchases } : {})
    return res.data!
  },
}
