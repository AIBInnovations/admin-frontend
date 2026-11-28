import { apiService, ApiResponse } from './api.service'

// Date-range presets for events + most-viewed analytics
export type AnalyticsRange = 'week' | 'month' | 'year' | 'all'

// Types
export interface DashboardAnalytics {
  users: {
    total: number
    active_30_days: number
    new_this_month: number
  }
  revenue: {
    total: number
    this_month: number
  }
  content: {
    most_viewed_videos: Array<{
      video_id: string
      title: string
      view_count: number // plays
      unique_viewer_count: number
      total_watch_seconds: number
      avg_watch_seconds: number
      thumbnail_url: string | null
    }>
    popular_subjects: Array<{
      subject_id: string
      name: string
      icon_url: string | null
      purchase_count: number
    }>
  }
  events: {
    range: AnalyticsRange
    by_range: Array<{
      event_type: string
      count: number
    }>
  }
}

// ── Reports (admin/analytics-v2). One sale definition behind all of them. ──

export type SaleType = 'package' | 'session' | 'workshop' | 'book' | 'ebook' | 'form'
export type PackageKind = 'theory' | 'practical' | 'combo' | 'other'
export type Granularity = 'auto' | 'day' | 'week' | 'month' | 'year'

/** What every report accepts. Empty values are not sent. */
export interface ReportQuery {
  from?: string
  to?: string
  compare?: 'previous' | 'none'
  granularity?: Granularity
  split?: 'none' | 'type' | 'kind'
  type?: string
  subject_id?: string
  package_id?: string
  package_type?: string
  tier?: string
  product_id?: string
  coupon?: string
  sort?: 'collected' | 'orders' | 'buyers' | 'name'
  page?: number
  limit?: number
  min_ratings?: number
  /** Cross-filters set by clicking a chart: a billing state ('none' = not recorded), a weekday 1-7, an hour '20' or '18-20' (IST). */
  state?: string
  dow?: string
  hour?: string
}

export interface RangeInfo { from: string | null; to: string | null; days: number | null }
export interface Money { orders: number; collected: number; net: number; gst: number; discount: number }
interface Ranged { range: RangeInfo; previous_range: RangeInfo | null }

export interface Figures extends Money {
  legacy_orders: number
  average_order: number
  buyers: number
  new_buyers: number
  returning_buyers: number
  repeat_buyers: number
  reversed_orders: number
  reversed_amount: number
  new_users?: number
  active_users?: number
}

export interface TypeRow extends Money {
  type: SaleType
  buyers: number
  share: number
  previous_collected: number | null
  previous_orders: number | null
}

export interface Overview extends Ranged { current: Figures; previous: Figures | null; by_type: TypeRow[] }

export interface SeriesPoint extends Money {
  key: string
  from: string
  to: string
  partial: boolean
  by?: Record<string, { orders: number; collected: number }>
}

export interface TimeSeries extends Ranged {
  from: string
  to: string
  granularity: Exclude<Granularity, 'auto'>
  granularity_adjusted: boolean
  split: 'none' | 'type' | 'kind'
  keys: string[]
  points: SeriesPoint[]
  previous: { from: string; to: string; orders: number; collected: number; net: number }[] | null
  total: Money & { by?: Record<string, { orders: number; collected: number }> }
}

export type SubjectColumn = 'theory' | 'practical' | 'combo' | 'other_package' | Exclude<SaleType, 'package'>
type SubjectCells = Record<SubjectColumn, { orders: number; collected: number }>

export interface SubjectRow extends Money, SubjectCells {
  subject_id: string | null
  name: string
  buyers: number
  share: number
  previous_collected: number | null
}

export interface SubjectsReport extends Ranged {
  columns: SubjectColumn[]
  rows: SubjectRow[]
  total: Money & SubjectCells & { buyers: number; previous_collected: number | null }
  orders_in_several_subjects: number
}

export interface TierRow extends Money {
  key: string
  tier_duration_days: number | null
  tier_name: string | null
  share: number
  previous_collected: number | null
}

