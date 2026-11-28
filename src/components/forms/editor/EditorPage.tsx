import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, apiErrorInfo, apiErrorMessage } from '@/components/common/detail'
import { Skeleton } from '@/components/ui/skeleton'
import { useUnsavedChanges } from '@/components/layouts/workspaceStore'
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { ApiResponse } from '@/services/api.service'

/** Moves to the first field with an error, in the order the page shows them. */
export function focusFirstInvalid(root: ParentNode | null = document, frames = 12) {
  requestAnimationFrame(() => {
    const el = root?.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (!el) {
      // The errors render just after the failed submit
      if (frames > 0) focusFirstInvalid(root, frames - 1)
      return
    }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    el.focus({ preventScroll: true })
  })
}

/**
 * Unsaved-changes guard for a routed editor. `leave` goes to another page
 * without asking, for after a save.
 */
export function useEditorExit(dirty: boolean) {
  const navigate = useNavigate()
  const [target, setTarget] = useState<string | null>(null)
  useUnsavedChanges(dirty && target === null)
  useEffect(() => { if (target !== null) navigate(target, { replace: true }) }, [target, navigate])
  return useCallback((to: string) => setTarget(to), [])
}

// ── Someone else saved first ─────────────────────────────────────────────
type StaleAnswer = 'ok' | 'overwrite' | 'reload' | 'keep'

/**
 * Before saving an edit, checks whether the record changed since it was
 * opened. `fingerprint` covers only the fields this editor writes, so counters
 * that move on their own do not raise a false alarm.
 */
