import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { FacultyFormModal } from '@/components/faculty/FacultyFormModal'
import { Plus, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'
import { facultyService, Faculty, FacultyFormData } from '@/services/faculty.service'
import { useFacultyColumns } from './FacultyPage.columns'

export function FacultyPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [facultyList, setFacultyList] = useState<Faculty[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null)

  // Fetch faculty
  const fetchFaculty = useCallback(async () => {
    try {
      setLoading(true)
      const response = await facultyService.getAll({
        page: currentPage,
        limit: 20,
        is_active: statusFilter === 'all' ? null : statusFilter === 'active',
      })

      if (response.success && response.data) {
        setFacultyList(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      }
    } catch (error) {
      toast.error('Failed to load faculty')
      setFacultyList([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, statusFilter])

  useEffect(() => { fetchFaculty() }, [fetchFaculty])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (statusFilter !== 'all') params.status = statusFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [statusFilter, currentPage, setSearchParams])

  useEffect(() => { setCurrentPage(1) }, [statusFilter])

  // Handlers
  const handleCreate = () => {
    setModalMode('create')
    setSelectedFaculty(null)
    setFormModalOpen(true)
  }

  const handleEdit = (faculty: Faculty) => {
    setModalMode('edit')
    setSelectedFaculty(faculty)
    setFormModalOpen(true)
  }

  const handleDeleteClick = (faculty: Faculty) => {
    setSelectedFaculty(faculty)
    setDeleteModalOpen(true)
  }

  const handleFormSubmit = async (data: FacultyFormData) => {
    try {
      if (modalMode === 'create') {
        const response = await facultyService.create(data)
        if (response.success) {
          toast.success('Faculty added successfully')
          fetchFaculty()
        }
      } else if (selectedFaculty) {
        const response = await facultyService.update(selectedFaculty._id, data)
        if (response.success) {
          toast.success('Faculty updated successfully')
          fetchFaculty()
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save faculty')
      throw error
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedFaculty) return
    try {
      const response = await facultyService.delete(selectedFaculty._id)
      if (response.success) {
        toast.success('Faculty deleted successfully')
        fetchFaculty()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete faculty')
      throw error
    }
  }

  const handleToggleActive = async (faculty: Faculty) => {
    try {
      const response = await facultyService.toggleActive(faculty._id, !faculty.is_active)
      if (response.success) {
        toast.success(`Faculty ${!faculty.is_active ? 'activated' : 'deactivated'} successfully`)
        fetchFaculty()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status')
    }
  }

  const handleVerify = async (faculty: Faculty) => {
    try {
      const response = await facultyService.verifyFaculty(faculty._id, true)
      if (response.success) {
        toast.success('Faculty verified successfully')
        fetchFaculty()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify faculty')
    }
  }

  // Filters
  const filters: FilterConfig[] = [
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
  ]

  const columns = useFacultyColumns({
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
    onToggleActive: handleToggleActive,
    onVerify: handleVerify,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty"
        description="Manage faculty members and their profiles"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Faculty' }]}
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />Add Faculty
          </Button>
        }
      />

      <SearchWithFilters
        value=""
        onChange={() => {}}
        placeholder="Filter faculty..."
        filters={filters}
        activeFilters={{ status: statusFilter }}
        onFiltersChange={(f) => {
          if (f.status !== undefined) setStatusFilter(f.status)
        }}
      />

      <DataTable
        data={facultyList}
        columns={columns}
        isLoading={loading}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          onPageChange: setCurrentPage,
        }}
        emptyState={{
          icon: GraduationCap,
          title: statusFilter !== 'all' ? 'No faculty found matching your filters' : 'No faculty yet',
          description: statusFilter === 'all' ? 'Get started by adding your first faculty member' : undefined,
          action: statusFilter === 'all' ? (
            <Button onClick={handleCreate} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />Add your first faculty
            </Button>
          ) : undefined,
        }}
        getRowKey={(f) => f._id}
      />

      <FacultyFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        faculty={selectedFaculty}
        mode={modalMode}
      />

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Faculty"
        itemName={selectedFaculty?.name}
      />
    </div>
  )
}
