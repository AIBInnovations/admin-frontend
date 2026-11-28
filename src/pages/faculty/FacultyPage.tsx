import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useServerSearch } from '@/hooks/useServerSearch'
import { useResetPageOnChange } from '@/hooks/useResetPageOnChange'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { PageHeader } from '@/components/common/PageHeader'
import { apiErrorMessage } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { Plus, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import type { DeleteImpactResponse } from '@/types/api.types'
import { facultyService, Faculty } from '@/services/faculty.service'
import { subjectsService } from '@/services/subjects.service'
import { StaleNotice } from '@/pages/feedback/components/StaleNotice'
import { useFacultyColumns } from './FacultyPage.columns'

const STATUSES = ['all', 'active', 'inactive']
const startPage = (params: URLSearchParams) => {
  const n = Number(params.get('page'))
  return Number.isInteger(n) && n > 0 ? n : 1
}

export function FacultyPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('faculty.create')
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [facultyList, setFacultyList] = useState<Faculty[] | null>(null)
  const { inputValue: search, setInputValue: setSearch, debouncedSearch } = useServerSearch(searchParams.get('search') || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState(STATUSES.includes(searchParams.get('status') || '') ? searchParams.get('status')! : 'all')
  const [subjectFilter, setSubjectFilter] = useState(searchParams.get('subject') || 'all')
  const [subjects, setSubjects] = useState<{ _id: string; name: string }[]>([])
  const [currentPage, setCurrentPage] = useState(startPage(searchParams))
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null)
  const [deleteImpact, setDeleteImpact] = useState<DeleteImpactResponse | null>(null)
  const [loadingDeleteImpact, setLoadingDeleteImpact] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const impactFor = useRef<string | null>(null)

  const { nextFetchId, isStale } = useLatestFetch()

  // Fetch faculty
  const fetchFaculty = useCallback(async () => {
    const fetchId = nextFetchId()
    setLoading(true)
    try {
      const response = await facultyService.getAll({
        page: currentPage,
        limit: 20,
        search: debouncedSearch || undefined,
        is_active: statusFilter === 'all' ? null : statusFilter === 'active',
        subject_id: subjectFilter === 'all' ? undefined : subjectFilter,
        with_rating: true,
      })
      if (isStale(fetchId)) return
      if (!response.success || !response.data) throw new Error(response.message)

      const rows = response.data.entities || []
      const pages = response.data.pagination?.totalPages || 1
      // The last row of the last page was deleted: step back
      if (rows.length === 0 && currentPage > 1) {
        setCurrentPage(Math.min(currentPage - 1, pages))
        return
      }
      setFacultyList(rows)
      setTotalPages(pages)
      setTotalCount(response.data.pagination?.total || 0)
      setError(null)
    } catch (err) {
      if (isStale(fetchId)) return
      setError(apiErrorMessage(err, 'Failed to load faculty'))
    } finally {
      if (!isStale(fetchId)) setLoading(false)
    }
  }, [currentPage, debouncedSearch, statusFilter, subjectFilter, nextFetchId, isStale])

  useEffect(() => { fetchFaculty() }, [fetchFaculty])

  useEffect(() => {
    let live = true
    subjectsService.getSubjects({ limit: 200, sort_by: 'name', sort_order: 'asc' })
      .then((r) => { if (live) setSubjects((r.data?.entities ?? []).map((s) => ({ _id: s._id, name: s.name }))) })
      .catch(() => {})
    return () => { live = false }
  }, [])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (debouncedSearch) params.search = debouncedSearch
    if (statusFilter !== 'all') params.status = statusFilter
    if (subjectFilter !== 'all') params.subject = subjectFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params, { replace: true })
  }, [debouncedSearch, statusFilter, subjectFilter, currentPage, setSearchParams])

  useResetPageOnChange(setCurrentPage, [debouncedSearch, statusFilter, subjectFilter])

  const handleDeleteClick = async (faculty: Faculty) => {
    setSelectedFaculty(faculty)
    setDeleteModalOpen(true)
    setLoadingDeleteImpact(true)
    setDeleteImpact(null)
    impactFor.current = faculty._id
    try {
      const response = await facultyService.getDeleteImpact(faculty._id)
      if (impactFor.current !== faculty._id) return
      if (!response.success || !response.data) throw new Error(response.message)
      setDeleteImpact(response.data)
    } catch (err) {
      if (impactFor.current === faculty._id) toast.error(apiErrorMessage(err, 'Failed to check delete impact'))
    } finally {
      if (impactFor.current === faculty._id) setLoadingDeleteImpact(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedFaculty) return
    try {
      const response = await facultyService.delete(selectedFaculty._id)
      if (!response.success) throw new Error(response.message)
      toast.success('Faculty deleted successfully')
      fetchFaculty()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to delete faculty'))
      throw err
    }
  }

  const change = async (faculty: Faculty, run: () => Promise<{ success: boolean; message: string }>, done: string, failed: string) => {
    if (pendingId) return
    setPendingId(faculty._id)
    try {
      const response = await run()
      if (!response.success) throw new Error(response.message)
      toast.success(done)
      await fetchFaculty()
    } catch (err) {
      toast.error(apiErrorMessage(err, failed))
    } finally {
      setPendingId(null)
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
    {
      key: 'subject',
      label: 'Subject',
      type: 'select',
      searchable: true,
      options: [{ label: 'All subjects', value: 'all' }, ...subjects.map((s) => ({ label: s.name, value: s._id }))],
      placeholder: 'Filter by subject',
      defaultValue: 'all',
    },
  ]

  const columns = useFacultyColumns({
    onEdit: hasPermission('faculty.update') ? (f) => navigate(`/faculty/${f._id}/edit`) : undefined,
    onDelete: hasPermission('faculty.delete') ? handleDeleteClick : undefined,
    onToggleActive: hasPermission('faculty.update')
      ? (f) => change(f, () => facultyService.toggleActive(f._id, !f.is_active), `Faculty ${!f.is_active ? 'activated' : 'deactivated'} successfully`, 'Failed to update status')
      : undefined,
    onVerify: hasPermission('faculty.update')
      ? (f) => change(f, () => facultyService.verifyFaculty(f._id, true), 'Faculty verified successfully', 'Failed to verify faculty')
      : undefined,
    showRating: hasPermission('videos.read'),
    pendingId,
  })

  const filtered = !!debouncedSearch || statusFilter !== 'all' || subjectFilter !== 'all'
  const clearFilters = () => { setSearch(''); setStatusFilter('all'); setSubjectFilter('all') }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty"
        description="Manage faculty members and their profiles"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Faculty' }]}
        action={canCreate ? (
          <Button onClick={() => navigate('/faculty/new')}>
            <Plus className="mr-2 h-4 w-4" />Add Faculty
          </Button>
        ) : undefined}
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search name, email or code (PGMEF001)"
        filters={filters}
        activeFilters={{ status: statusFilter, subject: subjectFilter }}
        onFiltersChange={(f) => {
          if (f.status !== undefined) setStatusFilter(f.status)
          if (f.subject !== undefined) setSubjectFilter(f.subject)
        }}
        action={filtered ? <Button variant="ghost" className="self-start" onClick={clearFilters}>Clear filters</Button> : undefined}
      />

      {facultyList && <StaleNotice error={error} onRetry={fetchFaculty} />}

      <DataTable
        data={facultyList ?? []}
        columns={columns}
        isLoading={loading && !pendingId}
        error={facultyList ? null : error}
        onRetry={fetchFaculty}
        onRowClick={(f) => navigate(`/faculty/${f._id}`)}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          onPageChange: setCurrentPage,
        }}
        emptyState={{
          icon: GraduationCap,
          title: filtered ? 'No faculty found matching your filters' : 'No faculty yet',
          description: !filtered ? 'Get started by adding your first faculty member' : undefined,
          action: filtered ? (
            <Button onClick={clearFilters} variant="outline" size="sm">Clear filters</Button>
          ) : canCreate ? (
            <Button onClick={() => navigate('/faculty/new')} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />Add your first faculty
            </Button>
          ) : undefined,
        }}
        getRowKey={(f) => f._id}
      />

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setDeleteImpact(null); impactFor.current = null }}
        onConfirm={handleDeleteConfirm}
        title="Delete Faculty"
        itemName={selectedFaculty?.name}
        isLoadingImpact={loadingDeleteImpact}
        blocked={deleteImpact?.blocked}
        warning={deleteImpact?.dependencies?.length ? {
          message: deleteImpact.blocked
            ? 'Cannot delete. Remove the following dependencies first:'
            : 'The following associated data will be affected:',
          details: deleteImpact.dependencies.map(d => ({
            label: d.label,
            count: d.count,
            blocking: d.blocking,
          })),
        } : undefined}
      />
    </div>
  )
}
