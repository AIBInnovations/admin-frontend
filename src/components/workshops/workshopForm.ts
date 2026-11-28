import { z } from 'zod'
import type { Workshop, WorkshopDay } from '@/services/workshops.service'
import { fromIstInputs, shiftDate, toIstInputs } from '@/components/forms/editor/ist'

export const MAX_DAYS = 10

export interface DayValues {
  session_id: string | null
  title: string
  description: string
  faculty_id: string
  date: string
  start_time: string
  end_time: string
  /** The day runs past midnight: the end time belongs to the next date. */
  ends_next_day: boolean
  /** Has attendance or recordings; the API refuses to remove it. */
  locked: boolean
  status: WorkshopDay['status'] | null
}

export interface WorkshopFormValues {
  title: string
  description: string
  subject_id: string
  platform: 'zoom' | 'agora' | 'teams' | 'other'
  enrollment_mode: 'open' | 'enrollment_required' | 'disabled'
  capacity_mode: 'limited' | 'unlimited'
  max_seats: number | null
  allow_waitlist: boolean
  is_free: boolean
  price: number | null
  registration_cutoff_mode: 'first_day' | 'custom'
  registration_closes_date: string
  registration_closes_time: string
  certificate_enabled: boolean
  certificate_min_days_attended: number | null
  certificate_signatory_name: string
  certificate_signatory_title: string
  publish_status: 'draft' | 'published'
  days: DayValues[]
}

export const emptyDay = (): DayValues => ({
  session_id: null, title: '', description: '', faculty_id: '', date: '', start_time: '', end_time: '', ends_next_day: false, locked: false, status: null,
})

export const BLANK_WORKSHOP = (): WorkshopFormValues => ({
  title: '', description: '', subject_id: '', platform: 'zoom', enrollment_mode: 'enrollment_required', capacity_mode: 'unlimited', max_seats: null,
  allow_waitlist: true, is_free: false, price: 999, registration_cutoff_mode: 'first_day', registration_closes_date: '', registration_closes_time: '',
  certificate_enabled: true, certificate_min_days_attended: null, certificate_signatory_name: '', certificate_signatory_title: '',
  publish_status: 'draft', days: [emptyDay(), emptyDay()],
})

export const dayStart = (d: Pick<DayValues, 'date' | 'start_time'>) => fromIstInputs(d.date, d.start_time)
export const dayEnd = (d: Pick<DayValues, 'date' | 'end_time' | 'ends_next_day'>) => fromIstInputs(d.ends_next_day ? shiftDate(d.date, 1) : d.date, d.end_time)
export function dayMinutes(d: DayValues): number {
  const a = dayStart(d)
  const b = dayEnd(d)
  return a && b && b > a ? Math.round((b.getTime() - a.getTime()) / 60000) : 0
}

