import { useEffect, useState } from 'react'
import { Copy, CopyPlus, FolderInput, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDay } from '@/lib/format'
import { contentMoveService, type Place, type VideoLocation } from '@/services/contentMove.service'

interface Props {
  videoId: string
  /** Changes when the video moved, so the card reads its place again. */
  version?: number
  onMove?: () => void
  onCopy?: () => void
}

const where = (p: Place | null) => (p ? [p.package_name, p.series_name, p.module_name].filter(Boolean).join(' › ') : 'Deleted module')

/**
 * Where a video is (package › series › module) with "Change" (the move
 * picker) and "Copy to...". Also says when it is a copy, how many copies it
 * has, and that shared files stay as long as any of them uses them.
 */
export function VideoLocationCard({ videoId, version = 0, onMove, onCopy }: Props) {
  const [info, setInfo] = useState<VideoLocation | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    setFailed(false)
    contentMoveService.getVideoLocation(videoId)
      .then((res) => { if (live) { if (res.data) setInfo(res.data); else setFailed(true) } })
      .catch(() => { if (live) setFailed(true) })
    return () => { live = false }
  }, [videoId, version])

  const last = info?.history.find((h) => h.kind === 'video_move')
  const sharing = info?.shares_files_with.length ?? 0

  return (
    <section aria-label="Location" className="space-y-2 rounded-xl border border-border bg-card px-3 py-3 text-[13px]">
      <div className="flex items-start gap-2">
        <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">Location</p>
          {info ? (
            <p className="break-words font-medium text-foreground">
              {info.location?.subject_name && <span className="font-normal text-muted-foreground">{info.location.subject_name} › </span>}
              {where(info.location)}
            </p>
          ) : failed ? (
            <p className="text-muted-foreground">The location could not be loaded.</p>
          ) : (
            <p aria-busy="true" className="h-4 w-48 max-w-full animate-pulse rounded bg-muted" />
          )}
        </div>
        {onMove && (
          <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={onMove} aria-label="Change location: move this video">
            <FolderInput className="h-3.5 w-3.5" /> Change
          </Button>
        )}
      </div>
      {info?.copied_from && (
        <p className="flex items-start gap-2 break-words text-muted-foreground">
          <Copy aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Copy of {info.copied_from.title ? <span className="font-medium text-foreground">{info.copied_from.title}</span> : 'a deleted video'}
            {info.copied_from.location ? ` in ${where(info.copied_from.location)}` : ''}{info.copied_at ? `, made ${formatDay(info.copied_at)}` : ''}.
            {' '}It has its own views, reviews and progress.
          </span>
        </p>
      )}
      {info && info.copies.length > 0 && (
        <p className="break-words text-muted-foreground">{info.copies.length === 1 ? '1 copy' : `${info.copies.length} copies`} elsewhere: {info.copies.slice(0, 3).map((c) => where(c.location)).join('; ')}{info.copies.length > 3 ? ` and ${info.copies.length - 3} more` : ''}.</p>
      )}
      {sharing > 0 && (
        <p className="break-words text-muted-foreground">Shares its video files with {sharing === 1 ? '1 other video' : `${sharing} other videos`}. Deleting or replacing this one leaves theirs playing.</p>
      )}
      {last && <p className="text-xs text-muted-foreground">Moved {formatDay(last.at)}{last.by ? ` by ${last.by}` : ''}{last.from ? `, from ${where(last.from)}` : ''}.</p>}
      {onCopy && (
        <Button type="button" size="sm" variant="ghost" className="-ml-2 h-8" onClick={onCopy}><CopyPlus className="h-3.5 w-3.5" /> Copy to another module</Button>
      )}
    </section>
  )
}
