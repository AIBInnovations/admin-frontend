import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { BookOpen, BookText, CalendarDays, Download, Eye, FileText, Loader2, Package as PackageIcon, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, Section } from '@/components/common/detail'
import { DataTable } from '@/components/common/DataTable/DataTable'
import type { ColumnDef } from '@/components/common/DataTable/types'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field, SearchSelect, type SelectOption } from '@/components/users/kit'
import { dayIST, errText, plural, unwrap, useResource } from '@/components/users/lib'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { StudentLink, useStudentPage } from '@/components/students/StudentLink'
import { exportsService, type ExportPreviewData } from '@/services/exports.service'
import { subjectsService } from '@/services/subjects.service'
import { liveSessionsService } from '@/services/liveSessions.service'
import { packagesService } from '@/services/packages.service'
import { seriesService } from '@/services/series.service'
import { modulesService } from '@/services/modules.service'
import { documentsService } from '@/services/documents.service'
import { booksService } from '@/services/books.service'
import { formsService } from '@/services/forms.service'

type PackagePickerType = 'package' | 'series' | 'module' | 'document'
/** What one row of an export is. */
type RowNoun = 'user' | 'submission'

interface View { title: string; label: string; noun: RowNoun; load: () => Promise<ExportPreviewData> }
type OnView = (view: View) => Promise<void>

const refName = (v: unknown) => (v && typeof v === 'object' && 'name' in v ? String((v as { name: unknown }).name) : undefined)

export function ExportsPage() {
  const [view, setView] = useState<View | null>(null)
  const [data, setData] = useState<ExportPreviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const { nextFetchId, isStale } = useLatestFetch()

  const open: OnView = async (next) => {
    const id = nextFetchId()
    setView(next)
    setData(null)
    setError(null)
    setLoading(true)
    requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
    try {
      const result = await next.load()
      if (!isStale(id)) setData(result)
    } catch (err) {
      if (!isStale(id)) setError(errText(err, 'Failed to load preview'))
    } finally {
      if (!isStale(id)) setLoading(false)
    }
  }
  const close = () => { nextFetchId(); setView(null); setData(null); setError(null); setLoading(false) }

  return (
    <div className="relative space-y-6">
      <PageHeader
        title="Exports"
        description="Generate XLSX spreadsheets of users filtered by subject, session, or content access."
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Exports' }]}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <SubjectExportCard onView={open} />
        <SessionExportCard onView={open} />
        <PackageExportCard onView={open} />
        <EbookExportCard onView={open} />
        <FormExportCard onView={open} />
      </div>
      {view && (
        <div ref={sectionRef} className="scroll-mt-4">
          <ExportTableSection key={`${view.title}:${view.label}`} view={view} data={data} loading={loading} error={error} onClose={close} onRetry={() => open(view)} />
        </div>
      )}
    </div>
  )
}

/* -------- Shared card -------- */

interface CardProps {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
  noun: RowNoun
  /** The chosen item, when one is chosen. */
  label: string | null
  load: () => Promise<ExportPreviewData>
  download: () => Promise<{ filename: string }>
  onView: OnView
  children: ReactNode
}

