import { Archive, BookText, CopyPlus, FileText, FolderInput, RefreshCw, Trash2 } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { formatINR } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Book } from '@/services/books.service'
import type { PackageDetailModule, PackageDetailSeries, PackageDetailVideo } from '@/services/packages.service'
import type { Subject } from '@/services/subjects.service'
import { videosService } from '@/services/videos.service'
import { useActions } from '../../actions/ActionsContext'
import { useExplorerAccess } from '../../access'
import { useExplorerMutation } from '../../hooks/useExplorerMutation'
import { EntityMenuItems } from '../../panel/EntityHeaderActions'
import { refName } from '../../panel/helpers'
import { EXPLORER_BASE, buildChildUrl, type ExplorerFocus } from '../../parseExplorerPath'
import type { ExplorerPackage } from '../../types'
import { ActiveBadge, ComboBadge, EbookBadge, FormatBadge, FreeBadge, ProcessingBadge, PublishBadge, SaleBadge, ScheduledBadge, UnavailableBadge } from '../../ui/StatusBadge'
import { Thumb, initials } from '../../ui/Thumb'
import { clock, fileSize, plural } from '../../ui/text'
import { ProcessingDetailsPopover } from '../popovers/ProcessingDetailsPopover'
import { RowShell, type RowExtras } from './RowShell'

// ── Subject ──────────────────────────────────────────────────────────────
export function SubjectRow({ subject, parentFocus }: { subject: Subject; parentFocus: ExplorerFocus }) {
  const { can } = useExplorerAccess()
  const { open } = useActions()
  return (
    <RowShell
      kind="subject"
      id={subject._id}
      name={subject.name}
      leading={<Thumb src={subject.icon_url} fallback={initials(subject.name)} />}
      meta={[plural(subject.package_count ?? 0, 'package')]}
      badges={<ActiveBadge active={subject.is_active} />}
      href={buildChildUrl(parentFocus, subject._id)}
      openLabel="Open subject"
      canEdit={can('subject', 'update')}
      menu={(
        <EntityMenuItems
          kind="subject"
          id={subject._id}
          name={subject.name}
          data={subject}
          idLabel="Subject ID"
          extra={can('subject', 'delete') && (
            <DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => open({ type: 'deleteSubject', id: subject._id, name: subject.name })}><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</DropdownMenuItem>
          )}
        />
      )}
    />
  )
}

// ── Package ──────────────────────────────────────────────────────────────
function priceOf(pkg: ExplorerPackage): string {
  const prices = (pkg.tiers ?? []).map((t) => t.price)
  if (prices.length > 0) {
    const low = Math.min(...prices)
    return prices.every((p) => p === low) ? formatINR(low) : `From ${formatINR(low)}`
  }
  const price = pkg.is_on_sale && pkg.sale_price != null ? pkg.sale_price : pkg.price
  return price === 0 ? 'Free' : formatINR(price)
}

export function PackageRow({ pkg, parentFocus }: { pkg: ExplorerPackage; parentFocus: ExplorerFocus }) {
  const { can } = useExplorerAccess()
  const c = pkg.content_summary
  const plans = pkg.tiers?.length ?? 0
  return (
    <RowShell
      kind="package"
      id={pkg._id}
      name={pkg.name}
      leading={<Thumb src={pkg.thumbnail_url} fallback={initials(pkg.name)} />}
      meta={[
        <span key="p" className="font-medium text-foreground">{priceOf(pkg)}</span>,
        plans > 1 && plural(plans, 'plan'),
        pkg.is_combo ? plural(pkg.bundled_count ?? 0, 'package') + ' inside' : plural(pkg.series_count ?? c?.series_count ?? 0, 'series', 'series'),
        c && plural(c.video_count, 'video'),
        c && c.failed_video_count > 0 && <span key="f" className="text-danger">{c.failed_video_count} failed</span>,
      ]}
      badges={(
        <>
          {pkg.is_combo && <ComboBadge />}
          <PublishBadge status={pkg.publish_status} />
          <ActiveBadge active={pkg.is_active} />
          {pkg.is_on_sale && <SaleBadge />}
        </>
      )}
      href={buildChildUrl(parentFocus, pkg._id)}
      openLabel="Open package"
      canEdit={can('package', 'update')}
      menu={<EntityMenuItems kind="package" entityType="package" id={pkg._id} name={pkg.name} publishStatus={pkg.publish_status} data={pkg} idLabel="Package ID" />}
    />
  )
}

