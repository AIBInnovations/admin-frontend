import { apiService, ApiResponse } from './api.service'

export type PriceMismatchType = 'package' | 'package_tier' | 'book' | 'session' | 'form'
export type PriceMismatchStatus = 'fixed' | 'failed'

export interface PriceMismatch {
  type: PriceMismatchType
  id: string
  name: string
  status: PriceMismatchStatus
  mongoPrice?: number
  zohoPriceBefore?: number
  zohoPriceAfter?: number
  error?: string
}

export interface PriceSyncSummary {
  checked: number
  matched: number
  fixed: number
  failed: number
  mismatches: PriceMismatch[]
}

export interface ItemSyncSummary {
  fixed: number
  failed: number
  skipped: number
}

class ZohoService {
  private basePath = 'admin/zoho'

  /**
   * Compares every product's Mongo price against its live Zoho item rate and
   * fixes any drift. Can take a while for large catalogs (sequential Zoho API
   * calls) — caller should use a generous timeout.
   */
  async syncPrices(): Promise<ApiResponse<PriceSyncSummary>> {
    return apiService.post<PriceSyncSummary>(`${this.basePath}/sync-prices`, {}, { timeout: 120000 })
  }

  /** Re-creates any missing Zoho items (packages/tiers/books/sessions/forms). */
  async syncMissingItems(): Promise<ApiResponse<ItemSyncSummary>> {
    return apiService.post<ItemSyncSummary>(`${this.basePath}/sync-items`, {}, { timeout: 120000 })
  }
}

export const zohoService = new ZohoService()
