import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Download, BookOpen, CalendarDays, Package as PackageIcon, BookText,
  Check, ChevronsUpDown, Loader2, Eye, X, Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { exportsService, ExportPreviewData, PreviewColumn } from '@/services/exports.service'
import { subjectsService, Subject } from '@/services/subjects.service'
import { liveSessionsService, LiveSession } from '@/services/liveSessions.service'
import { packagesService, Package } from '@/services/packages.service'
import { seriesService, Series } from '@/services/series.service'
import { modulesService, Module as ModuleType } from '@/services/modules.service'
import { documentsService, Document as DocumentType } from '@/services/documents.service'
import { booksService, Book } from '@/services/books.service'
import { DataTable } from '@/components/common/DataTable/DataTable'
import type { ColumnDef } from '@/components/common/DataTable/types'

type PackagePickerType = 'package' | 'series' | 'module' | 'document'

type ViewData = {
  loading: boolean
  title: string
  label: string
  rows: Record<string, unknown>[]
  columns: PreviewColumn[]
  count: number
} | null

const handleError = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : fallback
  toast.error(message)
}

export function ExportsPage() {
  const [viewData, setViewData] = useState<ViewData>(null)

  const handleView = async (
    title: string,
    label: string,
    fetcher: () => Promise<ExportPreviewData>,
  ) => {
    setViewData({ loading: true, title, label, rows: [], columns: [], count: 0 })
    try {
      const data = await fetcher()
      setViewData({ loading: false, title, label, ...data })
    } catch (err) {
      setViewData(null)
      handleError(err, 'Failed to load preview')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exports"
        description="Generate XLSX spreadsheets of users filtered by subject, session, or content access."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Exports' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <SubjectExportCard onView={handleView} />
        <SessionExportCard onView={handleView} />
        <PackageExportCard onView={handleView} />
        <EbookExportCard onView={handleView} />
      </div>

      {viewData && (
        <ExportTableSection viewData={viewData} onClose={() => setViewData(null)} />
      )}
    </div>
  )
}

/* -------- Shared card wrapper -------- */

function ExportCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

/* -------- Action buttons (View + Download) -------- */

function ExportActions({
  onView,
  onDownload,
  viewing,
  downloading,
  disabled,
}: {
  onView: () => void
  onDownload: () => void
  viewing: boolean
  downloading: boolean
  disabled: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        onClick={onView}
        disabled={disabled || viewing}
      >
        {viewing ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</>
        ) : (
          <><Eye className="mr-2 h-4 w-4" />View</>
        )}
      </Button>
      <Button onClick={onDownload} disabled={disabled || downloading}>
        {downloading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
        ) : (
          <><Download className="mr-2 h-4 w-4" />Download XLSX</>
        )}
      </Button>
    </div>
  )
}

/* -------- Table preview section -------- */

function ExportTableSection({
  viewData,
  onClose,
}: {
  viewData: NonNullable<ViewData>
  onClose: () => void
}) {
  const columns: ColumnDef<Record<string, unknown>>[] = viewData.columns.map((col) => ({
    id: col.key,
    header: col.header,
    cell: (row) => {
      const val = row[col.key]
      return val !== undefined && val !== null && val !== '' ? String(val) : (
        <span className="text-muted-foreground">—</span>
      )
    },
  }))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold">
            {viewData.title}
            {viewData.label && (
              <span className="font-normal text-muted-foreground"> — {viewData.label}</span>
            )}
          </h2>
          {!viewData.loading && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {viewData.count} {viewData.count === 1 ? 'user' : 'users'}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="overflow-x-auto">
        <DataTable
          data={viewData.rows}
          columns={columns}
          isLoading={viewData.loading}
          skeletonCount={8}
          emptyState={{
            icon: Users,
            title: 'No users found',
            description: 'No users match this filter.',
          }}
        />
      </div>
    </div>
  )
}

