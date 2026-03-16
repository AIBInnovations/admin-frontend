import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { FormFormModal } from '@/components/forms/FormFormModal'
import { Plus, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { formsService, Form, FormFormData } from '@/services/forms.service'
import { subjectsService, Subject } from '@/services/subjects.service'
import { useFormsColumns } from './FormsPage.columns'

export function FormsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [subjectFilter, setSubjectFilter] = useState(searchParams.get('subject') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [subjects, setSubjects] = useState<Subject[]>([])

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedForm, setSelectedForm] = useState<Form | null>(null)
  const [deleteImpactLoading, setDeleteImpactLoading] = useState(false)
  const [deleteWarning, setDeleteWarning] = useState<string | undefined>()

  // Client-side search filter
  const filteredForms = search
    ? forms.filter((f) => f.title.toLowerCase().includes(search.toLowerCase()))
    : forms

  // Load subjects for filter dropdown
  useEffect(() => {
    subjectsService.getSubjects({ page: 1, limit: 100 }).then((res) => {
      if (res.success && res.data) {
        setSubjects(res.data.entities || [])
      }
    }).catch(() => { /* subjects filter will just be empty */ })
  }, [])

  // Fetch forms
  const fetchForms = useCallback(async () => {
    try {
      setLoading(true)
      const response = await formsService.getAll({
        page: currentPage,
        limit: 20,
        is_active: statusFilter === 'all' ? null : statusFilter === 'active',
        subject_id: subjectFilter === 'all' ? null : subjectFilter,
      })

      if (response.success && response.data) {
        setForms(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      } else {
        toast.error(response.message || 'Failed to load forms')
        setForms([])
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load forms')
      setForms([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, statusFilter, subjectFilter])

  useEffect(() => { fetchForms() }, [fetchForms])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (statusFilter !== 'all') params.status = statusFilter
    if (subjectFilter !== 'all') params.subject = subjectFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [search, statusFilter, subjectFilter, currentPage, setSearchParams])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, subjectFilter])

  // Handlers
  const handleCreate = () => {
    setModalMode('create')
    setSelectedForm(null)
    setFormModalOpen(true)
  }

  const handleEdit = (form: Form) => {
    setModalMode('edit')
    setSelectedForm(form)
    setFormModalOpen(true)
  }

  const handleDeleteClick = async (form: Form) => {
    setSelectedForm(form)
    setDeleteImpactLoading(true)
    setDeleteModalOpen(true)
    try {
      const impact = await formsService.getDeleteImpact(form._id)
      if (impact.success && impact.data) {
        const deps = impact.data.dependencies || []
        const msg = deps.map((d: any) => d.message).join('. ')
        setDeleteWarning(msg || undefined)
      }
    } catch {
      setDeleteWarning(undefined)
    } finally {
      setDeleteImpactLoading(false)
    }
  }

  const handleToggleActive = async (form: Form) => {
    try {
      const response = await formsService.toggleActive(form._id)
      if (response.success) {
        toast.success(`Form ${form.is_active ? 'deactivated' : 'activated'}`)

        fetchForms()
      } else {
        toast.error(response.message || 'Failed to toggle status')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle status')
    }
  }

  const handleViewSubmissions = (form: Form) => {
    navigate(`/content/forms/${form._id}/submissions`)
  }

  const handleFormSubmit = async (data: FormFormData) => {
    try {
      if (modalMode === 'create') {
        const response = await formsService.create(data)
        if (response.success) {
          toast.success('Form created successfully')
          fetchForms()
        } else {
          toast.error(response.message || 'Failed to create form')
          throw new Error(response.message)
        }
      } else if (selectedForm) {
        const response = await formsService.update(selectedForm._id, data)
        if (response.success) {
          toast.success('Form updated successfully')
          fetchForms()
        } else {
          toast.error(response.message || 'Failed to update form')
          throw new Error(response.message)
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save form')
      throw error
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedForm) return
    try {
      const response = await formsService.delete(selectedForm._id)
      if (response.success) {
        toast.success('Form deleted successfully')
        fetchForms()
      } else {
        toast.error(response.message || 'Failed to delete form')
        throw new Error(response.message)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete form')
      throw error
    }
  }

  // Filters
  const subjectOptions = [
    { label: 'All Subjects', value: 'all' },
    ...subjects.map((s) => ({ label: s.name, value: s._id })),
  ]

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
    {
      key: 'subject',
      label: 'Subject',
      type: 'select',
      options: subjectOptions,
      placeholder: 'Filter by subject',
      defaultValue: 'all',
    },
  ]

  const columns = useFormsColumns({
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
    onToggleActive: handleToggleActive,
    onViewSubmissions: handleViewSubmissions,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Forms"
        description="Manage registration forms for examiners and examinees"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Forms' }]}
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />Add Form
          </Button>
        }
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search forms..."
        filters={filters}
        activeFilters={{ status: statusFilter, subject: subjectFilter }}
        onFiltersChange={(f) => {
          if (f.status !== undefined) setStatusFilter(f.status)
          if (f.subject !== undefined) setSubjectFilter(f.subject)
        }}
      />

      <DataTable
        data={filteredForms}
        columns={columns}
        isLoading={loading}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          onPageChange: setCurrentPage,
        }}
        emptyState={{
          icon: FileText,
          title: search || statusFilter !== 'all' || subjectFilter !== 'all'
            ? 'No forms found matching your filters'
            : 'No forms yet',
          description: !search && statusFilter === 'all' && subjectFilter === 'all'
            ? 'Get started by creating your first form'
            : undefined,
          action: !search && statusFilter === 'all' && subjectFilter === 'all' ? (
            <Button onClick={handleCreate} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />Create your first form
            </Button>
          ) : undefined,
        }}
        getRowKey={(form) => form._id}
      />

      <FormFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        form={selectedForm}
        mode={modalMode}
      />

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Form"
        itemName={selectedForm?.title}
        warning={deleteWarning}
        isLoadingImpact={deleteImpactLoading}
      />
    </div>
  )
}
