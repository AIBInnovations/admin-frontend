import { useEffect, useMemo, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

/**
 * A student shown in any admin list opens their student page.
 *
 * - With `users.read` the name is a real link (middle-click, new tab, keyboard).
 * - Without it the name is plain text: the page would refuse the admin anyway.
 * - A missing or deleted account shows "Deleted student", with no link.
 *
 * The link carries where the admin came from, so the student page can say
 * "Back to Attendees" and go back through browser history.
 */

/** The shapes the API uses for a student: `_id`, or `user_id` on some lists. */
export interface StudentRef {
  _id?: string | null
  user_id?: string | null
  name?: string | null
  phone_number?: string | null
  email?: string | null
}

export const DELETED_STUDENT = 'Deleted student'

/** The student's id, whichever field the list uses. */
export const studentIdOf = (s: StudentRef | string | null | undefined): string | null => {
  if (!s) return null
  if (typeof s === 'string') return s
  return s._id || s.user_id || null
}

/** Name, else phone, else email. */
export const studentNameOf = (s: StudentRef | null | undefined, fallback = 'No name'): string =>
  s?.name?.trim() || s?.phone_number || s?.email || fallback

/** What the student page reads to label its Back link. */
export interface StudentBackState { studentBack?: { label: string; href: string } }

/** Opening a student from a row, plus whether this admin may. */
export function useStudentPage(from?: string) {
  const { hasPermission } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const can = hasPermission('users.read')
  const state: StudentBackState | undefined = from ? { studentBack: { label: from, href: `${location.pathname}${location.search}` } } : undefined
  return {
    /** Whether this admin can open student pages at all. */
    can,
    /** The student page's address, or null when it cannot be opened. */
    hrefOf: (s: StudentRef | string | null | undefined) => {
      const id = studentIdOf(s)
      return can && id ? `/users/${id}` : null
    },
    /** Opens the student page (a row click). Does nothing when it cannot. */
    open: (s: StudentRef | string | null | undefined) => {
      const id = studentIdOf(s)
      if (can && id) navigate(`/users/${id}`, { state })
    },
    state,
  }
}

/**
 * Props that make a plain table row open a record: click anywhere except a
 * control or link inside it, or Enter while the row has focus.
 */
export function openableRow(open: (() => void) | undefined, className?: string) {
  if (!open) return { className }
  return {
    tabIndex: 0,
    className: cn('cursor-pointer hover:bg-accent/50 focus-visible:bg-accent/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[hsl(var(--ring))]', className),
    onClick: (ev: MouseEvent<HTMLElement>) => {
      if (!(ev.target as HTMLElement).closest('button, a, input, select, textarea, [role="menuitem"], [role="switch"], [data-no-row-click]')) open()
    },
    onKeyDown: (ev: KeyboardEvent<HTMLElement>) => {
      if (ev.key === 'Enter' && ev.target === ev.currentTarget) { ev.preventDefault(); open() }
    },
  }
}

// A row that opens something else must not also open on this click or Enter.
const keepToLink = (e: MouseEvent) => e.stopPropagation()
const keepEnterToLink = (e: KeyboardEvent) => { if (e.key === 'Enter') e.stopPropagation() }

interface StudentLinkProps {
  /** The student, or null/undefined when the account is gone. */
  student: StudentRef | null | undefined
  /** Shown instead of the name (for example "Open student"). */
  children?: ReactNode
  /** The list's name, for the student page's Back label ("Attendees"). */
  from?: string
  /** Shown when the student has no name, phone or email. */
  fallback?: string
  className?: string
  /** Muted "Deleted student" text; pass a class to match a row's size. */
  deletedClassName?: string
  /** Opens in a new tab, for places with work in progress (a draft message). */
  newTab?: boolean
}

export function StudentLink({ student, children, from, fallback, className, deletedClassName, newTab }: StudentLinkProps) {
  const page = useStudentPage(from)
  const id = studentIdOf(student)
  if (!id) return <span className={cn('text-muted-foreground', deletedClassName ?? className)}>{DELETED_STUDENT}</span>
  const label = children ?? studentNameOf(student, fallback)
  const title = typeof label === 'string' ? label : undefined
  if (!page.can) return <span className={className} title={title}>{label}</span>
  return (
    <Link
      to={`/users/${id}`}
      state={page.state}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noopener noreferrer' : undefined}
      onClick={keepToLink}
      onKeyDown={keepEnterToLink}
      title={title}
      className={cn('rounded-sm font-medium text-primary underline-offset-2 hover:underline', className)}
    >
      {label}
    </Link>
  )
}

// ── The student page's Back ────────────────────────────────────────────

/**
 * Where Back goes, kept per tab. `target` is the history entry to return to,
 * so a trip through this student's own Edit or Grant page (which opens the
 * student page again when it is done) does not make Back land on that page.
 */
interface Origin { idx: number; target: number; label?: string; href?: string; inPanel: boolean; awaySub?: boolean }
const originKey = (id: string) => `pgme.studentBack.${id}`
const historyIdx = (): number | null => {
  const i = (window.history.state as { idx?: unknown } | null)?.idx
  return typeof i === 'number' ? i : null
}
function readOrigin(id: string): Origin | null {
  try { const raw = window.sessionStorage.getItem(originKey(id)); return raw ? (JSON.parse(raw) as Origin) : null } catch { return null }
}
function writeOrigin(id: string, o: Origin) {
  try { window.sessionStorage.setItem(originKey(id), JSON.stringify(o)) } catch { /* private mode: Back falls back to one step */ }
}
const safeHref = (href: string | undefined) => (href && href.startsWith('/') && !href.startsWith('//') ? href : undefined)

/**
 * Back on the student page: browser history when the admin came from inside
 * the panel (filters, page and scroll come back), else the Users list.
 */
export function StudentPageBack({ userId }: { userId: string }) {
  const location = useLocation()
  const navigate = useNavigate()
  const from = (location.state as StudentBackState | null)?.studentBack
  const inPanel = location.key !== 'default'

  const plan = useMemo(() => {
    const idx = historyIdx()
    const saved = readOrigin(userId)
    // Back here from this student's own Edit or Grant page (two entries on)
    if (idx !== null && saved && !from && saved.awaySub && idx === saved.idx + 2) return { ...saved, idx, awaySub: false }
    // The same entry again (a tab change replaced it): keep its label
    const same = idx !== null && saved && saved.idx === idx && !from ? saved : null
    return {
      idx: idx ?? -1, target: idx !== null ? idx - 1 : -1, inPanel,
      label: from?.label ?? same?.label, href: safeHref(from?.href) ?? same?.href,
    } satisfies Origin
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, userId])

  useEffect(() => {
    writeOrigin(userId, plan)
    return () => {
      // Leaving: remember whether it was for this student's own sub-page
      const away = window.location.pathname.startsWith(`/users/${userId}/`)
      const now = readOrigin(userId)
      if (now) writeOrigin(userId, { ...now, awaySub: away })
    }
  }, [plan, userId])

  const viaHistory = plan.inPanel && (plan.idx < 0 || plan.target >= 0)
  const steps = plan.idx >= 0 ? plan.target - plan.idx : -1
  const label = plan.label ? `Back to ${plan.label}` : plan.inPanel ? 'Back' : 'Back to Users'
  return (
    <Link
      to={safeHref(plan.href) ?? '/users'}
      onClick={(e) => {
        if (!viaHistory || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        e.preventDefault()
        navigate(steps)
      }}
      className="-ml-2 inline-flex h-8 items-center gap-1.5 rounded-md px-2 pointer-coarse:h-10 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
      {label}
    </Link>
  )
}