/* -------- Subject export -------- */

function SubjectExportCard({
  onView,
}: {
  onView: (title: string, label: string, fetcher: () => Promise<ExportPreviewData>) => void
}) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [subjectId, setSubjectId] = useState<string>('')
  const [downloading, setDownloading] = useState(false)
  const [viewing, setViewing] = useState(false)

  useEffect(() => {
    setLoadingList(true)
    subjectsService
      .getSubjects({ limit: 1000, sort_by: 'name', sort_order: 'asc' })
      .then((res) => {
        if (res.success && res.data) setSubjects(res.data.entities || [])
      })
      .catch((err) => handleError(err, 'Failed to load subjects'))
      .finally(() => setLoadingList(false))
  }, [])

  const selectedSubject = subjects.find((s) => s._id === subjectId)

  const handleDownload = async () => {
    if (!subjectId) return
    try {
      setDownloading(true)
      await exportsService.usersBySubject(subjectId)
      toast.success('Export downloaded')
    } catch (err) {
      handleError(err, 'Failed to download export')
    } finally {
      setDownloading(false)
    }
  }

  const handleView = async () => {
    if (!subjectId) return
    setViewing(true)
    await onView(
      'Users by Primary Subject',
      selectedSubject?.name ?? '',
      () => exportsService.previewUsersBySubject(subjectId),
    )
    setViewing(false)
  }

  return (
    <ExportCard
      icon={BookOpen}
      title="Users by Primary Subject"
      description="All active users whose primary subject selection matches."
    >
      <div className="space-y-2">
        <Label>Subject</Label>
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger>
            <SelectValue placeholder={loadingList ? 'Loading...' : 'Select a subject'} />
          </SelectTrigger>
          <SelectContent>
            {subjects.length === 0 && !loadingList ? (
              <div className="px-2 py-4 text-sm text-muted-foreground">No subjects available</div>
            ) : (
              subjects.map((s) => (
                <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
      <ExportActions
        onView={handleView}
        onDownload={handleDownload}
        viewing={viewing}
        downloading={downloading}
        disabled={!subjectId}
      />
    </ExportCard>
  )
}

/* -------- Session export -------- */

function SessionExportCard({
  onView,
}: {
  onView: (title: string, label: string, fetcher: () => Promise<ExportPreviewData>) => void
}) {
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [downloading, setDownloading] = useState(false)
  const [viewing, setViewing] = useState(false)

  useEffect(() => {
    setLoadingList(true)
    liveSessionsService
      .getAll({ limit: 1000 })
      .then((res) => {
        if (res.success && res.data) setSessions(res.data.entities || [])
      })
      .catch((err) => handleError(err, 'Failed to load sessions'))
      .finally(() => setLoadingList(false))
  }, [])

  const selectedSession = sessions.find((s) => s._id === sessionId)

  const handleDownload = async () => {
    if (!sessionId) return
    try {
      setDownloading(true)
      await exportsService.usersBySession(sessionId)
      toast.success('Export downloaded')
    } catch (err) {
      handleError(err, 'Failed to download export')
    } finally {
      setDownloading(false)
    }
  }

  const handleView = async () => {
    if (!sessionId) return
    setViewing(true)
    await onView(
      'Users by Live Session',
      selectedSession?.title ?? '',
      () => exportsService.previewUsersBySession(sessionId),
    )
    setViewing(false)
  }

  return (
    <ExportCard
      icon={CalendarDays}
      title="Users by Live Session"
      description="All confirmed enrollees of a live session — paid, admin-granted, and free."
    >
      <div className="space-y-2">
        <Label>Live Session</Label>
        <Combobox
          options={sessions.map((s) => ({
            value: s._id,
            label: s.title,
            hint: s.scheduled_start_time
              ? new Date(s.scheduled_start_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : undefined,
          }))}
          value={sessionId}
          onChange={setSessionId}
          placeholder={loadingList ? 'Loading...' : 'Select a session'}
          searchPlaceholder="Search sessions..."
          emptyText="No sessions found"
        />
      </div>
      <ExportActions
        onView={handleView}
        onDownload={handleDownload}
        viewing={viewing}
        downloading={downloading}
        disabled={!sessionId}
      />
    </ExportCard>
  )
}

/* -------- Package export (with Package / Series / Module / Document sub-picker) -------- */

function PackageExportCard({
  onView,
}: {
  onView: (title: string, label: string, fetcher: () => Promise<ExportPreviewData>) => void
}) {
  const [pickerType, setPickerType] = useState<PackagePickerType>('package')
  const [entityId, setEntityId] = useState<string>('')
  const [downloading, setDownloading] = useState(false)
  const [viewing, setViewing] = useState(false)

  const [packages, setPackages] = useState<Package[]>([])
  const [series, setSeries] = useState<Series[]>([])
  const [modules, setModules] = useState<ModuleType[]>([])
  const [documents, setDocuments] = useState<DocumentType[]>([])
  const [loadingList, setLoadingList] = useState(false)

  useEffect(() => {
    setEntityId('')
    setLoadingList(true)
    const loader = (() => {
      if (pickerType === 'package') {
        return packagesService.getAll({ limit: 1000 }).then((res) => {
          if (res.success && res.data) setPackages(res.data.entities || [])
        })
      }
      if (pickerType === 'series') {
        return seriesService.getAll({ limit: 1000 }).then((res) => {
          if (res.success && res.data) setSeries(res.data.entities || [])
        })
      }
      if (pickerType === 'module') {
        return modulesService.getAll({ limit: 1000 }).then((res) => {
          if (res.success && res.data) setModules(res.data.entities || [])
        })
      }
      return documentsService.getAll({ limit: 1000 }).then((res) => {
        if (res.success && res.data) setDocuments(res.data.entities || [])
      })
    })()
    loader
      .catch((err) => handleError(err, 'Failed to load items'))
      .finally(() => setLoadingList(false))
  }, [pickerType])

  const options = (() => {
    if (pickerType === 'package') {
      return packages.map((p) => ({
        value: p._id,
        label: p.name,
        hint: typeof p.subject_id === 'object' && p.subject_id ? p.subject_id.name : undefined,
      }))
    }
    if (pickerType === 'series') {
      return series.map((s) => ({
        value: s._id,
        label: s.name,
        hint: typeof s.package_id === 'object' && s.package_id ? s.package_id.name : undefined,
      }))
    }
    if (pickerType === 'module') {
      return modules.map((m) => ({
        value: m._id,
        label: m.name,
        hint: typeof m.series_id === 'object' && m.series_id ? m.series_id.name : undefined,
      }))
    }
    return documents.map((d) => ({
      value: d._id,
      label: d.title,
      hint: typeof d.series_id === 'object' && d.series_id ? d.series_id.name : undefined,
    }))
  })()

  const selectedLabel = options.find((o) => o.value === entityId)?.label ?? ''

  const handleDownload = async () => {
    if (!entityId) return
    try {
      setDownloading(true)
      await exportsService.usersByPackage({
        ...(pickerType === 'package' && { package_id: entityId }),
        ...(pickerType === 'series' && { series_id: entityId }),
        ...(pickerType === 'module' && { module_id: entityId }),
        ...(pickerType === 'document' && { document_id: entityId }),
      })
      toast.success('Export downloaded')
    } catch (err) {
      handleError(err, 'Failed to download export')
    } finally {
      setDownloading(false)
    }
  }

  const handleView = async () => {
    if (!entityId) return
    setViewing(true)
    await onView(
      'Users by Package Access',
      selectedLabel,
      () => exportsService.previewUsersByPackage({
        ...(pickerType === 'package' && { package_id: entityId }),
        ...(pickerType === 'series' && { series_id: entityId }),
        ...(pickerType === 'module' && { module_id: entityId }),
        ...(pickerType === 'document' && { document_id: entityId }),
      }),
    )
    setViewing(false)
  }

  return (
    <ExportCard
      icon={PackageIcon}
      title="Users by Package Access"
      description="Active purchasers of a package. Pick any item inside the package to resolve up."
    >
      <div className="space-y-2">
        <Label>Select By</Label>
        <Select value={pickerType} onValueChange={(v) => setPickerType(v as PackagePickerType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="package">Package</SelectItem>
            <SelectItem value="series">Series</SelectItem>
            <SelectItem value="module">Module</SelectItem>
            <SelectItem value="document">Document</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="capitalize">{pickerType}</Label>
        <Combobox
          options={options}
          value={entityId}
          onChange={setEntityId}
          placeholder={loadingList ? 'Loading...' : `Select a ${pickerType}`}
          searchPlaceholder={`Search ${pickerType}s...`}
          emptyText={`No ${pickerType}s found`}
        />
      </div>
      <ExportActions
        onView={handleView}
        onDownload={handleDownload}
        viewing={viewing}
        downloading={downloading}
        disabled={!entityId}
      />
    </ExportCard>
  )
}

/* -------- eBook export -------- */

function EbookExportCard({
  onView,
}: {
  onView: (title: string, label: string, fetcher: () => Promise<ExportPreviewData>) => void
}) {
  const [books, setBooks] = useState<Book[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [bookId, setBookId] = useState<string>('')
  const [downloading, setDownloading] = useState(false)
  const [viewing, setViewing] = useState(false)

  useEffect(() => {
    setLoadingList(true)
    booksService
      .getAll({ limit: 1000 })
      .then((res) => {
        if (res.success && res.data) {
          setBooks((res.data.entities || []).filter((b) => b.ebook))
        }
      })
      .catch((err) => handleError(err, 'Failed to load eBooks'))
      .finally(() => setLoadingList(false))
  }, [])

  const selectedBook = books.find((b) => b._id === bookId)

  const handleDownload = async () => {
    if (!bookId) return
    try {
      setDownloading(true)
      await exportsService.usersByEbook(bookId)
      toast.success('Export downloaded')
    } catch (err) {
      handleError(err, 'Failed to download export')
    } finally {
      setDownloading(false)
    }
  }

  const handleView = async () => {
    if (!bookId) return
    setViewing(true)
    await onView(
      'Users by eBook Access',
      selectedBook?.title ?? '',
      () => exportsService.previewUsersByEbook(bookId),
    )
    setViewing(false)
  }

  return (
    <ExportCard
      icon={BookText}
      title="Users by eBook Access"
      description="Active purchasers of an eBook (paid or admin-granted)."
    >
      <div className="space-y-2">
        <Label>eBook</Label>
        <Combobox
          options={books.map((b) => ({ value: b._id, label: b.title, hint: b.author }))}
          value={bookId}
          onChange={setBookId}
          placeholder={loadingList ? 'Loading...' : 'Select an eBook'}
          searchPlaceholder="Search eBooks..."
          emptyText="No eBooks found"
        />
      </div>
      <ExportActions
        onView={handleView}
        onDownload={handleDownload}
        viewing={viewing}
        downloading={downloading}
        disabled={!bookId}
      />
    </ExportCard>
  )
}

/* -------- Generic searchable combobox -------- */

type ComboboxOption = { value: string; label: string; hint?: string }

function Combobox({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
}: {
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  searchPlaceholder: string
  emptyText: string
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={`${opt.label} ${opt.hint || ''}`}
                  onSelect={() => { onChange(opt.value); setOpen(false) }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === opt.value ? 'opacity-100' : 'opacity-0')} />
                  <div className="flex flex-col">
                    <span>{opt.label}</span>
                    {opt.hint && <span className="text-xs text-muted-foreground">{opt.hint}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
