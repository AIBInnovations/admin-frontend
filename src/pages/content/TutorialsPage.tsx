import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { useAuth } from '@/contexts/AuthContext'
import { tutorialsService, Tutorial } from '@/services/tutorials.service'
import { ConfirmDock, must } from '@/components/forms/editor/ConfirmDock'
import { ListTable, useListState, useRemoteList } from '@/components/forms/editor/list'
import { getTutorialsColumns } from './TutorialsPage.columns'

const FILTERS: FilterConfig[] = [
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

export function TutorialsPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('tutorials.create')

  const { search, setSearch, query, values, setFilters, page, setPage, filtered, clear } = useListState({ status: 'all', publish_status: 'all' })
  const list = useRemoteList<Tutorial>(
    JSON.stringify([page, query, values]),
    () => tutorialsService.getAll({
      page,
      limit: 20,
      search: query || undefined,
      is_active: values.status === 'all' ? null : values.status === 'active',
      publish_status: values.publish_status === 'all' ? null : values.publish_status,
    }),
    page,
    setPage,
  )
  const [deleting, setDeleting] = useState<Tutorial | null>(null)
  const open = (t: Tutorial) => navigate(`/content/tutorials/${t._id}/edit`)

  const columns = getTutorialsColumns({
    canUpdate: hasPermission('tutorials.update'),
    canDelete: hasPermission('tutorials.delete'),
    onEdit: open,
    onDelete: setDeleting,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tutorials"
        description="Manage free tutorial links (videos & PDFs) shown to all app users"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Tutorials' }]}
        action={canCreate ? <Button asChild><Link to="/content/tutorials/new"><Plus aria-hidden="true" />Add Tutorial</Link></Button> : undefined}
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search tutorials..."
        filters={FILTERS}
        activeFilters={values}
        onFiltersChange={(f) => setFilters({ status: f.status, publish_status: f.publish_status })}
      />

      <ListTable
        list={list}
        columns={columns}
        page={page}
        onPage={setPage}
        rowKey={(t) => t._id}
        onRowClick={open}
        filtered={filtered}
        filteredTitle="No tutorials found matching your filters"
        onClear={clear}
        empty={{
          icon: GraduationCap,
          title: 'No tutorials yet',
          description: canCreate ? 'Get started by adding your first free tutorial' : undefined,
          action: canCreate ? <Button asChild variant="outline" size="sm"><Link to="/content/tutorials/new"><Plus aria-hidden="true" />Add your first tutorial</Link></Button> : undefined,
        }}
      />

      <ConfirmDock
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete Tutorial"
        confirmLabel="Delete"
        busyLabel="Deleting..."
        tone="danger"
        onConfirm={async () => {
          if (!deleting) return
          must(await tutorialsService.delete(deleting._id), 'Failed to delete tutorial')
          toast.success('Tutorial deleted successfully')
          list.refresh()
        }}
      >
        <p>Are you sure you want to delete <span className="font-medium text-foreground">{deleting?.title}</span>? This will deactivate the tutorial.</p>
      </ConfirmDock>
    </div>
  )
}