export function useStaleCheck<T>(fingerprint: (record: T) => string) {
  const [pending, setPending] = useState<{ latest: T; resolve: (a: StaleAnswer) => void } | null>(null)
  const check = useCallback(async (opened: T | null, load: () => Promise<ApiResponse<T>>): Promise<{ answer: StaleAnswer; latest?: T }> => {
    if (!opened) return { answer: 'ok' }
    let latest: T | undefined
    try { latest = (await load()).data } catch { return { answer: 'ok' } }
    if (!latest || fingerprint(latest) === fingerprint(opened)) return { answer: 'ok', latest }
    const answer = await new Promise<StaleAnswer>((resolve) => setPending({ latest: latest as T, resolve }))
    setPending(null)
    return { answer, latest }
  }, [fingerprint])

  const dock = (
    <AlertDialog open={!!pending} onOpenChange={(open) => { if (!open) pending?.resolve('keep') }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>This was changed while you were editing</AlertDialogTitle>
          <AlertDialogDescription>
            Another admin saved a newer version after you opened this page. Saving now replaces their changes with yours.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => pending?.resolve('keep')}>Keep editing</Button>
          <Button variant="outline" onClick={() => pending?.resolve('reload')}>Load their version</Button>
          <Button variant="destructive" onClick={() => pending?.resolve('overwrite')}>Save mine anyway</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
  return { check, dock }
}

// ── Page ─────────────────────────────────────────────────────────────────
interface EditorPageProps {
  title: string
  description?: string
  breadcrumbs: { label: string; href?: string }[]
  cancelHref: string
  saveLabel: string
  savingLabel: string
  saving: boolean
  dirty: boolean
  /** Number of problems after a failed save. */
  problems?: number
  /** The whole form failed to save (server or network). */
  failure?: string | null
  onSubmit: (e: FormEvent) => void
  /** Extra buttons on the left of the action bar. */
  extra?: ReactNode
  /** A second column, for a live preview. */
  aside?: ReactNode
  disabled?: boolean
  /** The admin may open the record but not change it. */
  readOnly?: boolean
  children: ReactNode
}

export function EditorPage({ title, description, breadcrumbs, cancelHref, saveLabel, savingLabel, saving, dirty, problems = 0, failure, onSubmit, extra, aside, disabled, readOnly, children }: EditorPageProps) {
  const formRef = useRef<HTMLFormElement>(null)
  // A double click lands before the button is disabled: one submit at a time
  const savingRef = useRef(saving)
  savingRef.current = saving
  const lastSubmit = useRef(0)
  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        const now = Date.now()
        if (savingRef.current || readOnly || now - lastSubmit.current < 400) { e.preventDefault(); return }
        lastSubmit.current = now
        onSubmit(e)
      }}
      className="-mb-4 space-y-6 sm:-mb-6"
      aria-busy={saving}
    >
      <PageHeader title={title} description={description} breadcrumbs={breadcrumbs} />
      {aside ? (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <fieldset disabled={readOnly} className="min-w-0 space-y-6">{children}</fieldset>
          <div className="min-w-0 xl:sticky xl:top-0 xl:max-h-[calc(100dvh-9.5rem)] xl:overflow-y-auto xl:pr-1">{aside}</div>
        </div>
      ) : (
        <fieldset disabled={readOnly} className="min-w-0 max-w-[1120px] space-y-6">{children}</fieldset>
      )}
      <div className="sticky -bottom-4 z-20 -mx-4 border-t border-border bg-background/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:-bottom-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-[13px] max-sm:empty:hidden" aria-live="polite">
            {failure ? (
              <p className="flex items-start gap-2 text-danger"><AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0 break-words">{failure}</span></p>
            ) : problems > 0 ? (
              <button type="button" className="flex items-center gap-2 text-left text-danger underline-offset-2 hover:underline" onClick={() => focusFirstInvalid(formRef.current)}>
                <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
                {problems === 1 ? '1 field needs attention' : `${problems} fields need attention`}
              </button>
            ) : readOnly ? (
              <p className="text-muted-foreground">View only. You do not have permission to change this.</p>
            ) : dirty ? (
              <p className="text-muted-foreground">Unsaved changes</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 max-sm:[&>*]:min-w-[7rem] max-sm:[&>*]:flex-1 sm:justify-end">
            {extra}
            {saving
              ? <Button type="button" variant="outline" className="bg-card" disabled>Cancel</Button>
              : <Button asChild variant="outline" className="bg-card"><Link to={cancelHref}>{readOnly ? 'Back' : 'Cancel'}</Link></Button>}
            {!readOnly && (
              <Button type="submit" disabled={saving || disabled}>
                {saving ? <><Loader2 aria-hidden="true" className="animate-spin" />{savingLabel}</> : saveLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}

interface EditorSectionProps {
  title: string
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  /** Title above the fields instead of beside them (wide content, or beside a preview). */
  stacked?: boolean
  id?: string
}

/** A titled group of fields: the title sits beside the fields when there is room. */
export function EditorSection({ title, description, action, children, stacked, id }: EditorSectionProps) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={cn('rounded-xl border border-border bg-card p-5 shadow-card', !stacked && 'lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8')}>
      <div className={cn('mb-4 flex flex-wrap items-start justify-between gap-3', !stacked && 'lg:mb-0 lg:block')}>
        <div className="min-w-0">
          <h2 id={id ? `${id}-title` : undefined} className="text-[15px] font-semibold leading-snug">{title}</h2>
          {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
        </div>
        {action && <div className={cn(!stacked && 'lg:mt-3')}>{action}</div>}
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  )
}

// ── Page states ──────────────────────────────────────────────────────────
export function EditorSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-6">
      <div className="space-y-3"><Skeleton className="h-4 w-56" /><Skeleton className="h-8 w-72 max-w-full" /></div>
      {[3, 2, 2].map((n, i) => (
        <div key={i} className="max-w-[1120px] rounded-xl border border-border bg-card p-5 shadow-card lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
          <Skeleton className="mb-4 h-5 w-28" />
          <div className="space-y-4">{Array.from({ length: n }, (_, j) => <Skeleton key={j} className="h-9 w-full" />)}</div>
        </div>
      ))}
    </div>
  )
}

interface LoadStateProps { status: number | null; message: string; noun: string; back: { label: string; href: string }; onRetry: () => void }

/** A record that could not be opened: gone, not allowed, or a failed request. */
export function RecordError({ status, message, noun, back, onRetry }: LoadStateProps) {
  if (status === 404 || status === 400) return <ErrorState title={`This ${noun} was not found`} message="It may have been deleted, or the link is wrong." back={back} />
  if (status === 403) return <ErrorState title="You do not have access to this page" message="Ask a super admin for the permission you need." back={back} />
  return <ErrorState title={`This ${noun} could not be loaded`} message={message} onRetry={onRetry} back={back} />
}

/** An API error in words an admin can act on. */
export function plainError(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (apiErrorInfo(e).status === 429) return 'Too many requests in a short time. Wait a minute, then try again.'
  const message = apiErrorMessage(e, fallback)
  return message === 'An error occurred' ? fallback : message
}

interface RecordState<T> { record: T | null; loading: boolean; error: { status: number | null; message: string } | null; reload: () => void; setRecord: (r: T | null) => void }

/** Loads one record by id. Late answers are dropped; a failed refresh keeps the old data. */
export function useRecord<T>(id: string | undefined, load: (id: string) => Promise<ApiResponse<T>>): RecordState<T> {
  const [record, setRecord] = useState<T | null>(null)
  const [loading, setLoading] = useState(!!id)
  const [error, setError] = useState<RecordState<T>['error']>(null)
  const [tick, setTick] = useState(0)
  const loadRef = useRef(load)
  loadRef.current = load
  const loadedId = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    let alive = true
    setLoading(true)
    setError(null)
    if (loadedId.current !== id) setRecord(null)
    loadRef.current(id)
      .then((res) => {
        if (!alive) return
        if (res.success && res.data) { loadedId.current = id; setRecord(res.data) }
        else setError({ status: 404, message: res.message || 'Not found' })
      })
      .catch((e) => { if (alive) setError({ status: apiErrorInfo(e).status ?? null, message: plainError(e) }) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { record, loading, error, reload, setRecord }
}
