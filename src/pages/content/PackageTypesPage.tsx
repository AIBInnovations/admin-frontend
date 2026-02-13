import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { PackageTypeFormModal } from '@/components/packageTypes/PackageTypeFormModal'
import { Plus, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { packageTypesService, PackageType, PackageTypeFormData } from '@/services/packageTypes.service'
import { usePackageTypesColumns } from './PackageTypesPage.columns'

export function PackageTypesPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedType, setSelectedType] = useState<PackageType | null>(null)

  // Fetch package types
  const fetchPackageTypes = useCallback(async () => {
    try {
      setLoading(true)
      const response = await packageTypesService.getAll({
        page: currentPage,
        limit: 20,
      })

      if (response.success && response.data) {
        setPackageTypes(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      }
    } catch (error) {
      toast.error('Failed to load package types')
      setPackageTypes([])
    } finally {
      setLoading(false)
    }
  }, [currentPage])

  useEffect(() => { fetchPackageTypes() }, [fetchPackageTypes])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [currentPage, setSearchParams])

  // Handlers
  const handleCreate = () => {
    setModalMode('create')
    setSelectedType(null)
    setFormModalOpen(true)
  }

  const handleEdit = (pt: PackageType) => {
    setModalMode('edit')
    setSelectedType(pt)
    setFormModalOpen(true)
  }

  const handleDeleteClick = (pt: PackageType) => {
    setSelectedType(pt)
    setDeleteModalOpen(true)
  }

  const handleFormSubmit = async (data: PackageTypeFormData) => {
    try {
      if (modalMode === 'create') {
        const response = await packageTypesService.create(data)
        if (response.success) {
          toast.success('Package type created successfully')
          fetchPackageTypes()
        }
      } else if (selectedType) {
        const response = await packageTypesService.update(selectedType._id, data)
        if (response.success) {
          toast.success('Package type updated successfully')
          fetchPackageTypes()
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save package type')
      throw error
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedType) return
    try {
      const response = await packageTypesService.delete(selectedType._id)
      if (response.success) {
        toast.success('Package type deleted successfully')
        fetchPackageTypes()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete package type')
      throw error
    }
  }

  const columns = usePackageTypesColumns({
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Package Types"
        description="Manage package types such as Theory, Practical, etc."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Content' },
          { label: 'Packages', href: '/content/packages' },
          { label: 'Package Types' },
        ]}
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />Add Package Type
          </Button>
        }
      />

      <DataTable
        data={packageTypes}
        columns={columns}
        isLoading={loading}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          onPageChange: setCurrentPage,
        }}
        emptyState={{
          icon: Layers,
          title: 'No package types yet',
          description: 'Get started by creating your first package type',
          action: (
            <Button onClick={handleCreate} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />Create your first package type
            </Button>
          ),
        }}
        getRowKey={(pt) => pt._id}
      />

      <PackageTypeFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        packageType={selectedType}
        mode={modalMode}
      />

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Package Type"
        itemName={selectedType?.name}
      />
    </div>
  )
}
