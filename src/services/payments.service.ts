import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams } from '@/types/api.types'

// Types
export interface Transaction {
  transaction_id: string
  purchase_type: 'package' | 'session' | 'book' | 'ebook'
  user: {
    _id: string
    name: string
    email: string
    phone_number: string
  }
  item_name: string
  amount: number
  currency: string
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
  payment_gateway: 'zoho_payments' | 'razorpay'
  zoho_payment_id: string | null
  zoho_payment_session_id: string
  purchased_at: string
  createdAt: string
  order_status?: string
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
