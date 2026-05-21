import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertCircle, CheckCircle2, Loader2, Clock, Upload } from 'lucide-react'
import { useExplorerMutation } from '../../hooks/useExplorerMutation'
import { videosService } from '@/services/videos.service'
import type { PackageDetailVideo } from '@/services/packages.service'

type ProcessingStatus = PackageDetailVideo['processing_status']

const STATUS_CONFIG: Record<ProcessingStatus, {
  icon: React.ElementType
  iconClass: string
  label: string
  description: string
}> = {
  ready: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-500',
    label: 'Ready',
    description: 'Video has been processed and is available to students.',
  },
  processing: {
    icon: Loader2,
    iconClass: 'text-blue-500 animate-spin',
    label: 'Processing',
    description: 'Video is being transcoded by MediaConvert. This usually takes a few minutes.',
  },
  uploading: {
    icon: Upload,
    iconClass: 'text-violet-500',
    label: 'Uploading',
    description: 'Video file is being uploaded to storage.',
  },
  upcoming: {
    icon: Clock,
    iconClass: 'text-orange-500',
    label: 'Upcoming',
    description: 'Placeholder video scheduled for a future release date.',
  },
  failed: {
    icon: AlertCircle,
    iconClass: 'text-red-500',
    label: 'Failed',
    description: 'Processing encountered an error.',
  },
}

interface ProcessingDetailsPopoverProps {
  video: PackageDetailVideo
  onRefresh?: () => void
  children: React.ReactNode
}

export function ProcessingDetailsPopover({ video, onRefresh, children }: ProcessingDetailsPopoverProps) {
  const config = STATUS_CONFIG[video.processing_status] ?? STATUS_CONFIG.failed
  const StatusIcon = config.icon

  const retry = useExplorerMutation({
    name: 'Retry transcoding',
    fn: () => videosService.retryTranscoding(video._id),
    onSuccess: () => onRefresh?.(),
    successMessage: 'Transcoding restarted',
  })

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-0 rounded-xl shadow-lg ring-1 ring-black/10" align="end">
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <StatusIcon className={`w-4 h-4 shrink-0 ${config.iconClass}`} />
            <span className="text-sm font-semibold text-slate-800">{config.label}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{config.description}</p>
        </div>

        {video.processing_status === 'failed' && video.processing_error && (
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-medium text-slate-600 mb-1">Error details</p>
            <p className="text-xs text-red-600 font-mono leading-relaxed break-all">
              {video.processing_error}
            </p>
          </div>
        )}

        {video.scheduled_release_at && (
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-medium text-slate-600 mb-1">Scheduled release</p>
            <p className="text-xs text-slate-700">
              {new Date(video.scheduled_release_at).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          </div>
        )}

        <div className="px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Video ID</span>
            <span className="font-mono text-slate-600 text-[11px]">{video._id.slice(-8)}</span>
          </div>
          {video.duration_seconds > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Duration</span>
              <span className="text-slate-600">
                {Math.floor(video.duration_seconds / 60)}m {video.duration_seconds % 60}s
              </span>
            </div>
          )}
        </div>

        {video.processing_status === 'failed' && (
          <div className="px-4 pb-3">
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 text-xs h-8"
              disabled={retry.loading}
              onClick={(e) => { e.stopPropagation(); retry.execute() }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retry.loading ? 'animate-spin' : ''}`} />
              {retry.loading ? 'Restarting…' : 'Retry processing'}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
