import { BaseCrudService } from './base.service'
import type { BaseListParams } from '@/types/api.types'

export type RedirectPlatform = 'ios' | 'android'

export interface WebStoreRedirectRule {
  _id: string
  platform: RedirectPlatform
  min_version: string
  max_version: string | null
  base_url: string
  priority: number
  is_active: boolean
  description: string
  createdAt: string
  updatedAt: string
}

export interface WebStoreRedirectRuleFormData {
  platform: RedirectPlatform
  min_version: string
  max_version?: string | null
  base_url: string
  priority?: number
  is_active?: boolean
  description?: string
}

export interface WebStoreRedirectRulesListParams extends BaseListParams {
  platform?: RedirectPlatform | null
  is_active?: boolean | null
}

class WebStoreRedirectRulesService extends BaseCrudService<
  WebStoreRedirectRule,
  WebStoreRedirectRuleFormData,
  WebStoreRedirectRulesListParams
> {
  constructor() {
    super('admin/web-store-redirect-rules', 'rule')
  }
}

export const webStoreRedirectRulesService = new WebStoreRedirectRulesService()
