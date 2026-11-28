import type { Tone } from '@/components/common/detail'
import type { CoursePath, FacultyRef, FeedbackAction, FeedbackActivity, FeedbackPriority, FeedbackStatus } from '@/services/feedback.service'

export const STATUSES: FeedbackStatus[] = ['new', 'in_review', 'action_planned', 'resolved', 'dismissed']
export const CLOSED: FeedbackStatus[] = ['resolved', 'dismissed']

export const STATUS_LABEL: Record<FeedbackStatus, string> = {
  new: 'New', in_review: 'In review', action_planned: 'Action planned', resolved: 'Resolved', dismissed: 'Dismissed',
}
export const STATUS_TONE: Record<FeedbackStatus, Tone> = {
  new: 'info', in_review: 'warning', action_planned: 'warning', resolved: 'success', dismissed: 'neutral',
}
export const PRIORITY_LABEL: Record<FeedbackPriority, string> = { low: 'Low', normal: 'Normal', high: 'High' }
export const ACTION_LABEL: Record<FeedbackAction, string> = {
  none: 'No action yet',
  talk_to_faculty: 'Talk to the lecturer',
  re_record: 'Re-record the video',
  edit_video: 'Edit the video',
  reply_student: 'Reply to the student',
}

// Times are shown in IST wherever the admin's computer is.
const IST = 'Asia/Kolkata'
const dayFmt = new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: 'numeric', month: 'short', year: 'numeric' })
const dayTimeFmt = new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
const format = (f: Intl.DateTimeFormat, v: string | null | undefined) => {
  if (!v) return 'Not set'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? 'Not set' : f.format(d)
}
export const istDay = (v: string | null | undefined) => format(dayFmt, v)
export const istDayTime = (v: string | null | undefined) => format(dayTimeFmt, v)
/** "2026-11-30" (already a calendar day) */
export const calendarDay = (v: string | null | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? dayFmt.format(new Date(`${v}T12:00:00+05:30`)) : 'Not set')
export const monthLabel = (v: string) => new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', month: 'short', year: '2-digit' }).format(new Date(`${v}-01T00:00:00Z`))

export const plural = (n: number, one: string, many = `${one}s`) => `${new Intl.NumberFormat('en-IN').format(n)} ${n === 1 ? one : many}`
export const average = (n: number | null | undefined) => (n == null ? 'No ratings' : n.toFixed(1))
export const facultyName = (f: FacultyRef | null | undefined) => (!f ? 'No lecturer set' : f.name || 'Deleted faculty')

/** The video's place in the Explorer, when every level of it still exists. */
export function explorerHref(path: CoursePath, videoId: string | undefined): string | null {
  const { subject, package: pkg, series, module } = path
  if (!subject || !pkg || !series || !module || !videoId) return null
  return `/content/explorer/subjects/${subject._id}/packages/${pkg._id}/series/${series._id}/modules/${module._id}/videos/${videoId}`
}

export const pathText = (p: CoursePath) => [p.subject?.name, p.package?.name, p.series?.name, p.module?.name].filter(Boolean).join(' / ')

export function activityTitle(a: FeedbackActivity): string {
  const who = a.by === 'student' ? 'The student' : a.by === 'system' ? 'The system' : a.admin_name || 'A former admin'
  const status = (s: string | null) => STATUS_LABEL[(s || 'new') as FeedbackStatus] ?? s
  switch (a.type) {
    case 'status': return `${who} moved it from ${status(a.from)} to ${status(a.to)}`
    case 'assigned':
      if (!a.to) return `${who} removed ${a.from || 'the assignee'}`
      return a.from ? `${who} reassigned it from ${a.from} to ${a.to}` : `${who} assigned it to ${a.to}`
    case 'priority': return `${who} set the priority to ${(PRIORITY_LABEL[(a.to || 'normal') as FeedbackPriority] ?? a.to ?? '').toLowerCase()}`
    case 'action': return a.to === 'none' ? `${who} removed the action` : `${who} chose the action: ${(ACTION_LABEL[(a.to || 'none') as FeedbackAction] ?? a.to ?? '').toLowerCase()}`
    case 'due': return a.to ? `${who} set the due date to ${calendarDay(a.to)}` : `${who} removed the due date`
    case 'reopened': return `Reopened because the student added to it (it was ${String(status(a.from)).toLowerCase()})`
    default: return `${who} added a note`
  }
}

export function activityTone(a: FeedbackActivity): Tone | undefined {
  if (a.type === 'reopened') return 'warning'
  if (a.type === 'status' && a.to === 'resolved') return 'success'
  return undefined
}
