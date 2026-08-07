import { apiService, ApiResponse } from './api.service'
import { BaseCrudService } from './base.service'
import type { ListResponse, BaseListParams } from '@/types/api.types'

export type CouponDiscountType = 'percentage' | 'flat'
export type CouponAppliesTo = 'all' | 'type' | 'products'
export type CouponProductType = 'package' | 'session' | 'ebook' | 'book' | 'form'

export const COUPON_PRODUCT_TYPES: CouponProductType[] = ['package', 'session', 'ebook', 'book', 'form']

export interface CouponApplicableProduct {
  product_type: CouponProductType
  product_id: string
}

export type CouponCustomerScope = 'all' | 'specific'

export interface CouponApplicableUser {
  _id: string
  name: string
  email: string
  phone_number?: string
  student_id?: string | null
}

export interface Coupon {
  _id: string
  code: string
  description: string
  discount_type: CouponDiscountType
  discount_value: number
  max_discount_cap: number | null
  applies_to: CouponAppliesTo
  applicable_types: CouponProductType[]
  applicable_products: CouponApplicableProduct[]
  min_order_value: number
  max_redemptions: number | null
  redemption_count: number
  per_user_limit: number | null
  expiry_at: string | null
  is_active: boolean
  is_visible: boolean
  customer_scope: CouponCustomerScope
  applicable_users: CouponApplicableUser[]
  createdAt: string
  updatedAt: string
}

export interface CouponFormData {
  code: string
  description?: string
  discount_type: CouponDiscountType
  discount_value: number
  max_discount_cap?: number | null
  applies_to: CouponAppliesTo
  applicable_types?: CouponProductType[]
  applicable_products?: CouponApplicableProduct[]
  min_order_value?: number
  max_redemptions?: number | null
  per_user_limit?: number | null
  expiry_at?: string | null
  is_active?: boolean
  is_visible?: boolean
  customer_scope?: CouponCustomerScope
  applicable_users?: string[]
}

export interface CouponsListParams extends BaseListParams {
  is_active?: boolean | null
  search?: string
}

export interface CouponRedemption {
  _id: string
  code: string
  user_id: { _id: string; name: string; email?: string; student_id?: string } | null
  purchase_type: CouponProductType
  discount_amount: number
  redeemed_at: string
  createdAt: string
}

class CouponsService extends BaseCrudService<Coupon, CouponFormData, CouponsListParams> {
  constructor() {
    super('admin/coupons', 'coupon')
  }

  async toggleActiveStatus(id: string): Promise<ApiResponse<Coupon>> {
    const response = await apiService.patch<Record<string, Coupon>>(`${this.basePath}/${id}/toggle-active`, {})
    if (response.success && response.data) {
      return { ...response, data: response.data.coupon }
    }
    return response as unknown as ApiResponse<Coupon>
  }

  async getRedemptions(
    id: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<ApiResponse<ListResponse<CouponRedemption> & { redemptions: CouponRedemption[] }>> {
    const query = this.buildQuery(params as Record<string, unknown>)
    return apiService.get(`${this.basePath}/${id}/redemptions${query}`)
  }
}

export const couponsService = new CouponsService()
