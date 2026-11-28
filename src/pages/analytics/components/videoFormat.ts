import type { Tone } from '@/components/common/detail'
import { formatCount } from '@/components/charts/format'
import type { VideoStatus } from '@/services/videoAnalytics.service'

/** Total watch time: "42 min", "3 h 05 min", "1,204 h". */
export function watchTime(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(seconds ?? 0))
  if (s === 0) return '0 min'
  if (s < 60) return `${s} s`
  if (s < 3600) return `${Math.round(s / 60)} min`
  const h = Math.floor(s / 3600)
  if (h < 10) return `${h} h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')} min`
  return `${formatCount(Math.round(s / 3600))} h`
}

/** A short span (average per viewer, a video's length): "42s", "8m 42s", "1h 05m". */
export function shortTime(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(seconds ?? 0))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
  return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`
}

/** "just now", "5 min ago", "3 h ago", "4 days ago"; older than 60 days: null (show the date). */
export function ago(iso: string | null | undefined, now = Date.now()): string | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  const min = Math.floor((now - t) / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.floor(h / 24)
  if (d <= 60) return d === 1 ? 'yesterday' : `${d} days ago`
  return null
}

export const STATUS: Record<VideoStatus, { label: string; tone: Tone; hint: string }> = {
  live: { label: 'Live', tone: 'success', hint: 'Students can watch it' },
  scheduled: { label: 'Scheduled', tone: 'info', hint: 'Released to students later' },
  processing: { label: 'Processing', tone: 'warning', hint: 'Still being prepared' },
  hidden: { label: 'Hidden', tone: 'neutral', hint: 'Its module or series is switched off or a draft' },
}

/** "Series One › Module Two", with plain names for what was deleted. */
export function pathOf(v: { series_name: string | null; module_name: string | null }): string {
  return `${v.series_name ?? 'Deleted series'} › ${v.module_name ?? 'Deleted module'}`
}

export const rating = (n: number | null | undefined) => (n === null || n === undefined ? '—' : n.toFixed(2))

/** No change arrow when both periods are zero: "0, same as before" is noise. */
export const quiet = (now: number | undefined, before: number | null | undefined) => (!now && !before ? null : before)
