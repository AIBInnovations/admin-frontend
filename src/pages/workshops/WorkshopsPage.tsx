import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarRange, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { useAuth } from '@/contexts/AuthContext'
import { workshopsService, Workshop } from '@/services/workshops.service'
import { ListTable, useListState, useRemoteList } from '@/components/forms/editor/list'
import { ArchiveWorkshopDock, CancelWorkshopDock, PublishWorkshopDock } from '@/components/workshops/WorkshopDocks'
import { getWorkshopsColumns } from './WorkshopsPage.columns'

const FILTERS: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'All Status', value: 'all' },
      { label: 'Scheduled', value: 'scheduled' },
      { label: 'Live', value: 'live' },
      { label: 'Completed', value: 'completed' },
      { label: 'Cancelled', value: 'cancelled' },
    ],
    placeholder: 'Filter by status',
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

export function WorkshopsPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('live_sessions.create')

  const { search, setSearch, query, values, setFilters, page, setPage, filtered, clear } = useListState({ status: 'all', publish_status: 'all' })
  const list = useRemoteList<Workshop>(
    JSON.stringify([page, query, values]),
    () => workshopsService.getAll({
      page,
      limit: 20,
      search: query || undefined,
      status: values.status !== 'all' ? values.status : undefined,
      publish_status: values.publish_status === 'all' ? null : values.publish_status,
    }),
    page,
    setPage,
  )

  const [archiving, setArchiving] = useState<Workshop | null>(null)
  const [cancelling, setCancelling] = useState<Workshop | null>(null)
  const [publishing, setPublishing] = useState<{ workshop: Workshop; action: 'publish' | 'unpublish' } | null>(null)

  const columns = getWorkshopsColumns({
    canUpdate: hasPermission('live_sessions.update'),
    canDelete: hasPermission('live_sessions.delete'),
    onEdit: (w) => navigate(`/workshops/${w._id}/edit`),
    onCancel: setCancelling,
    onArchive: setArchiving,
    onPublishAction: (workshop, action) => setPublishing({ workshop, action }),
    onViewEnrollees: (w) => navigate(`/workshops/${w._id}/enrollees`),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workshops"
        description="Multi-day live programmes — one purchase covers every day"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Workshops' }]}
        action={canCreate ? <Button asChild><Link to="/workshops/new"><Plus aria-hidden="true" />Create Workshop</Link></Button> : undefined}
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search by workshop title..."
        filters={FILTERS}
        activeFilters={values}
        onFiltersChange={(f) => setFilters({ status: f.status, publish_status: f.publish_status })}
      />

      <ListTable
        list={list}
        columns={columns}
        page={page}
        onPage={setPage}
        rowKey={(w) => w._id}
        onRowClick={(w) => navigate(`/workshops/${w._id}`)}
        filtered={filtered}
        filteredTitle="No workshops found matching your filters"
        onClear={clear}
        empty={{
          icon: CalendarRange,
          title: 'No workshops yet',
          description: canCreate ? 'Get started by creating your first multi-day workshop' : undefined,
          action: canCreate ? <Button asChild variant="outline" size="sm"><Link to="/workshops/new"><Plus aria-hidden="true" />Create your first workshop</Link></Button> : undefined,
        }}
      />

      <ArchiveWorkshopDock workshop={archiving} onClose={() => setArchiving(null)} onDone={list.refresh} />
      <CancelWorkshopDock workshop={cancelling} onClose={() => setCancelling(null)} onDone={list.refresh} />
      <PublishWorkshopDock workshop={publishing?.workshop ?? null} action={publishing?.action ?? 'publish'} onClose={() => setPublishing(null)} onDone={list.refresh} />
    </div>
  )
}
