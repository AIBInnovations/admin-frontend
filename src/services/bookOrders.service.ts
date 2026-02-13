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
  user_id: { _id: string; name: string; email: string; phone_number: string } | string
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

export interface BookOrdersListParams extends BaseListParams {
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
  overall: { total_orders: number; total_revenue: number; average_order_value: number }
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

  async getAll(params: BookOrdersListParams = {}): Promise<ApiResponse<ListResponse<BookOrder>>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<ListResponse<BookOrder>>(`${this.basePath}${query}`)
  }

  async getById(orderId: string): Promise<ApiResponse<BookOrder>> {
    const response = await apiService.get<{ book_order: BookOrder }>(`${this.basePath}/${orderId}`)
    if (response.success && response.data) {
      return { ...response, data: response.data.book_order }
    }
    return response as ApiResponse<BookOrder>
  }

  async updateStatus(orderId: string, orderStatus: string): Promise<ApiResponse<BookOrder>> {
    const response = await apiService.put<{ book_order: BookOrder }>(`${this.basePath}/${orderId}/status`, {
      order_status: orderStatus,
    })
    if (response.success && response.data) {
      return { ...response, data: response.data.book_order }
    }
    return response as ApiResponse<BookOrder>
  }

  async updateShipping(orderId: string, trackingNumber: string, courierName: string): Promise<ApiResponse<BookOrder>> {
    const response = await apiService.put<{ book_order: BookOrder }>(`${this.basePath}/${orderId}/shipping`, {
      tracking_number: trackingNumber,
      courier_name: courierName,
    })
    if (response.success && response.data) {
      return { ...response, data: response.data.book_order }
    }
    return response as ApiResponse<BookOrder>
  }

  async getStatistics(params: { start_date?: string; end_date?: string } = {}): Promise<ApiResponse<OrderStatistics>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<OrderStatistics>(`${this.basePath}/statistics${query}`)
  }
}

export const bookOrdersService = new BookOrdersService()
