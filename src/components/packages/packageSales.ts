import { apiService, type ApiResponse } from '@/services/api.service'

/** Sales of one package, from the analytics API. Needs analytics.read. */

export interface SalesFigures { orders?: number; collected?: number; net?: number; gst?: number; discount?: number; average_order?: number; buyers?: number }
export interface PackageSales {
  range?: { from: string | null; to: string | null }
  periods?: Record<string, SalesFigures & { from?: string | null; to?: string | null }>
  current?: SalesFigures
  previous?: SalesFigures | null
  tiers?: (SalesFigures & { key: string; tier_duration_days: number | null; tier_name: string | null; share?: number; previous_collected?: number })[]
  trend?: { granularity?: string; points?: { key: string; from: string; to: string; partial?: boolean; orders?: number; collected?: number }[] }
  opened_by_combos?: number
}
export interface PackageBuyer {
  purchase_id: string
  user?: { user_id?: string; name?: string | null; student_id?: string | null; phone_number?: string | null } | null
  tier_duration_days?: number | null
  tier_name?: string | null
  collected?: number
  coupon_code?: string | null
  discount?: number
  purchased_at?: string
}

async function read<T>(path: string): Promise<T> {
  const res: ApiResponse<T> = await apiService.get<T>(`admin/analytics-v2/packages/${path}`)
  if (!res.success || !res.data) throw new Error(res.message || 'Sales could not be loaded.')
  return res.data
}

export const packageSalesService = {
  detail: (packageId: string, range: { from?: string; to?: string } = {}) => {
    const q = new URLSearchParams()
    if (range.from && range.to) { q.set('from', range.from); q.set('to', range.to) }
    const s = q.toString()
    return read<PackageSales>(`${packageId}${s ? `?${s}` : ''}`)
  },
  buyers: async (packageId: string, limit: number, range: { from?: string; to?: string } = {}) => {
    const q = new URLSearchParams({ limit: String(limit) })
    if (range.from && range.to) { q.set('from', range.from); q.set('to', range.to) }
    const data = await read<{ entities?: PackageBuyer[]; pagination?: { total?: number } }>(`${packageId}/buyers?${q}`)
    return { rows: data.entities || [], total: data.pagination?.total ?? (data.entities || []).length }
  },
  /** Paid sales of each length, ever: days → orders. */
  soldByDays: async (packageId: string): Promise<Map<number, number>> => {
    const data = await read<PackageSales>(packageId)
    const map = new Map<number, number>()
    for (const t of data.tiers || []) if (t.tier_duration_days) map.set(t.tier_duration_days, t.orders ?? 0)
    return map
  },
}
