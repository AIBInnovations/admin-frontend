import { Link } from 'react-router-dom'
import { Eye, Globe, GlobeLock, Pencil, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { ColumnDef } from '@/components/common/DataTable'
import { Form } from '@/services/forms.service'
import { formatCount, formatINR } from '@/lib/format'
import { ActivePill, PublishStatusPill, RowMenu, Tag } from '@/components/forms/editor/list'
import { istDay } from '@/components/forms/editor/ist'

interface FormsColumnsProps {
  canUpdate: boolean
  canDelete: boolean
  onEdit: (form: Form) => void
  onDelete: (form: Form) => void
  onToggleActive: (form: Form) => void
  onViewSubmissions: (form: Form) => void
  onPublishAction: (form: Form, action: 'publish' | 'unpublish') => void
}

export function getFormsColumns({ canUpdate, canDelete, onEdit, onDelete, onToggleActive, onViewSubmissions, onPublishAction }: FormsColumnsProps): ColumnDef<Form>[] {
  return [
    {
      id: 'title',
      header: 'Title',
      cell: (form) => {
        const template = form.template_id && typeof form.template_id === 'object' ? form.template_id : null
        return (
          <div className="min-w-[180px] max-w-[360px]">
            <p className="truncate text-sm font-medium" title={form.title}>{form.title}</p>
            <div className="mt-1"><Tag>{template?.name ?? 'Deleted template'}</Tag></div>
          </div>
        )
      },
    },
    {
      id: 'subject',
      header: 'Subject',
      width: 'w-40',
      cell: (form) => <span className="text-sm text-muted-foreground">{form.subject_id && typeof form.subject_id === 'object' ? form.subject_id.name : 'Deleted subject'}</span>,
    },
    {
      id: 'payment',
      header: 'Payment',
      width: 'w-28',
      cell: (form) => form.payment_amount ? <span className="whitespace-nowrap text-sm font-medium tabular-nums">{formatINR(form.payment_amount)}</span> : <span className="text-[13px] text-muted-foreground">Free</span>,
    },
    {
      id: 'submissions',
      header: 'Submissions',
      width: 'w-28',
      cell: (form) => (
        <Link to={`/content/forms/${form._id}/submissions`} className="text-sm font-medium tabular-nums text-primary hover:underline pointer-coarse:-mx-3 pointer-coarse:px-3" aria-label={`${form.submission_count ?? 0} submissions of ${form.title}`}>
          {formatCount(form.submission_count ?? 0)}
        </Link>
      ),
    },
    { id: 'status', header: 'Status', width: 'w-24', cell: (form) => <ActivePill active={form.is_active} /> },
    { id: 'publish_status', header: 'Publish', width: 'w-28', cell: (form) => <PublishStatusPill status={form.publish_status} /> },
    { id: 'created', header: 'Created', width: 'w-32', cell: (form) => <span className="whitespace-nowrap text-[13px] text-muted-foreground">{istDay(form.createdAt)}</span> },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (form) => (
        <RowMenu
          label={`Actions for ${form.title}`}
          actions={[
            { label: 'View Submissions', icon: Eye, onSelect: () => onViewSubmissions(form) },
            { label: 'Edit', icon: Pencil, onSelect: () => onEdit(form), hidden: !canUpdate },
            form.is_active
              ? { label: 'Deactivate', icon: ToggleLeft, onSelect: () => onToggleActive(form), hidden: !canUpdate }
              : { label: 'Activate', icon: ToggleRight, onSelect: () => onToggleActive(form), hidden: !canUpdate },
            form.publish_status === 'draft'
              ? { label: 'Publish', icon: Globe, onSelect: () => onPublishAction(form, 'publish'), hidden: !canUpdate }
              : { label: 'Unpublish', icon: GlobeLock, onSelect: () => onPublishAction(form, 'unpublish'), hidden: !canUpdate },
            { label: 'Delete', icon: Trash2, onSelect: () => onDelete(form), tone: 'danger', separated: true, hidden: !canDelete },
          ]}
        />
      ),
    },
  ]
}
