import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { ErrorState } from '@/components/common/detail'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Package, BookOpen, Calendar, Hash, Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { formatDuration, formatINR } from '@/lib/format'
import {
  subjectsService,
  SubjectDetail,
  SubjectFormData,
} from '@/services/subjects.service'
import { packagesService, PackageFormData } from '@/services/packages.service'
import { SubjectFormModal } from '@/components/subjects/SubjectFormModal'
import { PackageFormModal } from '@/components/packages/PackageFormModal'

export function SubjectDetailPage() {
  const { subjectId } = useParams<{ subjectId: string }>()
  const navigate = useNavigate()

  const [subject, setSubject] = useState<SubjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<{ status?: number; message: string } | null>(null)
  const { hasPermission } = useAuth()
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [packageFormOpen, setPackageFormOpen] = useState(false)

  const { nextFetchId, isStale } = useLatestFetch()

  const fetchSubject = useCallback(async () => {
    if (!subjectId) return
    const fetchId = nextFetchId()
    setLoading(true)
    setLoadError(null)
    try {
      const response = await subjectsService.getSubject(subjectId)
      if (isStale(fetchId)) return
      if (!response.data) throw new Error(response.message || 'The subject could not be loaded.')
      setSubject(response.data)
    } catch (error: any) {
      if (isStale(fetchId)) return
      setLoadError({ status: error.status, message: error.message || 'The subject could not be loaded.' })
    } finally {
      if (!isStale(fetchId)) setLoading(false)
    }
  }, [subjectId, nextFetchId, isStale])

  useEffect(() => { fetchSubject() }, [fetchSubject])

  const handleFormSubmit = async (data: SubjectFormData) => {
    if (!subject) return
    try {
      const response = await subjectsService.updateSubject(subject._id, data)
      if (response.success) {
        toast.success('Subject updated successfully')
        fetchSubject()
      } else {
        toast.error(response.message || 'Failed to update subject')
        throw new Error(response.message || 'Failed to update subject')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update subject')
      throw error
    }
  }

  const handlePackageSubmit = async (data: PackageFormData) => {
    try {
      const response = await packagesService.create(data)
      if (response.success) {
        toast.success('Package created successfully')
        fetchSubject()
      } else {
        toast.error(response.message || 'Failed to create package')
        throw new Error(response.message || 'Failed to create package')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create package')
      throw error
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  if (loading && !subject) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!subject) {
    const gone = loadError?.status === 404 || loadError?.status === 400
    return (
      <ErrorState
        title={gone ? 'This subject no longer exists' : 'The subject could not be loaded'}
        message={gone ? 'It may have been deleted, or the link is wrong.' : loadError?.message}
        onRetry={gone ? undefined : fetchSubject}
        back={{ label: 'Back to subjects', href: '/content/subjects' }}
      />
    )
  }

  const canOpen = hasPermission('packages.read')

  return (
    <div className="space-y-6">
      <PageHeader
        title={subject.name}
        description={subject.description || undefined}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Content' },
          { label: 'Subjects', href: '/content/subjects' },
          { label: subject.name },
        ]}
        action={hasPermission('subjects.update') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFormModalOpen(true)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Subject
          </Button>
        )}
      />

      {/* Subject Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subject Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                  {subject.icon_url ? (
                    <img src={subject.icon_url} alt="" className="h-full w-full rounded-lg object-cover" />
                  ) : (
                    subject.name.charAt(0)
                  )}
                </div>
                <div>
                  <p className="text-lg font-medium">{subject.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge className={`text-[11px] ${subject.is_active
                      ? 'bg-success-soft text-success border-transparent'
                      : 'bg-danger-soft text-danger border-transparent'
                    }`}>
                      {subject.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
              {subject.description && (
                <p className="text-sm text-muted-foreground">{subject.description}</p>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5" /> Display Order
                  </p>
                  <p className="mt-0.5 font-medium">{subject.display_order}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Created
                  </p>
                  <p className="mt-0.5 font-medium">{formatDate(subject.createdAt)}</p>
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
                <p className="text-2xl font-semibold">{subject.package_count || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Packages</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-semibold">
                  {subject.packages?.filter(p => p.is_active).length || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Active Packages</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Packages */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Packages
            <Badge variant="outline" className="text-[11px] ml-1">{subject.packages?.length || 0}</Badge>
          </CardTitle>
          {hasPermission('packages.create') && (
            <Button variant="outline" size="sm" onClick={() => setPackageFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Package
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {(!subject.packages || subject.packages.length === 0) ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No packages for this subject
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-28">Price</TableHead>
                    <TableHead className="w-24">Sale</TableHead>
                    <TableHead className="w-28">Duration</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-28">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subject.packages.map((pkg) => (
                    <TableRow
                      key={pkg._id}
                      className={canOpen ? 'cursor-pointer' : undefined}
                      onClick={(e) => { if (canOpen && !(e.target as HTMLElement).closest('a')) navigate(`/content/packages/${pkg._id}`) }}
                    >
                      <TableCell className="text-sm text-muted-foreground">
                        {pkg.display_order}
                      </TableCell>
                      <TableCell>
                        <div>
                          {canOpen ? (
                            <Link to={`/content/packages/${pkg._id}`} className="text-sm font-medium hover:underline">
                              {pkg.name}
                            </Link>
                          ) : <span className="text-sm font-medium">{pkg.name}</span>}
                          {pkg.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-xs" title={pkg.description}>{pkg.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {pkg.is_on_sale ? (
                          <div>
                            <span className="line-through text-muted-foreground text-xs">{formatINR(pkg.price)}</span>
                            <br />
                            <span className="font-medium">{formatINR(pkg.sale_price ?? pkg.price)}</span>
                          </div>
                        ) : (
                          <span>{formatINR(pkg.price)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[11px] ${pkg.is_on_sale
                          ? 'bg-warning-soft text-warning border-transparent'
                          : 'bg-muted text-muted-foreground border-transparent'
                        }`}>
                          {pkg.is_on_sale ? 'On Sale' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDuration(pkg.duration_days)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[11px] ${pkg.is_active
                          ? 'bg-success-soft text-success border-transparent'
                          : 'bg-danger-soft text-danger border-transparent'
                        }`}>
                          {pkg.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(pkg.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Subject Modal */}
      <SubjectFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        subject={subject}
        mode="edit"
      />

      {/* Create Package Modal */}
      <PackageFormModal
        open={packageFormOpen}
        onClose={() => setPackageFormOpen(false)}
        onSubmit={handlePackageSubmit}
        mode="create"
        defaultSubjectId={subject._id}
      />
    </div>
  )
}
