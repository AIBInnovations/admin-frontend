import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ArrowLeft, Share2, RefreshCw, Keyboard } from 'lucide-react'
import { ExplorerBreadcrumb } from './ExplorerBreadcrumb'
import { KeyboardHelpDialog } from './popovers/KeyboardHelpDialog'
import { useKeyboardNav } from '../hooks/useKeyboardNav'
import { copyShareLink } from '../copyShareLink'
import { getParentUrl, type ExplorerFocus } from '../parseExplorerPath'

interface ExplorerTopBarProps {
  focus: ExplorerFocus
  subjectName?: string
  packageName?: string
  seriesName?: string
  moduleName?: string
  onRefresh?: () => void
  loading?: boolean
}

export function ExplorerTopBar({
  focus,
  subjectName,
  packageName,
  seriesName,
  moduleName,
  onRefresh,
  loading,
}: ExplorerTopBarProps) {
  const navigate = useNavigate()
  const parentUrl = getParentUrl(focus)
  const [helpOpen, setHelpOpen] = useState(false)

  useKeyboardNav({
    onHelp: () => setHelpOpen(true),
    upUrl: parentUrl ?? undefined,
  })

  return (
    <div className="bg-white">
      <div className="flex items-center gap-2 px-4 sm:px-5 h-12">
        {parentUrl && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  onClick={() => navigate(parentUrl)}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Go up</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <div className="flex-1 min-w-0">
          <ExplorerBreadcrumb
            focus={focus}
            subjectName={subjectName}
            packageName={packageName}
            seriesName={seriesName}
            moduleName={moduleName}
          />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onRefresh && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    onClick={onRefresh}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Refresh</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  onClick={() => copyShareLink('Link')}
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Copy link</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  onClick={() => setHelpOpen(true)}
                >
                  <Keyboard className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Keyboard shortcuts (?)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <KeyboardHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
