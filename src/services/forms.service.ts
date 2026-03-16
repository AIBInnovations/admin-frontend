import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams, DeleteImpactResponse } from '@/types/api.types'

// Types
export interface FormTemplateField {
  field_key: string
  label: string
  type: 'text' | 'email' | 'radio'
  required: boolean
  options: string[]
  display_order: number
}

export interface FormTemplate {
  _id: string
  slug: string
  name: string
  fields: FormTemplateField[]
  default_title: string
  default_description: string
}

export interface Form {
  _id: string
  template_id: { _id: string; slug: string; name: string } | string
  subject_id: { _id: string; name: string } | string
  title: string
  description: string | null
  payment_link: string | null
  is_active: boolean
  display_order: number
  exam_slots: string[]
  submission_count?: number
  createdAt: string
  updatedAt: string
}

export interface FormFormData {
  template_id: string
  subject_id: string
  title: string
  description?: string
  payment_link?: string | null
  is_active?: boolean
  display_order?: number
  exam_slots?: string[]
}

export interface FormsListParams extends BaseListParams {
  is_active?: boolean | null
  subject_id?: string | null
  template_id?: string | null
  search?: string
}

export interface FormSubmission {
  _id: string
  form_id: { _id: string; title: string } | string
  user_id: { _id: string; name: string; phone_number: string; email?: string } | null
  responses: Record<string, string>
  submitted_at: string
  createdAt: string
}

export interface FormSubmissionsListParams {
  form_id: string
  page?: number
  limit?: number
}

class FormsService {
  private basePath = 'admin/forms'

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

  // --- Templates ---

  async getTemplates(): Promise<ApiResponse<{ templates: FormTemplate[] }>> {
    return apiService.get<{ templates: FormTemplate[] }>(`${this.basePath}/templates`)
  }

  // --- Forms CRUD ---

  async getAll(params: FormsListParams = {}): Promise<ApiResponse<ListResponse<Form>>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<ListResponse<Form>>(`${this.basePath}${query}`)
  }

  async getById(formId: string): Promise<ApiResponse<Form>> {
    const response = await apiService.get<{ form: Form }>(`${this.basePath}/${formId}`)
    if (response.success && response.data) {
      return { ...response, data: response.data.form }
    }
    return response as unknown as ApiResponse<Form>
  }

  async create(data: FormFormData): Promise<ApiResponse<Form>> {
    const response = await apiService.post<{ form: Form }>(this.basePath, data)
    if (response.success && response.data) {
      return { ...response, data: response.data.form }
    }
    return response as unknown as ApiResponse<Form>
  }

  async update(formId: string, data: Partial<FormFormData>): Promise<ApiResponse<Form>> {
    const response = await apiService.put<{ form: Form }>(`${this.basePath}/${formId}`, data)
    if (response.success && response.data) {
      return { ...response, data: response.data.form }
    }
    return response as unknown as ApiResponse<Form>
  }

  async toggleActive(formId: string): Promise<ApiResponse<{ form: Form }>> {
    return apiService.patch<{ form: Form }>(`${this.basePath}/${formId}/toggle-active`, {})
  }

  async getDeleteImpact(formId: string): Promise<ApiResponse<DeleteImpactResponse>> {
    return apiService.get<DeleteImpactResponse>(`${this.basePath}/${formId}/delete-impact`)
  }

  async delete(formId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`${this.basePath}/${formId}`)
  }

  // --- Submissions ---

  async getSubmissions(params: FormSubmissionsListParams): Promise<ApiResponse<ListResponse<FormSubmission> & { form: Form }>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<ListResponse<FormSubmission> & { form: Form }>(`${this.basePath}/submissions${query}`)
  }

  async getSubmissionById(submissionId: string): Promise<ApiResponse<{ submission: FormSubmission }>> {
    return apiService.get<{ submission: FormSubmission }>(`${this.basePath}/submissions/${submissionId}`)
  }
}

export const formsService = new FormsService()
