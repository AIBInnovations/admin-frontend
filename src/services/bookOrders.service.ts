import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams } from '@/types/api.types'

// Types
export interface OrderItem {
  book_id: string
  quantity: number
  price_at_purchase: number
  title: string
}

export interface BookOrder {
  _id: string
  /** null when the student deleted the account */
  user_id: { _id: string; name: string; email: string; phone_number: string; student_id?: string | null } | string | null
  order_number: string
  items: OrderItem[]
  recipient_name: string
  shipping_phone: string
  shipping_address: string
  subtotal: number
  shipping_cost: number
  total_amount: number
  payment_gateway: string
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
  order_status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  tracking_number: string | null
  courier_name: string | null
  shipped_at: string | null
  delivered_at: string | null
  notes: string
  createdAt: string
  updatedAt: string
}

export interface BookOrderEvent {
  _id: string
  type: string
  from: string | null
  to: string | null
  note: string
  admin_name: string | null
  at: string
}

export interface BookOrderDetail extends Omit<BookOrder, 'items'> {
  items: { book_id: { _id: string; title: string; thumbnail_url?: string } | string | null; quantity: number; price_at_purchase: number; title: string }[]
  gateway_amount: number | null
  zoho_payment_id: string | null
  coupon_code: string | null
  coupon_discount: number
  dispute_status?: 'open' | 'won' | 'lost' | null
  refunded_at?: string | null
  refund_amount?: number | null
  refund_reference?: string | null
  shipping_address_structured?: Record<string, string>
  billing_address?: Record<string, string>
  invoice: { _id: string; invoice_number: string } | null
  events: BookOrderEvent[]
  allowed_statuses: BookOrder['order_status'][]
  shipping_editable: boolean
}

export interface BookOrderListResult extends ListResponse<BookOrder> {
  totals?: { count: number; paid_orders: number; revenue: number }
}

export interface BookOrdersListParams extends BaseListParams {
  from?: string
  to?: string
  order_status?: string
  payment_status?: string
  start_date?: string
  end_date?: string
  user_id?: string
  search?: string
}

export interface OrderStatistics {
  date_range: { start_date: string; end_date: string }
  by_order_status: Record<string, { count: number; total_amount: number }>
  by_payment_status: Record<string, { count: number; total_amount: number }>
  overall: { total_orders: number; paid_orders?: number; total_revenue: number; average_order_value: number }
}

class BookOrdersService {
  private basePath = 'admin/book-orders'

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

  async getAll(params: BookOrdersListParams = {}): Promise<ApiResponse<BookOrderListResult>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<BookOrderListResult>(`${this.basePath}${query}`)
  }

  async getById(orderId: string): Promise<ApiResponse<BookOrderDetail>> {
    const response = await apiService.get<{ order: BookOrderDetail }>(`${this.basePath}/${orderId}`)
    return { ...response, data: response.data?.order }
  }

  async updateStatus(orderId: string, orderStatus: string): Promise<ApiResponse<{ new_status: string }>> {
    return apiService.put(`${this.basePath}/${orderId}/status`, { order_status: orderStatus })
  }

  /** Internal note, never shown to the student. */
  async addNote(orderId: string, note: string): Promise<ApiResponse<{ note: string }>> {
    return apiService.post(`${this.basePath}/${orderId}/notes`, { note })
  }

  async updateShipping(orderId: string, trackingNumber: string, courierName: string): Promise<ApiResponse<{ order_status: string }>> {
    return apiService.put(`${this.basePath}/${orderId}/shipping`, {
      tracking_number: trackingNumber,
      courier_name: courierName,
    })
  }

  async getStatistics(params: { start_date?: string; end_date?: string } = {}): Promise<ApiResponse<OrderStatistics>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<OrderStatistics>(`${this.basePath}/statistics${query}`)
  }
}

export const bookOrdersService = new BookOrdersService()
