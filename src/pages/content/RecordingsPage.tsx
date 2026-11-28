import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Film, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { useAuth } from '@/contexts/AuthContext'
import { recordingsService, Recording } from '@/services/recordings.service'
import { DeleteRecordingDock } from '@/components/recordings/DeleteRecordingDock'
import { loadLiveSessions } from '@/components/recordings/sessions'
import { useOptions } from '@/components/forms/editor/pickers'
import { ListTable, useListState, useRemoteList } from '@/components/forms/editor/list'
import { getRecordingsColumns, sessionTitle } from './RecordingsPage.columns'

const LIMIT = 20
// The list API has no search, so a search reads up to this many rows and
// filters them here.
const SEARCH_ROWS = 1000

export function RecordingsPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('live_sessions.create')

  const { search, setSearch, query, values, setFilters, page, setPage, filtered, clear } = useListState({ session: 'all', status: 'all' })
  const list = useRemoteList<Recording>(
    JSON.stringify([page, query, values]),
    async () => {
      const params = {
        session_id: values.session !== 'all' ? values.session : undefined,
        processing_status: values.status !== 'all' ? values.status : undefined,
      }
      if (!query) return recordingsService.getAll({ ...params, page, limit: LIMIT })
      const res = await recordingsService.getAll({ ...params, page: 1, limit: SEARCH_ROWS })
      if (!res.success || !res.data) return res
      const q = query.toLowerCase()
      const hits = (res.data.entities || []).filter((r) => [r.title, r.description, sessionTitle(r)].some((x) => x?.toLowerCase().includes(q)))
      const totalPages = Math.max(1, Math.ceil(hits.length / LIMIT))
      return {
        ...res,
        data: {
          entities: hits.slice((page - 1) * LIMIT, page * LIMIT),
          pagination: { total: hits.length, page, limit: LIMIT, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
        },
      }
    },
    page,
    setPage,
  )

  const sessions = useOptions(loadLiveSessions)
  const [deleting, setDeleting] = useState<Recording | null>(null)
  const open = (r: Recording) => navigate(`/content/recordings/${r._id}`)

  const filters: FilterConfig[] = useMemo(() => [
    {
      key: 'session',
      label: 'Session',
      type: 'select',
      searchable: true,
      options: [{ value: 'all', label: 'All Sessions' }, ...sessions.options.map((s) => ({ value: s.id, label: s.sub ? `${s.name} (${s.sub})` : s.name }))],
      placeholder: 'Filter by session',
      defaultValue: 'all',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'ready', label: 'Ready' },
        { value: 'processing', label: 'Processing' },
        { value: 'uploading', label: 'Uploading' },
        { value: 'failed', label: 'Failed' },
      ],
      placeholder: 'Filter by status',
      defaultValue: 'all',
    },
  ], [sessions.options])

  const columns = getRecordingsColumns({
    canUpdate: hasPermission('live_sessions.update'),
    canDelete: hasPermission('live_sessions.delete'),
    onEdit: open,
    onDelete: setDeleting,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Session Recordings"
        description="Upload and manage live session recordings"
        action={canCreate ? <Button asChild><Link to="/content/recordings/new"><Plus aria-hidden="true" />Upload Recording</Link></Button> : undefined}
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search recordings..."
        filters={filters}
        activeFilters={values}
        onFiltersChange={(f) => setFilters({ session: f.session, status: f.status })}
      />

      <ListTable
        list={list}
        columns={columns}
        page={page}
        onPage={setPage}
        rowKey={(r) => r._id}
        onRowClick={open}
        filtered={filtered}
        filteredTitle="No recordings found"
        onClear={clear}
        empty={{
          icon: Film,
          title: 'No recordings found',
          description: canCreate ? 'Upload a recording of a live session or a workshop day' : undefined,
          action: canCreate ? <Button asChild variant="outline" size="sm"><Link to="/content/recordings/new"><Plus aria-hidden="true" />Upload Recording</Link></Button> : undefined,
        }}
      />

      <DeleteRecordingDock recording={deleting} onClose={() => setDeleting(null)} onDone={list.refresh} />
    </div>
  )
}
