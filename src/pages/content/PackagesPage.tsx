import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { PackageFormModal } from '@/components/packages/PackageFormModal'
import { Link } from 'react-router-dom'
import { Plus, Package as PackageIcon, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { packagesService, Package, PackageFormData } from '@/services/packages.service'
import { subjectsService, Subject } from '@/services/subjects.service'
import { usePackagesColumns } from './PackagesPage.columns'

export function PackagesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // State
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState(searchParams.get('subject') || 'all')
  const [activeFilter, setActiveFilter] = useState(searchParams.get('status') || 'all')
  const [saleFilter, setSaleFilter] = useState(searchParams.get('sale') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Dropdown data
  const [subjects, setSubjects] = useState<Subject[]>([])

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)

  // Fetch subjects for filter dropdown
  useEffect(() => {
    subjectsService.getSubjects({ limit: 100, sort_by: 'name', sort_order: 'asc' }).then((res) => {
      if (res.success && res.data) setSubjects(res.data.entities)
    })
  }, [])

  // Fetch packages
  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true)
      const response = await packagesService.getAll({
        page: currentPage,
        limit: 20,
        subject_id: subjectFilter !== 'all' ? subjectFilter : undefined,
        is_active: activeFilter === 'all' ? null : activeFilter === 'active',
        is_on_sale: saleFilter === 'all' ? null : saleFilter === 'on_sale',
      })

      if (response.success && response.data) {
        setPackages(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      }
    } catch (error) {
      toast.error('Failed to load packages')
      setPackages([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, subjectFilter, activeFilter, saleFilter])

  useEffect(() => { fetchPackages() }, [fetchPackages])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (subjectFilter !== 'all') params.subject = subjectFilter
    if (activeFilter !== 'all') params.status = activeFilter
    if (saleFilter !== 'all') params.sale = saleFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [subjectFilter, activeFilter, saleFilter, currentPage, setSearchParams])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [subjectFilter, activeFilter, saleFilter])

  // Client-side search filter
  const filteredPackages = search
    ? packages.filter((pkg) =>
        pkg.name.toLowerCase().includes(search.toLowerCase())
      )
    : packages

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

  const handleDeleteClick = (pkg: Package) => {
    setSelectedPackage(pkg)
    setDeleteModalOpen(true)
  }

  const handleFormSubmit = async (data: PackageFormData) => {
    try {
      if (modalMode === 'create') {
        const response = await packagesService.create(data)
        if (response.success) {
          toast.success('Package created successfully')
          fetchPackages()
        }
      } else if (selectedPackage) {
        const response = await packagesService.update(selectedPackage._id, data)
        if (response.success) {
          toast.success('Package updated successfully')
          fetchPackages()
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save package')
      throw error
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedPackage) return
    try {
      const response = await packagesService.delete(selectedPackage._id)
      if (response.success) {
        toast.success('Package deleted successfully')
        fetchPackages()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete package')
      throw error
    }
  }

  const handleToggleActive = async (pkg: Package) => {
    try {
      const response = await packagesService.toggleActive(pkg._id, !pkg.is_active)
      if (response.success) {
        toast.success(`Package ${!pkg.is_active ? 'activated' : 'deactivated'} successfully`)
        fetchPackages()
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
  ]

  const handleNavigate = (pkg: Package) => {
    navigate(`/content/packages/${pkg._id}`)
  }

  const columns = usePackagesColumns({
    onNavigate: handleNavigate,
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
    onToggleActive: handleToggleActive,
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
        activeFilters={{ subject: subjectFilter, status: activeFilter, sale: saleFilter }}
        onFiltersChange={(f) => {
          if (f.subject !== undefined) setSubjectFilter(f.subject)
          if (f.status !== undefined) setActiveFilter(f.status)
          if (f.sale !== undefined) setSaleFilter(f.sale)
        }}
      />

      <DataTable
        data={filteredPackages}
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
          title: search || subjectFilter !== 'all' || activeFilter !== 'all' || saleFilter !== 'all'
            ? 'No packages found matching your filters'
            : 'No packages yet',
          description: !search && subjectFilter === 'all' && activeFilter === 'all' && saleFilter === 'all'
            ? 'Get started by creating your first package'
            : undefined,
          action: !search && subjectFilter === 'all' && activeFilter === 'all' && saleFilter === 'all' ? (
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
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        pkg={selectedPackage}
        mode={modalMode}
      />

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Package"
        itemName={selectedPackage?.name}
      />
    </div>
  )
}
