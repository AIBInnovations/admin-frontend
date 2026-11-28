import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Image, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { PublishConfirmModal } from '@/components/common/PublishConfirmModal'
import { useAuth } from '@/contexts/AuthContext'
import { bannersService, Banner } from '@/services/banners.service'
import { ConfirmDock, impactOf, must } from '@/components/forms/editor/ConfirmDock'
import { ListTable, useListState, useRemoteList } from '@/components/forms/editor/list'
import { getBannersColumns } from './BannersPage.columns'

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

export function BannersPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('banners.create')

  const { search, setSearch, query, values, setFilters, page, setPage, filtered, clear } = useListState({ status: 'all', publish_status: 'all' })
  const list = useRemoteList<Banner>(
    JSON.stringify([page, query, values]),
    () => bannersService.getAll({
      page,
      limit: 20,
      search: query || undefined,
      is_active: values.status === 'all' ? null : values.status === 'active',
      publish_status: values.publish_status === 'all' ? null : values.publish_status,
    }),
    page,
    setPage,
  )

  const [archiving, setArchiving] = useState<Banner | null>(null)
  const [publishModal, setPublishModal] = useState<{ entityId: string; action: 'publish' | 'unpublish' } | null>(null)
  const open = (b: Banner) => navigate(`/content/banners/${b._id}/edit`)

  const columns = getBannersColumns({
    canUpdate: hasPermission('banners.update'),
    canDelete: hasPermission('banners.delete'),
    onEdit: open,
    onArchive: setArchiving,
    onPublishAction: (b, action) => setPublishModal({ entityId: b._id, action }),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banners"
        description="Manage homepage banners and promotions"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Banners' }]}
        action={canCreate ? <Button asChild><Link to="/content/banners/new"><Plus aria-hidden="true" />Add Banner</Link></Button> : undefined}
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search banners..."
        filters={FILTERS}
        activeFilters={values}
        onFiltersChange={(f) => setFilters({ status: f.status, publish_status: f.publish_status })}
      />

      <ListTable
        list={list}
        columns={columns}
        page={page}
        onPage={setPage}
        rowKey={(b) => b._id}
        onRowClick={open}
        filtered={filtered}
        filteredTitle="No banners found matching your filters"
        onClear={clear}
        empty={{
          icon: Image,
          title: 'No banners yet',
          description: canCreate ? 'Get started by adding your first banner' : undefined,
          action: canCreate ? <Button asChild variant="outline" size="sm"><Link to="/content/banners/new"><Plus aria-hidden="true" />Add your first banner</Link></Button> : undefined,
        }}
      />

      <ConfirmDock
        open={!!archiving}
        onClose={() => setArchiving(null)}
        title="Archive Banner"
        confirmLabel="Archive"
        busyLabel="Archiving..."
        blockedText="Cannot archive. Remove dependencies first:"
        loadImpact={archiving ? () => impactOf(bannersService.getDeleteImpact(archiving._id)) : undefined}
        onConfirm={async () => {
          if (!archiving) return
          must(await bannersService.archive(archiving._id), 'Failed to archive banner')
          toast.success('Banner archived successfully')
          list.refresh()
        }}
      >
        <p>Are you sure you want to archive <span className="font-medium text-foreground">{archiving?.title}</span>?</p>
        <p>Archived items are hidden from the app and will be permanently deleted after 30 days. You can restore them from the Archives page at any time before that.</p>
      </ConfirmDock>

      {publishModal && (
        <PublishConfirmModal
          open
          onOpenChange={(o) => { if (!o) setPublishModal(null) }}
          entityType="banner"
          entityId={publishModal.entityId}
          action={publishModal.action}
          onSuccess={() => { setPublishModal(null); list.refresh() }}
        />
      )}
    </div>
  )
}
