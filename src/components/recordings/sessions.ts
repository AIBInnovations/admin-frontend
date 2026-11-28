import { liveSessionsService } from '@/services/liveSessions.service'
import { workshopsService } from '@/services/workshops.service'
import type { PickOption } from '@/components/forms/editor/pickers'
import { istDay } from '@/components/forms/editor/ist'

/** The 100 most recent live sessions. */
export async function loadLiveSessions(): Promise<PickOption[]> {
  const res = await liveSessionsService.getAll({ limit: 100, sort_by: 'scheduled_start_time', sort_order: 'desc' })
  if (!res.success || !res.data) throw new Error(res.message || 'The sessions could not be loaded.')
  return res.data.entities.map((s) => ({ id: s._id, name: s.title, sub: s.scheduled_start_time ? istDay(s.scheduled_start_time) : undefined }))
}

const WORKSHOPS = 12

/**
 * The days of the most recent workshops. The sessions list leaves them out and
 * each workshop is its own request, so this is only called when an admin opens
 * the picker.
 */
export async function loadWorkshopDays(): Promise<PickOption[]> {
  const list = await workshopsService.getAll({ page: 1, limit: WORKSHOPS })
  const full = await Promise.allSettled((list.data?.entities ?? []).map((w) => workshopsService.getById(w._id)))
  return full.flatMap((r) => {
    const w = r.status === 'fulfilled' ? r.value.data : undefined
    return (w?.days ?? []).map((d) => ({ id: d.session_id, name: `Day ${d.day_number}: ${d.title}`, sub: `${w!.title}, ${istDay(d.scheduled_start_time)}` }))
  })
}
