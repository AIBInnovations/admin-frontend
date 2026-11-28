import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { PublishConfirmModal } from '@/components/common/PublishConfirmModal'
import { useAuth } from '@/contexts/AuthContext'
import { homeSectionsService, HomeSection, HomeSectionFormData } from '@/services/homeSections.service'
import { HomeSectionFormModal } from '@/components/homeSections/HomeSectionFormModal'
import { DeleteSectionDock } from '@/components/homeSections/DeleteSectionDock'
import { must } from '@/components/forms/editor/ConfirmDock'
import { ListTable, useListState, useRemoteList } from '@/components/forms/editor/list'
import { getHomeSectionsColumns } from './HomeSectionsPage.columns'

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

export function HomeSectionsPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('home-sections.create')

  const { search, setSearch, query, values, setFilters, page, setPage, filtered, clear } = useListState({ status: 'all', publish_status: 'all' })
  const list = useRemoteList<HomeSection>(
    JSON.stringify([page, query, values]),
    () => homeSectionsService.getAll({
      page,
      limit: 20,
      search: query || undefined,
      is_active: values.status === 'all' ? null : values.status === 'active',
      publish_status: values.publish_status === 'all' ? null : values.publish_status,
    }),
    page,
    setPage,
  )

  const [editing, setEditing] = useState<{ section: HomeSection | null } | null>(null)
  const [deleting, setDeleting] = useState<HomeSection | null>(null)
  const [publishModal, setPublishModal] = useState<{ entityId: string; action: 'publish' | 'unpublish' } | null>(null)
  const open = (s: HomeSection) => navigate(`/content/home-sections/${s._id}`)

  const save = async (data: HomeSectionFormData) => {
    const section = editing?.section
    if (section) must(await homeSectionsService.update(section._id, data), 'Failed to update home section')
    else must(await homeSectionsService.create(data), 'Failed to create home section')
    toast.success(section ? 'Home section updated successfully' : 'Home section created successfully')
    list.refresh()
  }

  const columns = getHomeSectionsColumns({
    canUpdate: hasPermission('home-sections.update'),
    canDelete: hasPermission('home-sections.delete'),
    onEdit: (section) => setEditing({ section }),
    onDelete: setDeleting,
    onViewItems: open,
    onPublishAction: (s, action) => setPublishModal({ entityId: s._id, action }),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Home Sections"
        description="Manage dynamic sections on the app home screen"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Home Sections' }]}
        action={canCreate ? <Button onClick={() => setEditing({ section: null })}><Plus aria-hidden="true" />Add Section</Button> : undefined}
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search sections..."
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
        onRowClick={open}
        filtered={filtered}
        filteredTitle="No sections found matching your filters"
        onClear={clear}
        empty={{
          icon: Layers,
          title: 'No home sections yet',
          description: canCreate ? 'Get started by adding your first home section' : undefined,
          action: canCreate ? <Button onClick={() => setEditing({ section: null })} variant="outline" size="sm"><Plus aria-hidden="true" />Add your first section</Button> : undefined,
        }}
      />

      <HomeSectionFormModal open={!!editing} onClose={() => setEditing(null)} onSubmit={save} section={editing?.section} mode={editing?.section ? 'edit' : 'create'} />
      <DeleteSectionDock section={deleting} onClose={() => setDeleting(null)} onDone={list.refresh} />

      {publishModal && (
        <PublishConfirmModal
          open
          onOpenChange={(o) => { if (!o) setPublishModal(null) }}
          entityType="homesection"
          entityId={publishModal.entityId}
          action={publishModal.action}
          onSuccess={() => { setPublishModal(null); list.refresh() }}
        />
      )}
    </div>
  )
}
