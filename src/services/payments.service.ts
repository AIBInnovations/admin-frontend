import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams } from '@/types/api.types'

// Types
export type PurchaseType = 'package' | 'session' | 'workshop' | 'book' | 'ebook' | 'form'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'revoked'

export interface Transaction {
  transaction_id: string
  purchase_type: PurchaseType
  user: {
    _id: string
    name: string
    email: string
    phone_number: string
    student_id?: string | null
  } | null
  item_name: string
  /** Package purchases only: the tier bought (null for single-price packages). */
  tier_name?: string | null
  tier_duration_days?: number | null
  amount: number
  currency: string
  payment_status: PaymentStatus
  payment_gateway: 'zoho_payments' | 'razorpay'
  zoho_payment_id: string | null
  zoho_payment_session_id: string
  purchased_at: string
  createdAt: string
  order_status?: string | null
  // Added with the purchases list (25 Nov 2026)
  item_id?: string | null
  item_deleted?: boolean
  item_detail?: string | null
  at?: string
  expires_at?: string | null
  is_active?: boolean
  is_revoked?: boolean
  is_admin_granted?: boolean
  /** Included with a combo: a ₹0 row, not a sale. */
  bundled?: boolean
  sale?: boolean
  coupon_code?: string | null
  coupon_discount?: number
  dispute_status?: DisputeStatus
  refund_amount?: number | null
  refunded_at?: string | null
  order_number?: string | null
  invoice?: { _id: string; invoice_number: string } | null
  open_case?: { _id: string; case_number: string; kind: string; status: string } | null
}

export type DisputeStatus = 'open' | 'won' | 'lost' | null

export interface PurchaseFilters extends BaseListParams {
  type?: string
  status?: string
  gateway?: string
  from?: string
  to?: string
  subject_id?: string
  package_id?: string
  item_id?: string
  user_id?: string
  tier?: string
  coupon?: string
  granted?: string
  dispute?: string
  sort?: string
  /** Testers' INR 1 orders (27 Nov 2026): hidden unless 'include' or 'only' */
  test?: 'hide' | 'include' | 'only'
}

export interface PurchaseTotals {
  count: number
  sales: number
  collected: number
  refunded: number
  refunded_amount: number
  pending: number
  failed: number
  revoked: number
}

export interface PurchaseListResult extends ListResponse<Transaction> {
  totals: PurchaseTotals
  search_truncated: boolean
}

export interface PurchaseFilterOptions {
  subjects: { _id: string; name: string }[]
  packages: { _id: string; name: string; subject_id: string | null; durations: number[] }[]
  coupons: string[]
}

export interface PurchaseBrief {
  _id: string
  name: string
  tier_name: string | null
  tier_duration_days: number | null
  expires_at: string | null
  purchased_at: string | null
  payment_status: PaymentStatus
  is_active: boolean
  is_revoked: boolean
}

export interface CaseSummary {
  _id: string
  case_number: string
  kind: string
  status: string
  source: string
  reason: string
  amount: number | null
  evidence_due_at: string | null
  created_at: string
  resolved_at: string | null
}

export interface TimelineItem {
  at: string
  kind: string
  title: string
  note: string | null
  by: string | null
  tone: 'neutral' | 'success' | 'warning' | 'danger'
  href: string | null
}

