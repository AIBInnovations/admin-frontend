import { Archive, BookMarked, BookOpen, CalendarRange, ExternalLink, Eye, FlaskConical, Globe, GlobeLock, Image, Layers, Pencil, Users, Video, type LucideIcon } from 'lucide-react'
import { ColumnDef } from '@/components/common/DataTable'
import { Banner } from '@/services/banners.service'
import { ActivePill, PublishStatusPill, RowMenu, Tag, Thumb } from '@/components/forms/editor/list'
import { istDay, storedDay, toIstInputs } from '@/components/forms/editor/ist'

interface BannersColumnsProps {
  canUpdate: boolean
  canDelete: boolean
  onEdit: (banner: Banner) => void
  onArchive: (banner: Banner) => void
  onPublishAction: (banner: Banner, action: 'publish' | 'unpublish') => void
}

const ACTIONS: Record<string, { label: string; icon: LucideIcon }> = {
  theory_package: { label: 'Theory Package', icon: BookOpen },
  practical_package: { label: 'Practical Package', icon: FlaskConical },
  combo_package: { label: 'Combo Package', icon: Layers },
  ebook: { label: 'Book', icon: BookMarked },
  live_session: { label: 'Live Session', icon: Video },
  workshop: { label: 'Workshop', icon: CalendarRange },
}

export function getBannersColumns({ canUpdate, canDelete, onEdit, onArchive, onPublishAction }: BannersColumnsProps): ColumnDef<Banner>[] {
  return [
    {
      id: 'banner',
      header: 'Banner',
      cell: (banner) => (
        <div className="flex min-w-[200px] max-w-[340px] items-center gap-3">
          <Thumb src={banner.image_url} icon={Image} className="h-10 w-16" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium" title={banner.title}>{banner.title}</p>
            {banner.subtitle && <p className="truncate text-xs text-muted-foreground">{banner.subtitle}</p>}
          </div>
        </div>
      ),
    },
    {
      id: 'link',
      header: 'Click Action',
      width: 'w-40',
      cell: (banner) => {
        const action = ACTIONS[banner.banner_type]
        if (action) return <Tag><action.icon aria-hidden="true" className="h-3 w-3 shrink-0" />{action.label}</Tag>
        if (banner.click_url && banner.link_type === 'external') {
          return (
            <a href={banner.click_url} target="_blank" rel="noopener noreferrer" title={banner.click_url} className="inline-flex items-center gap-1 text-[13px] text-primary hover:underline">
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />External Link
            </a>
          )
        }
        return <span className="text-[13px] text-muted-foreground">No Action</span>
      },
    },
    {
      id: 'visibility',
      header: 'Visible To',
      width: 'w-32',
      cell: (banner) => {
        const to = banner.visible_to || 'all'
        if (to === 'all') return <Tag><Users aria-hidden="true" className="h-3 w-3" />All Users</Tag>
        const n = (to === 'subject' ? banner.visible_to_subjects : banner.visible_to_packages)?.length || 0
        const noun = to === 'subject' ? 'Subject' : 'Package'
        return <Tag><Eye aria-hidden="true" className="h-3 w-3" />{n} {noun}{n !== 1 ? 's' : ''}</Tag>
      },
    },
    { id: 'order', header: 'Order', width: 'w-16', cell: (banner) => <span className="text-sm tabular-nums">{banner.display_order ?? '—'}</span> },
    {
      id: 'dates',
      header: 'Date Range',
      width: 'w-40',
      cell: (banner) => {
        const ended = banner.end_date && storedDay(banner.end_date) < toIstInputs(new Date()).date
        return (
          <div className="whitespace-nowrap text-[13px] text-muted-foreground">
            <p>{istDay(banner.start_date)}</p>
            {banner.end_date && <p className={ended ? 'text-warning' : undefined}>to {istDay(banner.end_date)}{ended ? ' (ended)' : ''}</p>}
          </div>
        )
      },
    },
    { id: 'status', header: 'Status', width: 'w-24', cell: (banner) => <ActivePill active={banner.is_active} /> },
    { id: 'publish_status', header: 'Publish', width: 'w-28', cell: (banner) => <PublishStatusPill status={banner.publish_status} /> },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (banner) => (
        <RowMenu
          label={`Actions for ${banner.title}`}
          actions={[
            { label: 'Edit', icon: Pencil, onSelect: () => onEdit(banner), hidden: !canUpdate },
            banner.publish_status === 'draft'
              ? { label: 'Publish', icon: Globe, onSelect: () => onPublishAction(banner, 'publish'), hidden: !canUpdate }
              : { label: 'Unpublish', icon: GlobeLock, onSelect: () => onPublishAction(banner, 'unpublish'), hidden: !canUpdate },
            { label: 'Archive', icon: Archive, onSelect: () => onArchive(banner), tone: 'warning', separated: true, hidden: !canDelete },
          ]}
        />
      ),
    },
  ]
}
