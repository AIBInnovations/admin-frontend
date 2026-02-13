import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams, PopulatedRef } from '@/types/api.types'

// Types
export interface Book {
  _id: string
  title: string
  author: string
  description: string
  isbn: string | null
  price: number
  original_price: number | null
  is_on_sale: boolean
  sale_price: number | null
  thumbnail_url: string | null
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
  createdAt: string
  updatedAt: string
}

export interface BookFormData {
  title: string
  author: string
  description?: string
  isbn?: string
  price: number
  original_price?: number
  is_on_sale?: boolean
  sale_price?: number
  thumbnail_url?: string
  category?: string
  subject_id?: string
  stock_quantity?: number
  is_available?: boolean
  weight_grams?: number
  publisher?: string
  publication_year?: number
  pages?: number
  display_order?: number
}

export interface BooksListParams extends BaseListParams {
  search?: string
  is_available?: boolean | null
  category?: string
  low_stock_threshold?: number
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
    return response as ApiResponse<Book>
  }

  async create(data: BookFormData): Promise<ApiResponse<Book>> {
    const response = await apiService.post<{ book: Book }>(this.basePath, data)
    if (response.success && response.data) {
      return { ...response, data: response.data.book }
    }
    return response as ApiResponse<Book>
  }

  async update(bookId: string, data: Partial<BookFormData>): Promise<ApiResponse<Book>> {
    const response = await apiService.put<{ book: Book }>(`${this.basePath}/${bookId}`, data)
    if (response.success && response.data) {
      return { ...response, data: response.data.book }
    }
    return response as ApiResponse<Book>
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
    return response as ApiResponse<Book>
  }

  async getLowStock(threshold = 10): Promise<ApiResponse<ListResponse<Book>>> {
    return apiService.get<ListResponse<Book>>(`${this.basePath}/low-stock?threshold=${threshold}`)
  }
}

export const booksService = new BooksService()
