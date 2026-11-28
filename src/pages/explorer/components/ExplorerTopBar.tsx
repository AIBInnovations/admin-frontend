import { useCallback, useRef } from 'react'
import { ArrowLeft, Keyboard, RefreshCw, Share2, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ExplorerBreadcrumb } from './ExplorerBreadcrumb'
import { ExplorerFind } from './ExplorerFind'
import { useActions } from '../actions/ActionsContext'
import { useKeyboardNav } from '../hooks/useKeyboardNav'
import { usePanelSelection } from '../context/PanelSelectionContext'
import { copyShareLink } from '../copyShareLink'
import { getParentUrl, type ExplorerFocus } from '../parseExplorerPath'
import type { ExplorerData } from '../hooks/useExplorerData'

interface BarButtonProps { label: string; icon: LucideIcon; onClick: () => void; disabled?: boolean; spin?: boolean }

function BarButton({ label, icon: Icon, onClick, disabled, spin }: BarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} onClick={onClick} disabled={disabled} className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground">
          <Icon className={cn('h-4 w-4', spin && 'animate-spin')} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

export function ExplorerTopBar({ focus, data }: { focus: ExplorerFocus; data: ExplorerData }) {
  const { go, handle, manual, clear } = usePanelSelection()
  const { open } = useActions()
  const parentUrl = getParentUrl(focus)
  const findRef = useRef<HTMLInputElement>(null)
  const showHelp = useCallback(() => open({ type: 'shortcuts' }), [open])

  useKeyboardNav({
    onHelp: showHelp,
    onFind: () => findRef.current?.focus(),
    onSave: () => { if (handle?.dirty) void handle.save() },
    onEscape: () => {
      if (handle?.dirty) return
      if (manual) clear()
      else if (parentUrl) go(parentUrl)
    },
  })

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2">
        {parentUrl && <BarButton label="Go up" icon={ArrowLeft} onClick={() => go(parentUrl)} />}
        <div className="min-w-0 flex-[3] basis-48">
          <ExplorerBreadcrumb
            focus={focus}
            subjectName={data.subjectName}
            packageName={data.packageName}
            seriesName={data.seriesName}
            moduleName={data.moduleName}
            videoName={data.videoName}
            bookName={data.bookName}
          />
        </div>
        <div className="flex min-w-0 flex-1 basis-56 items-center gap-1 @3xl:max-w-sm">
          <ExplorerFind inputRef={findRef} />
          <BarButton label="Refresh" icon={RefreshCw} onClick={() => void data.refetch()} disabled={data.loading} spin={data.loading} />
          <BarButton label="Copy link" icon={Share2} onClick={() => copyShareLink('Link')} />
          <BarButton label="Keyboard shortcuts (?)" icon={Keyboard} onClick={showHelp} />
        </div>
      </div>
    </TooltipProvider>
  )
}
