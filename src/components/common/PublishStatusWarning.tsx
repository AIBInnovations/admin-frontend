import { AlertTriangle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface PublishStatusWarningProps {
  publishStatus: string
  parentPublishStatus?: string
  parentIsActive?: boolean
  parentType?: string
  parentName?: string
}

export function PublishStatusWarning({
  publishStatus,
  parentPublishStatus,
  parentIsActive,
  parentType = 'parent',
  parentName,
}: PublishStatusWarningProps) {
  if (publishStatus !== 'published') return null

  let message = ''

  if (parentPublishStatus === 'draft') {
    message = `Parent ${parentType}${parentName ? ` '${parentName}'` : ''} is draft — not visible to users`
  } else if (parentIsActive === false) {
    message = `Parent ${parentType}${parentName ? ` '${parentName}'` : ''} is inactive — not visible to users`
  }

  if (!message) return null

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {message}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