/** Everything about one purchase. */
export interface PurchaseDetail {
  _id: string
  type: PurchaseType
  status: PaymentStatus
  payment_status: PaymentStatus
  at: string
  created_at: string
  user: { _id: string; name: string; email: string | null; phone_number: string; student_id: string | null } | null
  user_id: string | null
  item: {
    id: string | null
    name: string
    deleted: boolean
    subject: { _id: string; name: string } | null
    combo?: boolean
    lines?: { book_id: string; title: string; quantity: number; price: number; deleted: boolean }[]
    starts_at?: string | null
    ends_at?: string | null
    live_status?: string
    day_count?: number
    submission?: { _id: string; submitted_at: string; payment_status: string } | null
  }
  tier: { name: string | null; duration_days: number | null; index: number | null }
  sale: boolean
  bundled: boolean
  is_admin_granted: boolean
  grant: { reason: string | null; notes: string | null; by: string | null } | null
  money: {
    currency: string
    list_price: number | null
    sale_discount: number | null
    upgrade_credit: number | null
    price_before_gst: number | null
    gst: number | null
    gst_source: 'invoice' | 'computed' | null
    charged: number
    charged_is_pre_tax: boolean
    gateway_fee: number | null
    invoice_total: number | null
    subtotal: number | null
    shipping: number | null
    coupon: { _id: string | null; code: string; discount: number; redeemed_at: string | null } | null
  }
  access: {
    status: string
    start: string | null
    end: string | null
    activated_at?: string | null
    lifetime: boolean
    days_left: number | null
    is_active: boolean
    revoked: { at: string | null; reason: string | null } | null
    renewed_by: PurchaseBrief | null
    renews: PurchaseBrief[]
    combo_parent: PurchaseBrief | null
    bundled: PurchaseBrief[]
    upgraded_from: PurchaseBrief[]
    upgraded_to: PurchaseBrief | null
    enrollment: { status: string; attended_at?: string | null; days_attended?: number } | null
  }
  dispute_status: DisputeStatus
  refund: { at: string | null; amount: number | null; reference: string | null } | null
  terms: { accepted: boolean; version: string | null; at: string | null }
  device: { purchase_ip: string | null; purchase_user_agent: string | null; terms_ip: string | null; terms_user_agent: string | null } | null
  billing_address: Record<string, string> | null
  order: {
    order_number: string | null
    order_status: string
    recipient_name: string
    shipping_phone: string
    shipping_address: string
    tracking_number: string | null
    courier_name: string | null
    shipped_at: string | null
    delivered_at: string | null
    notes: string
  } | null
  payment: {
    gateway: string | null
    status: PaymentStatus
    payment_id: string | null
    session_id: string | null
    zoho_invoice_id: string | null
    claim: { purchase_type: PurchaseType; purchase_id: string; recorded_at: string | null; this_purchase: boolean } | null
  } | null
  documents: {
    invoice: { _id: string; invoice_number: string; amount: number; gst_amount: number; payment_status: string; created_at: string } | null
    delivery_note: { _id: string; note_number: string; status: string; issued_at: string; sent_at: string | null; email_to: string | null; trigger: string; by: string | null } | null
    delivery_note_available: boolean
  }
  cases: CaseSummary[]
  attempts: { _id: string; payment_status: PaymentStatus; is_revoked: boolean; amount: number; at: string; payment_id: string | null; tier_name: string | null; tier_duration_days: number | null }[]
  capabilities: { can_revoke: boolean; can_extend: boolean; can_open_case: boolean }
  timeline: TimelineItem[]
}

export interface TransactionsListParams extends BaseListParams {
  payment_status?: string
  payment_gateway?: string
  purchase_type?: string
  start_date?: string
  end_date?: string
  search?: string
}

export interface ReconciliationData {
  date_range: { start_date: string; end_date: string }
  payment_gateway: string
  completed_payments: {
    packages: { count: number; total_amount: number }
    sessions: { count: number; total_amount: number }
    books: { count: number; total_amount: number }
    ebooks: { count: number; total_amount: number }
    total: { count: number; total_amount: number }
  }
  failed_payments: {
    packages: number
    sessions: number
    books: number
    ebooks: number
    total: number
  }
}

class PaymentsService {
  private basePath = 'admin/payments'

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

  /** Purchases of every type: filters, paging and totals for the filtered set. */
  async getPurchases(filters: PurchaseFilters = {}): Promise<ApiResponse<PurchaseListResult>> {
    return apiService.get<PurchaseListResult>(`${this.basePath}/purchases${this.buildQuery(filters as Record<string, unknown>)}`)
  }

  async getFilterOptions(): Promise<ApiResponse<PurchaseFilterOptions>> {
    return apiService.get<PurchaseFilterOptions>(`${this.basePath}/purchases/filters`)
  }

  /** Everything about one purchase. */
  async getPurchase(type: string, id: string): Promise<PurchaseDetail> {
    const res = await apiService.get<{ purchase: PurchaseDetail }>(`${this.basePath}/purchases/${type}/${id}`)
    return res.data!.purchase
  }

  /**
   * Get all transactions with pagination and filters
   */
  async getTransactions(params: TransactionsListParams = {}): Promise<ApiResponse<ListResponse<Transaction>>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<ListResponse<Transaction>>(`${this.basePath}/transactions${query}`)
  }

  /**
   * Get single transaction by ID
   */
  async getTransaction(transactionId: string): Promise<ApiResponse<Transaction>> {
    return apiService.get<Transaction>(`${this.basePath}/transactions/${transactionId}`)
  }

  /**
   * Get payment reconciliation summary
   */
  async getReconciliation(params: {
    start_date?: string; end_date?: string; payment_gateway?: string
  } = {}): Promise<ApiResponse<ReconciliationData>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<ReconciliationData>(`${this.basePath}/reconciliation${query}`)
  }

  /**
   * Get failed payments
   */
  async getFailedPayments(): Promise<ApiResponse<ListResponse<Transaction>>> {
    return apiService.get<ListResponse<Transaction>>(`${this.basePath}/failed`)
  }
}

export const paymentsService = new PaymentsService()
