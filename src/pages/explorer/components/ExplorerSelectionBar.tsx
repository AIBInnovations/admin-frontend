import type { ReactNode } from 'react'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface BulkAction {
  label: string
  icon: ReactNode
  onClick: () => void
  loading?: boolean
}

interface ExplorerSelectionBarProps {
  count: number
  onClear: () => void
  actions: BulkAction[]
}

/** Sits under the list while rows are selected. */
export function ExplorerSelectionBar({ count, onClear, actions }: ExplorerSelectionBarProps) {
  if (count === 0) return null
  return (
    <div role="toolbar" aria-label="Selected items" className="pg-dock flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-t border-border bg-accent px-4 py-2">
      <span aria-live="polite" className="mr-auto text-sm font-semibold tabular-nums text-accent-foreground">{count} selected</span>
      {actions.map((action) => (
        <Button key={action.label} size="sm" variant="outline" disabled={action.loading} onClick={action.onClick} className="h-8 gap-1.5 bg-card">
          {action.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : action.icon}
          {action.label}
        </Button>
      ))}
      <Button size="icon" variant="ghost" onClick={onClear} aria-label="Clear selection" className="h-8 w-8"><X className="h-4 w-4" /></Button>
    </div>
  )
}
