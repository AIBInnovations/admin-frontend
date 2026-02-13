import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams } from '@/types/api.types'

/**
 * Base CRUD service that all entity services extend.
 * Handles the common patterns: list with pagination, get by ID, create, update, delete.
 *
 * Backend response patterns:
 * - List: { data: { entities: T[], pagination: {...} } }
 * - Single: { data: { [entityKey]: T } }
 * - Delete: { message: string } (no data)
 */
export class BaseCrudService<
  TEntity,
  TFormData,
  TListParams extends BaseListParams = BaseListParams,
> {
  constructor(
    /** Admin API path, e.g. 'admin/packages' */
    protected readonly basePath: string,
    /** Key used to unwrap single entity from response, e.g. 'package' */
    protected readonly entityKey: string,
  ) {}

  /**
   * Build query string from params object, skipping null/undefined values
   */
  protected buildQuery(params: Record<string, unknown>): string {
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
   * Get paginated list of entities
   */
  async getAll(params: TListParams = {} as TListParams): Promise<ApiResponse<ListResponse<TEntity>>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<ListResponse<TEntity>>(`${this.basePath}${query}`)
  }

  /**
   * Get single entity by ID (unwraps from { [entityKey]: T })
   */
  async getById(id: string): Promise<ApiResponse<TEntity>> {
    const response = await apiService.get<Record<string, TEntity>>(`${this.basePath}/${id}`)
    if (response.success && response.data) {
      return {
        ...response,
        data: response.data[this.entityKey],
      }
    }
    return response as ApiResponse<TEntity>
  }

  /**
   * Create new entity (unwraps from { [entityKey]: T })
   */
  async create(data: TFormData): Promise<ApiResponse<TEntity>> {
    const response = await apiService.post<Record<string, TEntity>>(this.basePath, data)
    if (response.success && response.data) {
      return {
        ...response,
        data: response.data[this.entityKey],
      }
    }
    return response as ApiResponse<TEntity>
  }

  /**
   * Update existing entity (unwraps from { [entityKey]: T })
   */
  async update(id: string, data: Partial<TFormData>): Promise<ApiResponse<TEntity>> {
    const response = await apiService.put<Record<string, TEntity>>(`${this.basePath}/${id}`, data)
    if (response.success && response.data) {
      return {
        ...response,
        data: response.data[this.entityKey],
      }
    }
    return response as ApiResponse<TEntity>
  }

  /**
   * Delete entity
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`${this.basePath}/${id}`)
  }

  /**
   * Toggle is_active status (convenience method wrapping update)
   */
  async toggleActive(id: string, isActive: boolean): Promise<ApiResponse<TEntity>> {
    return this.update(id, { is_active: isActive } as Partial<TFormData>)
  }
}
