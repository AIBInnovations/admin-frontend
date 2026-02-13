import axios from 'axios'
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
   * Upload new document via presigned S3 URL (3-step flow):
   * 1. Get presigned upload URL from backend
   * 2. PUT file directly to S3
   * 3. Confirm upload with backend to create DB record
   */
  async upload(
    data: DocumentFormData,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<ApiResponse<any>> {
    const mimeType = file.type || 'application/pdf'

    // Step 1: Get presigned upload URL
    const urlRes = await apiService.post<{ uploadUrl: string; s3Key: string }>(
      `${this.basePath}/upload-url`,
      { mimeType },
    )
    if (!urlRes.success || !urlRes.data) {
      throw new Error(urlRes.message || 'Failed to get upload URL')
    }
    const { uploadUrl, s3Key } = urlRes.data

    // Step 2: Upload directly to S3 (raw axios, no auth header)
    await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': mimeType },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })

    // Step 3: Confirm upload with backend
    return apiService.post<any>(`${this.basePath}/confirm-upload`, {
      s3Key,
      title: data.title,
      description: data.description,
      series_id: data.series_id,
      is_free: data.is_free,
      fileSize: file.size,
      mimeType,
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
