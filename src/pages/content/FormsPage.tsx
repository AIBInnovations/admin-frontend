import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { apiErrorMessage } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { PublishConfirmModal } from '@/components/common/PublishConfirmModal'
import { useAuth } from '@/contexts/AuthContext'
import { formsService, Form } from '@/services/forms.service'
import { ConfirmDock, impactOf, must } from '@/components/forms/editor/ConfirmDock'
import { ListTable, useListState, useRemoteList } from '@/components/forms/editor/list'
import { loadSubjects, useOptions } from '@/components/forms/editor/pickers'
import { getFormsColumns } from './FormsPage.columns'

export function FormsPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('forms.create')

  const { search, setSearch, query, values, setFilters, page, setPage, filtered, clear } = useListState({ status: 'all', subject: 'all', publish_status: 'all' })
  const list = useRemoteList<Form>(
    JSON.stringify([page, query, values]),
    () => formsService.getAll({
      page,
      limit: 20,
      search: query || undefined,
      is_active: values.status === 'all' ? null : values.status === 'active',
      subject_id: values.subject === 'all' ? null : values.subject,
      publish_status: values.publish_status === 'all' ? null : values.publish_status,
    }),
    page,
    setPage,
  )
  const subjects = useOptions(loadSubjects(false))

  const [deleting, setDeleting] = useState<Form | null>(null)
  const [publishModal, setPublishModal] = useState<{ entityId: string; action: 'publish' | 'unpublish' } | null>(null)
  const toggling = useRef(new Set<string>())
  const open = (f: Form) => navigate(`/content/forms/${f._id}/edit`)

  const toggleActive = async (form: Form) => {
    if (toggling.current.has(form._id)) return
    toggling.current.add(form._id)
    try {
      must(await formsService.toggleActive(form._id), 'Failed to toggle status')
      toast.success(`Form ${form.is_active ? 'deactivated' : 'activated'}`)
      list.refresh()
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Failed to toggle status'))
    } finally {
      toggling.current.delete(form._id)
    }
  }

  const filters: FilterConfig[] = useMemo(() => [
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
      key: 'subject',
      label: 'Subject',
      type: 'select',
      options: [{ label: 'All Subjects', value: 'all' }, ...subjects.options.map((s) => ({ label: s.name, value: s.id }))],
      placeholder: 'Filter by subject',
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
  ], [subjects.options])

  const columns = getFormsColumns({
    canUpdate: hasPermission('forms.update'),
    canDelete: hasPermission('forms.delete'),
    onEdit: open,
    onDelete: setDeleting,
    onToggleActive: toggleActive,
    onViewSubmissions: (f) => navigate(`/content/forms/${f._id}/submissions`),
    onPublishAction: (f, action) => setPublishModal({ entityId: f._id, action }),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Forms"
        description="Manage registration forms for examiners and examinees"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Forms' }]}
        action={canCreate ? <Button asChild><Link to="/content/forms/new"><Plus aria-hidden="true" />Add Form</Link></Button> : undefined}
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search forms..."
        filters={filters}
        activeFilters={values}
        onFiltersChange={(f) => setFilters({ status: f.status, subject: f.subject, publish_status: f.publish_status })}
      />

      <ListTable
        list={list}
        columns={columns}
        page={page}
        onPage={setPage}
        rowKey={(f) => f._id}
        onRowClick={open}
        filtered={filtered}
        filteredTitle="No forms found matching your filters"
        onClear={clear}
        empty={{
          icon: FileText,
          title: 'No forms yet',
          description: canCreate ? 'Get started by creating your first form' : undefined,
          action: canCreate ? <Button asChild variant="outline" size="sm"><Link to="/content/forms/new"><Plus aria-hidden="true" />Create your first form</Link></Button> : undefined,
        }}
      />

      <ConfirmDock
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete Form"
        confirmLabel="Delete"
        busyLabel="Deleting..."
        tone="danger"
        loadImpact={deleting ? async () => {
          const impact = await impactOf(formsService.getDeleteImpact(deleting._id))
          if (!impact) return null
          // This endpoint names its counts differently from the others
          return {
            blocked: !!impact.blocked,
            dependencies: (impact.dependencies || [])
              .filter((d) => d.count > 0)
              .map((d) => ({ ...d, label: d.label || `submission${d.count === 1 ? '' : 's'} will be deleted`, blocking: !!d.blocking })),
          }
        } : undefined}
        onConfirm={async () => {
          if (!deleting) return
          must(await formsService.delete(deleting._id), 'Failed to delete form')
          toast.success('Form deleted successfully')
          list.refresh()
        }}
      >
        <p>Are you sure you want to delete <span className="font-medium text-foreground">{deleting?.title}</span>? This action cannot be undone.</p>
      </ConfirmDock>

      {publishModal && (
        <PublishConfirmModal
          open
          onOpenChange={(o) => { if (!o) setPublishModal(null) }}
          entityType="form"
          entityId={publishModal.entityId}
          action={publishModal.action}
          onSuccess={() => { setPublishModal(null); list.refresh() }}
        />
      )}
    </div>
  )
}
