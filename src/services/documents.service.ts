import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams, PopulatedRef } from '@/types/api.types'

// Types
export interface Document {
  _id: string
  series_id: PopulatedRef & { package_id?: string }
  title: string
  description: string
  file_url: string
  file_format: 'pdf' | 'epub' | 'doc' | 'docx' | 'ppt' | 'pptx'
  preview_url: string | null
  file_size_mb: number
  page_count: number | null
  is_free: boolean
  display_order: number
  download_count: number
  createdAt: string
  updatedAt: string
}

export interface DocumentFormData {
  title: string
  description: string
  series_id: string
  is_free?: boolean
  display_order?: number
}

export interface DocumentsListParams extends BaseListParams {
  series_id?: string
  file_format?: string
  is_free?: boolean | null
}

class DocumentsService {
  private basePath = 'admin/documents'

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
   * Get all documents with pagination and filters
   */
  async getAll(params: DocumentsListParams = {}): Promise<ApiResponse<ListResponse<Document>>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<ListResponse<Document>>(`${this.basePath}${query}`)
  }

  /**
   * Get single document by ID
   */
  async getById(documentId: string): Promise<ApiResponse<Document>> {
    const response = await apiService.get<{ document: Document }>(`${this.basePath}/${documentId}`)
    if (response.success && response.data) {
      return { ...response, data: response.data.document }
    }
    return response as ApiResponse<Document>
  }

  /**
   * Upload new document (multipart/form-data)
   */
  async upload(data: DocumentFormData, file: File): Promise<ApiResponse<any>> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', data.title)
    formData.append('description', data.description)
    formData.append('series_id', data.series_id)
    if (data.is_free !== undefined) formData.append('is_free', String(data.is_free))

    return apiService.post<any>(this.basePath, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,
    })
  }

  /**
   * Update document metadata (JSON)
   */
  async update(documentId: string, data: Partial<DocumentFormData>): Promise<ApiResponse<Document>> {
    const response = await apiService.put<{ document: Document }>(`${this.basePath}/${documentId}`, data)
    if (response.success && response.data) {
      return { ...response, data: response.data.document }
    }
    return response as ApiResponse<Document>
  }

  /**
   * Delete document
   */
  async delete(documentId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`${this.basePath}/${documentId}`)
  }
}

export const documentsService = new DocumentsService()
