import { Button } from '@/components/ui/button'
import { X, Eye, EyeOff, Archive, Loader2 } from 'lucide-react'

interface BulkAction {
  label: string
  icon: React.ReactNode
  onClick: () => void
  loading?: boolean
  variant?: 'default' | 'outline' | 'amber'
}

interface ExplorerSelectionBarProps {
  count: number
  onClear: () => void
  actions: BulkAction[]
}

export function ExplorerSelectionBar({ count, onClear, actions }: ExplorerSelectionBarProps) {
  if (count === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-foreground text-background rounded-xl px-4 py-2.5 shadow-lg border border-border/20">
      <span className="text-sm font-medium mr-1">{count} selected</span>

      {actions.map((action, i) => (
        <Button
          key={i}
          size="sm"
          variant="ghost"
          disabled={action.loading}
          onClick={action.onClick}
          className={`h-7 gap-1.5 text-background hover:text-background hover:bg-white/10 ${
            action.variant === 'amber' ? 'text-amber-300 hover:text-amber-300' : ''
          }`}
        >
          {action.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : action.icon}
          <span className="hidden sm:inline">{action.label}</span>
        </Button>
      ))}

      <div className="w-px h-4 bg-white/20 mx-1" />

      <Button
        size="icon"
        variant="ghost"
        onClick={onClear}
        className="h-7 w-7 text-background hover:text-background hover:bg-white/10"
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}

export { Eye, EyeOff, Archive }
