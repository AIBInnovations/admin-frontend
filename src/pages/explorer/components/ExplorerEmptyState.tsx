import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'

interface ExplorerEmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function ExplorerEmptyState({ icon: Icon, title, description, action }: ExplorerEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-slate-400" />
      </div>
      <h3 className="text-sm font-semibold text-slate-700 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-xs mb-5 leading-relaxed">{description}</p>
      {action && (
        <Button onClick={action.onClick} size="sm" variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50">
          {action.label}
        </Button>
      )}
    </div>
  )
}
