import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  BarChart3, BookOpen, Calendar, CalendarClock, ChevronRight, Clock, Download, Eye, FileText, Film, Hash, IndianRupee, Layers, Loader2, Package, Pencil, Plus, Tag,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { DetailSkeleton, ErrorState, Section, StatusPill } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DocumentFormModal } from '@/components/documents/DocumentFormModal'
import { ModuleFormModal } from '@/components/modules/ModuleFormModal'
import { PackageSalesSection } from '@/components/packages/PackageSalesSection'
import { summaryText, type ContentSummary } from '@/components/packages/BundlePicker'
import { SeriesFormModal } from '@/components/series/SeriesFormModal'
import { StaleNotice } from '@/components/users/kit'
import { dayIST, dayTimeIST, errText, plural, unwrap, useResource, useUrlState } from '@/components/users/lib'
import { UpcomingVideoModal } from '@/components/videos/UpcomingVideoModal'
import { VideoFormModal } from '@/components/videos/VideoFormModal'
import { useAuth } from '@/contexts/AuthContext'
import { formatDuration as formatPlan, formatINR } from '@/lib/format'
import { documentsService, type DocumentFormData } from '@/services/documents.service'
import { modulesService, type Module, type ModuleFormData } from '@/services/modules.service'
import { packagesService, type PackageDetail, type PackageDetailModule, type PackageDetailSeries, type PackageDetailVideo } from '@/services/packages.service'
import { seriesService, type Series, type SeriesFormData } from '@/services/series.service'
import { videosService, type ReleaseMode, type UpcomingVideoFormData, type Video, type VideoFormData } from '@/services/videos.service'
import { ProductCode } from '@/components/common/ProductCode'

/** Fields newer backends add: what a combo really contains. */
type DetailWithBundle = PackageDetail & {
  /** Parts of the course tree this admin's role may not read (left out by the API). */
  withheld?: ('series' | 'modules' | 'videos' | 'documents')[]
  is_combo?: boolean
  content_summary?: ContentSummary
  bundle?: {
    missing_count?: number
    packages?: (ContentSummary & { _id: string; name: string; is_active?: boolean; publish_status?: string; subject?: { name?: string | null } | null })[]
  } | null
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0m'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  const remainMins = mins % 60
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`
}

function formatFileSize(mb: number | null | undefined): string {
  if (!mb) return 'Unknown'
  if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`
  return `${mb.toFixed(1)} MB`
}

const refName = (v: unknown, deleted: string) => (v && typeof v === 'object' && 'name' in v ? String((v as { name: unknown }).name) : deleted)

