import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useServerSearch } from '@/hooks/useServerSearch'
import { useResetPageOnChange } from '@/hooks/useResetPageOnChange'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { VideoTagFormModal } from '@/components/videoTags/VideoTagFormModal'
import { Plus, Tags } from 'lucide-react'
import { toast } from 'sonner'
import type { DeleteImpactResponse } from '@/types/api.types'
import { videoTagsService, VideoTag, VideoTagFormData } from '@/services/videoTags.service'
import { useVideoTagsColumns } from './VideoTagsPage.columns'

export function VideoTagsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [tags, setTags] = useState<VideoTag[]>([])
  const [loading, setLoading] = useState(true)
  const { inputValue: search, setInputValue: setSearch, debouncedSearch } = useServerSearch('')
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedTag, setSelectedTag] = useState<VideoTag | null>(null)
  const [deleteImpact, setDeleteImpact] = useState<DeleteImpactResponse | null>(null)
  const [loadingDeleteImpact, setLoadingDeleteImpact] = useState(false)

  // Collect unique categories from loaded tags for filter
  const categories = Array.from(new Set(tags.map((t) => t.category).filter(Boolean))) as string[]

  const { nextFetchId, isStale } = useLatestFetch()

  // Fetch tags
  const fetchTags = useCallback(async () => {
    const fetchId = nextFetchId()
    setLoading(true)
    try {
      const response = await videoTagsService.getAll({
        page: currentPage,
        limit: 20,
        search: debouncedSearch || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
      })
      if (isStale(fetchId)) return

      if (response.success && response.data) {
        setTags(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      } else {
        toast.error(response.message || 'Failed to load video tags')
      }
    } catch (error: any) {
      if (isStale(fetchId)) return
      toast.error(error.message || 'Failed to load video tags')
    } finally {
      if (!isStale(fetchId)) setLoading(false)
    }
  }, [currentPage, debouncedSearch, categoryFilter, nextFetchId, isStale])

  useEffect(() => { fetchTags() }, [fetchTags])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (categoryFilter !== 'all') params.category = categoryFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [categoryFilter, currentPage, setSearchParams])

  useResetPageOnChange(setCurrentPage, [debouncedSearch, categoryFilter])

  // Handlers
  const handleCreate = () => {
    setModalMode('create')
    setSelectedTag(null)
    setFormModalOpen(true)
  }

  const handleEdit = (tag: VideoTag) => {
    setModalMode('edit')
    setSelectedTag(tag)
    setFormModalOpen(true)
  }

  const handleDeleteClick = async (tag: VideoTag) => {
    setSelectedTag(tag)
    setDeleteModalOpen(true)
    setLoadingDeleteImpact(true)
    setDeleteImpact(null)
    try {
      const response = await videoTagsService.getDeleteImpact(tag._id)
      if (response.success && response.data) {
        setDeleteImpact(response.data)
      } else {
        toast.error(response.message || 'Failed to check delete impact')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to check delete impact')
      setDeleteImpact(null)
    } finally {
      setLoadingDeleteImpact(false)
    }
  }

  const handleFormSubmit = async (data: VideoTagFormData) => {
    try {
      if (modalMode === 'create') {
        const response = await videoTagsService.create(data)
        if (response.success) {
          toast.success('Tag created successfully')
          fetchTags()
        } else {
          toast.error(response.message || 'Failed to create tag')
          throw new Error(response.message || 'Failed to create tag')
        }
      } else if (selectedTag) {
        const response = await videoTagsService.update(selectedTag._id, data)
        if (response.success) {
          toast.success('Tag updated successfully')
          fetchTags()
        } else {
          toast.error(response.message || 'Failed to update tag')
          throw new Error(response.message || 'Failed to update tag')
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save tag')
      throw error
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedTag) return
    try {
      const response = await videoTagsService.delete(selectedTag._id)
      if (response.success) {
        toast.success('Tag deleted successfully')
        fetchTags()
      } else {
        toast.error(response.message || 'Failed to delete tag')
        throw new Error(response.message || 'Failed to delete tag')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete tag')
      throw error
    }
  }

  // Filters
  const filters: FilterConfig[] = [
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      options: [
        { label: 'All Categories', value: 'all' },
        ...categories.map((c) => ({ label: c, value: c })),
      ],
      placeholder: 'Filter by category',
      defaultValue: 'all',
    },
  ]

  const columns = useVideoTagsColumns({
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
  })

  const hasFilters = categoryFilter !== 'all'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Video Tags"
        description="Manage tags for video categorization and discovery"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Video Tags' }]}
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />Add Tag
          </Button>
        }
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search by tag name..."
        filters={filters}
        activeFilters={{ category: categoryFilter }}
        onFiltersChange={(f) => {
          if (f.category !== undefined) setCategoryFilter(f.category)
        }}
      />

      <DataTable
        data={tags}
        columns={columns}
        isLoading={loading}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          onPageChange: setCurrentPage,
        }}
        emptyState={{
          icon: Tags,
          title: debouncedSearch || hasFilters ? 'No tags found matching your criteria' : 'No tags yet',
          description: !debouncedSearch && !hasFilters ? 'Get started by creating your first tag' : undefined,
          action: !debouncedSearch && !hasFilters ? (
            <Button onClick={handleCreate} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />Create your first tag
            </Button>
          ) : undefined,
        }}
        getRowKey={(tag) => tag._id}
      />

      <VideoTagFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        tag={selectedTag}
        mode={modalMode}
      />

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setDeleteImpact(null); }}
        onConfirm={handleDeleteConfirm}
        title="Delete Tag"
        itemName={selectedTag?.name}
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