// ── Series ───────────────────────────────────────────────────────────────
export function SeriesRow({ series, parentFocus, ...extras }: { series: PackageDetailSeries; parentFocus: ExplorerFocus } & RowExtras) {
  const { can } = useExplorerAccess()
  const { open } = useActions()
  const packageId = 'packageId' in parentFocus ? parentFocus.packageId : series.package_id
  return (
    <RowShell
      kind="series"
      id={series._id}
      name={series.name}
      leading={<Thumb fallback={`S${series.display_order}`} />}
      meta={[
        plural(series.module_count ?? 0, 'module'),
        (series.document_count ?? 0) > 0 && plural(series.document_count, 'document'),
      ]}
      badges={<>{series.publish_status && <PublishBadge status={series.publish_status} />}<ActiveBadge active={series.is_active} /></>}
      href={buildChildUrl(parentFocus, series._id)}
      openLabel="Open series"
      canEdit={can('series', 'update')}
      menu={(
        <EntityMenuItems
          kind="series"
          entityType="series"
          id={series._id}
          name={series.name}
          publishStatus={series.publish_status ?? 'draft'}
          data={series}
          idLabel="Series ID"
          extra={can('series', 'update') && (
            <DropdownMenuItem onSelect={() => open({ type: 'moveContent', kind: 'series-move', items: [{ id: series._id, name: series.name, parentId: packageId }] })}><FolderInput className="mr-2 h-3.5 w-3.5" /> Move to package…</DropdownMenuItem>
          )}
        />
      )}
      {...extras}
    />
  )
}

// ── Module ───────────────────────────────────────────────────────────────
function minutes(total: number): string {
  if (total < 60) return `${total} min`
  return total % 60 ? `${Math.floor(total / 60)} h ${total % 60} min` : `${total / 60} h`
}

export function ModuleRow({ module, parentFocus, ...extras }: { module: PackageDetailModule; parentFocus: ExplorerFocus } & RowExtras) {
  const { can } = useExplorerAccess()
  const { open } = useActions()
  const seriesId = 'seriesId' in parentFocus ? parentFocus.seriesId : module.series_id
  const videos = module.videos ?? []
  const failed = videos.filter((v) => v.processing_status === 'failed').length
  const processing = videos.filter((v) => v.processing_status === 'processing' || v.processing_status === 'uploading').length
  return (
    <RowShell
      kind="module"
      id={module._id}
      name={module.name}
      leading={<Thumb fallback={module.display_order} />}
      meta={[
        plural(module.video_count ?? module.lesson_count ?? 0, 'video'),
        module.estimated_duration_minutes > 0 && minutes(module.estimated_duration_minutes),
        failed > 0 && <span key="f" className="text-danger">{failed} failed</span>,
        processing > 0 && <span key="p" className="text-primary">{processing} processing</span>,
      ]}
      badges={<>{module.publish_status && <PublishBadge status={module.publish_status} />}<ActiveBadge active={module.is_active} /></>}
      href={buildChildUrl(parentFocus, module._id)}
      openLabel="Open module"
      canEdit={can('module', 'update')}
      menu={(
        <EntityMenuItems
          kind="module"
          entityType="module"
          id={module._id}
          name={module.name}
          publishStatus={module.publish_status ?? 'draft'}
          data={module}
          idLabel="Module ID"
          extra={can('module', 'update') && (
            <DropdownMenuItem onSelect={() => open({ type: 'moveContent', kind: 'module-move', items: [{ id: module._id, name: module.name, parentId: seriesId }] })}><FolderInput className="mr-2 h-3.5 w-3.5" /> Move to series…</DropdownMenuItem>
          )}
        />
      )}
      {...extras}
    />
  )
}

// ── Video ────────────────────────────────────────────────────────────────
export function VideoRow({ video, parentFocus, onRefresh, ...extras }: { video: PackageDetailVideo; parentFocus: ExplorerFocus; onRefresh: () => Promise<void> } & RowExtras) {
  const { can } = useExplorerAccess()
  const { open } = useActions()
  const scheduled = video.processing_status === 'ready' && !!video.scheduled_release_at && new Date(video.scheduled_release_at) > new Date()
  const failed = video.processing_status === 'failed'
  const canMove = can('video', 'update')
  const pick = (kind: 'video-move' | 'video-copy') => open({ type: 'moveContent', kind, items: [{ id: video._id, name: video.title, parentId: 'moduleId' in parentFocus ? parentFocus.moduleId : video.module_id }] })
  const retry = useExplorerMutation({
    name: 'Retry transcoding',
    what: 'processing videos',
    fn: () => videosService.retryTranscoding(video._id),
    onSuccess: () => onRefresh(),
    successMessage: 'Transcoding restarted',
  })
  return (
    <RowShell
      kind="video"
      id={video._id}
      name={video.title}
      leading={<Thumb src={video.thumbnail_url} fallback={video.display_order} className="h-9 w-9 @md:w-14" />}
      meta={[video.duration_seconds > 0 && clock(video.duration_seconds), video.faculty_id?.name, video.is_free && 'Free preview']}
      badges={(
        <>
          <ProcessingDetailsPopover video={video} onRefresh={onRefresh}>
            <button type="button" aria-label={`Processing: ${video.processing_status}. Show details`} className="inline-flex rounded-full transition-opacity hover:opacity-80"><ProcessingBadge status={video.processing_status} /></button>
          </ProcessingDetailsPopover>
          {video.publish_status && <PublishBadge status={video.publish_status} />}
          {video.is_free && <FreeBadge />}
          {scheduled && video.scheduled_release_at && <ScheduledBadge dateIso={video.scheduled_release_at} />}
        </>
      )}
      href={buildChildUrl(parentFocus, video._id)}
      openLabel="Open (tags and reviews)"
      canEdit={can('video', 'update')}
      menu={(
        <EntityMenuItems
          kind="video"
          entityType="video"
          id={video._id}
          name={video.title}
          publishStatus={video.publish_status ?? 'draft'}
          data={video}
          idLabel="Video ID"
          extra={canMove || can('video', 'delete') ? (
            <>
              {canMove && <DropdownMenuItem onSelect={() => pick('video-move')}><FolderInput className="mr-2 h-3.5 w-3.5" /> Move to…</DropdownMenuItem>}
              {canMove && <DropdownMenuItem onSelect={() => pick('video-copy')}><CopyPlus className="mr-2 h-3.5 w-3.5" /> Copy to…</DropdownMenuItem>}
              {failed && canMove && <DropdownMenuItem disabled={retry.loading} onSelect={() => void retry.execute()}><RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry transcoding</DropdownMenuItem>}
              {can('video', 'delete') && <DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => open({ type: 'archive', kind: 'video', id: video._id, name: video.title })}><Archive className="mr-2 h-3.5 w-3.5" /> Archive</DropdownMenuItem>}
            </>
          ) : undefined}
        />
      )}
      {...extras}
    />
  )
}

