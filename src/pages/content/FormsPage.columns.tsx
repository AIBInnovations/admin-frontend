import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { Form } from '@/services/forms.service'
import { MoreVertical, Pencil, Trash2, Eye, ToggleLeft, ToggleRight } from 'lucide-react'

interface FormsColumnsProps {
  onEdit: (form: Form) => void
  onDelete: (form: Form) => void
  onToggleActive: (form: Form) => void
  onViewSubmissions: (form: Form) => void
  onPublishAction: (form: Form, action: 'publish' | 'unpublish') => void
}

export function useFormsColumns({
  onEdit,
  onDelete,
  onToggleActive,
  onViewSubmissions,
  onPublishAction,
}: FormsColumnsProps): ColumnDef<Form>[] {
  return [
    {
      id: 'title',
      header: 'Title',
      cell: (form) => {
        const template = typeof form.template_id === 'object' ? form.template_id : null
        return (
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{form.title}</p>
            {template && (
              <Badge className={`text-[10px] mt-1 ${
                template.slug === 'examiner'
                  ? 'bg-purple-500/10 text-purple-600 border-purple-200'
                  : 'bg-blue-500/10 text-blue-600 border-blue-200'
              }`}>
                {template.name}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      id: 'subject',
      header: 'Subject',
      width: 'w-40',
      cell: (form) => {
        const subject = typeof form.subject_id === 'object' ? form.subject_id : null
        return (
          <span className="text-sm text-muted-foreground">
            {subject ? subject.name : '—'}
          </span>
        )
      },
    },
    {
      id: 'payment',
      header: 'Payment',
      width: 'w-28',
      cell: (form) => (
        form.payment_amount ? (
          <span className="text-sm font-mono text-amber-600">{'\u20B9'}{form.payment_amount}</span>
        ) : (
          <span className="text-xs text-muted-foreground">Free</span>
        )
      ),
    },
    {
      id: 'submissions',
      header: 'Submissions',
      width: 'w-28',
      cell: (form) => (
        <span className="text-sm font-mono">{form.submission_count ?? 0}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-24',
      cell: (form) => (
        <Badge className={`text-[10px] ${
          form.is_active
            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
            : 'bg-red-500/10 text-red-600 border-red-200'
        }`}>
          {form.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'publish_status',
      header: 'Publish',
      width: 'w-24',
      cell: (form) => (
        <Badge className={`text-[10px] ${
          form.publish_status === 'published'
            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
            : 'bg-amber-500/10 text-amber-600 border-amber-200'
        }`}>
          {form.publish_status === 'published' ? 'Published' : 'Draft'}
        </Badge>
      ),
    },
    {
      id: 'created',
      header: 'Created',
      width: 'w-32',
      cell: (form) => (
        <span className="text-xs text-muted-foreground">
          {new Date(form.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (form) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewSubmissions(form)}>
              <Eye className="mr-2 h-4 w-4" />View Submissions
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(form)}>
              <Pencil className="mr-2 h-4 w-4" />Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleActive(form)}>
              {form.is_active ? (
                <><ToggleLeft className="mr-2 h-4 w-4" />Deactivate</>
              ) : (
                <><ToggleRight className="mr-2 h-4 w-4" />Activate</>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onPublishAction(form, form.publish_status === 'draft' ? 'publish' : 'unpublish')}
            >
              {form.publish_status === 'draft' ? 'Publish' : 'Unpublish'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(form)} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
