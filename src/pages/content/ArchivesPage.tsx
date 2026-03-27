import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, ColumnDef } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { Archive, RotateCcw, Trash2, Video, FileText, Image, Radio, MoreVertical } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { archivesService, ArchivedItem } from '@/services/archives.service'

const typeIcons: Record<string, React.ReactNode> = {
  video: <Video className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  banner: <Image className="h-4 w-4" />,
  live_session: <Radio className="h-4 w-4" />,
}

const typeBadgeColors: Record<string, string> = {
  video: 'bg-blue-500/10 text-blue-600 border-blue-200',
  document: 'bg-red-500/10 text-red-600 border-red-200',
  banner: 'bg-purple-500/10 text-purple-600 border-purple-200',
  live_session: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
}

const typeLabels: Record<string, string> = {
  video: 'Video',
  document: 'Document',
  banner: 'Banner',
  live_session: 'Live Session',
}

function getDaysRemaining(archivedAt: string): number {
  const archived = new Date(archivedAt)
  const deleteDate = new Date(archived)
  deleteDate.setDate(deleteDate.getDate() + 30)
  const now = new Date()
  return Math.max(0, Math.ceil((deleteDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
}

export function ArchivesPage() {
  const [items, setItems] = useState<ArchivedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ArchivedItem | null>(null)

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      const response = await archivesService.getAll({
        page: currentPage,
        limit: 20,
        type: typeFilter !== 'all' ? typeFilter as any : undefined,
      })

      if (response.success && response.data) {
        setItems(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      } else {
        toast.error(response.message || 'Failed to load archives')
        setItems([])
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load archives')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, typeFilter])

  useEffect(() => { fetchItems() }, [fetchItems])

  useEffect(() => { setCurrentPage(1) }, [typeFilter])

  const handleRestore = async (item: ArchivedItem) => {
    try {
      const response = await archivesService.restore(item._type, item._id)
      if (response.success) {
        toast.success(`${typeLabels[item._type] || item._type} restored successfully`)
        fetchItems()
      } else {
        toast.error(response.message || 'Failed to restore')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to restore')
    }
  }

  const handleDeleteClick = (item: ArchivedItem) => {
    setSelectedItem(item)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedItem) return
    try {
      const response = await archivesService.permanentDelete(selectedItem._type, selectedItem._id)
      if (response.success) {
        toast.success('Permanently deleted')
        fetchItems()
      } else {
        toast.error(response.message || 'Failed to delete')
        throw new Error(response.message || 'Failed to delete')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete')
      throw error
    }
  }

  const filters: FilterConfig[] = [
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { label: 'All Types', value: 'all' },
        { label: 'Videos', value: 'video' },
        { label: 'Documents', value: 'document' },
        { label: 'Banners', value: 'banner' },
        { label: 'Live Sessions', value: 'live_session' },
      ],
      placeholder: 'Filter by type',
      defaultValue: 'all',
    },
  ]

  const filteredItems = search
    ? items.filter((item) => item.title.toLowerCase().includes(search.toLowerCase()))
    : items

  const columns: ColumnDef<ArchivedItem>[] = [
    {
      id: 'item',
      header: 'Item',
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            {typeIcons[item._type]}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{item.title}</p>
            <p className="text-xs text-muted-foreground">
              {item._type === 'video' && item.module_id && typeof item.module_id === 'object' ? item.module_id.name : ''}
              {item._type === 'document' && item.series_id && typeof item.series_id === 'object' ? item.series_id.name : ''}
              {item._type === 'banner' ? (item.is_active ? 'Active' : 'Inactive') : ''}
              {item._type === 'live_session' && item.subject_id && typeof item.subject_id === 'object' ? item.subject_id.name : ''}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      width: 'w-28',
      cell: (item) => (
        <Badge className={`text-[10px] ${typeBadgeColors[item._type] || ''}`}>
          {typeLabels[item._type] || item._type}
        </Badge>
      ),
    },
    {
      id: 'archivedAt',
      header: 'Archived',
      width: 'w-32',
      cell: (item) => (
        <span className="text-xs text-muted-foreground">
          {new Date(item.archivedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      id: 'expiresIn',
      header: 'Auto-Delete In',
      width: 'w-32',
      cell: (item) => {
        const days = getDaysRemaining(item.archivedAt)
        return (
          <Badge className={`text-[10px] ${
            days <= 7
              ? 'bg-red-500/10 text-red-600 border-red-200'
              : days <= 14
                ? 'bg-amber-500/10 text-amber-600 border-amber-200'
                : 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
          }`}>
            {days} days
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleRestore(item)}>
              <RotateCcw className="mr-2 h-4 w-4" />Restore
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleDeleteClick(item)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />Delete Permanently
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Archives"
        description="Archived items are hidden from the app and auto-deleted after 30 days"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Archives' }]}
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search archived items..."
        filters={filters}
        activeFilters={{ type: typeFilter }}
        onFiltersChange={(f) => {
          if (f.type !== undefined) setTypeFilter(f.type)
        }}
      />

      <DataTable
        data={filteredItems}
        columns={columns}
        isLoading={loading}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          onPageChange: setCurrentPage,
        }}
        emptyState={{
          icon: Archive,
          title: typeFilter !== 'all' ? 'No archived items of this type' : 'No archived items',
          description: 'Items you archive will appear here for 30 days before permanent deletion',
        }}
        getRowKey={(item) => `${item._type}-${item._id}`}
      />

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Permanently Delete"
        itemName={selectedItem?.title}
        requireConfirmation
      />
    </div>
  )
}