// ── Document ─────────────────────────────────────────────────────────────
/** Shape shared by a subject's documents and the ones in a package tree. */
export interface DocRowData {
  _id: string
  title: string
  file_format: string
  file_size_mb: number
  page_count: number | null
  is_free: boolean
  download_count: number
  publish_status?: 'draft' | 'published'
  thumbnail_url?: string | null
  /** Filled when the document is listed outside its own series. */
  series_id?: { _id: string; name: string } | string | null
}

export function DocumentRow({ document: doc, ...extras }: { document: DocRowData } & RowExtras) {
  const { can } = useExplorerAccess()
  const { open } = useActions()
  const canEdit = can('document', 'update')
  return (
    <RowShell
      kind="document"
      id={doc._id}
      name={doc.title}
      leading={<Thumb src={doc.thumbnail_url} fallback={<FileText className="h-4 w-4" />} />}
      meta={[refName(doc.series_id), fileSize(doc.file_size_mb), doc.page_count != null && plural(doc.page_count, 'page'), plural(doc.download_count ?? 0, 'download')]}
      badges={<><FormatBadge format={doc.file_format} />{doc.is_free && <FreeBadge />}{doc.publish_status && <PublishBadge status={doc.publish_status} />}</>}
      canEdit={canEdit}
      menu={(
        <EntityMenuItems
          kind="document"
          entityType="document"
          id={doc._id}
          name={doc.title}
          publishStatus={doc.publish_status}
          data={doc}
          idLabel="Document ID"
          extra={canEdit || can('document', 'delete') ? (
            <>
              {canEdit && <DropdownMenuItem onSelect={() => open({ type: 'move', id: doc._id, name: doc.title })}><FolderInput className="mr-2 h-3.5 w-3.5" /> Move</DropdownMenuItem>}
              {can('document', 'delete') && <DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => open({ type: 'archive', kind: 'document', id: doc._id, name: doc.title })}><Archive className="mr-2 h-3.5 w-3.5" /> Archive</DropdownMenuItem>}
            </>
          ) : undefined}
        />
      )}
      {...extras}
    />
  )
}

// ── Book ─────────────────────────────────────────────────────────────────
export function BookRow({ book }: { book: Book }) {
  const { can } = useExplorerAccess()
  const price = book.is_on_sale && book.sale_price != null ? book.sale_price : book.price
  const low = book.stock_quantity <= 5
  return (
    <RowShell
      kind="book"
      id={book._id}
      name={book.title}
      leading={<Thumb src={book.thumbnail_url} fallback={<BookText className="h-4 w-4" />} className="h-12 w-9" />}
      meta={[
        book.author,
        <span key="p" className="font-medium text-foreground">{price === 0 ? 'Free' : formatINR(price)}</span>,
        <span key="s" className={cn(low && 'text-danger')}>{book.stock_quantity} in stock</span>,
      ]}
      badges={(
        <>
          {book.ebook && <EbookBadge />}
          {book.is_on_sale && <SaleBadge />}
          {!book.is_available && <UnavailableBadge />}
          <PublishBadge status={book.publish_status} />
        </>
      )}
      href={`${EXPLORER_BASE}/books/${book._id}`}
      openLabel="Open book"
      canEdit={can('book', 'update')}
      menu={<EntityMenuItems kind="book" entityType="book" id={book._id} name={book.title} publishStatus={book.publish_status} data={book} idLabel="Book ID" />}
    />
  )
}