export interface PackageRow extends Money {
  package_id: string
  name: string
  deleted: boolean
  kind: PackageKind
  package_type: string | null
  subject_id: string | null
  subject_name: string | null
  buyers: number
  share: number
  previous_collected: number | null
  previous_orders: number | null
  trend: number[]
  tiers: TierRow[]
}

export interface PackagesReport extends Ranged {
  granularity: Exclude<Granularity, 'auto'>
  trend_days: { from: string; to: string }[]
  rows: PackageRow[]
  total: Money & { buyers: number; previous_collected: number | null; previous_orders: number | null }
}

export interface CouponRow {
  code: string
  coupon_id: string | null
  description: string
  is_active: boolean | null
  uses: number
  buyers: number
  discount: number
  collected: number
  net: number
  previous_uses: number | null
  /** Students whose first purchase ever was made with this coupon. */
  new_buyers: number
  new_buyer_share: number
}

export interface CouponsReport extends Ranged {
  rows: CouponRow[]
  total: { uses: number; discount: number; collected: number; net: number; new_buyers: number }
  without_coupon: { orders: number; collected: number }
}

export interface PackageReport extends Ranged {
  package: {
    package_id: string
    name: string
    deleted: boolean
    is_active: boolean
    publish_status: string | null
    subject: { subject_id: string; name: string } | null
    package_type: { package_type_id: string; name: string } | null
    kind: PackageKind
    is_combo: boolean
    tiers: { name: string; duration_days: number; price: number }[]
  }
  periods: Record<'today' | 'week' | 'month' | 'last_month' | 'year' | 'all', Money & { from: string | null; to: string | null }>
  current: Figures
  previous: Figures | null
  tiers: TierRow[]
  trend: Pick<TimeSeries, 'granularity' | 'from' | 'to' | 'points' | 'previous'>
  coupons: CouponRow[]
  opened_by_combos: number
}

export interface PackageBuyer {
  purchase_id: string
  user: { user_id: string; name: string; student_id: string | null } | null
  tier_duration_days: number | null
  tier_name: string | null
  collected: number
  coupon_code: string | null
  discount: number
  purchased_at: string
}

