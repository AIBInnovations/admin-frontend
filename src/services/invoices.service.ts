import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams } from '@/types/api.types'
import type { PurchaseType } from './payments.service'

// Types
export interface Invoice {
  _id: string
  purchase_id: string | null
  /** null when the student deleted the account */
  user_id: { _id: string; name: string; email: string; phone_number: string; student_id?: string | null } | string | null
  purchase_type: PurchaseType
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

export interface InvoiceListResult extends ListResponse<Invoice> {
  totals?: { count: number; amount: number; gst: number; unpaid: number }
  zoho_connected?: boolean
}

export interface InvoiceLine {
  name: string
  description: string | null
  quantity: number
  rate: number
  discount: number
  total: number
}

export interface InvoiceDetail extends Invoice {
  zoho_customer_payment_id: string | null
  place_of_supply: string | null
  billing_address?: Record<string, string>
  shipping_address?: Record<string, string>
  description?: string | null
  last_emailed_at: string | null
  last_emailed_to: string | null
  created_by_admin_name: string | null
  user: { _id: string; name: string; email: string | null; phone_number: string; student_id: string | null } | null
  purchase: { _id: string; type: PurchaseType; item_name: string; tier_name: string | null; tier_duration_days: number | null; status: string; at: string; charged: number } | null
  purchase_missing: boolean
  line_items: InvoiceLine[] | null
  line_items_source: 'zoho' | 'purchase' | null
  zoho_connected: boolean
  pdf_available: boolean
}

export interface InvoicesListParams extends BaseListParams {
  from?: string
  to?: string
  user_id?: string
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

  async getAll(params: InvoicesListParams = {}): Promise<ApiResponse<InvoiceListResult>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<InvoiceListResult>(`${this.basePath}${query}`)
  }

  async getById(invoiceId: string): Promise<ApiResponse<InvoiceDetail>> {
    const response = await apiService.get<{ invoice: InvoiceDetail }>(`${this.basePath}/${invoiceId}`)
    return { ...response, data: response.data?.invoice }
  }

  /** The PDF, streamed by our server from Zoho Books. */
  async downloadPdf(invoice: Pick<Invoice, '_id' | 'invoice_number'>) {
    return apiService.downloadBlob(`${this.basePath}/${invoice._id}/pdf`, undefined, `${invoice.invoice_number}.pdf`)
  }

  /** Emails the invoice to the student again, through Zoho Books. */
  async emailAgain(invoiceId: string): Promise<ApiResponse<{ emailed_to: string; emailed_at: string }>> {
    return apiService.post(`${this.basePath}/${invoiceId}/email`)
  }

  async createManual(data: {
    user_id: string
    purchase_type: string
    amount: number
    description: string
    notes?: string
  }): Promise<ApiResponse<Invoice>> {
    const response = await apiService.post<{ invoice: Invoice }>(`${this.basePath}/manual`, data)
    return { ...response, data: response.data?.invoice }
  }

  /** Reads the number, amounts and status again from Zoho Books. */
  async regenerate(invoiceId: string): Promise<ApiResponse<Pick<Invoice, 'zoho_invoice_id' | 'invoice_number' | 'invoice_url' | 'amount' | 'gst_amount' | 'payment_status'>>> {
    return apiService.post(`${this.basePath}/${invoiceId}/regenerate`)
  }

  async getDownloadUrl(invoiceId: string): Promise<ApiResponse<InvoiceDownload>> {
    return apiService.get<InvoiceDownload>(`${this.basePath}/${invoiceId}/download`)
  }
}

export const invoicesService = new InvoicesService()
