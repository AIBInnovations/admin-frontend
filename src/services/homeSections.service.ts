import axios from 'axios'
import { apiService, ApiResponse } from './api.service'
import type { ListResponse, BaseListParams, DeleteImpactResponse } from '@/types/api.types'

// ─── Entity Types ────────────────────────────────────────────────────────────

export type VisibleTo = 'all' | 'subject' | 'package'

export interface HomeSection {
  _id: string
  title: string | null
  subtitle: string | null
  background_color: string | null
  text_color: string | null
  visible_to: VisibleTo
  visible_to_subjects: string[]
  visible_to_packages: string[]
  display_order: number
  is_active: boolean
  start_date: string | null
  end_date: string | null
  items?: HomeSectionItem[]
  item_count?: number
  createdAt: string
  updatedAt: string
}

export interface HomeSectionItem {
  _id: string
  section_id: string
  card_type: string
  title: string | null
  subtitle: string | null
  description: string | null
  image_url: string | null
  image_s3_key: string | null
  icon_url: string | null
  icon_s3_key: string | null
  tag_label: string | null
  tag_color: string | null
  background_color: string | null
  text_color: string | null
  border_color: string | null
  button_text: string | null
  button_color: string | null
  button_text_color: string | null
  link_type: 'internal' | 'external' | 'none'
  external_url: string | null
  internal_route: string | null
  internal_params: Record<string, string> | null
  secondary_button_text: string | null
  secondary_link_type: 'internal' | 'external' | 'none'
  secondary_external_url: string | null
  secondary_internal_route: string | null
  secondary_internal_params: Record<string, string> | null
  metadata: MetadataEntry[]
  display_order: number
  is_active: boolean
  createdAt: string
  updatedAt: string
}

export interface MetadataEntry {
  label: string
  value: string
  icon_url?: string | null
}

// ─── Reference Data Types ────────────────────────────────────────────────────

export interface NavigationTargetParam {
  name: string
  type: string
  required: boolean
  label: string
  options?: string[]
  autoFrom?: string         // e.g. 'packageId' — value auto-derived from another param's entity
  filterPackageType?: string // e.g. 'Theory' — filter packages dropdown to this type only
}

export interface NavigationTarget {
  key: string
  label: string
  route: string
  params: NavigationTargetParam[]
}

export interface CardTypeInfo {
  key: string
  label: string
  description: string
}

// ─── Form Data Types ─────────────────────────────────────────────────────────

export interface HomeSectionFormData {
  title?: string
  subtitle?: string
  background_color?: string
  text_color?: string
  visible_to?: VisibleTo
  visible_to_subjects?: string[]
  visible_to_packages?: string[]
  display_order?: number
  is_active?: boolean
  start_date?: string
  end_date?: string
}

export interface HomeSectionItemFormData {
  card_type: string
  title?: string
  subtitle?: string
  description?: string
  image_url?: string
  image_s3_key?: string
  icon_url?: string
  icon_s3_key?: string
  tag_label?: string
  tag_color?: string
  background_color?: string
  text_color?: string
  border_color?: string
  button_text?: string
  button_color?: string
  button_text_color?: string
  link_type?: string
  external_url?: string
  internal_route?: string
  internal_params?: Record<string, string>
  secondary_button_text?: string
  secondary_link_type?: string
  secondary_external_url?: string
  secondary_internal_route?: string
  secondary_internal_params?: Record<string, string>
  metadata?: MetadataEntry[]
  display_order?: number
  is_active?: boolean
}

export interface HomeSectionsListParams extends BaseListParams {
  is_active?: boolean | null
}

// ─── Service ─────────────────────────────────────────────────────────────────

class HomeSectionsService {
  private basePath = 'admin/home-sections'

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

  // ── Section CRUD ─────────────────────────────────────────────────────────

