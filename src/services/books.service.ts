import axios from 'axios'
import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams, PopulatedRef, DeleteImpactResponse, PublishStatus } from '@/types/api.types'

// Types
export interface Book {
  _id: string
  /** Product ID, e.g. PGMEP001 (28 Nov 2026). Absent until the backfill has run. */
  product_code?: string | null
  title: string
  author: string
  description: string
  isbn: string | null
  price: number
  original_price: number | null
  is_on_sale: boolean
  sale_price: number | null
  thumbnail_url: string | null
  thumbnail_s3_key: string | null
  images: string[]
  category: string | null
  subject_id: PopulatedRef | string | null
  stock_quantity: number
  is_available: boolean
  weight_grams: number
  publisher: string | null
  publication_year: number | null
  pages: number | null
  display_order: number
  ebook: boolean
  ebook_file_url: string | null
  ebook_s3_key: string | null
  ebook_file_size_mb: number | null
  ebook_file_format: 'pdf' | 'epub' | null
  publish_status: PublishStatus
  createdAt: string
  updatedAt: string
  // E-book file, checks and free sample (full record only)
  ebook_file_name?: string | null
  ebook_file_updated_at?: string | null
  ebook_validation?: EbookReport | null
  ebook_job?: EbookJob | { status: EbookJobStatus } | null
  sample?: BookSample | null
  has_sample?: boolean
  // Sales (list only). revenue is null when the admin may not see money.
  sold?: number
  ebook_sold?: number
  paperback_sold?: number
  revenue?: number | null
  file_status?: EbookReport['status'] | null
}

export interface EbookIssue { code: string; message: string }

/** What the server found when it checked an e-book file. */
export interface EbookReport {
  status: 'passed' | 'warnings' | 'failed'
  checked_at: string
  file_name: string | null
  converted_from_pdf: boolean
  errors_found: EbookIssue[]
  warnings: EbookIssue[]
  info: {
    version?: string | null
    title?: string | null
    author?: string | null
    language?: string | null
    sections?: number
    chars?: number
    images?: number
    estimated_pages?: number
    toc_entries?: number
    has_cover?: boolean
    fixed_layout?: boolean
    size_bytes?: number
  }
}

export type EbookJobStatus = 'queued' | 'converting' | 'validating' | 'ready' | 'failed'
export const EBOOK_JOB_ACTIVE: EbookJobStatus[] = ['queued', 'converting', 'validating']

export interface EbookJob {
  job_id: string
  status: EbookJobStatus
  source_format: 'epub' | 'pdf'
  file_name: string | null
  file_size: number | null
  error_code: string | null
  error: string | null
  report: EbookReport | null
  started_at: string | null
  finished_at: string | null
}

export interface EbookStatus {
  book_id: string
  ebook_file_url: string | null
  ebook_file_size_mb: number | null
  ebook_file_format: 'pdf' | 'epub' | null
  ebook_file_name: string | null
  ebook_file_updated_at: string | null
  has_file?: boolean
  status: EbookJobStatus | null
  job: EbookJob | null
  validation: EbookReport | null
  pending?: boolean
  conversion_available?: boolean
  max_file_bytes?: number
}

/** Free sample as the admin sees it. */
export interface BookSample {
  source: 'auto' | 'file' | null
  format: 'epub' | 'pdf' | null
  pages: number | null
  sections: number | null
  size_bytes: number | null
  file_name: string | null
  target_pages: number | null
  share_of_book: number | null
  has_preview: boolean
  enabled: boolean
  opens: number
  updated_at: string | null
  /** Made from an earlier e-book file. */
  stale: boolean
  /** Students can open it now. */
  visible: boolean
}

export interface SampleResult { book_id: string; sample: BookSample | null; warnings?: EbookIssue[] }

export interface BookSalesMonth { month: string; ebook: number; paperback: number; sold: number; collected: number | null; net: number | null }

export interface BookSales {
  book_id: string
  range: { from: string; to: string } | null
  money_visible: boolean
  ebook: { sold: number; collected: number | null; net: number | null }
  paperback: { sold: number; orders: number; collected: number | null; net: number | null }
  total: { sold: number; collected: number | null; net: number | null }
  granted_copies: number
  active_readers: number
  last_sale_at: string | null
  trend: BookSalesMonth[]
  stock: { quantity: number; is_available: boolean; low: boolean }
  sample: BookSample | null
  sample_opens: number
}

export type BookBuyerKind = 'ebook' | 'paperback' | 'granted'
export interface BookBuyer {
  _id: string
  kind: BookBuyerKind
  purchase_id: string
  user: { _id: string; name?: string; email?: string; phone_number?: string } | null
  user_id: string | null
  quantity: number
  collected: number | null
  date: string
  coupon_code: string | null
  order_number: string | null
  order_status: string | null
  dispute_status: string | null
  is_admin_granted: boolean
  grant_reason: string | null
}

