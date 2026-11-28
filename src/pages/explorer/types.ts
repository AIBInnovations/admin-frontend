import type { Package, PackageDetail, PackageTier } from '@/services/packages.service'

export interface ContentCounts {
  series_count: number
  module_count: number
  video_count: number
  document_count: number
  duration_seconds: number
  failed_video_count: number
  processing_video_count: number
  draft_video_count: number
}

/** One of a package's lengths. Each is sold, priced and billed on its own. */
export type ExplorerTier = PackageTier & { zoho_item_id?: string | null }

export interface BundledPackage extends ContentCounts {
  _id: string
  name: string
  description: string
  thumbnail_url: string | null
  is_active: boolean
  publish_status: 'draft' | 'published'
  price: number
  duration_days: number
  subject: { _id: string; name: string | null }
}

interface Contents {
  is_combo?: boolean
  bundled_count?: number
  content_summary?: ContentCounts
  zoho_item_id?: string | null
}

/** A package in a list: GET admin/packages?with_counts=true */
export type ExplorerPackage = Package & Contents

/** A package with everything in it: GET admin/packages/:id */
export type ExplorerPackageDetail = PackageDetail & Contents & {
  bundle?: { missing_count: number; packages: BundledPackage[] } | null
}

export type AnyPackage = ExplorerPackage | ExplorerPackageDetail