  async getAll(params: HomeSectionsListParams = {}): Promise<ApiResponse<ListResponse<HomeSection>>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<ListResponse<HomeSection>>(`${this.basePath}${query}`)
  }

  async getById(sectionId: string): Promise<ApiResponse<HomeSection>> {
    const response = await apiService.get<{ section: HomeSection }>(`${this.basePath}/${sectionId}`)
    if (response.success && response.data) {
      return { ...response, data: response.data.section }
    }
    return response as unknown as ApiResponse<HomeSection>
  }

  async create(data: HomeSectionFormData): Promise<ApiResponse<HomeSection>> {
    const response = await apiService.post<{ section: HomeSection }>(this.basePath, data)
    if (response.success && response.data) {
      return { ...response, data: response.data.section }
    }
    return response as unknown as ApiResponse<HomeSection>
  }

  async update(sectionId: string, data: Partial<HomeSectionFormData>): Promise<ApiResponse<HomeSection>> {
    const response = await apiService.put<{ section: HomeSection }>(`${this.basePath}/${sectionId}`, data)
    if (response.success && response.data) {
      return { ...response, data: response.data.section }
    }
    return response as unknown as ApiResponse<HomeSection>
  }

  async getDeleteImpact(sectionId: string): Promise<ApiResponse<DeleteImpactResponse>> {
    return apiService.get<DeleteImpactResponse>(`${this.basePath}/${sectionId}/delete-impact`)
  }

  async delete(sectionId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`${this.basePath}/${sectionId}`)
  }

  async reorder(orders: { id: string; display_order: number }[]): Promise<ApiResponse<{ updated: number }>> {
    return apiService.put<{ updated: number }>(`${this.basePath}/reorder`, { orders })
  }

  // ── Section Extras ───────────────────────────────────────────────────────

  async getNavigationTargets(): Promise<ApiResponse<{ targets: NavigationTarget[] }>> {
    return apiService.get<{ targets: NavigationTarget[] }>(`${this.basePath}/navigation-targets`)
  }

  async getCardTypes(): Promise<ApiResponse<{ card_types: CardTypeInfo[] }>> {
    return apiService.get<{ card_types: CardTypeInfo[] }>(`${this.basePath}/card-types`)
  }

  async uploadSectionImage(
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<{ imageUrl: string; s3Key: string }> {
    const urlRes = await apiService.post<{ uploadUrl: string; s3Key: string; imageUrl: string }>(
      `${this.basePath}/image-upload-url`,
      { mimeType: file.type || 'image/jpeg' },
    )
    if (!urlRes.success || !urlRes.data) {
      throw new Error(urlRes.message || 'Failed to get upload URL')
    }
    const { uploadUrl, s3Key, imageUrl } = urlRes.data

    await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type || 'image/jpeg' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })

    return { imageUrl, s3Key }
  }

  // ── Item CRUD ────────────────────────────────────────────────────────────

  async getAllItems(
    sectionId: string,
    params: BaseListParams = {},
  ): Promise<ApiResponse<ListResponse<HomeSectionItem>>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<ListResponse<HomeSectionItem>>(`${this.basePath}/${sectionId}/items${query}`)
  }

  async getItemById(sectionId: string, itemId: string): Promise<ApiResponse<HomeSectionItem>> {
    const response = await apiService.get<{ item: HomeSectionItem }>(
      `${this.basePath}/${sectionId}/items/${itemId}`,
    )
    if (response.success && response.data) {
      return { ...response, data: response.data.item }
    }
    return response as unknown as ApiResponse<HomeSectionItem>
  }

  async createItem(
    sectionId: string,
    data: HomeSectionItemFormData,
  ): Promise<ApiResponse<HomeSectionItem>> {
    const response = await apiService.post<{ item: HomeSectionItem }>(
      `${this.basePath}/${sectionId}/items`,
      data,
    )
    if (response.success && response.data) {
      return { ...response, data: response.data.item }
    }
    return response as unknown as ApiResponse<HomeSectionItem>
  }

  async updateItem(
    sectionId: string,
    itemId: string,
    data: Partial<HomeSectionItemFormData>,
  ): Promise<ApiResponse<HomeSectionItem>> {
    const response = await apiService.put<{ item: HomeSectionItem }>(
      `${this.basePath}/${sectionId}/items/${itemId}`,
      data,
    )
    if (response.success && response.data) {
      return { ...response, data: response.data.item }
    }
    return response as unknown as ApiResponse<HomeSectionItem>
  }

  async deleteItem(sectionId: string, itemId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`${this.basePath}/${sectionId}/items/${itemId}`)
  }

  async reorderItems(
    sectionId: string,
    orders: { id: string; display_order: number }[],
  ): Promise<ApiResponse<{ updated: number }>> {
    return apiService.put<{ updated: number }>(
      `${this.basePath}/${sectionId}/items/reorder`,
      { orders },
    )
  }

  // ── Item Extras ──────────────────────────────────────────────────────────

  async uploadItemImage(
    sectionId: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<{ imageUrl: string; s3Key: string }> {
    const urlRes = await apiService.post<{ uploadUrl: string; s3Key: string; imageUrl: string }>(
      `${this.basePath}/${sectionId}/items/image-upload-url`,
      { mimeType: file.type || 'image/jpeg' },
    )
    if (!urlRes.success || !urlRes.data) {
      throw new Error(urlRes.message || 'Failed to get upload URL')
    }
    const { uploadUrl, s3Key, imageUrl } = urlRes.data

    await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type || 'image/jpeg' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })

    return { imageUrl, s3Key }
  }
}

export const homeSectionsService = new HomeSectionsService()