const MIME = { epub: 'application/epub+zip', pdf: 'application/pdf' } as const

/** What a chosen file really is, from its first bytes. The server checks again. */
export async function sniffEbookFile(file: File): Promise<'epub' | 'pdf' | null> {
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer())
  if (head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04) return 'epub'
  if (new TextDecoder('latin1').decode(head).includes('%PDF-')) return 'pdf'
  return null
}

/** On an update, null clears a field; leave it out to keep it. */
export interface BookFormData {
  title: string
  author: string
  description?: string | null
  isbn?: string | null
  price: number
  original_price?: number | null
  is_on_sale?: boolean
  sale_price?: number | null
  thumbnail_url?: string | null
  thumbnail_s3_key?: string | null
  category?: string | null
  subject_id?: string | null
  stock_quantity?: number
  is_available?: boolean
  weight_grams?: number | null
  publisher?: string | null
  publication_year?: number | null
  pages?: number | null
  display_order?: number
  ebook?: boolean
  publish_status?: PublishStatus
}

export interface BooksListParams extends BaseListParams {
  search?: string
  is_available?: boolean | null
  category?: string
  low_stock_threshold?: number
  publish_status?: string | null
  format?: string | null
  has_sample?: boolean | null
  sort?: string | null
}

class BooksService {
  private basePath = 'admin/books'

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

