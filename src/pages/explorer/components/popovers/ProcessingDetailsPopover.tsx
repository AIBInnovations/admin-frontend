import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw, Upload, type LucideIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { formatDayTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { videosService } from '@/services/videos.service'
import type { PackageDetailVideo } from '@/services/packages.service'
import { useExplorerMutation } from '../../hooks/useExplorerMutation'
import { useExplorerAccess } from '../../access'
import { clock } from '../../ui/text'
import { CopyButton } from '@/components/common/detail'

const STATUS: Record<PackageDetailVideo['processing_status'], { icon: LucideIcon; tone: string; label: string; description: string }> = {
  ready: { icon: CheckCircle2, tone: 'text-success', label: 'Ready', description: 'Processed and playable for students.' },
  processing: { icon: Loader2, tone: 'text-primary animate-spin', label: 'Processing', description: 'Being converted. This usually takes a few minutes.' },
  uploading: { icon: Upload, tone: 'text-primary', label: 'Uploading', description: 'The file is being uploaded.' },
  upcoming: { icon: Clock, tone: 'text-warning', label: 'Upcoming', description: 'A placeholder for a video that will be released later.' },
  failed: { icon: AlertCircle, tone: 'text-danger', label: 'Failed', description: 'Processing stopped with an error.' },
}

interface Props { video: PackageDetailVideo; onRefresh: () => Promise<void> | void; children: ReactNode }

export function ProcessingDetailsPopover({ video, onRefresh, children }: Props) {
  const { can } = useExplorerAccess()
  const { icon: Icon, tone, label, description } = STATUS[video.processing_status] ?? STATUS.failed
  const retry = useExplorerMutation({
    name: 'Retry processing',
    what: 'processing videos',
    fn: () => videosService.retryTranscoding(video._id),
    onSuccess: () => onRefresh(),
    successMessage: 'Processing restarted',
  })

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3 p-4 text-sm">
        <div>
          <p className="flex items-center gap-2 font-semibold text-foreground"><Icon aria-hidden="true" className={cn('h-4 w-4 shrink-0', tone)} />{label}</p>
          <p className="mt-1 text-muted-foreground">{description}</p>
        </div>
        {video.processing_status === 'failed' && video.processing_error && <p className="break-words rounded-md bg-danger-soft p-2.5 font-mono text-xs text-danger">{video.processing_error}</p>}
        <dl className="space-y-1.5 text-[13px]">
          {video.scheduled_release_at && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Release</dt><dd className="text-right">{formatDayTime(video.scheduled_release_at)}</dd></div>}
          {video.duration_seconds > 0 && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Length</dt><dd className="tabular-nums">{clock(video.duration_seconds)}</dd></div>}
          <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">Video ID</dt><dd className="flex items-center gap-1 font-mono text-xs">{video._id.slice(-8)}<CopyButton value={video._id} label="video ID" /></dd></div>
        </dl>
        {video.processing_status === 'failed' && can('video', 'update') && (
          <Button size="sm" variant="outline" className="w-full" disabled={retry.loading} onClick={() => void retry.execute()}>
            <RefreshCw className={cn('h-3.5 w-3.5', retry.loading && 'animate-spin')} />{retry.loading ? 'Restarting…' : 'Retry processing'}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
