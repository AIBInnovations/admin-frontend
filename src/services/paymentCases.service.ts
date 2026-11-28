import { apiService, ApiResponse } from './api.service'
import type { ListResponse } from '@/types/api.types'
import type { PurchaseDetail, PurchaseType, PaymentStatus } from './payments.service'

export type CaseKind = 'dispute' | 'refund' | 'coupon_limit' | 'duplicate_payment' | 'payment_reused' | 'unmatched_payment'
export type CaseStatus = 'open' | 'in_progress' | 'won' | 'lost' | 'refunded' | 'resolved' | 'dismissed'

export interface CaseUser { _id: string; name: string; email: string | null; phone_number: string; student_id: string | null }

export interface PaymentCase {
  _id: string
  case_number: string
  kind: CaseKind
  status: CaseStatus
  source: 'system' | 'gateway' | 'admin'
  purchase_type: PurchaseType | null
  purchase_id: string | null
  user_id: string | null
  user: CaseUser | null
  item_name: string | null
  tier_name: string | null
  tier_duration_days: number | null
  purchase_status: PaymentStatus | null
  payment_id: string | null
  payment_session_id: string | null
  gateway_reference: string | null
  gateway_status: string | null
  amount: number | null
  currency: string
  reason: string
  evidence_due_at: string | null
  resolved_at: string | null
  resolution_note: string
  refund?: { reference: string | null; amount: number | null; recorded_at: string | null }
  createdAt: string
  updatedAt: string
}

export interface CaseEvent {
  at: string
  type: 'opened' | 'status' | 'note' | 'evidence' | 'gateway'
  from: string | null
  to: string | null
  note: string
  admin_name: string | null
}

export interface PaymentCaseDetail extends PaymentCase {
  events: CaseEvent[]
  purchase: PurchaseDetail | null
  related: { _id: string; case_number: string; kind: CaseKind; status: CaseStatus; amount: number | null; createdAt: string }[]
  actions: {
    transitions: CaseStatus[]
    can_note: boolean
    can_refund: boolean
    can_approve: boolean
    can_build_evidence: boolean
    refund_max: number | null
    access_still_on: boolean
  }
}

export interface CaseListResult extends ListResponse<PaymentCase> {
  counts: { all: number; open: number; in_progress: number; active: number; active_amount: number; closed: number; overdue: number }
}

export interface CaseListParams {
  status?: string
  kind?: string
  search?: string
  sort?: string
  overdue?: 1
  user_id?: string
  purchase_id?: string
  page?: number
  limit?: number
}

export interface OpenCaseBody {
  purchase_type: PurchaseType
  purchase_id: string
  kind: 'dispute' | 'refund'
  reason: string
  gateway_reference?: string
  evidence_due_at?: string
  amount?: number
}

export interface EvidencePack {
  generated_at: string
  case: { _id: string; case_number: string; gateway_reference: string | null; reason: string; amount: number | null; opened_at: string; evidence_due_at: string | null }
  student: { name: string; email: string | null; phone: string; student_id: string | null } | null
  purchase: {
    type: PurchaseType
    type_label: string
    item: string
    lines: { title: string; quantity: number }[]
    tier_name: string | null
    tier_duration_days: number | null
    at: string
    included: string[]
    order: PurchaseDetail['order']
  }
  payment: { payment_id: string | null; session_id: string | null; amount: number; currency: string; gst: number | null; coupon: { code: string; discount: number } | null; status: string; invoice_number: string | null }
  delivery: {
    delivery_note_number: string | null
    issued_at: string | null
    emailed_at: string | null
    emailed_to: string | null
    pdf_sha256: string | null
    access_status: string
    activated_at: string | null
    access_start: string | null
    access_end: string | null
    lifetime: boolean
  }
  terms: { accepted: boolean; version: string | null; at: string | null; ip: string | null; user_agent: string | null }
  order_device: { ip: string | null; user_agent: string | null }
  usage: {
    devices: number
    first_sign_in: string | null
    last_active: string | null
    device_list: { name: string; type: string; signed_in_at: string; last_active: string }[]
    videos_opened: number
    videos_completed: number
    documents_opened: number
    first_use: string | null
    last_use: string | null
    videos: { title: string; last_watched: string; percent: number | null }[]
    attendance: { attended_at?: string | null; days_attended?: number } | null
  }
  missing: string[]
}

type CaseResponse = { case: PaymentCaseDetail }

class PaymentCasesService {
  private basePath = 'admin/payment-cases'

  async list(params: CaseListParams = {}): Promise<ApiResponse<CaseListResult>> {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q.append(k, String(v)) })
    const qs = q.toString()
    return apiService.get<CaseListResult>(`${this.basePath}${qs ? `?${qs}` : ''}`)
  }

  async get(id: string): Promise<PaymentCaseDetail> {
    return (await apiService.get<CaseResponse>(`${this.basePath}/${id}`)).data!.case
  }

  async open(body: OpenCaseBody): Promise<PaymentCaseDetail> {
    return (await apiService.post<CaseResponse>(this.basePath, body)).data!.case
  }

  async addNote(id: string, note: string): Promise<PaymentCaseDetail> {
    return (await apiService.post<CaseResponse>(`${this.basePath}/${id}/notes`, { note })).data!.case
  }

  async update(id: string, body: { evidence_due_at?: string | null; gateway_reference?: string }): Promise<PaymentCaseDetail> {
    return (await apiService.put<CaseResponse>(`${this.basePath}/${id}`, body)).data!.case
  }

  async changeStatus(id: string, status: CaseStatus, note: string): Promise<PaymentCaseDetail> {
    return (await apiService.put<CaseResponse>(`${this.basePath}/${id}/status`, { status, note })).data!.case
  }

  /** Records a refund already made in Zoho Payments. Ends the student's access. */
  async recordRefund(id: string, body: { reference: string; amount: number; note?: string; confirm: true }): Promise<PaymentCaseDetail> {
    return (await apiService.post<CaseResponse>(`${this.basePath}/${id}/refund`, body)).data!.case
  }

  async approve(id: string, note: string): Promise<PaymentCaseDetail> {
    return (await apiService.post<CaseResponse>(`${this.basePath}/${id}/approve`, { note })).data!.case
  }

  async evidence(id: string): Promise<EvidencePack> {
    return (await apiService.get<{ evidence: EvidencePack }>(`${this.basePath}/${id}/evidence`)).data!.evidence
  }

  async downloadEvidence(id: string, caseNumber: string) {
    return apiService.downloadBlob(`${this.basePath}/${id}/evidence/pdf`, undefined, `PGME-Evidence-${caseNumber}.pdf`)
  }
}

export const paymentCasesService = new PaymentCasesService()
