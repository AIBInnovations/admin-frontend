import { apiService, ApiResponse } from './api.service'

export type DeliveryNoteStatus = 'generated' | 'sent' | 'failed'
export type DeliveryNotePurchaseType = 'package' | 'ebook'

/**
 * Proof that a digital subscription was delivered: issued when a purchase is
 * activated and emailed to the student as a PDF (owner, 23 Nov 2026, after a
 * "Product Undelivered" chargeback).
 */
export interface DeliveryNote {
  _id: string
  note_number: string
  user_id: string
  purchase_type: DeliveryNotePurchaseType
  purchase_id: string
  product_name: string
  tier_name: string | null
  tier_duration_days: number | null
  access_start: string
  access_end: string | null
  is_extension: boolean
  included_packages: { package_id: string | null; name: string }[]
  amount: number
  currency: string
  payment_id: string | null
  invoice_number: string | null
  student_name: string
  student_email: string | null
  student_id: string | null
  issued_at: string
  trigger: 'auto' | 'admin'
  status: DeliveryNoteStatus
  sent_at: string | null
  send_error: string | null
  attempts: number
  email_to: string | null
  /** The student's account as it is now (newer backends); null when it was deleted. */
  student?: { _id: string; name: string | null; phone_number: string | null; email: string | null; student_id: string | null } | null
}

export interface DeliveryNotesListParams {
  user_id?: string
  purchase_id?: string
  purchase_type?: DeliveryNotePurchaseType
  status?: DeliveryNoteStatus
  page?: number
  limit?: number
}

class DeliveryNotesService {
  private basePath = 'admin/delivery-notes'

  async list(params: DeliveryNotesListParams = {}): Promise<ApiResponse<{ delivery_notes: DeliveryNote[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>> {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q.append(k, String(v)) })
    const qs = q.toString()
    return apiService.get(`${this.basePath}${qs ? `?${qs}` : ''}`)
  }

  /** Saves the PDF in the browser. */
  async downloadPdf(note: Pick<DeliveryNote, '_id' | 'note_number'>) {
    return apiService.downloadBlob(`${this.basePath}/${note._id}/pdf`, undefined, `PGME-Delivery-Note-${note.note_number}.pdf`)
  }

  /** Emails the note to the student again. */
  async resend(id: string): Promise<ApiResponse<{ delivery_note: DeliveryNote }>> {
    return apiService.post(`${this.basePath}/${id}/resend`, {})
  }

  /**
   * Issue a note for an older purchase (activated before notes existed).
   * This EMAILS THE STUDENT straight away. Returns the existing note
   * (created: false) if one was already issued.
   */
  async issue(purchaseType: DeliveryNotePurchaseType, purchaseId: string): Promise<ApiResponse<{ delivery_note: DeliveryNote; created: boolean }>> {
    return apiService.post(`${this.basePath}/issue`, { purchase_type: purchaseType, purchase_id: purchaseId })
  }
}

export const deliveryNotesService = new DeliveryNotesService()