export interface PackageBuyers {
  entities: PackageBuyer[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export interface ProductRow extends Money {
  type: SaleType
  product_id: string | null
  name: string
  deleted: boolean
  subject_id: string | null
  subject_name: string | null
  buyers: number
  quantity: number
  share: number
  previous_collected: number | null
}

export interface ProductsReport extends Ranged { rows: ProductRow[]; total_products: number; total: Money }

export interface FeedbackReport extends Ranged {
  min_ratings: number
  current: { average: number | null; ratings: number; low_ratings: number; comments: number; low_comments: number }
  previous: { average: number | null; ratings: number; low_ratings: number } | null
  distribution: { rating: number; count: number; share: number }[]
  granularity: Exclude<Granularity, 'auto'>
  points: { key: string; from: string; to: string; partial: boolean; ratings: number; low_ratings: number; average: number | null }[]
  lowest_videos: { video_id: string; title: string; deleted: boolean; faculty_name: string | null; average: number; ratings: number; low_ratings: number }[]
  lowest_faculty: { faculty_id: string; name: string; average: number; ratings: number; low_ratings: number; videos: number }[]
  recent_low: {
    review_id: string
    rating: number
    feedback: string
    at: string
    video: { video_id: string; title: string } | null
    faculty_name: string | null
    user: { user_id: string; name: string } | null
    status: string
  }[]
}

export interface UsersReport extends Ranged {
  total_users: number
  current: { new_users: number; active_users: number; buyers: number; new_buyers: number; returning_buyers: number; repeat_buyers: number }
  previous: { new_users: number; active_users: number } | null
  granularity: Exclude<Granularity, 'auto'>
  points: { key: string; from: string; to: string; partial: boolean; registrations: number }[]
  previous_points: { from: string; to: string; registrations: number }[] | null
  conversion: { registered: number; bought: number; rate: number; steps: { key: string; label: string; students: number; share: number }[] }
}

export interface ExpiringReport {
  ending_7_days: number
  ending_30_days: number
  paid_30_days: number
  ended_90_days: number
  renewed_90_days: number
  renewal_rate: number | null
  rows: {
    purchase_id: string
    user: { user_id: string; name: string; student_id: string | null } | null
    package_id: string
    package_name: string
    tier_duration_days: number | null
    tier_name: string | null
    expires_at: string
    days_left: number
    paid: boolean
  }[]
}

export interface ContentReport {
  range: RangeInfo
  most_viewed_videos: { video_id: string; title: string; deleted: boolean; view_count: number; unique_viewer_count: number; avg_watch_seconds: number }[]
  events: { event_type: string; count: number }[]
  popular_subjects: { subject_id: string; name: string; purchase_count: number; collected: number }[]
}

export interface WatchedVideo {
  video_id: string
  title: string
  plays: number
  viewers: number
  avg_watch_seconds: number
  subject_id: string | null
  subject_name: string | null
  package_name: string | null
  package_id: string | null
  series_id: string | null
  module_id: string | null
}

export interface VideosReport {
  range: RangeInfo
  most: WatchedVideo[]
  least: WatchedVideo[]
  subjects: { subject_id: string | null; name: string; videos: number; plays: number; not_watched: number }[]
}

export interface Headline {
  users: { total: number; active_30_days: number; new_this_month: number }
  revenue: { this_month: number; total: number }
  month: { from: string; to: string }
}

export interface ReportOptions {
  subjects: { subject_id: string; name: string; is_active: boolean }[]
  package_types: { package_type_id: string; name: string; kind: PackageKind }[]
  packages: {
    package_id: string
    name: string
    subject_id: string | null
    package_type_id: string | null
    kind: PackageKind
    is_active: boolean
    tiers: { name: string; duration_days: number }[]
  }[]
}

// ── Round 3: the deeper views ──────────────────────────────────────────────

export interface InsightLink { tab?: string; params?: Record<string, string>; focus?: string; path?: string }
export interface InsightDriver {
  type: SaleType
  product_id: string | null
  name: string
  subject_id: string | null
  subject_name: string | null
  kind: PackageKind | null
  tier: string | null
  tier_duration_days: number | null
  tier_name: string | null
  now: number
  before: number
  delta: number
  share_of_change?: number
  share?: number
}
export interface InsightFact {
  id: 'revenue' | 'top_product' | 'no_sales' | 'refunds' | 'refund_rate' | 'mix' | 'mix_share' | 'subject' | 'new_buyers' | 'average_order' | 'discounts' | 'coupon_new_buyers' | 'open_disputes'
  direction: 'up' | 'down' | 'flat' | null
  tone: 'good' | 'bad' | 'neutral'
  link: InsightLink
  now?: number
  before?: number
  delta?: number
  change?: number | null
  driver?: InsightDriver | null
  ratio?: number | null
  amount?: number
  previous_amount?: number
  rate?: number
  previous_rate?: number
  kind?: PackageKind
  share_now?: number
  share_before?: number
  points?: number
  subject_id?: string | null
  name?: string
  code?: string
  coupon_id?: string | null
  new_buyers?: number
  buyers?: number
  collected?: number
  before_too?: boolean
}
export interface InsightsReport extends Ranged { facts: InsightFact[]; generated_at: string }

export interface RunRate {
  as_of: string
  today: string
  month: { from: string; to: string; days: number }
  elapsed_days: number
  days_left: number
  mtd: { orders: number; collected: number; net: number }
  last_month: { from: string; to: string; orders: number; collected: number }
  same_point_last_month: { from: string; to: string; orders: number; collected: number }
  projection: { collected: number; low: number; high: number; method: 'month_pace' | 'trailing_28'; pace_per_day: number; sd_per_day: number; basis: { from: string; to: string }; versus_last_month: number | null }
  daily: { day: string; orders: number; collected: number; cumulative: number }[]
  path: { day: string; expected: number; low: number; high: number }[]
  last_month_daily: { day_of_month: number; cumulative: number }[]
}

export interface HeatmapReport {
  range: RangeInfo
  cells: { dow: number; hour: number; orders: number; collected: number; net: number }[]
  by_dow: { dow: number; orders: number; collected: number }[]
  by_hour: { hour: number; orders: number; collected: number }[]
  total: { orders: number; collected: number; net: number }
  max: { orders: number; collected: number }
  peak: { dow: number; hour: number; orders: number; collected: number } | null
  busiest_day: number | null
}

export interface StateRow { key: string; state: string | null; name: string; orders: number; buyers: number; collected: number; net: number; share: number; previous_collected: number | null }
export interface StatesReport extends Ranged {
  rows: StateRow[]
  total: { orders: number; collected: number; net: number; buyers: number }
  states_with_sales: number
  recorded_share: number
  known_states: string[]
}

export interface FunnelReport {
  range: RangeInfo
  registered: number
  first_purchase: number
  second_purchase: number
  steps: { key: string; label: string; students: number; share: number; of_previous: number | null }[]
  median_days_to_first: number | null
  median_days_to_second: number | null
  time_to_first: { key: string; label: string; students: number; share: number }[]
  bought_before_registering: number
  by_month: { month: string; registered: number; bought: number; second: number; rate: number }[]
}

export interface StudentValueReport extends Ranged {
  buyers: number
  collected: number
  average_per_buyer: number
  median_per_buyer: number
  repeat: { buyers: number; share: number; collected: number; collected_share: number }
  previous: { buyers: number; collected: number; average_per_buyer: number; repeat_buyers: number } | null
  bands: { key: string; label: string; min: number; max: number | null; buyers: number; collected: number; share: number }[]
  names_hidden: boolean
  top: {
    rank: number
    user: { user_id: string; name: string; student_id: string | null } | null
    deleted: boolean
    orders: number
    collected: number
    share: number
    first_at: string
    last_at: string
    lifetime: number
    lifetime_orders: number
  }[]
}

export interface Outcomes { ended: number; renewed: number; via_combo: number; switched: number; other_only: number; lapsed: number; renewal_rate: number | null }
export interface RetentionReport {
  range: RangeInfo
  ended_until: string
  totals: Outcomes & { timing: { early: number; within_30: number; later: number } }
  by_package: (Outcomes & { package_id: string | null; name: string; deleted: boolean; kind: PackageKind; subject_id: string | null; tier: string; tier_duration_days: number | null; tier_name: string | null })[]
  moved_to: { package_id: string | null; name: string; students: number }[]
  months: number
  cohorts: { month: string; students: number; cells: { k: number; students: number; retained: number; rate: number | null }[] }[]
}

export interface RefundTotals {
  paid_orders: number
  sales_orders: number
  reversed_orders: number
  reversed_amount: number
  refunded_orders: number
  refunded_amount: number
  revoked_orders: number
  revoked_amount: number
  rate: number
  amount_rate: number
  disputes: { opened: number; open: number; won: number; lost: number; closed_other: number; amount: number; lost_amount: number }
}
export interface RefundsReport extends Ranged {
  granularity: Exclude<Granularity, 'auto'>
  current: RefundTotals
  previous: RefundTotals | null
  points: { key: string; from: string; to: string; partial: boolean; paid: number; reversed: number; amount: number; disputes: number; rate: number | null }[]
  by_product: { key: string; type: SaleType; package_id: string | null; name: string | null; tier: string | null; tier_duration_days: number | null; tier_name: string | null; sales: number; reversed: number; paid: number; amount: number; rate: number }[]
  disputes_by_package: { package_id: string | null; name: string; opened: number; lost: number; amount: number }[]
}

export type ExportReport = 'subjects' | 'packages' | 'types' | 'products' | 'periods' | 'coupons' | 'buyers' | 'feedback' | 'users' | 'videos' | 'expiring'

const BASE = 'admin/analytics-v2'

function clean(q: object): Record<string, string> {
  return Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)]))
}

