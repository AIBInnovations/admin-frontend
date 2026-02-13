import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { VideoTagFormModal } from '@/components/videoTags/VideoTagFormModal'
import { Plus, Tags } from 'lucide-react'
import { toast } from 'sonner'
import { videoTagsService, VideoTag, VideoTagFormData } from '@/services/videoTags.service'
import { useVideoTagsColumns } from './VideoTagsPage.columns'

export function VideoTagsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [tags, setTags] = useState<VideoTag[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedTag, setSelectedTag] = useState<VideoTag | null>(null)

  // Collect unique categories from loaded tags for filter
  const categories = Array.from(new Set(tags.map((t) => t.category).filter(Boolean))) as string[]

  // Client-side search filter
  const filteredTags = search ? tags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase())) : tags

  // Fetch tags
  const fetchTags = useCallback(async () => {
    try {
      setLoading(true)
      const response = await videoTagsService.getAll({
        page: currentPage,
        limit: 20,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
      })

      if (response.success && response.data) {
        setTags(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      }
    } catch (error) {
      toast.error('Failed to load video tags')
      setTags([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, categoryFilter])

  useEffect(() => { fetchTags() }, [fetchTags])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (categoryFilter !== 'all') params.category = categoryFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [categoryFilter, currentPage, setSearchParams])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [categoryFilter])

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

  const handleDeleteClick = (tag: VideoTag) => {
    setSelectedTag(tag)
    setDeleteModalOpen(true)
  }

  const handleFormSubmit = async (data: VideoTagFormData) => {
    try {
      if (modalMode === 'create') {
        const response = await videoTagsService.create(data)
        if (response.success) {
          toast.success('Tag created successfully')
          fetchTags()
        }
      } else if (selectedTag) {
        const response = await videoTagsService.update(selectedTag._id, data)
        if (response.success) {
          toast.success('Tag updated successfully')
          fetchTags()
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
        data={filteredTags}
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
          title: search || hasFilters ? 'No tags found matching your criteria' : 'No tags yet',
          description: !search && !hasFilters ? 'Get started by creating your first tag' : undefined,
          action: !search && !hasFilters ? (
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
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Tag"
        itemName={selectedTag?.name}
      />
    </div>
  )
}