/** One export: choose, look at it, download it. */
function ExportCard({ icon: Icon, title, description, noun, label, load, download, onView, children }: CardProps) {
  const [busy, setBusy] = useState<'view' | 'download' | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { setError(null) }, [label])

  const view = async () => {
    if (label === null || busy) return
    setBusy('view')
    setError(null)
    await onView({ title, label, noun, load })
    setBusy(null)
  }
  const save = async () => {
    if (label === null || busy) return
    setBusy('download')
    setError(null)
    try {
      const { filename } = await download()
      toast.success(`Export downloaded: ${filename}`)
    } catch (err) {
      setError(errText(err, 'Failed to download export'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Section title={<span className="flex items-center gap-2"><Icon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />{title}</span>} description={description} className="h-full">
      <div className="space-y-4">
        {children}
        {error && <p role="alert" className="rounded-lg bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="bg-card" onClick={view} disabled={label === null || !!busy}>
            {busy === 'view' ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Eye aria-hidden="true" />}
            {busy === 'view' ? 'Loading…' : 'View'}
          </Button>
          <Button type="button" onClick={save} disabled={label === null || !!busy}>
            {busy === 'download' ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Download aria-hidden="true" />}
            {busy === 'download' ? 'Generating…' : 'Download XLSX'}
          </Button>
        </div>
      </div>
    </Section>
  )
}

/* -------- Preview table -------- */

const CHUNK = 100

function ExportTableSection({ view, data, loading, error, onClose, onRetry }: { view: View; data: ExportPreviewData | null; loading: boolean; error: string | null; onClose: () => void; onRetry: () => void }) {
  const [shown, setShown] = useState(CHUNK)
  const rows = data?.rows ?? []
  const student = useStudentPage(view.title)
  // Each name opens the student; a row of a users export opens the student too
  const idOf = (row: Record<string, unknown>) => (typeof row.user_id === 'string' ? row.user_id : null)
  const nameKey = view.noun === 'user' ? 'name' : 'submitter_name'
  const columns: ColumnDef<Record<string, unknown>>[] = (data?.columns ?? []).map((col) => ({
    id: col.key,
    header: col.header,
    cell: (row) => {
      const value = row[col.key]
      if (col.key === nameKey && idOf(row)) {
        return <span className="block max-w-[320px] break-words text-sm"><StudentLink student={{ _id: idOf(row), name: value ? String(value) : null, email: row.email ? String(row.email) : row.submitter_email ? String(row.submitter_email) : null }} from={view.title} className={view.noun === 'user' ? 'text-foreground hover:text-primary' : undefined} /></span>
      }
      return value !== undefined && value !== null && value !== '' ? <span className="block max-w-[320px] break-words text-sm">{String(value)}</span> : <span className="text-muted-foreground">—</span>
    },
  }))
  return (
    <section aria-label={`${view.title}: ${view.label}`} className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0" aria-live="polite">
          <h2 className="break-words text-[15px] font-semibold">{view.title}<span className="font-normal text-muted-foreground">: {view.label}</span></h2>
          {data && <p className="text-[13px] text-muted-foreground">{plural(data.count, view.noun)}</p>}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 shrink-0" aria-label="Close preview"><X className="h-4 w-4" /></Button>
      </div>
      {error ? <ErrorState title="The preview could not be loaded" message={error} onRetry={onRetry} /> : (
        <>
          <div className="overflow-x-auto">
            <DataTable
              data={rows.slice(0, shown)}
              columns={columns.length ? columns : [{ id: 'loading', header: 'Loading', cell: () => null }]}
              isLoading={loading}
              skeletonCount={6}
              onRowClick={view.noun === 'user' && student.can && rows.some(idOf) ? (row) => student.open(idOf(row)) : undefined}
              emptyState={{ icon: Users, title: view.noun === 'user' ? 'No users found' : 'No submissions found', description: view.noun === 'user' ? 'No users match this filter. The XLSX would be empty.' : 'Nobody has submitted this form yet.' }}
            />
          </div>
          {rows.length > shown && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Showing {shown.toLocaleString('en-IN')} of {plural(rows.length, view.noun)}. The XLSX has all of them.</span>
              <Button size="sm" variant="outline" className="bg-card" onClick={() => setShown((n) => n + CHUNK)}>Show {Math.min(CHUNK, rows.length - shown)} more</Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

/* -------- Subject export -------- */

function SubjectExportCard({ onView }: { onView: OnView }) {
  const [id, setId] = useState('')
  const list = useResource<SelectOption[]>(async () => unwrap(await subjectsService.getSubjects({ limit: 1000, sort_by: 'name', sort_order: 'asc' })).entities.map((s) => ({ value: s._id, label: s.name })), [])
  return (
    <ExportCard
      icon={BookOpen} title="Users by Primary Subject" description="All active users whose primary subject selection matches." noun="user"
      label={list.data?.find((s) => s.value === id)?.label ?? null} onView={onView}
      load={() => exportsService.previewUsersBySubject(id)} download={() => exportsService.usersBySubject(id)}
    >
      <Field id="export-subject" label="Subject">
        <SearchSelect value={id} onChange={setId} options={list.data || []} loading={list.loading} error={list.error} onRetry={() => list.reload()} placeholder="Select a subject" searchPlaceholder="Search subjects..." emptyText="No subjects available" />
      </Field>
    </ExportCard>
  )
}

/* -------- Session export -------- */

function SessionExportCard({ onView }: { onView: OnView }) {
  const [id, setId] = useState('')
  const list = useResource<SelectOption[]>(async () => unwrap(await liveSessionsService.getAll({ limit: 1000 })).entities.map((s) => ({ value: s._id, label: s.title, hint: s.scheduled_start_time ? dayIST(s.scheduled_start_time) : undefined })), [])
  return (
    <ExportCard
      icon={CalendarDays} title="Users by Live Session" description="All confirmed enrollees of a live session: paid, admin-granted, and free." noun="user"
      label={list.data?.find((s) => s.value === id)?.label ?? null} onView={onView}
      load={() => exportsService.previewUsersBySession(id)} download={() => exportsService.usersBySession(id)}
    >
      <Field id="export-session" label="Live Session">
        <SearchSelect value={id} onChange={setId} options={list.data || []} loading={list.loading} error={list.error} onRetry={() => list.reload()} placeholder="Select a session" searchPlaceholder="Search sessions..." emptyText="No sessions found" />
      </Field>
    </ExportCard>
  )
}

/* -------- Package export (with Package / Series / Module / Document sub-picker) -------- */

const PICKER_LABEL: Record<PackagePickerType, string> = { package: 'Package', series: 'Series', module: 'Module', document: 'Document' }
const PICKER_PLURAL: Record<PackagePickerType, string> = { package: 'packages', series: 'series', module: 'modules', document: 'documents' }

async function loadPicker(type: PackagePickerType): Promise<SelectOption[]> {
  switch (type) {
    case 'package': return unwrap(await packagesService.getAll({ limit: 1000 })).entities.map((p) => ({ value: p._id, label: p.name, hint: refName(p.subject_id) }))
    case 'series': return unwrap(await seriesService.getAll({ limit: 1000 })).entities.map((s) => ({ value: s._id, label: s.name, hint: refName(s.package_id) }))
    case 'module': return unwrap(await modulesService.getAll({ limit: 1000 })).entities.map((m) => ({ value: m._id, label: m.name, hint: refName(m.series_id) }))
    case 'document': return unwrap(await documentsService.getAll({ limit: 1000 })).entities.map((d) => ({ value: d._id, label: d.title, hint: refName(d.series_id) }))
  }
}

function PackageExportCard({ onView }: { onView: OnView }) {
  const [type, setType] = useState<PackagePickerType>('package')
  const [id, setId] = useState('')
  const list = useResource<{ type: PackagePickerType; options: SelectOption[] }>(async () => ({ type, options: await loadPicker(type) }), [type])
  const options = list.data?.type === type ? list.data.options : []
  const params = { [`${type}_id`]: id } as { package_id?: string; series_id?: string; module_id?: string; document_id?: string }
  return (
    <ExportCard
      icon={PackageIcon} title="Users by Package Access" description="Active purchasers of a package. Pick any item inside the package to resolve up." noun="user"
      label={options.find((o) => o.value === id)?.label ?? null} onView={onView}
      load={() => exportsService.previewUsersByPackage(params)} download={() => exportsService.usersByPackage(params)}
    >
      <div className="grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
        <Field id="export-by" label="Select By"><PickerTypeSelect value={type} onChange={(t) => { setType(t); setId('') }} /></Field>
        <Field id="export-item" label={PICKER_LABEL[type]}>
          <SearchSelect value={id} onChange={setId} options={options} loading={list.loading} error={list.error} onRetry={() => list.reload()} placeholder={`Select a ${type}`} searchPlaceholder={`Search ${PICKER_PLURAL[type]}...`} emptyText={`No ${PICKER_PLURAL[type]} found`} />
        </Field>
      </div>
    </ExportCard>
  )
}

function PickerTypeSelect({ value, onChange, ...aria }: { value: PackagePickerType; onChange: (v: PackagePickerType) => void; id?: string }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PackagePickerType)}>
      <SelectTrigger {...aria}><SelectValue /></SelectTrigger>
      <SelectContent>{(Object.keys(PICKER_LABEL) as PackagePickerType[]).map((k) => <SelectItem key={k} value={k}>{PICKER_LABEL[k]}</SelectItem>)}</SelectContent>
    </Select>
  )
}

/* -------- eBook export -------- */

function EbookExportCard({ onView }: { onView: OnView }) {
  const [id, setId] = useState('')
  const list = useResource<SelectOption[]>(async () => unwrap(await booksService.getAll({ limit: 1000 })).entities.filter((b) => b.ebook).map((b) => ({ value: b._id, label: b.title, hint: b.author || undefined })), [])
  return (
    <ExportCard
      icon={BookText} title="Users by eBook Access" description="Active purchasers of an eBook (paid or admin-granted)." noun="user"
      label={list.data?.find((b) => b.value === id)?.label ?? null} onView={onView}
      load={() => exportsService.previewUsersByEbook(id)} download={() => exportsService.usersByEbook(id)}
    >
      <Field id="export-ebook" label="eBook">
        <SearchSelect value={id} onChange={setId} options={list.data || []} loading={list.loading} error={list.error} onRetry={() => list.reload()} placeholder="Select an eBook" searchPlaceholder="Search eBooks..." emptyText="No eBooks found" />
      </Field>
    </ExportCard>
  )
}

/* -------- Form submissions export -------- */

function FormExportCard({ onView }: { onView: OnView }) {
  const [id, setId] = useState('')
  const list = useResource<SelectOption[]>(async () => unwrap(await formsService.getAll({ limit: 1000 })).entities.map((f) => ({ value: f._id, label: f.title, hint: refName(f.subject_id) })), [])
  return (
    <ExportCard
      icon={FileText} title="Form Submissions" description="All submissions for a form, one column per field, with payment status." noun="submission"
      label={list.data?.find((f) => f.value === id)?.label ?? null} onView={onView}
      load={() => exportsService.previewFormSubmissions(id)} download={() => exportsService.formSubmissions(id)}
    >
      <Field id="export-form" label="Form">
        <SearchSelect value={id} onChange={setId} options={list.data || []} loading={list.loading} error={list.error} onRetry={() => list.reload()} placeholder="Select a form" searchPlaceholder="Search forms..." emptyText="No forms found" />
      </Field>
    </ExportCard>
  )
}