export function PackageDetailPage() {
  const { packageId = '' } = useParams<{ packageId: string }>()
  const { hasPermission } = useAuth()
  const canUpdate = hasPermission('packages.update')
  const canAddSeries = hasPermission('series.create')
  const canAddModule = hasPermission('modules.create')
  const canAddVideo = hasPermission('videos.create')
  const canEditVideo = hasPermission('videos.update')
  const canEditSeries = hasPermission('series.update')
  const canEditModule = hasPermission('modules.update')
  const canAddDocument = hasPermission('documents.create')

  const { data, loading, error, status, reload } = useResource<DetailWithBundle>(async () => unwrap(await packagesService.getDetail(packageId), 'Package not found') as DetailWithBundle, [packageId])
  const pkg = data
  const refresh = () => { void reload({ silent: true }) }
  const { state, set } = useUrlState({ tab: 'videos' })

  // Forms opened from the content tree
  const [seriesModalOpen, setSeriesModalOpen] = useState(false)
  const [moduleModalOpen, setModuleModalOpen] = useState(false)
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [videoModalMode, setVideoModalMode] = useState<'create' | 'edit'>('create')
  const [editingVideo, setEditingVideo] = useState<PackageDetailVideo | null>(null)
  const [upcomingVideoModalOpen, setUpcomingVideoModalOpen] = useState(false)
  const [documentModalOpen, setDocumentModalOpen] = useState(false)
  const [targetSeriesId, setTargetSeriesId] = useState('')
  const [targetModuleId, setTargetModuleId] = useState('')
  // Edit a series or module right here (Aviraj, 28 Nov 2026: no more going to
  // the Series or Modules tab and searching for it). The full record is loaded
  // first, so the form starts from everything saved.
  const [editingSeries, setEditingSeries] = useState<Series | null>(null)
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)

  // Open rows, separate for the video and the document tree
  const [openSeries, setOpenSeries] = useState<Set<string>>(new Set())
  const [openModules, setOpenModules] = useState<Set<string>>(new Set())
  const [openDocSeries, setOpenDocSeries] = useState<Set<string>>(new Set())
  const flip = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (id: string) => setter((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  const toggleSeries = flip(setOpenSeries)
  const toggleModule = flip(setOpenModules)
  const toggleDocSeries = flip(setOpenDocSeries)

  useEffect(() => { setOpenSeries(new Set()); setOpenModules(new Set()); setOpenDocSeries(new Set()) }, [packageId])

  const isTheory = refName(pkg?.package_type_id, '').toLowerCase() === 'theory'
  const bundled = pkg?.bundle?.packages ?? (pkg?.bundled_package_ids || []).filter((b) => b && typeof b === 'object').map((b) => ({ _id: b._id, name: b.name }) as NonNullable<NonNullable<DetailWithBundle['bundle']>['packages']>[number])
  const missing = pkg?.bundle?.missing_count ?? 0

  const stats = useMemo(() => {
    // Counts come with each level, so they stay right when a role cannot
    // read the items themselves (see `withheld`)
    const own = { series: pkg?.series?.length || pkg?.series_count || 0, modules: 0, videos: 0, seconds: 0, documents: 0 }
    for (const s of pkg?.series ?? []) {
      own.modules += s.modules?.length || s.module_count || 0
      own.documents += s.documents?.length || s.document_count || 0
      for (const m of s.modules || []) {
        own.videos += m.videos?.length || m.video_count || 0
        for (const v of m.videos || []) own.seconds += v.duration_seconds || 0
      }
    }
    const sum = pkg?.content_summary
    // Series withheld: a plain package's summary is its own content
    if (sum && pkg?.withheld?.includes('series') && !pkg?.is_combo) {
      Object.assign(own, { series: sum.series_count, modules: sum.module_count, videos: sum.video_count, documents: sum.document_count, seconds: sum.duration_seconds })
    }
    return {
      own,
      series: sum?.series_count ?? own.series, modules: sum?.module_count ?? own.modules, videos: sum?.video_count ?? own.videos,
      documents: sum?.document_count ?? own.documents, seconds: sum?.duration_seconds ?? own.seconds,
    }
  }, [pkg])

  // ── Saving from the content tree ──

  const run = async (work: () => Promise<string | null>, fallback: string) => {
    try {
      const done = await work()
      if (done) toast.success(done)
      refresh()
    } catch (err) {
      toast.error(errText(err, fallback))
      throw err
    }
  }

  const handleSeriesSubmit = (formData: SeriesFormData) => run(async () => { unwrap(await seriesService.create(formData), 'Failed to create series'); return 'Series created successfully' }, 'Failed to create series')
  const handleModuleSubmit = (formData: ModuleFormData) => run(async () => { unwrap(await modulesService.create(formData), 'Failed to create module'); return 'Module created successfully' }, 'Failed to create module')
  const handleUpcomingVideoSubmit = (formData: UpcomingVideoFormData) => run(async () => {
    const res = await videosService.createUpcoming(formData)
    if (!res.success) throw new Error(res.message || 'Failed to add upcoming video')
    return 'Upcoming video added successfully'
  }, 'Failed to add upcoming video')

  const handleVideoSubmit = (
    formData: VideoFormData,
    file?: File,
    onProgress?: (percent: number) => void,
    onPhaseChange?: (phase: 'uploading' | 'completing' | 'confirming') => void,
    releaseMode?: ReleaseMode,
  ) => run(async () => {
    let videoId: string | undefined
    let message: string | null = null
    if (videoModalMode === 'create') {
      if (!file) return null
      const response = await videosService.upload(formData, file, onProgress, onPhaseChange)
      if (!response.success) throw new Error(response.message || 'Failed to upload video')
      videoId = response.data?.video_id
      message = 'Video uploaded successfully'
    } else if (editingVideo) {
      // For an upcoming video with a newly attached file, the file goes through
      // the dedicated endpoint first; it owns the scheduled_release_at change.
      if (file && editingVideo.processing_status === 'upcoming') {
        const uploadResponse = await videosService.uploadFileForExisting(editingVideo._id, file, {
          onProgress, onPhaseChange, release_mode: releaseMode, scheduled_release_at: formData.scheduled_release_at ?? undefined,
        })
        if (!uploadResponse.success) throw new Error(uploadResponse.message || 'Failed to upload video file')
        message = releaseMode === 'scheduled' ? 'Video file uploaded. It will release on the scheduled date.' : 'Video file uploaded. Processing will begin shortly.'
      }
      // After a file upload the endpoint already wrote scheduled_release_at,
      // so leave it out of the details update.
      const { scheduled_release_at: _release, ...rest } = formData
      const response = await videosService.update(editingVideo._id, (file ? rest : formData) as Partial<VideoFormData>)
      if (!response.success) throw new Error(response.message || 'Failed to update video')
      videoId = editingVideo._id
      message = message ?? 'Video updated successfully'
    }
    if (videoId && formData.tag_ids && formData.tag_ids.length > 0) await videosService.assignTags(videoId, formData.tag_ids).catch(() => {})
    return message
  }, 'Failed to save video')

  const handleDocumentSubmit = (formData: DocumentFormData, file?: File, onProgress?: (percent: number) => void, linkedBookId?: string) => run(async () => {
    if (linkedBookId) {
      const response = await documentsService.createLinked({
        source_book_id: linkedBookId, series_id: formData.series_id, subject_id: formData.subject_id, is_free: formData.is_free, publish_status: formData.publish_status,
      })
      if (!response.success) throw new Error(response.message || 'Failed to link eBook as document')
      return 'eBook linked as document successfully'
    }
    if (!file) throw new Error('A document file is required to create a standalone document.')
    const response = await documentsService.upload(formData, file, onProgress)
    if (!response.success) throw new Error(response.message || 'Failed to upload document')
    return 'Document uploaded successfully'
  }, 'Failed to upload document')

  const openAddVideo = (moduleId: string) => { setTargetModuleId(moduleId); setEditingVideo(null); setVideoModalMode('create'); setVideoModalOpen(true) }
  const openEditVideo = (video: PackageDetailVideo) => { setEditingVideo(video); setTargetModuleId(video.module_id); setVideoModalMode('edit'); setVideoModalOpen(true) }

  const openEdit = async <T,>(id: string, load: () => Promise<{ success: boolean; data?: T; message?: string }>, open: (record: T) => void, what: string) => {
    if (openingId) return
    setOpeningId(id)
    try {
      const res = await load()
      if (!res.success || !res.data) throw new Error(res.message || `This ${what} could not be loaded`)
      open(res.data)
    } catch (err) {
      toast.error(errText(err, `This ${what} could not be loaded`))
    } finally {
      setOpeningId(null)
    }
  }
  const openEditSeries = (id: string) => openEdit<Series>(id, () => seriesService.getById(id), setEditingSeries, 'series')
  const openEditModule = (id: string) => openEdit<Module>(id, () => modulesService.getById(id), setEditingModule, 'module')
  const handleSeriesUpdate = (formData: SeriesFormData) => run(async () => {
    if (!editingSeries) return null
    unwrap(await seriesService.update(editingSeries._id, formData), 'Failed to update series')
    return 'Series updated'
  }, 'Failed to update series')
  const handleModuleUpdate = (formData: ModuleFormData) => run(async () => {
    if (!editingModule) return null
    unwrap(await modulesService.update(editingModule._id, formData), 'Failed to update module')
    return 'Module updated'
  }, 'Failed to update module')

  if (loading && !pkg) return <DetailSkeleton />
  if (!pkg) {
    const gone = status === 404 || status === 400
    return (
      <ErrorState
        title={gone ? 'Package not found' : status === 403 ? 'You do not have access to this package' : 'This package could not be loaded'}
        message={gone ? 'It may have been deleted, or the link is wrong.' : error ?? undefined}
        onRetry={gone || status === 403 ? undefined : () => reload()}
        back={{ label: 'Back to Packages', href: '/content/packages' }}
      />
    )
  }

  const tiers = [...(pkg.tiers || [])].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
  const pct = pkg.is_on_sale && pkg.sale_discount_percent ? pkg.sale_discount_percent : 0
  const isCombo = bundled.length > 0 || missing > 0
  const series = pkg.series || []

  const bundleList = isCombo && (
    <div className="overflow-hidden rounded-lg border border-border">
      <ul className="divide-y divide-border">
        {bundled.map((b) => (
          <li key={b._id}>
            <Link to={`/content/packages/${b._id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50">
              <Package aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-medium">{b.name}</span>
                <span className="block text-xs text-muted-foreground">{[b.subject?.name, summaryText(b)].filter(Boolean).join(' · ')}</span>
              </span>
              {b.publish_status === 'draft' && <StatusPill tone="warning">Draft</StatusPill>}
              {b.is_active === false && <StatusPill tone="neutral">Inactive</StatusPill>}
              <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
        {missing > 0 && <li className="px-4 py-3 text-sm text-danger">{plural(missing, 'deleted package')} still listed in this combo. Edit the package to remove {missing === 1 ? 'it' : 'them'}.</li>}
      </ul>
    </div>
  )

  return (
    <div className="relative space-y-6">
      <PageHeader
        title={pkg.name}
        description={pkg.description || undefined}
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Packages', href: '/content/packages' }, { label: pkg.name }]}
        action={canUpdate ? <Button asChild variant="outline" size="sm" className="bg-card"><Link to={`/content/packages/${pkg._id}/edit`}><Pencil aria-hidden="true" />Edit Package</Link></Button> : undefined}
      />

      {error && <StaleNotice message={error} onRetry={refresh} />}

      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Package Details">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {pkg.thumbnail_url
                ? <img src={pkg.thumbnail_url} alt="" className="h-14 w-24 shrink-0 rounded-lg border border-border object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                : <div aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-accent text-lg font-bold text-accent-foreground">{pkg.name.charAt(0).toUpperCase()}</div>}
              <div className="min-w-0">
                <p className="break-words text-lg font-medium">{pkg.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusPill tone={pkg.is_active ? 'success' : 'danger'}>{pkg.is_active ? 'Active' : 'Inactive'}</StatusPill>
                  {pkg.publish_status === 'draft' && <StatusPill tone="warning">Draft</StatusPill>}
                  {pkg.is_on_sale && <StatusPill tone="warning">On Sale{pkg.sale_end_date ? ` until ${dayIST(pkg.sale_end_date)}` : ''}</StatusPill>}
                </div>
              </div>
            </div>

            {pkg.description && <p className="break-words text-sm text-muted-foreground">{pkg.description}</p>}

            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <Fact icon={Hash} label="Product ID"><ProductCode code={pkg.product_code} /></Fact>
              <Fact icon={BookOpen} label="Subject">{refName(pkg.subject_id, 'Deleted subject')}</Fact>
              <Fact icon={Tag} label="Package Type">{refName(pkg.package_type_id, 'Deleted type')}</Fact>
              {isCombo && (
                <Fact icon={Layers} label="Bundles (Combo)" wide>
                  <span className="flex flex-wrap gap-1.5">
                    {bundled.map((b) => <Link key={b._id} to={`/content/packages/${b._id}`} className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground hover:underline">{b.name}</Link>)}
                    {missing > 0 && <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-medium text-danger">{plural(missing, 'deleted package')}</span>}
                  </span>
                </Fact>
              )}
              <Fact icon={IndianRupee} label="Price">
                {tiers.length > 0 ? <>From {formatINR(Math.min(...tiers.map((t) => t.price)))} <span className="font-normal text-muted-foreground">({plural(tiers.length, 'tier')})</span></>
                  : pkg.is_on_sale && pkg.sale_price != null ? <><span className="text-success">{formatINR(pkg.sale_price)}</span> <s className="text-xs font-normal text-muted-foreground">{formatINR(pkg.price)}</s></>
                    : formatINR(pkg.price)}
              </Fact>
              <Fact icon={Clock} label="Duration">
                {tiers.length > 0 ? [...new Set(tiers.map((t) => t.duration_days))].sort((a, b) => a - b).map(formatPlan).join(', ') : formatPlan(pkg.duration_days)}
              </Fact>
              <Fact icon={Hash} label="Display Order">{pkg.display_order}</Fact>
              <Fact icon={Calendar} label="Created">{dayIST(pkg.createdAt)}</Fact>
            </dl>
          </div>
        </Section>

        <Section title="Quick Stats" description={isCombo ? 'Combined, with everything in the bundled packages.' : undefined}>
          <dl className={isCombo ? 'grid grid-cols-2 gap-4 sm:grid-cols-3' : 'grid grid-cols-2 gap-4'}>
            {isCombo && <QuickStat label="Packages" value={bundled.length.toLocaleString('en-IN')} />}
            <QuickStat label="Series" value={stats.series.toLocaleString('en-IN')} />
            <QuickStat label="Modules" value={stats.modules.toLocaleString('en-IN')} />
            <QuickStat label="Videos" value={stats.videos.toLocaleString('en-IN')} />
            {(isTheory || isCombo) && <QuickStat label="Documents" value={stats.documents.toLocaleString('en-IN')} />}
            {!isTheory && <QuickStat label="Total Duration" value={formatDuration(stats.seconds)} />}
          </dl>
        </Section>
      </div>

      {tiers.length > 0 && (
        <Section flush title={<span className="flex flex-wrap items-center gap-2"><BarChart3 aria-hidden="true" className="h-4 w-4 text-muted-foreground" />Pricing Tiers{pct > 0 && <StatusPill tone="success">{pct}% Sale Discount</StatusPill>}</span>}>
          <div className="border-t border-border">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col" className="w-14 pl-5">#</TableHead>
                  <TableHead scope="col">Tier Name</TableHead>
                  <TableHead scope="col">Duration</TableHead>
                  <TableHead scope="col">Price</TableHead>
                  {pct > 0 && <TableHead scope="col">Sale Price</TableHead>}
                  <TableHead scope="col" className="pr-5">Zoho item</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map((tier, i) => (
                  <TableRow key={tier._id ?? i} className="hover:bg-transparent">
                    <TableCell className="py-3 pl-5 text-xs tabular-nums text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="break-words text-sm font-medium">{tier.name}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatPlan(tier.duration_days)} <span className="text-xs text-muted-foreground">({plural(tier.duration_days, 'day')})</span></TableCell>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums">
                      {pct > 0 ? <s className="text-muted-foreground">{formatINR(tier.price)}</s> : <span className="font-semibold">{formatINR(tier.price)}</span>}
                      {pct === 0 && tier.original_price && tier.original_price > tier.price ? <s className="ml-1.5 text-xs text-muted-foreground">{formatINR(tier.original_price)}</s> : null}
                    </TableCell>
                    {pct > 0 && <TableCell className="whitespace-nowrap text-sm font-semibold tabular-nums text-success">{formatINR(Math.round(tier.price * (1 - pct / 100)))}</TableCell>}
                    <TableCell className="pr-5 text-xs">{(tier as { zoho_item_id?: string | null }).zoho_item_id ? <span className="font-medium text-success">Linked</span> : <span className="text-warning" title="Created automatically on the next save of this package, or at the first checkout">Not created yet</span>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>
      )}

      <Section
        title={<span className="flex items-center gap-2"><Layers aria-hidden="true" className="h-4 w-4 text-muted-foreground" />Content Structure<span className="rounded-full bg-muted px-2 py-px text-xs font-semibold tabular-nums text-muted-foreground">{stats.own.series} series</span></span>}
        action={canAddSeries ? <Button variant="outline" size="sm" className="bg-card" onClick={() => setSeriesModalOpen(true)}><Plus aria-hidden="true" />Add Series</Button> : undefined}
      >
        {!!pkg.withheld?.length && (
          <p className="mb-4 text-sm text-muted-foreground" role="note">Some content is hidden because your role cannot view: {pkg.withheld.join(', ')}.</p>
        )}
        {isCombo && (
          <div className="mb-5 space-y-2">
            <p className="text-sm text-muted-foreground">This combo opens the content of these packages{series.length > 0 ? ', and its own series below' : '. It has no series of its own'}.</p>
            {bundleList}
          </div>
        )}
        {!(isCombo && series.length === 0) && (
          <Tabs value={state.tab === 'documents' ? 'documents' : 'videos'} onValueChange={(v) => set({ tab: v })}>
            <TabsList>
              <TabsTrigger value="videos" className="gap-1.5"><Film aria-hidden="true" className="h-3.5 w-3.5" />Videos<span className="rounded-full bg-muted-foreground/10 px-1.5 text-xs tabular-nums">{stats.own.videos}</span></TabsTrigger>
              <TabsTrigger value="documents" className="gap-1.5"><FileText aria-hidden="true" className="h-3.5 w-3.5" />Documents<span className="rounded-full bg-muted-foreground/10 px-1.5 text-xs tabular-nums">{stats.own.documents}</span></TabsTrigger>
            </TabsList>
            <TabsContent value="videos" className="mt-4">
              {series.length === 0 ? <NoSeries icon={Package} hidden={pkg.withheld?.includes('series') && !!pkg.series_count} /> : (
                <div className="space-y-3">
                  {series.map((s) => (
                    <SeriesBlock
                      key={s._id} series={s} isOpen={openSeries.has(s._id)} onToggle={() => toggleSeries(s._id)} openModules={openModules} onToggleModule={toggleModule}
                      onAddModule={canAddModule ? () => { setTargetSeriesId(s._id); setModuleModalOpen(true) } : undefined}
                      onAddVideo={canAddVideo ? openAddVideo : undefined}
                      onAddUpcoming={canAddVideo ? (moduleId) => { setTargetModuleId(moduleId); setUpcomingVideoModalOpen(true) } : undefined}
                      onEditVideo={canEditVideo ? openEditVideo : undefined}
                      onEdit={canEditSeries ? () => openEditSeries(s._id) : undefined}
                      onEditModule={canEditModule ? openEditModule : undefined}
                      openingId={openingId}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="documents" className="mt-4">
              {series.length === 0 ? <NoSeries icon={FileText} hidden={pkg.withheld?.includes('series') && !!pkg.series_count} /> : (
                <div className="space-y-3">
                  {series.map((s) => (
                    <DocSeriesBlock key={s._id} series={s} isOpen={openDocSeries.has(s._id)} onToggle={() => toggleDocSeries(s._id)} onAddDocument={canAddDocument ? () => { setTargetSeriesId(s._id); setDocumentModalOpen(true) } : undefined} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </Section>

      <PackageSalesSection packageId={pkg._id} tiers={tiers} isCombo={isCombo} />

      <SeriesFormModal open={seriesModalOpen} onClose={() => setSeriesModalOpen(false)} onSubmit={handleSeriesSubmit} mode="create" defaultPackageId={pkg._id} />
      <ModuleFormModal open={moduleModalOpen} onClose={() => setModuleModalOpen(false)} onSubmit={handleModuleSubmit} mode="create" defaultSeriesId={targetSeriesId} />
      <SeriesFormModal open={!!editingSeries} onClose={() => setEditingSeries(null)} onSubmit={handleSeriesUpdate} mode="edit" series={editingSeries} />
      <ModuleFormModal open={!!editingModule} onClose={() => setEditingModule(null)} onSubmit={handleModuleUpdate} mode="edit" module={editingModule} />
      <VideoFormModal
        open={videoModalOpen} onClose={() => { setVideoModalOpen(false); setEditingVideo(null) }} onSubmit={handleVideoSubmit}
        mode={videoModalMode} video={editingVideo as unknown as Video | null} defaultModuleId={targetModuleId}
      />
      <UpcomingVideoModal open={upcomingVideoModalOpen} onClose={() => setUpcomingVideoModalOpen(false)} onSubmit={handleUpcomingVideoSubmit} defaultModuleId={targetModuleId} />
      <DocumentFormModal open={documentModalOpen} onClose={() => setDocumentModalOpen(false)} onSubmit={handleDocumentSubmit} mode="create" defaultSeriesId={targetSeriesId} />
    </div>
  )
}

function Fact({ icon: Icon, label, wide, children }: { icon: typeof Package; label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? 'min-w-0 sm:col-span-2' : 'min-w-0'}>
      <dt className="flex items-center gap-1 text-xs text-muted-foreground"><Icon aria-hidden="true" className="h-3.5 w-3.5" />{label}</dt>
      <dd className="mt-0.5 break-words font-medium">{children}</dd>
    </div>
  )
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse rounded-lg border border-border p-4 text-center">
      <dt className="mt-1 text-xs text-muted-foreground">{label}</dt>
      <dd className="font-display text-2xl font-semibold tabular-nums tracking-[-0.02em]">{value}</dd>
    </div>
  )
}

function NoSeries({ icon: Icon, hidden }: { icon: typeof Package; hidden?: boolean }) {
  return <div className="py-9 text-center text-sm text-muted-foreground"><Icon aria-hidden="true" className="mx-auto mb-2 h-7 w-7 opacity-40" />{hidden ? 'Your role cannot view the series in this package' : 'No series in this package yet'}</div>
}

// --- Series Block (Video Hierarchy) ---

interface SeriesBlockProps {
  series: PackageDetailSeries
  isOpen: boolean
  onToggle: () => void
  openModules: Set<string>
  onToggleModule: (id: string) => void
  onAddModule?: () => void
  onAddVideo?: (moduleId: string) => void
  onAddUpcoming?: (moduleId: string) => void
  onEditVideo?: (video: PackageDetailVideo) => void
  /** Opens this series' edit form. */
  onEdit?: () => void
  onEditModule?: (moduleId: string) => void
  /** The series or module whose edit form is loading. */
  openingId?: string | null
}

const Chip = ({ children }: { children: React.ReactNode }) => <span className="shrink-0 whitespace-nowrap rounded-full bg-muted px-2 py-px text-xs tabular-nums text-muted-foreground">{children}</span>
const ActivePill = ({ active }: { active: boolean }) => <StatusPill tone={active ? 'success' : 'danger'} className="h-5 px-2 text-[11px]">{active ? 'Active' : 'Inactive'}</StatusPill>

function SeriesBlock({ series, isOpen, onToggle, openModules, onToggleModule, onAddModule, onAddVideo, onAddUpcoming, onEditVideo, onEdit, onEditModule, openingId }: SeriesBlockProps) {
  const modules = series.modules || []
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="flex items-center transition-colors hover:bg-muted/50">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex min-w-0 flex-1 items-center gap-3 p-4 text-left">
            <ChevronRight aria-hidden="true" className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`} />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="min-w-0 break-words text-sm font-medium">{series.name}</span>
                <Chip>{plural(series.module_count ?? modules.length, 'module')}</Chip>
                <ActivePill active={series.is_active} />
                {series.publish_status === 'draft' && <StatusPill tone="warning" className="h-5 px-2 text-[11px]">Draft</StatusPill>}
              </span>
              {series.description && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{series.description}</span>}
            </span>
          </button>
        </CollapsibleTrigger>
        {onEdit && <span className="pr-3"><EditButton label={`Edit series ${series.name}`} busy={openingId === series._id} onClick={onEdit} /></span>}
        </div>
        <CollapsibleContent>
          <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">Modules in this series</p>
              {onAddModule && <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onAddModule}><Plus aria-hidden="true" className="!size-3" />Add Module</Button>}
            </div>
            {modules.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">No modules yet</p> : (
              <div className="space-y-2">
                {modules.map((mod) => (
                  <ModuleBlock
                    key={mod._id} module={mod} isOpen={openModules.has(mod._id)} onToggle={() => onToggleModule(mod._id)}
                    onAddVideo={onAddVideo ? () => onAddVideo(mod._id) : undefined} onAddUpcoming={onAddUpcoming ? () => onAddUpcoming(mod._id) : undefined} onEditVideo={onEditVideo}
                    onEdit={onEditModule ? () => onEditModule(mod._id) : undefined} opening={openingId === mod._id}
                  />
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function EditButton({ label, busy, onClick, small }: { label: string; busy?: boolean; onClick: () => void; small?: boolean }) {
  return (
    <Button
      type="button" variant="ghost" size="sm" disabled={busy}
      className={small ? 'h-7 shrink-0 px-2 text-xs' : 'h-8 shrink-0 px-2.5 text-xs'}
      aria-label={label} title={label}
      onClick={(e) => { e.stopPropagation(); onClick() }}
    >
      {busy ? <Loader2 aria-hidden="true" className="!size-3 animate-spin" /> : <Pencil aria-hidden="true" className="!size-3" />}Edit
    </Button>
  )
}

// --- Module Block ---

interface ModuleBlockProps {
  module: PackageDetailModule
  isOpen: boolean
  onToggle: () => void
  onAddVideo?: () => void
  onAddUpcoming?: () => void
  onEditVideo?: (video: PackageDetailVideo) => void
  /** Opens this module's edit form. */
  onEdit?: () => void
  /** Its edit form is loading. */
  opening?: boolean
}

function ModuleBlock({ module: mod, isOpen, onToggle, onAddVideo, onAddUpcoming, onEditVideo, onEdit, opening }: ModuleBlockProps) {
  const videos = mod.videos || []
  const totalDuration = videos.reduce((sum, v) => sum + (v.duration_seconds || 0), 0)
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="overflow-hidden rounded-md border border-border bg-muted/30">
        <div className="flex items-center transition-colors hover:bg-muted/50">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left">
            <ChevronRight aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`} />
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="min-w-0 break-words text-sm font-medium">{mod.name}</span>
              <Chip>{plural(mod.video_count ?? videos.length, 'video')}</Chip>
              {totalDuration > 0 && <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground"><Clock aria-hidden="true" className="h-3 w-3" />{formatDuration(totalDuration)}</span>}
              <ActivePill active={mod.is_active} />
              {mod.publish_status === 'draft' && <StatusPill tone="warning" className="h-5 px-2 text-[11px]">Draft</StatusPill>}
            </span>
          </button>
        </CollapsibleTrigger>
        {onEdit && <span className="pr-2"><EditButton small label={`Edit module ${mod.name}`} busy={opening} onClick={onEdit} /></span>}
        </div>
        <CollapsibleContent>
          <div className="border-t border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <p className="text-xs text-muted-foreground">Videos in this module</p>
              <div className="flex gap-1">
                {onAddVideo && <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onAddVideo}><Plus aria-hidden="true" className="!size-3" />Add Video</Button>}
                {onAddUpcoming && <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-warning hover:bg-warning-soft hover:text-warning" onClick={onAddUpcoming}><Clock aria-hidden="true" className="!size-3" />Add Upcoming</Button>}
              </div>
            </div>
            {videos.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">No videos yet</p> : (
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead scope="col" className="w-10 text-xs">#</TableHead>
                    <TableHead scope="col" className="text-xs">Title</TableHead>
                    <TableHead scope="col" className="w-20 text-xs">Duration</TableHead>
                    <TableHead scope="col" className="w-16 text-xs">Access</TableHead>
                    <TableHead scope="col" className="w-28 text-xs">Status</TableHead>
                    <TableHead scope="col" className="w-16 text-right text-xs">Views</TableHead>
                    <TableHead scope="col" className="w-20 text-xs"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videos.map((video) => {
                    const scheduled = video.processing_status === 'ready' && !!video.scheduled_release_at && new Date(video.scheduled_release_at) > new Date()
                    return (
                      <TableRow key={video._id} className="hover:bg-muted/30">
                        <TableCell className="text-xs tabular-nums text-muted-foreground">{video.display_order}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Film aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 max-w-[320px]">
                              <p className="truncate text-sm" title={video.title}>{video.title}</p>
                              {video.faculty_id && <p className="truncate text-xs text-muted-foreground">{video.faculty_id.name}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDuration(video.duration_seconds)}</TableCell>
                        <TableCell className="text-xs">{video.is_free ? 'Free' : 'Paid'}</TableCell>
                        <TableCell>
                          {video.processing_status === 'upcoming' ? <StatusPill tone="warning" className="h-5 px-2 text-[11px]">Upcoming</StatusPill>
                            : scheduled ? <StatusPill tone="info" className="h-5 px-2 text-[11px]">Scheduled</StatusPill>
                              : <StatusPill tone={video.processing_status === 'ready' ? 'success' : video.processing_status === 'failed' ? 'danger' : 'warning'} className="h-5 px-2 text-[11px] capitalize">{video.processing_status}</StatusPill>}
                          {video.scheduled_release_at && <p className="mt-1 flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground"><CalendarClock aria-hidden="true" className="h-3 w-3" />{dayTimeIST(video.scheduled_release_at)}</p>}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground"><span className="inline-flex items-center gap-1 tabular-nums"><Eye aria-hidden="true" className="h-3 w-3" />{(video.view_count || 0).toLocaleString('en-IN')}</span></TableCell>
                        <TableCell className="text-right">
                          {onEditVideo && (
                            <EditButton small label={video.processing_status === 'upcoming' ? `Edit ${video.title}: upload the file or reschedule` : `Edit or replace ${video.title}`} onClick={() => onEditVideo(video)} />
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// --- Document Series Block (Document Hierarchy) ---

function DocSeriesBlock({ series, isOpen, onToggle, onAddDocument }: { series: PackageDetailSeries; isOpen: boolean; onToggle: () => void; onAddDocument?: () => void }) {
  const documents = series.documents || []
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="overflow-hidden rounded-lg border border-border">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50">
            <ChevronRight aria-hidden="true" className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`} />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="min-w-0 break-words text-sm font-medium">{series.name}</span>
                <Chip>{plural(series.document_count ?? documents.length, 'document')}</Chip>
                <ActivePill active={series.is_active} />
              </span>
              {series.description && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{series.description}</span>}
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border">
            <div className="flex items-center justify-between gap-2 px-4 py-2">
              <p className="text-xs text-muted-foreground">Documents in this series</p>
              {onAddDocument && <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onAddDocument}><Plus aria-hidden="true" className="!size-3" />Add Document</Button>}
            </div>
            {documents.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">No documents yet</p> : (
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead scope="col" className="w-10 pl-4 text-xs">#</TableHead>
                    <TableHead scope="col" className="text-xs">Title</TableHead>
                    <TableHead scope="col" className="w-16 text-xs">Format</TableHead>
                    <TableHead scope="col" className="w-20 text-xs">Size</TableHead>
                    <TableHead scope="col" className="w-16 text-xs">Access</TableHead>
                    <TableHead scope="col" className="w-20 pr-4 text-right text-xs">Downloads</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc._id} className="hover:bg-muted/30">
                      <TableCell className="pl-4 text-xs tabular-nums text-muted-foreground">{doc.display_order}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 max-w-[360px]">
                            <p className="truncate text-sm" title={doc.title}>{doc.title}</p>
                            {!!doc.page_count && <p className="text-xs text-muted-foreground">{plural(doc.page_count, 'page')}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs uppercase">{doc.file_format || '—'}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatFileSize(doc.file_size_mb)}</TableCell>
                      <TableCell className="text-xs">{doc.is_free ? 'Free' : 'Paid'}</TableCell>
                      <TableCell className="pr-4 text-right text-xs text-muted-foreground"><span className="inline-flex items-center gap-1 tabular-nums"><Download aria-hidden="true" className="h-3 w-3" />{(doc.download_count || 0).toLocaleString('en-IN')}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
