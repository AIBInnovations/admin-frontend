import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Video } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { PublishConfirmModal } from '@/components/common/PublishConfirmModal'
import { useAuth } from '@/contexts/AuthContext'
import { liveSessionsService, LiveSession } from '@/services/liveSessions.service'
import { ListTable, useListState, useRemoteList } from '@/components/forms/editor/list'
import { ArchiveSessionDock, CancelSessionDock } from '@/components/sessions/SessionDocks'
import { getSessionsColumns } from './SessionsPage.columns'

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

export function SessionsPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('live_sessions.create')
  const canUpdate = hasPermission('live_sessions.update')
  const canDelete = hasPermission('live_sessions.delete')

  const { search, setSearch, query, values, setFilters, page, setPage, filtered, clear } = useListState({ status: 'all', publish_status: 'all' })
  const list = useRemoteList<LiveSession>(
    JSON.stringify([page, query, values]),
    () => liveSessionsService.getAll({
      page,
      limit: 20,
      search: query || undefined,
      status: values.status !== 'all' ? values.status : undefined,
      publish_status: values.publish_status === 'all' ? null : values.publish_status,
    }),
    page,
    setPage,
  )

  const [archiving, setArchiving] = useState<LiveSession | null>(null)
  const [cancelling, setCancelling] = useState<LiveSession | null>(null)
  const [publishModal, setPublishModal] = useState<{ entityId: string; action: 'publish' | 'unpublish' } | null>(null)

  const columns = getSessionsColumns({
    canUpdate,
    canDelete,
    onEdit: (s) => navigate(`/sessions/${s._id}/edit`),
    onCancel: setCancelling,
    onArchive: setArchiving,
    onPublishAction: (entityId, action) => setPublishModal({ entityId, action }),
    onViewAttendees: (s) => navigate(`/sessions/${s._id}/attendees`),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Sessions"
        description="Manage live sessions, scheduling, and capacity"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Live Sessions' }]}
        action={canCreate ? <Button asChild><Link to="/sessions/new"><Plus aria-hidden="true" />Schedule Session</Link></Button> : undefined}
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search by session title..."
        filters={FILTERS}
        activeFilters={values}
        onFiltersChange={(f) => setFilters({ status: f.status, publish_status: f.publish_status })}
      />

      <ListTable
        list={list}
        columns={columns}
        page={page}
        onPage={setPage}
        rowKey={(s) => s._id}
        onRowClick={(s) => navigate(`/sessions/${s._id}`)}
        filtered={filtered}
        filteredTitle="No sessions found matching your filters"
        onClear={clear}
        empty={{
          icon: Video,
          title: 'No live sessions yet',
          description: canCreate ? 'Get started by scheduling your first live session' : undefined,
          action: canCreate ? <Button asChild variant="outline" size="sm"><Link to="/sessions/new"><Plus aria-hidden="true" />Schedule your first session</Link></Button> : undefined,
        }}
      />

      <ArchiveSessionDock session={archiving} onClose={() => setArchiving(null)} onDone={list.refresh} />
      <CancelSessionDock session={cancelling} onClose={() => setCancelling(null)} onDone={() => { toast.success('Session cancelled'); list.refresh() }} />

      {publishModal && (
        <PublishConfirmModal
          open
          onOpenChange={(open) => { if (!open) setPublishModal(null) }}
          entityType="livesession"
          entityId={publishModal.entityId}
          action={publishModal.action}
          onSuccess={list.refresh}
        />
      )}
    </div>
  )
}
