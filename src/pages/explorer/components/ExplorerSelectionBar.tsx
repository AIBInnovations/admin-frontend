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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white text-slate-900 rounded-xl px-4 py-2.5 shadow-lg ring-1 ring-black/10">
      <span className="text-sm font-medium text-slate-700 mr-1">{count} selected</span>

      {actions.map((action, i) => (
        <Button
          key={i}
          size="sm"
          variant="ghost"
          disabled={action.loading}
          onClick={action.onClick}
          className={`h-7 gap-1.5 ${
            action.variant === 'amber'
              ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          {action.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : action.icon}
          <span className="hidden sm:inline">{action.label}</span>
        </Button>
      ))}

      <div className="w-px h-4 bg-slate-200 mx-1" />

      <Button
        size="icon"
        variant="ghost"
        onClick={onClear}
        className="h-7 w-7 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}

export { Eye, EyeOff, Archive }
