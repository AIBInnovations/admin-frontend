import { useMemo, useState } from 'react'
import { Plus, Tags } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { useAuth } from '@/contexts/AuthContext'
import { videoTagsService, VideoTag, VideoTagFormData } from '@/services/videoTags.service'
import { VideoTagFormModal } from '@/components/videoTags/VideoTagFormModal'
import { ConfirmDock, impactOf, must } from '@/components/forms/editor/ConfirmDock'
import { ListTable, useListState, useRemoteList } from '@/components/forms/editor/list'
import { loadAll, useOptions } from '@/components/forms/editor/pickers'
import { getVideoTagsColumns } from './VideoTagsPage.columns'

/** Every category in use, not only the ones on this page. */
async function loadCategories() {
  const tags = await loadAll((page) => videoTagsService.getAll({ page, limit: 100 }))
  return [...new Set(tags.map((t) => t.category).filter((c): c is string => !!c))].sort().map((c) => ({ id: c, name: c }))
}

export function VideoTagsPage() {
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('video_tags.create')
  const canUpdate = hasPermission('video_tags.update')

  const { search, setSearch, query, values, setFilters, page, setPage, filtered, clear } = useListState({ category: 'all' })
  const list = useRemoteList<VideoTag>(
    JSON.stringify([page, query, values]),
    () => videoTagsService.getAll({ page, limit: 20, search: query || undefined, category: values.category !== 'all' ? values.category : undefined }),
    page,
    setPage,
  )
  const categories = useOptions(loadCategories)
  const [editing, setEditing] = useState<{ tag: VideoTag | null } | null>(null)
  const [deleting, setDeleting] = useState<VideoTag | null>(null)

  const save = async (data: VideoTagFormData) => {
    const tag = editing?.tag
    if (tag) must(await videoTagsService.update(tag._id, data), 'Failed to update tag')
    else must(await videoTagsService.create(data), 'Failed to create tag')
    toast.success(tag ? 'Tag updated successfully' : 'Tag created successfully')
    list.refresh()
    categories.reload()
  }

  const filters: FilterConfig[] = useMemo(() => [
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      options: [{ label: 'All Categories', value: 'all' }, ...categories.options.map((c) => ({ label: c.name, value: c.id }))],
      placeholder: 'Filter by category',
      defaultValue: 'all',
    },
  ], [categories.options])

  const columns = getVideoTagsColumns({
    canUpdate,
    canDelete: hasPermission('video_tags.delete'),
    onEdit: (tag) => setEditing({ tag }),
    onDelete: setDeleting,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Video Tags"
        description="Manage tags for video categorization and discovery"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Video Tags' }]}
        action={canCreate ? <Button onClick={() => setEditing({ tag: null })}><Plus aria-hidden="true" />Add Tag</Button> : undefined}
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search by tag name..."
        filters={filters}
        activeFilters={values}
        onFiltersChange={(f) => setFilters({ category: f.category })}
      />

      <ListTable
        list={list}
        columns={columns}
        page={page}
        onPage={setPage}
        rowKey={(t) => t._id}
        onRowClick={(tag) => setEditing({ tag })}
        filtered={filtered}
        filteredTitle="No tags found matching your criteria"
        onClear={clear}
        empty={{
          icon: Tags,
          title: 'No tags yet',
          description: canCreate ? 'Get started by creating your first tag' : undefined,
          action: canCreate ? <Button onClick={() => setEditing({ tag: null })} variant="outline" size="sm"><Plus aria-hidden="true" />Create your first tag</Button> : undefined,
        }}
      />

      <VideoTagFormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        onSubmit={save}
        tag={editing?.tag}
        mode={editing?.tag ? 'edit' : 'create'}
        categories={categories.options.map((c) => c.name)}
        readOnly={!!editing?.tag && !canUpdate}
      />

      <ConfirmDock
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete Tag"
        confirmLabel="Delete"
        busyLabel="Deleting..."
        tone="danger"
        blockedText="Cannot delete. Remove the following dependencies first:"
        loadImpact={deleting ? () => impactOf(videoTagsService.getDeleteImpact(deleting._id)) : undefined}
        onConfirm={async () => {
          if (!deleting) return
          must(await videoTagsService.delete(deleting._id), 'Failed to delete tag')
          toast.success('Tag deleted successfully')
          list.refresh()
          categories.reload()
        }}
      >
        <p>Are you sure you want to delete <span className="font-medium text-foreground">{deleting?.name}</span>? This action cannot be undone.</p>
      </ConfirmDock>
    </div>
  )
}
