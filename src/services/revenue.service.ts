import { apiService, ApiResponse } from './api.service'

// Types
export interface RevenueByType {
  date_range: { start_date: string; end_date: string }
  revenue_by_product_type: {
    packages: { revenue: number; count: number; percentage: string }
    sessions: { revenue: number; count: number; percentage: string }
    books: { revenue: number; count: number; percentage: string }
  }
  total_revenue: number
  total_transactions: number
}

export interface RevenueTrend {
  period: string | { year: number; week: number }
  package_revenue: number
  session_revenue: number
  book_revenue: number
  total_revenue: number
}

export interface RevenueTrendsData {
  date_range: { start_date: string; end_date: string }
  period: 'daily' | 'weekly' | 'monthly'
  trends: RevenueTrend[]
}

export interface TopSellingProduct {
  _id: string
  name?: string
  title?: string
  author?: string
  price: number
  total_revenue: number
  total_sales?: number
  total_quantity_sold?: number
  total_orders?: number
}

export interface TopSellingData {
  date_range: { start_date: string; end_date: string }
  limit: number
  product_type: string
  top_selling_products: {
    packages: TopSellingProduct[]
    sessions: TopSellingProduct[]
    books: TopSellingProduct[]
  }
}

export interface RevenueForecast {
  historical_period: string
  forecast_period: string
  data_quality: { days_of_data: number; sufficient_for_forecast: boolean }
  historical_statistics: {
    avg_daily_revenue: number
    total_revenue: number
    recent_avg_daily_revenue: number
    growth_rate: string
  }
  forecast: { date: string; projected_revenue: string }[]
}

class RevenueService {
  private basePath = 'admin/revenue'

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

  async getByProductType(params: { start_date?: string; end_date?: string } = {}): Promise<ApiResponse<RevenueByType>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<RevenueByType>(`${this.basePath}/by-product-type${query}`)
  }

  async getTrends(params: {
    period?: 'daily' | 'weekly' | 'monthly'
    start_date?: string
    end_date?: string
  } = {}): Promise<ApiResponse<RevenueTrendsData>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<RevenueTrendsData>(`${this.basePath}/trends${query}`)
  }

  async getTopSelling(params: {
    limit?: number
    product_type?: string
    start_date?: string
    end_date?: string
  } = {}): Promise<ApiResponse<TopSellingData>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get<TopSellingData>(`${this.basePath}/top-selling${query}`)
  }

  async getForecast(days = 30): Promise<ApiResponse<RevenueForecast>> {
    return apiService.get<RevenueForecast>(`${this.basePath}/forecast?days=${days}`)
  }
}

export const revenueService = new RevenueService()