interface Job { body: { report: string; query: Record<string, string>; id?: string }; resolve: (v: unknown) => void; reject: (e: unknown) => void }
interface BatchResult { ok: boolean; data?: unknown; status?: number; message?: string }

// The server answers up to 20 reports in one request: a whole tab
const BATCH = 20
let queue: Job[] = []
let timer: ReturnType<typeof setTimeout> | null = null

function failure(message: string, status?: number): Error {
  return Object.assign(new Error(status === 429 ? 'Too many requests. Wait a minute, then try again.' : message), { status })
}

/** Sends everything asked for in the same moment as one request; asks for the same thing once. */
async function flush() {
  timer = null
  const jobs = queue
  queue = []
  const unique = new Map<string, Job[]>()
  for (const j of jobs) {
    const key = JSON.stringify(j.body)
    unique.set(key, [...(unique.get(key) ?? []), j])
  }
  const groups = [...unique.values()]
  for (let i = 0; i < groups.length; i += BATCH) {
    const part = groups.slice(i, i + BATCH)
    void apiService.post<{ results: BatchResult[] }>(`${BASE}/batch`, { requests: part.map((g) => g[0].body) })
      .then((res) => {
        part.forEach((g, n) => {
          const r = res.data?.results?.[n]
          if (r?.ok) g.forEach((j) => j.resolve(r.data))
          else g.forEach((j) => j.reject(failure(r?.message || 'This report could not be loaded', r?.status)))
        })
      })
      .catch((err: Error & { status?: number }) => part.flat().forEach((j) => j.reject(failure(err.message, err.status))))
  }
}

