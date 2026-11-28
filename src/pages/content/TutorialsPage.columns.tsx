import { ExternalLink, FileCheck, Image, Pencil, Trash2 } from 'lucide-react'
import { ColumnDef } from '@/components/common/DataTable'
import { Tutorial } from '@/services/tutorials.service'
import { ActivePill, PublishStatusPill, RowMenu, Tag, Thumb } from '@/components/forms/editor/list'

interface TutorialsColumnsProps {
  canUpdate: boolean
  canDelete: boolean
  onEdit: (tutorial: Tutorial) => void
  onDelete: (tutorial: Tutorial) => void
}

const SCREEN_LABELS: Record<string, string> = { home: 'Home', theory: 'Theory', practical: 'Practical', notes: 'Notes', 'ebook-store': 'E-Book Store' }

function hostOf(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

export function getTutorialsColumns({ canUpdate, canDelete, onEdit, onDelete }: TutorialsColumnsProps): ColumnDef<Tutorial>[] {
  return [
    {
      id: 'title',
      header: 'Title',
      cell: (tutorial) => (
        <div className="flex min-w-[200px] max-w-[340px] items-center gap-3">
          <Thumb src={tutorial.thumbnail_url} icon={Image} className="h-10 w-14" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium" title={tutorial.title}>{tutorial.title}</p>
            {tutorial.description && <p className="truncate text-xs text-muted-foreground">{tutorial.description}</p>}
          </div>
        </div>
      ),
    },
    {
      id: 'url',
      header: 'URL',
      width: 'w-36',
      cell: (tutorial) => tutorial.url ? (
        <a href={tutorial.url} target="_blank" rel="noopener noreferrer" title={tutorial.url} className="inline-flex max-w-[150px] items-center gap-1 text-[13px] text-primary hover:underline">
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{hostOf(tutorial.url)}</span>
        </a>
      ) : <span className="text-[13px] text-muted-foreground">None</span>,
    },
    {
      id: 'media',
      header: 'Media',
      width: 'w-24',
      cell: (tutorial) => tutorial.media_url ? <Tag><FileCheck aria-hidden="true" className="h-3 w-3" />Uploaded</Tag> : <span className="text-[13px] text-muted-foreground">None</span>,
    },
    {
      id: 'screens',
      header: 'Screens',
      width: 'w-36',
      cell: (tutorial) => {
        const screens = tutorial.display_screens || []
        if (screens.length === 0) return <span className="text-[13px] text-muted-foreground">None</span>
        return <div className="flex flex-wrap gap-1">{screens.map((s) => <Tag key={s}>{SCREEN_LABELS[s] ?? s}</Tag>)}</div>
      },
    },
    {
      id: 'subject',
      header: 'Subject',
      width: 'w-32',
      cell: (tutorial) => tutorial.subject_id && typeof tutorial.subject_id === 'object'
        ? <span className="text-sm">{tutorial.subject_id.name}</span>
        : <span className="text-[13px] text-muted-foreground">All Subjects</span>,
    },
    { id: 'order', header: 'Order', width: 'w-16', cell: (tutorial) => <span className="text-sm tabular-nums">{tutorial.display_order ?? '—'}</span> },
    { id: 'status', header: 'Status', width: 'w-24', cell: (tutorial) => <ActivePill active={tutorial.is_active} /> },
    { id: 'publish_status', header: 'Publish', width: 'w-28', cell: (tutorial) => <PublishStatusPill status={tutorial.publish_status} /> },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (tutorial) => (
        <RowMenu
          label={`Actions for ${tutorial.title}`}
          actions={[
            { label: 'Edit', icon: Pencil, onSelect: () => onEdit(tutorial), hidden: !canUpdate },
            { label: 'Delete', icon: Trash2, onSelect: () => onDelete(tutorial), tone: 'danger', separated: true, hidden: !canDelete },
          ]}
        />
      ),
    },
  ]
}
