import { Eye, Globe, GlobeLock, Pencil, Trash2 } from 'lucide-react'
import { ColumnDef } from '@/components/common/DataTable'
import { HomeSection } from '@/services/homeSections.service'
import { ActivePill, PublishStatusPill, RowMenu, Tag } from '@/components/forms/editor/list'
import { istDay } from '@/components/forms/editor/ist'

interface HomeSectionsColumnsProps {
  canUpdate: boolean
  canDelete: boolean
  onEdit: (section: HomeSection) => void
  onDelete: (section: HomeSection) => void
  onViewItems: (section: HomeSection) => void
  onPublishAction: (section: HomeSection, action: 'publish' | 'unpublish') => void
}

function Swatch({ color, label }: { color: string; label: string }) {
  return <span role="img" aria-label={`${label}: ${color}`} title={`${label}: ${color}`} className="inline-block h-5 w-5 shrink-0 rounded border border-border" style={{ backgroundColor: color }} />
}

export function getHomeSectionsColumns({ canUpdate, canDelete, onEdit, onDelete, onViewItems, onPublishAction }: HomeSectionsColumnsProps): ColumnDef<HomeSection>[] {
  return [
    {
      id: 'section',
      header: 'Section',
      cell: (section) => (
        <div className="min-w-[160px] max-w-[320px]">
          <p className="truncate text-sm font-medium" title={section.title || undefined}>{section.title || 'Untitled Section'}</p>
          {section.subtitle && <p className="truncate text-xs text-muted-foreground">{section.subtitle}</p>}
        </div>
      ),
    },
    { id: 'items', header: 'Items', width: 'w-20', cell: (section) => <span className="text-sm tabular-nums">{section.item_count ?? section.items?.length ?? 0}</span> },
    {
      id: 'colors',
      header: 'Colors',
      width: 'w-24',
      cell: (section) => (
        <div className="flex items-center gap-1.5">
          {section.background_color && <Swatch color={section.background_color} label="Background" />}
          {section.text_color && <Swatch color={section.text_color} label="Text" />}
          {!section.background_color && !section.text_color && <span className="text-[13px] text-muted-foreground">Default</span>}
        </div>
      ),
    },
    {
      id: 'visibleTo',
      header: 'Visible To',
      width: 'w-28',
      cell: (section) => {
        const v = section.visible_to || 'all'
        if (v === 'all') return <Tag>All</Tag>
        return v === 'subject'
          ? <Tag>Subject ({section.visible_to_subjects?.length || 0})</Tag>
          : <Tag>Package ({section.visible_to_packages?.length || 0})</Tag>
      },
    },
    { id: 'order', header: 'Order', width: 'w-16', cell: (section) => <span className="text-sm tabular-nums">{section.display_order ?? '—'}</span> },
    {
      id: 'dates',
      header: 'Date Range',
      width: 'w-40',
      cell: (section) => (
        <div className="whitespace-nowrap text-[13px] text-muted-foreground">
          <p>{section.start_date ? istDay(section.start_date) : 'No start date'}</p>
          {section.end_date && <p>to {istDay(section.end_date)}</p>}
        </div>
      ),
    },
    { id: 'status', header: 'Status', width: 'w-24', cell: (section) => <ActivePill active={section.is_active} /> },
    { id: 'publish_status', header: 'Publish', width: 'w-28', cell: (section) => <PublishStatusPill status={section.publish_status} /> },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (section) => (
        <RowMenu
          label={`Actions for ${section.title || 'Untitled Section'}`}
          actions={[
            { label: 'View Items', icon: Eye, onSelect: () => onViewItems(section) },
            { label: 'Edit', icon: Pencil, onSelect: () => onEdit(section), hidden: !canUpdate },
            section.publish_status === 'draft'
              ? { label: 'Publish', icon: Globe, onSelect: () => onPublishAction(section, 'publish'), hidden: !canUpdate }
              : { label: 'Unpublish', icon: GlobeLock, onSelect: () => onPublishAction(section, 'unpublish'), hidden: !canUpdate },
            { label: 'Delete', icon: Trash2, onSelect: () => onDelete(section), tone: 'danger', separated: true, hidden: !canDelete },
          ]}
        />
      ),
    },
  ]
}