/** Position of each day in time order: the number the API will give it. */
export function dayNumbers(days: DayValues[]): number[] {
  const order = days
    .map((d, i) => ({ i, t: dayStart(d)?.getTime() ?? Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => a.t - b.t || a.i - b.i)
  const numbers: number[] = []
  order.forEach((e, n) => { numbers[e.i] = n + 1 })
  return numbers
}

export function toWorkshopValues(w: Workshop): WorkshopFormValues {
  const cutoff = w.registration_closes_at ? new Date(w.registration_closes_at) : null
  const first = w.start_date ? new Date(w.start_date) : null
  const atFirstDay = !cutoff || (!!first && Math.abs(cutoff.getTime() - first.getTime()) < 60000)
  const closes = atFirstDay ? { date: '', time: '' } : toIstInputs(cutoff)
  return {
    title: w.title,
    description: w.description || '',
    subject_id: w.subject_id && typeof w.subject_id === 'object' ? w.subject_id._id : w.subject_id || '',
    platform: w.platform || 'zoom',
    enrollment_mode: w.enrollment_mode,
    capacity_mode: w.capacity_mode,
    max_seats: w.max_seats,
    allow_waitlist: w.allow_waitlist,
    is_free: w.is_free,
    price: w.is_free ? null : w.price,
    registration_cutoff_mode: atFirstDay ? 'first_day' : 'custom',
    registration_closes_date: closes.date,
    registration_closes_time: closes.time,
    certificate_enabled: w.certificate_enabled,
    certificate_min_days_attended: w.certificate_min_days_attended,
    certificate_signatory_name: w.certificate_signatory_name || '',
    certificate_signatory_title: w.certificate_signatory_title || '',
    publish_status: w.publish_status || 'draft',
    days: (w.days || []).map((d) => {
      const a = toIstInputs(d.scheduled_start_time)
      const b = toIstInputs(d.scheduled_end_time)
      return {
        session_id: d.session_id, title: d.title, description: d.description || '', faculty_id: d.faculty_id || '',
        date: a.date, start_time: a.time, end_time: b.time, ends_next_day: b.date > a.date,
        locked: d.attendee_count > 0 || d.recording_count > 0, status: d.status,
      }
    }),
  }
}

// The base shape accepts anything, so every problem is reported in one go.
export const workshopSchema = z.custom<WorkshopFormValues>().superRefine((d, ctx) => {
  const fail = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', message, path })
  const title = d.title.trim()
  if (title.length < 5) fail(['title'], title ? 'Title must be at least 5 characters' : 'Title is required')
  if (title.length > 200) fail(['title'], 'Keep the title under 200 characters')
  if (!d.description.trim()) fail(['description'], 'Description is required')
  if (d.description.trim().length > 4000) fail(['description'], 'Keep the description under 4000 characters')
  if (!d.subject_id) fail(['subject_id'], 'Subject is required')
  if (d.capacity_mode === 'limited' && !(d.max_seats && Number.isInteger(d.max_seats) && d.max_seats > 0)) fail(['max_seats'], 'Seat limit is required for limited capacity')
  if (!d.is_free && !(d.price && d.price > 0)) fail(['price'], 'Price is required for paid workshops')

  if (d.days.length < 1) fail(['days'], 'A workshop needs at least one day')
  if (d.days.length > MAX_DAYS) fail(['days'], `At most ${MAX_DAYS} days`)
  d.days.forEach((day, i) => {
    const name = day.title.trim()
    if (name.length < 3) fail(['days', i, 'title'], 'Day title must be at least 3 characters')
    if (name.length > 200) fail(['days', i, 'title'], 'Keep the day title under 200 characters')
    if (day.description.length > 2000) fail(['days', i, 'description'], 'Keep this under 2000 characters')
    if (!day.date) fail(['days', i, 'date'], 'Date is required')
    if (!day.start_time) fail(['days', i, 'start_time'], 'Start time is required')
    if (!day.end_time) fail(['days', i, 'end_time'], 'End time is required')
    const a = dayStart(day)
    const b = dayEnd(day)
    if (a && b && b <= a) fail(['days', i, 'end_time'], 'End time must be after start time')
  })

  // Overlaps, once sorted by time. The API sorts and renumbers too, so days can be entered in any order.
  const spans = d.days
    .map((day, i) => ({ i, a: dayStart(day)?.getTime(), b: dayEnd(day)?.getTime() }))
    .filter((s): s is { i: number; a: number; b: number } => s.a !== undefined && s.b !== undefined && s.b > s.a)
    .sort((x, y) => x.a - y.a)
  for (let k = 1; k < spans.length; k += 1) {
    if (spans[k].a < spans[k - 1].b) fail(['days', spans[k].i, 'start_time'], 'This day overlaps another day of the workshop')
  }

  if (d.registration_cutoff_mode === 'custom') {
    const cutoff = fromIstInputs(d.registration_closes_date, d.registration_closes_time)
    if (!d.registration_closes_date || !d.registration_closes_time || !cutoff) fail(['registration_closes_date'], 'Set a cutoff date and time')
    else if (spans.length > 0 && cutoff.getTime() > Math.max(...spans.map((s) => s.b))) fail(['registration_closes_date'], 'The cutoff cannot be after the last day ends')
  }

  if (d.certificate_enabled) {
    const min = d.certificate_min_days_attended
    if (min != null && (!Number.isInteger(min) || min < 1)) fail(['certificate_min_days_attended'], 'Enter a whole number, 1 or more, or leave it blank')
    else if (min != null && d.days.length > 0 && min > d.days.length) fail(['certificate_min_days_attended'], `This workshop has ${d.days.length} day${d.days.length === 1 ? '' : 's'}`)
    if (d.certificate_signatory_name.length > 120) fail(['certificate_signatory_name'], 'Keep this under 120 characters')
    if (d.certificate_signatory_title.length > 120) fail(['certificate_signatory_title'], 'Keep this under 120 characters')
  }
})