  async getAll(params: BooksListParams = {}): Promise<ApiResponse<ListResponse<Book>>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<ListResponse<Book>>(`${this.basePath}${query}`)
  }

  async getById(bookId: string): Promise<ApiResponse<Book>> {
    const response = await apiService.get<{ book: Book }>(`${this.basePath}/${bookId}`)
    if (response.success && response.data) {
      return { ...response, data: response.data.book }
    }
    return response as unknown as ApiResponse<Book>
  }

  async create(data: BookFormData): Promise<ApiResponse<Book>> {
    const response = await apiService.post<{ book: Book }>(this.basePath, data)
    if (response.success && response.data) {
      return { ...response, data: response.data.book }
    }
    return response as unknown as ApiResponse<Book>
  }

  async update(bookId: string, data: Partial<BookFormData>): Promise<ApiResponse<Book>> {
    const response = await apiService.put<{ book: Book }>(`${this.basePath}/${bookId}`, data)
    if (response.success && response.data) {
      return { ...response, data: response.data.book }
    }
    return response as unknown as ApiResponse<Book>
  }

  /**
   * Get delete impact — checks what depends on this entity before deletion
   */
  async getDeleteImpact(bookId: string): Promise<ApiResponse<DeleteImpactResponse>> {
    return apiService.get<DeleteImpactResponse>(`${this.basePath}/${bookId}/delete-impact`)
  }

  async delete(bookId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`${this.basePath}/${bookId}`)
  }

  async updateStock(bookId: string, stockQuantity: number): Promise<ApiResponse<Book>> {
    const response = await apiService.put<{ book: Book }>(`${this.basePath}/${bookId}/stock`, {
      stock_quantity: stockQuantity,
    })
    if (response.success && response.data) {
      return { ...response, data: response.data.book }
    }
    return response as unknown as ApiResponse<Book>
  }

  async getLowStock(threshold = 10): Promise<ApiResponse<ListResponse<Book>>> {
    return apiService.get<ListResponse<Book>>(`${this.basePath}/low-stock?threshold=${threshold}`)
  }

  /**
   * Append image URLs to a book's gallery (already-uploaded CloudFront URLs).
   */
  async addImages(bookId: string, imageUrls: string[]): Promise<ApiResponse<{ images: string[]; message?: string }>> {
    return apiService.post(`${this.basePath}/${bookId}/images`, { images: imageUrls })
  }

  /**
   * Remove a gallery image by its index.
   */
  async removeImage(bookId: string, imageIndex: number): Promise<ApiResponse<{ images: string[]; message?: string }>> {
    return apiService.delete(`${this.basePath}/${bookId}/images/${imageIndex}`)
  }

  /**
   * Upload ebook file to S3 and confirm with backend.
   * 3-step flow: get presigned URL → upload to S3 → confirm upload.
   * The server checks the file before it replaces the live one; a PDF comes
   * back as `pending` and is converted in the background (poll getEbookStatus).
   */
  async uploadEbook(
    bookId: string,
    file: File,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
  ): Promise<ApiResponse<EbookStatus>> {
    const s3Key = await this.putFile(`${this.basePath}/${bookId}/ebook-upload-url`, file, onProgress, signal)
    return apiService.post<EbookStatus>(
      `${this.basePath}/${bookId}/ebook-confirm`,
      { s3Key, fileName: file.name, fileSize: file.size, mimeType: file.type || undefined },
      { timeout: 90000, signal },
    )
  }

  /** Ask for an upload link and send the file to storage. Returns its key. */
  private async putFile(url: string, file: File, onProgress?: (percent: number) => void, signal?: AbortSignal): Promise<string> {
    const format = await sniffEbookFile(file)
    if (!format) throw new Error('This file is not an EPUB. Choose an EPUB file.')
    const mimeType = MIME[format]
    const res = await apiService.post<{ uploadUrl: string; s3Key: string }>(url, { mimeType, fileName: file.name }, { signal })
    if (!res.success || !res.data) throw new Error(res.message || 'Failed to get upload URL')
    try {
      await axios.put(res.data.uploadUrl, file, {
        headers: { 'Content-Type': mimeType },
        signal,
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
        },
      })
    } catch (err) {
      if (axios.isCancel(err)) throw err
      throw new Error('The file could not be uploaded. Check your connection and try again.')
    }
    return res.data.s3Key
  }

  async getEbookStatus(bookId: string): Promise<ApiResponse<EbookStatus>> {
    return apiService.get<EbookStatus>(`${this.basePath}/${bookId}/ebook-status`)
  }

  /** Cancel a running check or conversion, or clear a finished result. */
  async clearEbookJob(bookId: string): Promise<ApiResponse<EbookStatus>> {
    return apiService.delete<EbookStatus>(`${this.basePath}/${bookId}/ebook-job`)
  }

  /** Check the live EPUB again. */
  async revalidateEbook(bookId: string): Promise<ApiResponse<EbookStatus>> {
    return apiService.post<EbookStatus>(`${this.basePath}/${bookId}/ebook-validate`, {}, { timeout: 90000 })
  }

  async getFileUrl(bookId: string, kind: 'ebook' | 'sample'): Promise<ApiResponse<{ url: string }>> {
    return apiService.get<{ url: string }>(`${this.basePath}/${bookId}/file-url?kind=${kind}`)
  }

  async uploadSample(bookId: string, file: File, onProgress?: (percent: number) => void, signal?: AbortSignal): Promise<ApiResponse<SampleResult>> {
    const s3Key = await this.putFile(`${this.basePath}/${bookId}/sample-upload-url`, file, onProgress, signal)
    return apiService.post<SampleResult>(`${this.basePath}/${bookId}/sample-confirm`, { s3Key, fileName: file.name }, { timeout: 90000, signal })
  }

  /** Cut a sample of about `pages` pages from the book's EPUB. */
  async generateSample(bookId: string, pages: number): Promise<ApiResponse<SampleResult>> {
    return apiService.post<SampleResult>(`${this.basePath}/${bookId}/sample/generate`, { pages }, { timeout: 90000 })
  }

  async setSampleEnabled(bookId: string, enabled: boolean): Promise<ApiResponse<SampleResult>> {
    return apiService.put<SampleResult>(`${this.basePath}/${bookId}/sample`, { enabled })
  }

  async removeSample(bookId: string): Promise<ApiResponse<SampleResult>> {
    return apiService.delete<SampleResult>(`${this.basePath}/${bookId}/sample`)
  }

  async getSales(bookId: string, range: { from?: string; to?: string } = {}): Promise<ApiResponse<BookSales>> {
    return apiService.get<BookSales>(`${this.basePath}/${bookId}/sales${this.buildQuery(range)}`)
  }

  async getBuyers(bookId: string, params: { page?: number; limit?: number; type?: string; search?: string } = {}): Promise<ApiResponse<ListResponse<BookBuyer>>> {
    return apiService.get<ListResponse<BookBuyer>>(`${this.basePath}/${bookId}/buyers${this.buildQuery(params)}`)
  }

  /**
   * Upload book thumbnail to S3.
   * 2-step flow: get presigned URL → upload to S3 → return thumbnail URL & s3 key.
   */
  async uploadThumbnail(
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<{ thumbnailUrl: string; s3Key: string }> {
    // Step 1: Get presigned upload URL
    const urlRes = await apiService.post<{ uploadUrl: string; s3Key: string; thumbnailUrl: string }>(
      `${this.basePath}/thumbnail-upload-url`,
      { mimeType: file.type || 'image/jpeg' },
    )
    if (!urlRes.success || !urlRes.data) {
      throw new Error(urlRes.message || 'Failed to get upload URL')
    }
    const { uploadUrl, s3Key, thumbnailUrl } = urlRes.data

    // Step 2: Upload directly to S3
    await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type || 'image/jpeg' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })

    return { thumbnailUrl, s3Key }
  }
}

export const booksService = new BooksService()
