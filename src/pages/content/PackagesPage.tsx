import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useServerSearch } from '@/hooks/useServerSearch'
import { useResetPageOnChange } from '@/hooks/useResetPageOnChange'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { PackageFormModal } from '@/components/packages/PackageFormModal'
import { Link } from 'react-router-dom'
import { Plus, Package as PackageIcon, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { packagesService, Package, PackageFormData } from '@/services/packages.service'
import { subjectsService, Subject } from '@/services/subjects.service'
import { PublishConfirmModal } from '@/components/common/PublishConfirmModal'
import { usePackagesColumns } from './PackagesPage.columns'

export function PackagesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // State
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const { inputValue: search, setInputValue: setSearch, debouncedSearch } = useServerSearch(searchParams.get('search') || '')
  const [subjectFilter, setSubjectFilter] = useState(searchParams.get('subject') || 'all')
  const [activeFilter, setActiveFilter] = useState(searchParams.get('status') || 'all')
  const [saleFilter, setSaleFilter] = useState(searchParams.get('sale') || 'all')
  const [publishFilter, setPublishFilter] = useState(searchParams.get('publish_status') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Dropdown data
  const [subjects, setSubjects] = useState<Subject[]>([])

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [publishModal, setPublishModal] = useState<{
    entityId: string;
    action: 'publish' | 'unpublish';
  } | null>(null)

  // Fetch subjects for filter dropdown
  useEffect(() => {
    subjectsService.getSubjects({ limit: 100, sort_by: 'name', sort_order: 'asc' }).then((res) => {
      if (res.success && res.data) setSubjects(res.data.entities)
    })
  }, [])

  const { nextFetchId, isStale } = useLatestFetch()

  // Fetch packages
  const fetchPackages = useCallback(async () => {
    const fetchId = nextFetchId()
    setLoading(true)
    try {
      const response = await packagesService.getAll({
        page: currentPage,
        limit: 20,
        search: debouncedSearch || undefined,
        subject_id: subjectFilter !== 'all' ? subjectFilter : undefined,
        is_active: activeFilter === 'all' ? null : activeFilter === 'active',
        is_on_sale: saleFilter === 'all' ? null : saleFilter === 'on_sale',
        publish_status: publishFilter === 'all' ? null : publishFilter,
      })
      if (isStale(fetchId)) return

      if (response.success && response.data) {
        setPackages(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      } else {
        toast.error(response.message || 'Failed to load packages')
      }
    } catch (error: any) {
      if (isStale(fetchId)) return
      toast.error(error.message || 'Failed to load packages')
    } finally {
      if (!isStale(fetchId)) setLoading(false)
    }
  }, [currentPage, debouncedSearch, subjectFilter, activeFilter, saleFilter, publishFilter, nextFetchId, isStale])

  useEffect(() => { fetchPackages() }, [fetchPackages])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (subjectFilter !== 'all') params.subject = subjectFilter
    if (activeFilter !== 'all') params.status = activeFilter
    if (saleFilter !== 'all') params.sale = saleFilter
    if (publishFilter !== 'all') params.publish_status = publishFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [subjectFilter, activeFilter, saleFilter, publishFilter, currentPage, setSearchParams])

  useResetPageOnChange(setCurrentPage, [debouncedSearch, subjectFilter, activeFilter, saleFilter, publishFilter])

  // Handlers
  const handleCreate = () => {
    setModalMode('create')
    setSelectedPackage(null)
    setFormModalOpen(true)
  }

  const handleEdit = (pkg: Package) => {
    setModalMode('edit')
    setSelectedPackage(pkg)
    setFormModalOpen(true)
  }

  const handleFormSubmit = async (data: PackageFormData) => {
    try {
      if (modalMode === 'create') {
        const response = await packagesService.create(data)
        if (response.success) {
          toast.success('Package created successfully')
          fetchPackages()
        } else {
          toast.error(response.message || 'Failed to create package')
          throw new Error(response.message || 'Failed to create package')
        }
      } else if (selectedPackage) {
        const response = await packagesService.update(selectedPackage._id, data)
        if (response.success) {
          toast.success('Package updated successfully')
          fetchPackages()
        } else {
          toast.error(response.message || 'Failed to update package')
          throw new Error(response.message || 'Failed to update package')
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save package')
      throw error
    }
  }

  const handleToggleActive = async (pkg: Package) => {
    try {
      const response = await packagesService.toggleActive(pkg._id, !pkg.is_active)
      if (response.success) {
        toast.success(`Package ${!pkg.is_active ? 'activated' : 'deactivated'} successfully`)
        fetchPackages()
      } else {
        toast.error(response.message || 'Failed to update status')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status')
    }
  }

  // Filters
  const filters: FilterConfig[] = [
    {
      key: 'subject',
      label: 'Subject',
      type: 'select',
      searchable: true,
      options: [
        { label: 'All Subjects', value: 'all' },
        ...subjects.map((s) => ({ label: s.name, value: s._id })),
      ],
      placeholder: 'Filter by subject',
      defaultValue: 'all',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
      placeholder: 'Filter by status',
      defaultValue: 'all',
    },
    {
      key: 'sale',
      label: 'Sale',
      type: 'select',
      options: [
        { label: 'All', value: 'all' },
        { label: 'On Sale', value: 'on_sale' },
        { label: 'Not on Sale', value: 'not_on_sale' },
      ],
      placeholder: 'Filter by sale',
      defaultValue: 'all',
    },
    {
      key: 'publish_status',
      label: 'Publish Status',
      type: 'select',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Published', value: 'published' },
        { label: 'Draft', value: 'draft' },
      ],
      placeholder: 'Filter by publish status',
      defaultValue: 'all',
    },
  ]

  const handlePublishAction = useCallback((pkg: Package, action: 'publish' | 'unpublish') => {
    setPublishModal({ entityId: pkg._id, action });
  }, []);

  const handleNavigate = (pkg: Package) => {
    navigate(`/content/packages/${pkg._id}`)
  }

  const columns = usePackagesColumns({
    onNavigate: handleNavigate,
    onEdit: handleEdit,
    onToggleActive: handleToggleActive,
    onPublishAction: handlePublishAction,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Packages"
        description="Manage course packages, pricing, and enrollment"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Packages' }]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/content/package-types">
                <Layers className="mr-2 h-4 w-4" />Manage Types
              </Link>
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />Add Package
            </Button>
          </div>
        }
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search packages..."
        filters={filters}
        activeFilters={{ subject: subjectFilter, status: activeFilter, sale: saleFilter, publish_status: publishFilter }}
        onFiltersChange={(f) => {
          if (f.subject !== undefined) setSubjectFilter(f.subject)
          if (f.status !== undefined) setActiveFilter(f.status)
          if (f.sale !== undefined) setSaleFilter(f.sale)
          if (f.publish_status !== undefined) setPublishFilter(f.publish_status)
        }}
      />

      <DataTable
        data={packages}
        columns={columns}
        isLoading={loading}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          onPageChange: setCurrentPage,
        }}
        emptyState={{
          icon: PackageIcon,
          title: debouncedSearch || subjectFilter !== 'all' || activeFilter !== 'all' || saleFilter !== 'all' || publishFilter !== 'all'
            ? 'No packages found matching your filters'
            : 'No packages yet',
          description: !debouncedSearch && subjectFilter === 'all' && activeFilter === 'all' && saleFilter === 'all' && publishFilter === 'all'
            ? 'Get started by creating your first package'
            : undefined,
          action: !debouncedSearch && subjectFilter === 'all' && activeFilter === 'all' && saleFilter === 'all' && publishFilter === 'all' ? (
            <Button onClick={handleCreate} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />Create your first package
            </Button>
          ) : undefined,
        }}
        onRowClick={handleNavigate}
        getRowKey={(pkg) => pkg._id}
      />

      <PackageFormModal
        open={formModalOpen}
        onClose={() => { setFormModalOpen(false); fetchPackages() }}
        onSubmit={handleFormSubmit}
        pkg={selectedPackage}
        mode={modalMode}
      />

      {publishModal && (
        <PublishConfirmModal
          open={!!publishModal}
          onOpenChange={(open) => { if (!open) setPublishModal(null); }}
          entityType="package"
          entityId={publishModal.entityId}
          action={publishModal.action}
          onSuccess={() => {
            setPublishModal(null);
            fetchPackages();
          }}
        />
      )}

    </div>
  )
}
