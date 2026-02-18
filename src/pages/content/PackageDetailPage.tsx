import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Package, BookOpen, Calendar, Hash, Pencil, Plus, ChevronRight,
  Layers, Film, Clock, Eye, IndianRupee, Tag, FileText, Download, BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  packagesService,
  PackageDetail,
  PackageFormData,
  PackageDetailSeries,
  PackageDetailModule,
  PackageDetailDocument,
} from '@/services/packages.service'
import { SeriesFormData } from '@/services/series.service'
import { seriesService } from '@/services/series.service'
import { ModuleFormData } from '@/services/modules.service'
import { modulesService } from '@/services/modules.service'
import { VideoFormData, videosService } from '@/services/videos.service'
import { DocumentFormData, documentsService } from '@/services/documents.service'
import { PackageFormModal } from '@/components/packages/PackageFormModal'
import { SeriesFormModal } from '@/components/series/SeriesFormModal'
import { ModuleFormModal } from '@/components/modules/ModuleFormModal'
import { VideoFormModal } from '@/components/videos/VideoFormModal'
import { DocumentFormModal } from '@/components/documents/DocumentFormModal'

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  const remainMins = mins % 60
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatFileSize(mb: number): string {
  if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`
  return `${mb.toFixed(1)} MB`
}

export function PackageDetailPage() {
  const { packageId } = useParams<{ packageId: string }>()
  const navigate = useNavigate()

  const [pkg, setPkg] = useState<PackageDetail | null>(null)
  const [loading, setLoading] = useState(true)

  // Modal states
  const [editPackageOpen, setEditPackageOpen] = useState(false)
  const [seriesModalOpen, setSeriesModalOpen] = useState(false)
  const [moduleModalOpen, setModuleModalOpen] = useState(false)
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [documentModalOpen, setDocumentModalOpen] = useState(false)
  const [targetSeriesId, setTargetSeriesId] = useState<string>('')
  const [targetModuleId, setTargetModuleId] = useState<string>('')

  // Collapsible states — separate for video hierarchy and document hierarchy
  const [openSeries, setOpenSeries] = useState<Set<string>>(new Set())
  const [openModules, setOpenModules] = useState<Set<string>>(new Set())
  const [openDocSeries, setOpenDocSeries] = useState<Set<string>>(new Set())

  const fetchPackage = useCallback(async () => {
    if (!packageId) return
    try {
      setLoading(true)
      const response = await packagesService.getDetail(packageId)
      if (response.success && response.data) {
        setPkg(response.data)
      } else {
        toast.error('Package not found')
        navigate('/content/packages')
      }
    } catch {
      toast.error('Failed to load package details')
      navigate('/content/packages')
    } finally {
      setLoading(false)
    }
  }, [packageId, navigate])

  useEffect(() => { fetchPackage() }, [fetchPackage])

  // Detect if theory package
  const isTheory = useMemo(() => {
    if (!pkg) return false
    const typeName = typeof pkg.package_type_id === 'object' ? pkg.package_type_id.name : ''
    return typeName.toLowerCase() === 'theory'
  }, [pkg])

  // Computed stats
  const stats = useMemo(() => {
    if (!pkg) return { totalModules: 0, totalVideos: 0, totalDuration: 0, totalDocuments: 0 }
    let totalModules = 0
    let totalVideos = 0
    let totalDuration = 0
    let totalDocuments = 0
    for (const s of pkg.series) {
      totalModules += s.modules.length
      totalDocuments += (s.documents?.length || 0)
      for (const m of s.modules) {
        totalVideos += m.videos.length
        for (const v of m.videos) {
          totalDuration += v.duration_seconds
        }
      }
    }
    return { totalModules, totalVideos, totalDuration, totalDocuments }
  }, [pkg])

  // Toggle helpers
  const toggleSeries = (id: string) => {
    setOpenSeries((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleModule = (id: string) => {
    setOpenModules((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleDocSeries = (id: string) => {
    setOpenDocSeries((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Handlers
  const handlePackageSubmit = async (data: PackageFormData) => {
    if (!pkg) return
    try {
      const response = await packagesService.update(pkg._id, data)
      if (response.success) {
        toast.success('Package updated successfully')
        fetchPackage()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update package')
      throw error
    }
  }

  const handleSeriesSubmit = async (data: SeriesFormData) => {
    try {
      const response = await seriesService.create(data)
      if (response.success) {
        toast.success('Series created successfully')
        fetchPackage()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create series')
      throw error
    }
  }

  const handleModuleSubmit = async (data: ModuleFormData) => {
    try {
      const response = await modulesService.create(data)
      if (response.success) {
        toast.success('Module created successfully')
        fetchPackage()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create module')
      throw error
    }
  }

  const handleVideoSubmit = async (data: VideoFormData, file?: File, onProgress?: (percent: number) => void) => {
    if (!file) return
    try {
      const response = await videosService.upload(data, file, onProgress)
      if (response.success) {
        const videoId = response.data?.video_id
        if (videoId && data.tag_ids && data.tag_ids.length > 0) {
          await videosService.assignTags(videoId, data.tag_ids).catch(() => {})
        }
        toast.success('Video uploaded successfully')
        fetchPackage()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload video')
      throw error
    }
  }

  const handleDocumentSubmit = async (data: DocumentFormData, file?: File, onProgress?: (percent: number) => void) => {
    if (!file) return
    try {
      const response = await documentsService.upload(data, file, onProgress)
      if (response.success) {
        toast.success('Document uploaded successfully')
        fetchPackage()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload document')
      throw error
    }
  }

  const openAddModule = (seriesId: string) => {
    setTargetSeriesId(seriesId)
    setModuleModalOpen(true)
  }

  const openAddVideo = (moduleId: string) => {
    setTargetModuleId(moduleId)
    setVideoModalOpen(true)
  }

  const openAddDocument = (seriesId: string) => {
    setTargetSeriesId(seriesId)
    setDocumentModalOpen(true)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!pkg) return null

  const subjectName = typeof pkg.subject_id === 'object' ? pkg.subject_id.name : '—'
  const packageTypeName = typeof pkg.package_type_id === 'object' ? pkg.package_type_id.name : '—'

  // Video hierarchy content (used in both theory tabs and practical layout)
  const videoHierarchyContent = (
    <>
      {pkg.series.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No series in this package yet
        </div>
      ) : (
        <div className="space-y-3">
          {pkg.series.map((series) => (
            <SeriesBlock
              key={series._id}
              series={series}
              isOpen={openSeries.has(series._id)}
              onToggle={() => toggleSeries(series._id)}
              openModules={openModules}
              onToggleModule={toggleModule}
              onAddModule={() => openAddModule(series._id)}
              onAddVideo={openAddVideo}
            />
          ))}
        </div>
      )}
    </>
  )

  // Document hierarchy content (theory packages only)
  const documentHierarchyContent = (
    <>
      {pkg.series.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No series in this package yet
        </div>
      ) : (
        <div className="space-y-3">
          {pkg.series.map((series) => (
            <DocSeriesBlock
              key={series._id}
              series={series}
              isOpen={openDocSeries.has(series._id)}
              onToggle={() => toggleDocSeries(series._id)}
              onAddDocument={() => openAddDocument(series._id)}
            />
          ))}
        </div>
      )}
    </>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={pkg.name}
        description={pkg.description || undefined}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Content' },
          { label: 'Packages', href: '/content/packages' },
          { label: pkg.name },
        ]}
        action={
          <Button variant="outline" size="sm" onClick={() => setEditPackageOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Package
          </Button>
        }
      />

      {/* Package Info + Quick Stats */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Package Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                  {pkg.name.charAt(0)}
                </div>
                <div>
                  <p className="text-lg font-medium">{pkg.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge className={`text-[10px] ${pkg.is_active
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                      : 'bg-red-500/10 text-red-600 border-red-200'
                    }`}>
                      {pkg.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {pkg.is_on_sale && (
                      <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-[10px]">
                        On Sale
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {pkg.description && (
                <p className="text-sm text-muted-foreground">{pkg.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" /> Subject
                  </p>
                  <p className="mt-0.5 font-medium">{subjectName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" /> Package Type
                  </p>
                  <p className="mt-0.5 font-medium">{packageTypeName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <IndianRupee className="h-3.5 w-3.5" /> Price
                  </p>
                  <p className="mt-0.5 font-medium">
                    {pkg.tiers && pkg.tiers.length > 0 ? (
                      <>
                        From ₹{Math.min(...pkg.tiers.map(t => t.price)).toLocaleString('en-IN')}
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          {pkg.tiers.length} {pkg.tiers.length === 1 ? 'tier' : 'tiers'}
                        </Badge>
                      </>
                    ) : pkg.is_on_sale ? (
                      <>
                        <span className="text-emerald-600">₹{pkg.sale_price?.toLocaleString('en-IN')}</span>
                        <span className="ml-2 text-xs text-muted-foreground line-through">
                          ₹{pkg.price.toLocaleString('en-IN')}
                        </span>
                      </>
                    ) : (
                      <>₹{pkg.price.toLocaleString('en-IN')}</>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Duration
                  </p>
                  <p className="mt-0.5 font-medium">
                    {pkg.tiers && pkg.tiers.length > 0 ? (
                      (() => {
                        const durations = pkg.tiers!.map(t => t.duration_days).sort((a, b) => a - b)
                        return `${durations[0]} – ${durations[durations.length - 1]} days`
                      })()
                    ) : (
                      `${pkg.duration_days} days`
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5" /> Display Order
                  </p>
                  <p className="mt-0.5 font-medium">{pkg.display_order}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Created
                  </p>
                  <p className="mt-0.5 font-medium">{formatDate(pkg.createdAt)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-semibold">{pkg.series_count}</p>
                <p className="text-xs text-muted-foreground mt-1">Series</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-semibold">{stats.totalModules}</p>
                <p className="text-xs text-muted-foreground mt-1">Modules</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-semibold">{stats.totalVideos}</p>
                <p className="text-xs text-muted-foreground mt-1">Videos</p>
              </div>
              {isTheory ? (
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-semibold">{stats.totalDocuments}</p>
                  <p className="text-xs text-muted-foreground mt-1">Documents</p>
                </div>
              ) : (
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-2xl font-semibold">{formatDuration(stats.totalDuration)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Duration</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Tiers */}
      {pkg.tiers && pkg.tiers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Pricing Tiers
              {pkg.is_on_sale && pkg.sale_discount_percent && (
                <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200 text-[10px]">
                  {pkg.sale_discount_percent}% Sale Discount
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <TableHead className="text-xs">Tier Name</TableHead>
                  <TableHead className="w-28 text-xs">Duration</TableHead>
                  <TableHead className="w-28 text-xs">Price</TableHead>
                  {pkg.is_on_sale && pkg.sale_discount_percent && (
                    <TableHead className="w-28 text-xs">Sale Price</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...pkg.tiers]
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((tier, idx) => {
                    const salePrice = pkg.is_on_sale && pkg.sale_discount_percent
                      ? Math.round(tier.price * (1 - pkg.sale_discount_percent / 100))
                      : null
                    return (
                      <TableRow key={idx} className="hover:bg-muted/30">
                        <TableCell className="text-xs text-muted-foreground">
                          {tier.display_order}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{tier.name}</TableCell>
                        <TableCell className="text-sm">{tier.duration_days} days</TableCell>
                        <TableCell className={`text-sm ${salePrice ? 'text-muted-foreground line-through' : 'font-semibold'}`}>
                          ₹{tier.price.toLocaleString('en-IN')}
                        </TableCell>
                        {salePrice !== null && (
                          <TableCell className="text-sm font-semibold text-emerald-600">
                            ₹{salePrice.toLocaleString('en-IN')}
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Content Structure */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Content Structure
            <Badge variant="secondary" className="text-[10px] ml-1">
              {pkg.series_count} series
            </Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setSeriesModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Series
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="videos">
            <TabsList>
              <TabsTrigger value="videos" className="gap-1.5">
                <Film className="h-3.5 w-3.5" />
                Videos
                <Badge variant="secondary" className="text-[10px] ml-1">{stats.totalVideos}</Badge>
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Documents
                <Badge variant="secondary" className="text-[10px] ml-1">{stats.totalDocuments}</Badge>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="videos" className="mt-4">
              {videoHierarchyContent}
            </TabsContent>
            <TabsContent value="documents" className="mt-4">
              {documentHierarchyContent}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modals */}
      <PackageFormModal
        open={editPackageOpen}
        onClose={() => setEditPackageOpen(false)}
        onSubmit={handlePackageSubmit}
        pkg={pkg}
        mode="edit"
      />

      <SeriesFormModal
        open={seriesModalOpen}
        onClose={() => setSeriesModalOpen(false)}
        onSubmit={handleSeriesSubmit}
        mode="create"
        defaultPackageId={pkg._id}
      />

      <ModuleFormModal
        open={moduleModalOpen}
        onClose={() => setModuleModalOpen(false)}
        onSubmit={handleModuleSubmit}
        mode="create"
        defaultSeriesId={targetSeriesId}
      />

      <VideoFormModal
        open={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        onSubmit={handleVideoSubmit}
        mode="create"
        defaultModuleId={targetModuleId}
      />

      <DocumentFormModal
        open={documentModalOpen}
        onClose={() => setDocumentModalOpen(false)}
        onSubmit={handleDocumentSubmit}
        mode="create"
        defaultSeriesId={targetSeriesId}
      />
    </div>
  )
}

// --- Series Block (Video Hierarchy) ---

interface SeriesBlockProps {
  series: PackageDetailSeries
  isOpen: boolean
  onToggle: () => void
  openModules: Set<string>
  onToggleModule: (id: string) => void
  onAddModule: () => void
  onAddVideo: (moduleId: string) => void
}

function SeriesBlock({ series, isOpen, onToggle, openModules, onToggleModule, onAddModule, onAddVideo }: SeriesBlockProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="rounded-lg border">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors">
            <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{series.name}</span>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {series.module_count} {series.module_count === 1 ? 'module' : 'modules'}
                </Badge>
                <Badge className={`text-[10px] shrink-0 ${series.is_active
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                  : 'bg-red-500/10 text-red-600 border-red-200'
                }`}>
                  {series.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {series.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{series.description}</p>
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t px-4 pb-4 pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Modules in this series</p>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onAddModule}>
                <Plus className="mr-1 h-3 w-3" />
                Add Module
              </Button>
            </div>

            {series.modules.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No modules yet</p>
            ) : (
              <div className="space-y-2">
                {series.modules.map((mod) => (
                  <ModuleBlock
                    key={mod._id}
                    module={mod}
                    isOpen={openModules.has(mod._id)}
                    onToggle={() => onToggleModule(mod._id)}
                    onAddVideo={() => onAddVideo(mod._id)}
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

// --- Module Block ---

interface ModuleBlockProps {
  module: PackageDetailModule
  isOpen: boolean
  onToggle: () => void
  onAddVideo: () => void
}

function ModuleBlock({ module: mod, isOpen, onToggle, onAddVideo }: ModuleBlockProps) {
  const totalDuration = mod.videos.reduce((sum, v) => sum + v.duration_seconds, 0)

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="rounded-md border bg-muted/30">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors">
            <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{mod.name}</span>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {mod.video_count} {mod.video_count === 1 ? 'video' : 'videos'}
                </Badge>
                {totalDuration > 0 && (
                  <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    {formatDuration(totalDuration)}
                  </span>
                )}
                <Badge className={`text-[10px] shrink-0 ${mod.is_active
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                  : 'bg-red-500/10 text-red-600 border-red-200'
                }`}>
                  {mod.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t">
            <div className="flex items-center justify-between px-3 pt-2">
              <p className="text-xs text-muted-foreground">Videos in this module</p>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onAddVideo}>
                <Plus className="mr-1 h-3 w-3" />
                Add Video
              </Button>
            </div>
            {mod.videos.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No videos yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 text-xs">#</TableHead>
                    <TableHead className="text-xs">Title</TableHead>
                    <TableHead className="w-20 text-xs">Duration</TableHead>
                    <TableHead className="w-16 text-xs">Access</TableHead>
                    <TableHead className="w-20 text-xs">Status</TableHead>
                    <TableHead className="w-16 text-xs text-right">Views</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mod.videos.map((video) => (
                    <TableRow key={video._id} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground">
                        {video.display_order}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Film className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="text-sm truncate">{video.title}</p>
                            {video.faculty_id && (
                              <p className="text-[10px] text-muted-foreground">
                                {video.faculty_id.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDuration(video.duration_seconds)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={video.is_free ? 'secondary' : 'outline'}
                          className="text-[10px]"
                        >
                          {video.is_free ? 'Free' : 'Paid'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${
                          video.processing_status === 'ready'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                            : video.processing_status === 'failed'
                            ? 'bg-red-500/10 text-red-600 border-red-200'
                            : 'bg-amber-500/10 text-amber-600 border-amber-200'
                        }`}>
                          {video.processing_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground text-right">
                        <span className="flex items-center justify-end gap-1">
                          <Eye className="h-3 w-3" />
                          {video.view_count}
                        </span>
                      </TableCell>
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

// --- Document Series Block (Document Hierarchy) ---

interface DocSeriesBlockProps {
  series: PackageDetailSeries
  isOpen: boolean
  onToggle: () => void
  onAddDocument: () => void
}

function DocSeriesBlock({ series, isOpen, onToggle, onAddDocument }: DocSeriesBlockProps) {
  const documents = series.documents || []

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="rounded-lg border">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors">
            <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{series.name}</span>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {series.document_count} {series.document_count === 1 ? 'document' : 'documents'}
                </Badge>
                <Badge className={`text-[10px] shrink-0 ${series.is_active
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                  : 'bg-red-500/10 text-red-600 border-red-200'
                }`}>
                  {series.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {series.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{series.description}</p>
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t">
            <div className="flex items-center justify-between px-4 pt-3">
              <p className="text-xs text-muted-foreground">Documents in this series</p>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onAddDocument}>
                <Plus className="mr-1 h-3 w-3" />
                Add Document
              </Button>
            </div>
            {documents.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No documents yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 text-xs">#</TableHead>
                    <TableHead className="text-xs">Title</TableHead>
                    <TableHead className="w-16 text-xs">Format</TableHead>
                    <TableHead className="w-16 text-xs">Size</TableHead>
                    <TableHead className="w-16 text-xs">Access</TableHead>
                    <TableHead className="w-20 text-xs text-right">Downloads</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc._id} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground">
                        {doc.display_order}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="text-sm truncate">{doc.title}</p>
                            {doc.page_count && (
                              <p className="text-[10px] text-muted-foreground">
                                {doc.page_count} pages
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {doc.file_format}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatFileSize(doc.file_size_mb)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={doc.is_free ? 'secondary' : 'outline'}
                          className="text-[10px]"
                        >
                          {doc.is_free ? 'Free' : 'Paid'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground text-right">
                        <span className="flex items-center justify-end gap-1">
                          <Download className="h-3 w-3" />
                          {doc.download_count}
                        </span>
                      </TableCell>
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
