import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams } from '@/types/api.types'

// Types
export interface Invoice {
  _id: string
  purchase_id: string | null
  user_id: { _id: string; name: string; email: string; phone_number: string } | string
  purchase_type: 'package' | 'session' | 'book'
  zoho_invoice_id: string | null
  invoice_number: string
  invoice_url: string | null
  amount: number
  gst_amount: number
  zoho_payment_id: string | null
  payment_status: 'unpaid' | 'paid' | 'partially_paid' | 'void'
  payment_recorded_at: string | null
  createdAt: string
  updatedAt: string
}

export interface InvoicesListParams extends BaseListParams {
  purchase_type?: string
  payment_status?: string
  start_date?: string
  end_date?: string
  search?: string
}

export interface InvoiceDownload {
  invoice_id: string
  invoice_number: string
  invoice_url: string
  download_url: string
}

class InvoicesService {
  private basePath = 'admin/invoices'

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

  async getAll(params: InvoicesListParams = {}): Promise<ApiResponse<ListResponse<Invoice>>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<ListResponse<Invoice>>(`${this.basePath}${query}`)
  }

  async getById(invoiceId: string): Promise<ApiResponse<Invoice>> {
    const response = await apiService.get<{ invoice: Invoice }>(`${this.basePath}/${invoiceId}`)
    if (response.success && response.data) {
      return { ...response, data: response.data.invoice }
    }
    return response as ApiResponse<Invoice>
  }

  async createManual(data: {
    user_id: string
    purchase_type: string
    amount: number
    description: string
    notes?: string
  }): Promise<ApiResponse<Invoice>> {
    const response = await apiService.post<{ invoice: Invoice }>(`${this.basePath}/manual`, data)
    if (response.success && response.data) {
      return { ...response, data: response.data.invoice }
    }
    return response as ApiResponse<Invoice>
  }

  async regenerate(invoiceId: string): Promise<ApiResponse<Invoice>> {
    const response = await apiService.post<{ invoice: Invoice }>(`${this.basePath}/${invoiceId}/regenerate`)
    if (response.success && response.data) {
      return { ...response, data: response.data.invoice }
    }
    return response as ApiResponse<Invoice>
  }

  async getDownloadUrl(invoiceId: string): Promise<ApiResponse<InvoiceDownload>> {
    return apiService.get<InvoiceDownload>(`${this.basePath}/${invoiceId}/download`)
  }
}

export const invoicesService = new InvoicesService()
