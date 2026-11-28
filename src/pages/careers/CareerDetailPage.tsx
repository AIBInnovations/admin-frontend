import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Check, ExternalLink, Eye, Loader2, Mail, MessageCircle, Phone, RotateCcw, RotateCw, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DetailHeader, DetailSkeleton, ErrorState, Section, Timeline, apiErrorInfo, apiErrorMessage, type TimelineEntry } from '@/components/common/detail'
import { StudentLink } from '@/components/students/StudentLink'
import { useUnsavedChanges } from '@/components/layouts/workspaceStore'
import { useAuth } from '@/contexts/AuthContext'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { relativeTime } from '@/lib/relativeTime'
import { cn } from '@/lib/utils'
import { careersService, type CareerApplicationDetail, type CareerStatus } from '@/services/careers.service'
import { CareerStatusPill, CopyAction } from '@/components/careers/controls'
import { STATUS, historyTitle, istStamp, telHref, webLink, whatsappNumber } from '@/components/careers/lib'

const NOTE_MAX = 2000
/** The buttons, in the order a decision is usually made. */
const NEXT: CareerStatus[] = ['reviewed', 'accepted', 'rejected', 'pending']
const ICON: Record<CareerStatus, typeof Check> = { reviewed: Eye, accepted: Check, rejected: X, pending: RotateCcw }

interface Back { label: string; href: string }

/** Back to the list the admin came from, filters included; else Careers. */
function useBack(): Back {
  const state = useLocation().state as { back?: Back } | null
  const b = state?.back
  return b && typeof b.label === 'string' && typeof b.href === 'string' && b.href.startsWith('/') && !b.href.startsWith('//') ? b : { label: 'Careers', href: '/careers' }
}

