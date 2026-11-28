import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, CalendarRange, FileText, Image, Radio, RotateCcw, Trash2, Video, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { ColumnDef } from '@/components/common/DataTable'
import { StatusPill } from '@/components/common/detail'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { apiService } from '@/services/api.service'
import { ARCHIVE_PATH, archivesService, ArchivedItem } from '@/services/archives.service'
import type { DeleteImpactResponse } from '@/types/api.types'
import { ConfirmDock, impactOf, must } from '@/components/forms/editor/ConfirmDock'
import { ListTable, RowMenu, Tag, useListState, useRemoteList } from '@/components/forms/editor/list'
import { istDay } from '@/components/forms/editor/ist'

const TYPES: Record<ArchivedItem['_type'], { label: string; icon: LucideIcon; path: string }> = {
  video: { label: 'Video', icon: Video, path: ARCHIVE_PATH.video },
  document: { label: 'Document', icon: FileText, path: ARCHIVE_PATH.document },
  banner: { label: 'Banner', icon: Image, path: ARCHIVE_PATH.banner },
  live_session: { label: 'Live Session', icon: Radio, path: ARCHIVE_PATH.live_session },
  // A workshop's days are archived with it and come back with it
  workshop: { label: 'Workshop', icon: CalendarRange, path: ARCHIVE_PATH.workshop },
}
const FILTERS: FilterConfig[] = [
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
      { label: 'Workshops', value: 'workshop' },
    ],
    placeholder: 'Filter by type',
    defaultValue: 'all',
  },
]

function daysRemaining(archivedAt: string): number {
  const due = new Date(archivedAt)
  due.setDate(due.getDate() + 30)
  return Math.max(0, Math.ceil((due.getTime() - Date.now()) / 86400000))
}

function contextOf(item: ArchivedItem): string {
  switch (item._type) {
    case 'video': return item.module_id && typeof item.module_id === 'object' ? item.module_id.name : ''
    case 'document': return item.series_id && typeof item.series_id === 'object' ? item.series_id.name : ''
    case 'banner': return item.is_active ? 'Active' : 'Inactive'
    case 'live_session':
    case 'workshop': return item.subject_id && typeof item.subject_id === 'object' ? item.subject_id.name : ''
    default: return ''
  }
}

export function ArchivesPage() {
  const navigate = useNavigate()
  const { search, setSearch, query, values, setFilters, page, setPage, filtered, clear } = useListState({ type: 'all' })
  const list = useRemoteList<ArchivedItem>(
    JSON.stringify([page, query, values]),
    () => archivesService.getAll({ page, limit: 20, search: query || undefined, type: values.type !== 'all' ? (values.type as ArchivedItem['_type']) : undefined }),
    page,
    setPage,
  )
  const [restoring, setRestoring] = useState<ArchivedItem | null>(null)
  const [deleting, setDeleting] = useState<ArchivedItem | null>(null)
  const label = (item: ArchivedItem | null) => (item ? TYPES[item._type]?.label ?? item._type : 'Item')

  // Banners, live sessions and workshops have their own pages
  const open = (item: ArchivedItem) => {
    if (item._type === 'live_session') navigate(`/sessions/${item._id}`)
    else if (item._type === 'workshop') navigate(`/workshops/${item._id}`)
    else if (item._type === 'banner') navigate(`/content/banners/${item._id}/edit`)
    else setRestoring(item)
  }

  const columns: ColumnDef<ArchivedItem>[] = [
    {
      id: 'item',
      header: 'Item',
      cell: (item) => {
        const Icon = TYPES[item._type]?.icon ?? Archive
        return (
          <div className="flex min-w-[200px] items-center gap-3">
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 max-w-[420px]">
              <p className="truncate text-sm font-medium" title={item.title}>{item.title}</p>
              {contextOf(item) && <p className="truncate text-xs text-muted-foreground">{contextOf(item)}</p>}
            </div>
          </div>
        )
      },
    },
    { id: 'type', header: 'Type', width: 'w-32', cell: (item) => <Tag>{label(item)}</Tag> },
    { id: 'archivedAt', header: 'Archived', width: 'w-32', cell: (item) => <span className="whitespace-nowrap text-[13px] text-muted-foreground">{istDay(item.archivedAt)}</span> },
    {
      id: 'expiresIn',
      header: 'Auto-Delete In',
      width: 'w-32',
      cell: (item) => {
        // A workshop goes with its days (one kept by a recording stays until removed by hand)
        const days = daysRemaining(item.archivedAt)
        return <StatusPill tone={days <= 7 ? 'danger' : days <= 14 ? 'warning' : 'neutral'}>{days === 0 ? 'Today' : `${days} day${days === 1 ? '' : 's'}`}</StatusPill>
      },
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (item) => (
        <RowMenu
          label={`Actions for ${item.title}`}
          actions={[
            { label: 'Restore', icon: RotateCcw, onSelect: () => setRestoring(item) },
            { label: 'Delete Permanently', icon: Trash2, onSelect: () => setDeleting(item), tone: 'danger', separated: true },
          ]}
        />
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
        filters={FILTERS}
        activeFilters={values}
        onFiltersChange={(f) => setFilters({ type: f.type })}
      />

      <ListTable
        list={list}
        columns={columns}
        page={page}
        onPage={setPage}
        rowKey={(i) => `${i._type}-${i._id}`}
        onRowClick={open}
        filtered={filtered}
        filteredTitle={query ? 'No archived items match your filters' : 'No archived items of this type'}
        onClear={clear}
        empty={{ icon: Archive, title: 'No archived items', description: 'Items you archive will appear here for 30 days before permanent deletion' }}
      />

      <ConfirmDock
        open={!!restoring}
        onClose={() => setRestoring(null)}
        title={`Restore ${label(restoring)}`}
        confirmLabel="Restore"
        busyLabel="Restoring..."
        onConfirm={async () => {
          if (!restoring) return
          must(await archivesService.restore(restoring._type, restoring._id), 'Failed to restore')
          toast.success(`${label(restoring)} restored successfully`)
          list.refresh()
        }}
      >
        <p>
          Restore <span className="font-medium text-foreground">{restoring?.title}</span>{restoring && contextOf(restoring) && restoring._type !== 'banner' ? ` to ${contextOf(restoring)}` : ''}? It goes back to its list, and students can see it again if it is published.
          {restoring?._type === 'workshop' && ' Its days come back with it.'}
        </p>
      </ConfirmDock>

      <ConfirmDock
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Permanently Delete"
        confirmLabel="Delete"
        busyLabel="Deleting..."
        tone="danger"
        typeToConfirm={deleting?.title}
        blockedText="Cannot delete. Remove the following dependencies first:"
        loadImpact={deleting ? () => impactOf(apiService.get<DeleteImpactResponse>(`admin/${TYPES[deleting._type]?.path}/${deleting._id}/delete-impact`)) : undefined}
        onConfirm={async () => {
          if (!deleting) return
          must(await archivesService.permanentDelete(deleting._type, deleting._id), 'Failed to delete')
          toast.success('Permanently deleted')
          list.refresh()
        }}
      >
        <p>Delete <span className="font-medium text-foreground">{deleting?.title}</span>{deleting?._type === 'workshop' ? ', its days' : ''} and its files for good? This action cannot be undone.</p>
      </ConfirmDock>
    </div>
  )
}