function report<T>(name: string, q: object = {}, id?: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push({ body: { report: name, query: clean(q), ...(id && { id }) }, resolve: resolve as (v: unknown) => void, reject })
    timer ??= setTimeout(() => void flush(), 10)
  })
}

class AnalyticsService {
  async getDashboard(range: AnalyticsRange = 'month'): Promise<ApiResponse<DashboardAnalytics>> {
    return apiService.get<DashboardAnalytics>(`admin/analytics/dashboard?range=${range}`)
  }

  headline = () => report<Headline>('headline')
  options = () => report<ReportOptions>('options')
  overview = (q: ReportQuery) => report<Overview>('overview', q)
  timeseries = (q: ReportQuery) => report<TimeSeries>('timeseries', q)
  subjects = (q: ReportQuery) => report<SubjectsReport>('subjects', q)
  packages = (q: ReportQuery) => report<PackagesReport>('packages', q)
  package = (id: string, q: ReportQuery) => report<PackageReport>('package', q, id)
  packageBuyers = (id: string, q: ReportQuery) => report<PackageBuyers>('buyers', q, id)
  products = (q: ReportQuery) => report<ProductsReport>('products', q)
  coupons = (q: ReportQuery) => report<CouponsReport>('coupons', q)
  feedback = (q: ReportQuery) => report<FeedbackReport>('feedback', q)
  users = (q: ReportQuery) => report<UsersReport>('users', q)
  expiring = (q: ReportQuery) => report<ExpiringReport>('expiring', q)
  content = (q: ReportQuery) => report<ContentReport>('content', q)
  videos = (q: ReportQuery) => report<VideosReport>('videos', q)
  insights = (q: ReportQuery) => report<InsightsReport>('insights', q)
  runrate = (q: ReportQuery) => report<RunRate>('runrate', q)
  heatmap = (q: ReportQuery) => report<HeatmapReport>('heatmap', q)
  states = (q: ReportQuery) => report<StatesReport>('states', q)
  funnel = (q: ReportQuery) => report<FunnelReport>('funnel', q)
  studentValue = (q: ReportQuery) => report<StudentValueReport>('value', q)
  retention = (q: ReportQuery) => report<RetentionReport>('retention', q)
  refunds = (q: ReportQuery) => report<RefundsReport>('refunds', q)

  exportCsv(name: ExportReport, q: ReportQuery) {
    return apiService.downloadBlob(`${BASE}/export`, clean({ ...q, report: name }), `pgme-${name}.csv`)
  }
}

export const analyticsService = new AnalyticsService()