/** One application. A failed refresh keeps what is on screen; a late answer never replaces a newer one. */
function useApplication(id: string) {
  const [state, setState] = useState<{ id: string; data: CareerApplicationDetail | null }>({ id, data: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ message: string; status?: number } | null>(null)
  const { nextFetchId, isStale } = useLatestFetch()

  const load = useCallback(async () => {
    const req = nextFetchId()
    setLoading(true)
    try {
      const res = await careersService.detail(id)
      if (isStale(req)) return
      setState({ id, data: res.data?.application ?? null })
      setError(null)
    } catch (e) {
      if (!isStale(req)) setError({ message: apiErrorMessage(e, 'This application could not be loaded.'), status: apiErrorInfo(e).status })
    } finally {
      if (!isStale(req)) setLoading(false)
    }
  }, [id, nextFetchId, isStale])

  useEffect(() => { load() }, [load])
  return {
    data: state.id === id ? state.data : null,
    loading,
    error,
    reload: load,
    setData: (data: CareerApplicationDetail) => setState({ id, data }),
  }
}

/** One career application, with the team's decision and notes. */
export function CareerDetailPage() {
  const { applicationId = '' } = useParams()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canUpdate = hasPermission('careers.update')
  const canDelete = hasPermission('careers.delete')
  const back = useBack()
  const { data: a, loading, error, reload, setData } = useApplication(applicationId)
  const [gone, setGone] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { setGone(false); setConfirmDelete(false) }, [applicationId])

  /** Someone deleted it while it was open. */
  const lost = (e: unknown) => {
    if (apiErrorInfo(e).status !== 404) return false
    setGone(true)
    return true
  }

  if (gone) return <ErrorState title="This application was deleted" message="Someone deleted it while you had it open." back={back} />
  if (!a) {
    if (loading) return <DetailSkeleton />
    const missing = error?.status === 404 || error?.status === 400
    return (
      <ErrorState
        title={missing ? 'This application was not found' : undefined}
        message={missing ? 'It may have been deleted, or the link is wrong.' : error?.message}
        onRetry={missing ? undefined : reload}
        back={back}
      />
    )
  }

  const remove = async () => {
    if (deleting) return
    setDeleting(true)
    try {
      await careersService.remove(a._id)
      toast.success('Application deleted')
      navigate(back.href, { replace: true })
    } catch (e) {
      setDeleting(false)
      if (lost(e)) return
      toast.error(apiErrorMessage(e, 'The application could not be deleted. Please try again.'))
    }
  }

  return (
    <div className="space-y-6">
      <DetailHeader
        back={back}
        title={a.name}
        status={<CareerStatusPill status={a.status} />}
        subtitle={<span className="[overflow-wrap:anywhere]">{a.wished_role}{a.subject ? ` · ${a.subject}` : ''} · applied {relativeTime(a.createdAt)}</span>}
        actions={canDelete ? (
          <Button type="button" variant="outline" className="h-10 bg-card text-danger hover:text-danger sm:h-9" onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden="true" />Delete
          </Button>
        ) : undefined}
      />

      {error && (
        <p role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-danger-soft px-4 py-2.5 text-sm text-danger">
          {error.message} Showing what was loaded before.
          <Button size="sm" variant="outline" className="h-10 sm:h-8" onClick={reload}><RotateCw aria-hidden="true" />Try again</Button>
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <Section title="Applicant">
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <Fact label="Email">
                <p className="[overflow-wrap:anywhere]">{a.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm" className="h-10 bg-card px-3 text-[13px] sm:h-8">
                    <a href={`mailto:${a.email}`}><Mail aria-hidden="true" />Email</a>
                  </Button>
                  <CopyAction value={a.email} label="Copy" />
                </div>
              </Fact>
              <Fact label="Phone (WhatsApp)">
                <p className="tabular-nums [overflow-wrap:anywhere]">{a.phone_number}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm" className="h-10 bg-card px-3 text-[13px] sm:h-8">
                    <a href={telHref(a.phone_number)}><Phone aria-hidden="true" />Call</a>
                  </Button>
                  {whatsappNumber(a.phone_number) && (
                    <Button asChild variant="outline" size="sm" className="h-10 bg-card px-3 text-[13px] sm:h-8">
                      <a href={`https://wa.me/${whatsappNumber(a.phone_number)}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp (opens in a new tab)">
                        <MessageCircle aria-hidden="true" />WhatsApp
                      </a>
                    </Button>
                  )}
                  <CopyAction value={a.phone_number} label="Copy" />
                </div>
              </Fact>
              <Fact label="Role">{a.wished_role}{a.wished_role === 'Examiner' && <span className="ml-1 font-normal text-muted-foreground">(old role name)</span>}</Fact>
              <Fact label="Subject">{a.subject || <Muted>Not given</Muted>}</Fact>
              <Fact label="Submitted">{istStamp(a.createdAt)}</Fact>
              <Fact label="Student account">
                {a.student ? (
                  <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                    <StudentLink student={a.student} from="Career application" className="[overflow-wrap:anywhere]" />
                    {a.student.student_id && <span className="font-mono text-[13px] text-muted-foreground">{a.student.student_id}</span>}
                  </span>
                ) : a.student_deleted ? <Muted>Deleted student</Muted> : <Muted>Applied without an account</Muted>}
              </Fact>
            </dl>
          </Section>

          <Section title="Message">
            {a.message
              ? <p className="whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]">{a.message}</p>
              : <p className="text-sm text-muted-foreground">No message.</p>}
          </Section>

          <Section title="Links">
            {a.portfolio_link || a.representative_work ? (
              <ul className="space-y-2">
                {a.portfolio_link && <li><LinkRow label="Portfolio" value={a.portfolio_link} /></li>}
                {a.representative_work && <li><LinkRow label="Representative work" value={a.representative_work} /></li>}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No links given.</p>}
          </Section>
        </div>

        <div className="min-w-0 space-y-6">
          {canUpdate && <StatusPanel key={`${a._id}:${a.status}`} a={a} onDone={setData} onLost={lost} onStale={reload} />}
          <NotePanel key={a._id} a={a} canEdit={canUpdate} onDone={setData} onLost={lost} />
          <Section title="History"><Timeline entries={timeline(a)} /></Section>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={(o) => { if (!deleting) setConfirmDelete(o) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this application?</AlertDialogTitle>
            <AlertDialogDescription>
              The application from <span className="font-medium text-foreground [overflow-wrap:anywhere]">{a.name}</span> is removed for good and cannot be brought back. Use this for spam, or when the person asks for their data to be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="h-10 sm:h-9">Cancel</AlertDialogCancel>
            <Button type="button" variant="destructive" className="h-10 sm:h-9" disabled={deleting} onClick={remove}>
              {deleting && <Loader2 aria-hidden="true" className="animate-spin" />}
              {deleting ? 'Deleting…' : 'Delete application'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

const Muted = ({ children }: { children: ReactNode }) => <span className="font-normal text-muted-foreground">{children}</span>

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 min-w-0 text-sm font-medium">{children}</dd>
    </div>
  )
}

/** A web link opens in a new tab and shows its domain; anything else is only text. */
function LinkRow({ label, value }: { label: string; value: string }) {
  const link = webLink(value)
  if (!link) {
    return (
      <div className="rounded-lg border border-border px-3.5 py-2.5">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        <p className="text-sm [overflow-wrap:anywhere]">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Not a web address, so it is not opened from here.</p>
      </div>
    )
  }
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-12 items-center gap-3 rounded-lg border border-border px-3.5 py-2.5 transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] text-muted-foreground">{label}</span>
        <span className="block truncate text-sm font-medium text-primary">{link.domain}</span>
        <span className="block truncate text-xs text-muted-foreground" title={link.href}>{link.href}</span>
      </span>
      <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  )
}

function timeline(a: CareerApplicationDetail): TimelineEntry[] {
  const changes = a.status_history.map((h, i): TimelineEntry => {
    const tone = STATUS[h.status]?.tone
    return {
      id: `change-${i}`,
      title: historyTitle(h.status),
      meta: `${istStamp(h.at)}${h.by ? ` by ${h.by.name || 'a removed admin'}` : ''}`,
      body: h.note || undefined,
      tone: tone === 'success' || tone === 'danger' ? tone : undefined,
    }
  })
  return [
    ...changes.reverse(),
    { id: 'received', title: 'Application received', meta: `${istStamp(a.createdAt)}, ${a.user ? 'from a signed-in student' : 'from the guest form'}` },
  ]
}

interface PanelProps {
  a: CareerApplicationDetail
  onDone: (a: CareerApplicationDetail) => void
  onLost: (e: unknown) => boolean
}

function StatusPanel({ a, onDone, onLost, onStale }: PanelProps & { onStale: () => void }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState<CareerStatus | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  useUnsavedChanges(note.trim().length > 0 && !saving)

  const change = async (to: CareerStatus) => {
    if (saving) return
    setSaving(to)
    setProblem(null)
    try {
      const res = await careersService.update(a._id, { status: to, note: note.trim() || undefined, expected_status: a.status })
      if (res.data?.application) onDone(res.data.application)
      toast.success(STATUS[to].done)
    } catch (e) {
      setSaving(null)
      if (onLost(e)) return
      if (apiErrorInfo(e).code === 'APPLICATION_CHANGED') {
        toast.error(apiErrorMessage(e))
        onStale()
        return
      }
      setProblem(apiErrorMessage(e, 'The status could not be changed. Please try again.'))
    }
  }

  return (
    <Section title="Decision" description="The note is optional. It is kept in the history with your name.">
      <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <CareerStatusPill status={a.status} />
        {a.reviewed_by && a.reviewed_at && <span className="text-muted-foreground">by {a.reviewed_by.name || 'a removed admin'}, {relativeTime(a.reviewed_at)}</span>}
      </p>
      <label htmlFor="status-note" className="text-sm font-medium">Note (optional)</label>
      <Textarea
        id="status-note"
        rows={2}
        maxLength={NOTE_MAX}
        value={note}
        disabled={!!saving}
        placeholder="For example: called on 27 Nov, strong teaching sample"
        onChange={(e) => setNote(e.target.value)}
        className="mt-1.5 bg-card"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {NEXT.filter((s) => s !== a.status).map((s) => {
          const Icon = ICON[s]
          return (
            <Button
              key={s}
              type="button"
              variant={s === 'accepted' ? 'default' : 'outline'}
              className={cn('h-10 sm:h-9', s !== 'accepted' && 'bg-card', s === 'rejected' && 'text-danger hover:text-danger')}
              disabled={!!saving}
              onClick={() => change(s)}
            >
              {saving === s ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Icon aria-hidden="true" />}
              {saving === s ? STATUS[s].doing : STATUS[s].action}
            </Button>
          )
        })}
      </div>
      {problem && <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{problem}</p>}
    </Section>
  )
}

function NotePanel({ a, canEdit, onDone, onLost }: PanelProps & { canEdit: boolean }) {
  const saved = a.admin_note || ''
  const [draft, setDraft] = useState(saved)
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const dirty = draft.trim() !== saved.trim()
  useUnsavedChanges(canEdit && dirty && !saving)
  // A newer copy from the server (another change on this page) replaces a clean draft
  useEffect(() => { if (!dirty) setDraft(saved) }, [saved]) // eslint-disable-line react-hooks/exhaustive-deps

  const editedBy = a.admin_note_updated_at
    ? `Last saved ${relativeTime(a.admin_note_updated_at)}${a.admin_note_updated_by ? ` by ${a.admin_note_updated_by.name || 'a removed admin'}` : ''}`
    : null

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!dirty || saving) return
    setSaving(true)
    setProblem(null)
    try {
      const res = await careersService.update(a._id, { admin_note: draft.trim() })
      if (res.data?.application) {
        onDone(res.data.application)
        setDraft(res.data.application.admin_note || '')
      }
      toast.success(draft.trim() ? 'Internal note saved' : 'Internal note cleared')
    } catch (err) {
      if (onLost(err)) return
      setProblem(apiErrorMessage(err, 'The note could not be saved. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  if (!canEdit) {
    return (
      <Section title="Internal note" description="Only the team sees this.">
        {saved ? <p className="whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">{saved}</p> : <p className="text-sm text-muted-foreground">No internal note.</p>}
        {editedBy && <p className="mt-2 text-xs text-muted-foreground">{editedBy}</p>}
      </Section>
    )
  }

  return (
    <Section title="Internal note" description="Only the team sees this. The applicant never does.">
      <form onSubmit={save}>
        <label htmlFor="admin-note" className="sr-only">Internal note</label>
        <Textarea
          id="admin-note"
          rows={4}
          maxLength={NOTE_MAX}
          value={draft}
          disabled={saving}
          placeholder="Calls, interviews, who is following up"
          onChange={(e) => setDraft(e.target.value)}
          className="bg-card"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {editedBy || 'No note yet.'}
            {draft.length > NOTE_MAX - 200 && <span className="ml-1 tabular-nums">{draft.length} / {NOTE_MAX}</span>}
          </p>
          <div className="flex gap-2">
            {dirty && !saving && <Button type="button" variant="ghost" className="h-10 sm:h-8" onClick={() => setDraft(saved)}>Undo</Button>}
            <Button type="submit" variant="outline" className="h-10 bg-card sm:h-8" disabled={!dirty || saving}>
              {saving && <Loader2 aria-hidden="true" className="animate-spin" />}
              {saving ? 'Saving…' : 'Save note'}
            </Button>
          </div>
        </div>
        {problem && <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{problem}</p>}
      </form>
    </Section>
  )
}
