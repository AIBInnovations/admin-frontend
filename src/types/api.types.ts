/** Standard pagination response from backend */
export interface PaginationResponse {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

/** Standard list response wrapper */
export interface ListResponse<T> {
  entities: T[]
  pagination: PaginationResponse
}

/** Standard list query params shared across all entities */
export interface BaseListParams {
  page?: number
  limit?: number
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

/** Base entity fields present on all MongoDB documents */
export interface BaseEntity {
  _id: string
  createdAt: string
  updatedAt: string
}

/** Populated reference — when backend populates an ObjectId ref */
export interface PopulatedRef {
  _id: string
  name: string
}
