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
import { cn } from '@/lib/utils'
import {
  Download, BookOpen, CalendarDays, Package as PackageIcon, BookText, Check, ChevronsUpDown, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { exportsService } from '@/services/exports.service'
import { subjectsService, Subject } from '@/services/subjects.service'
import { liveSessionsService, LiveSession } from '@/services/liveSessions.service'
import { packagesService, Package } from '@/services/packages.service'
import { seriesService, Series } from '@/services/series.service'
import { modulesService, Module as ModuleType } from '@/services/modules.service'
import { documentsService, Document as DocumentType } from '@/services/documents.service'
import { booksService, Book } from '@/services/books.service'

type PackagePickerType = 'package' | 'series' | 'module' | 'document'

const handleError = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : fallback
  toast.error(message)
}

export function ExportsPage() {
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
        <SubjectExportCard />
        <SessionExportCard />
        <PackageExportCard />
        <EbookExportCard />
      </div>
    </div>
  )
}

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

function DownloadButton({
  onClick,
  loading,
  disabled,
}: {
  onClick: () => void
  loading: boolean
  disabled: boolean
}) {
  return (
    <Button onClick={onClick} disabled={disabled || loading} className="w-full sm:w-auto">
      {loading ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
      ) : (
        <><Download className="mr-2 h-4 w-4" />Download XLSX</>
      )}
    </Button>
  )
}

/* -------- Subject export -------- */

function SubjectExportCard() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [subjectId, setSubjectId] = useState<string>('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    setLoadingList(true)
    subjectsService
      .getSubjects({ limit: 200, sort_by: 'name', sort_order: 'asc' })
      .then((res) => {
        if (res.success && res.data) setSubjects(res.data.entities || [])
      })
      .catch((err) => handleError(err, 'Failed to load subjects'))
      .finally(() => setLoadingList(false))
  }, [])

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
      <DownloadButton onClick={handleDownload} loading={downloading} disabled={!subjectId} />
    </ExportCard>
  )
}

/* -------- Session export -------- */

function SessionExportCard() {
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    setLoadingList(true)
    liveSessionsService
      .getAll({ limit: 200 })
      .then((res) => {
        if (res.success && res.data) setSessions(res.data.entities || [])
      })
      .catch((err) => handleError(err, 'Failed to load sessions'))
      .finally(() => setLoadingList(false))
  }, [])

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
      <DownloadButton onClick={handleDownload} loading={downloading} disabled={!sessionId} />
    </ExportCard>
  )
}

/* -------- Package export (with Package / Series / Module / Document sub-picker) -------- */

function PackageExportCard() {
  const [pickerType, setPickerType] = useState<PackagePickerType>('package')
  const [entityId, setEntityId] = useState<string>('')
  const [downloading, setDownloading] = useState(false)

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
        return packagesService.getAll({ limit: 200 }).then((res) => {
          if (res.success && res.data) setPackages(res.data.entities || [])
        })
      }
      if (pickerType === 'series') {
        return seriesService.getAll({ limit: 200 }).then((res) => {
          if (res.success && res.data) setSeries(res.data.entities || [])
        })
      }
      if (pickerType === 'module') {
        return modulesService.getAll({ limit: 200 }).then((res) => {
          if (res.success && res.data) setModules(res.data.entities || [])
        })
      }
      return documentsService.getAll({ limit: 200 }).then((res) => {
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
      <DownloadButton onClick={handleDownload} loading={downloading} disabled={!entityId} />
    </ExportCard>
  )
}

/* -------- eBook export -------- */

function EbookExportCard() {
  const [books, setBooks] = useState<Book[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [bookId, setBookId] = useState<string>('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    setLoadingList(true)
    booksService
      .getAll({ limit: 200 })
      .then((res) => {
        if (res.success && res.data) {
          setBooks((res.data.entities || []).filter((b) => b.ebook))
        }
      })
      .catch((err) => handleError(err, 'Failed to load eBooks'))
      .finally(() => setLoadingList(false))
  }, [])

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
      <DownloadButton onClick={handleDownload} loading={downloading} disabled={!bookId} />
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
