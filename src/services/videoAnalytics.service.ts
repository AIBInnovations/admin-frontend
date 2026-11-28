import { apiService } from './api.service'
import type { Granularity, RangeInfo } from './analytics.service'

/**
 * Video analytics (round 7): per package, its videos' views, viewers, watch
 * time, completion and ratings, and who watches. Served by the analytics batch
 * (admin/analytics-v2/batch), so one view of the Videos tab is one request.
 *
 * Which numbers follow the date range: `basis` on each report. Views, unique
 * viewers and ratings do; watch time is all time; completion is "now" (each
 * student's last saved position).
 */

export type VideoSort = 'views' | 'viewers' | 'watch' | 'avg_watch' | 'completion' | 'completed' | 'rating' | 'ratings' | 'last' | 'title' | 'order'
export type VideoStatus = 'live' | 'scheduled' | 'processing' | 'hidden'

export interface VideoQuery {
  from?: string
  to?: string
  compare?: 'previous' | 'none'
  granularity?: Granularity
  subject_id?: string
  package_id?: string
  video_id?: string
  vsort?: VideoSort
  dir?: 'asc' | 'desc'
  search?: string
  page?: number
  limit?: number
}

export interface VideoBasis {
  views: 'events' | 'counter'
  viewers: 'events' | 'counter'
  ratings: 'range' | 'all_time'
  watch_time: 'all_time'
  completion: 'now'
}

export interface VideoScopePackage { package_id: string; name: string; deleted: boolean; is_combo: boolean; bundled: { package_id: string; name: string }[] }

export interface VideoRow {
  video_id: string
  title: string
  duration_seconds: number
  is_free: boolean
  status: VideoStatus
  package_id: string | null
  package_name: string | null
  subject_id: string | null
  series_id: string | null
  series_name: string | null
  module_id: string | null
  module_name: string | null
  views: number
  viewers: number
  previous_views: number | null
  watch_seconds: number
  avg_watch_seconds: number
  started: number
  completed: number
  completion: number | null
  ratings: number
  rating: number | null
  last_watched_at: string | null
  views_all_time: number
  viewers_all_time: number
}

export interface VideoUsageReport {
  range: RangeInfo
  previous_range: RangeInfo | null
  package: VideoScopePackage | null
  subject: { subject_id: string; name: string } | null
  tracking_since: string | null
  basis: VideoBasis
  sort: { vsort: VideoSort; dir: 'asc' | 'desc' }
  totals: {
    videos: number
    live_videos: number
    watched: number
    not_watched: number
    not_watched_live: number
    views: number
    viewers: number
    watch_seconds: number
    duration_seconds: number
    started: number
    completed: number
    completion: number | null
    ratings: number
    rating: number | null
  }
  previous: { views: number; viewers: number; ratings: number; rating: number | null } | null
  rows: VideoRow[]
  top: VideoRow[]
  least: VideoRow[]
  search: string | null
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export interface VideoTrendPoint { key: string; from: string; to: string; partial: boolean; views: number; viewers: number }
export interface VideoTrendReport {
  range: RangeInfo
  previous_range: RangeInfo | null
  tracking_since: string | null
  from: string
  to: string
  granularity: Exclude<Granularity, 'auto'>
  granularity_adjusted: boolean
  points: VideoTrendPoint[]
  previous_points: { from: string; to: string; views: number; viewers: number }[] | null
  total: { views: number; viewers: number }
  previous_total: { views: number; viewers: number } | null
}

export interface VideoDetailReport {
  range: RangeInfo
  previous_range: RangeInfo | null
  tracking_since: string | null
  video: {
    video_id: string
    title: string
    duration_seconds: number
    is_free: boolean
    status: VideoStatus
    archived: boolean
    draft: boolean
    created_at: string | null
    faculty: { faculty_id: string; name: string } | null
    package_id: string | null
    package_name: string | null
    subject_id: string | null
    series_id: string | null
    series_name: string | null
    module_id: string | null
    module_name: string | null
  }
  basis: VideoBasis
  current: { views: number; viewers: number; ratings: number; rating: number | null }
  previous: { views: number; viewers: number; ratings: number; rating: number | null } | null
  all_time: { views: number; viewers: number; watch_seconds: number; avg_watch_seconds: number; ratings: number; rating: number | null }
  progress: {
    started: number
    completed: number
    completion: number | null
    last_watched_at: string | null
    reach: { key: string; label: string; students: number; share: number; of_previous: number | null }[]
    stopped: { from: number; to: number; students: number; share: number }[]
  }
  distribution: { rating: number; count: number; share: number }[]
}

export interface AudienceRow { key: string; name: string; viewers: number; share: number }
export interface AudienceText {
  rows: AudienceRow[]
  others: { viewers: number; names: number; share: number }
  not_recorded: { viewers: number; share: number }
  recorded: number
  distinct: number
}
export interface VideoAudienceReport {
  range: RangeInfo
  package: VideoScopePackage | null
  video_id: string | null
  basis: 'events' | 'progress'
  viewers: number
  deleted_students: number
  states: { rows: (AudienceRow & { state: string | null })[]; recorded: number; distinct: number }
  cities: AudienceText
  colleges: AudienceText
}

export type VideoExport = 'video_usage' | 'video_audience'

const BASE = 'admin/analytics-v2'

function clean(q: object): Record<string, string> {
  return Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)]))
}

interface Job { body: { report: string; query: Record<string, string> }; resolve: (v: unknown) => void; reject: (e: unknown) => void }
interface BatchResult { ok: boolean; data?: unknown; status?: number; message?: string }

let queue: Job[] = []
let timer: ReturnType<typeof setTimeout> | null = null

function failure(message: string, status?: number): Error {
  return Object.assign(new Error(status === 429 ? 'Too many requests. Wait a minute, then try again.' : message), { status })
}

/** Everything asked for in the same moment goes as one request (the server takes up to 20). */
function flush() {
  timer = null
  const jobs = queue
  queue = []
  for (let i = 0; i < jobs.length; i += 20) {
    const part = jobs.slice(i, i + 20)
    void apiService.post<{ results: BatchResult[] }>(`${BASE}/batch`, { requests: part.map((j) => j.body) })
      .then((res) => part.forEach((j, n) => {
        const r = res.data?.results?.[n]
        if (r?.ok) j.resolve(r.data)
        else j.reject(failure(r?.message || 'This report could not be loaded', r?.status))
      }))
      .catch((err: Error & { status?: number }) => part.forEach((j) => j.reject(failure(err.message, err.status))))
  }
}

function report<T>(name: string, q: object): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push({ body: { report: name, query: clean(q) }, resolve: resolve as (v: unknown) => void, reject })
    timer ??= setTimeout(flush, 10)
  })
}

export const videoAnalyticsService = {
  usage: (q: VideoQuery) => report<VideoUsageReport>('video_usage', q),
  trend: (q: VideoQuery) => report<VideoTrendReport>('video_trend', q),
  detail: (q: VideoQuery) => report<VideoDetailReport>('video_detail', q),
  audience: (q: VideoQuery) => report<VideoAudienceReport>('video_audience', q),
  exportCsv: (name: VideoExport, q: VideoQuery) => apiService.downloadBlob(`${BASE}/export`, clean({ ...q, report: name }), `pgme-${name}.csv`),
}
