import type { LucideIcon } from 'lucide-react'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExplorerEmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export function ExplorerEmptyState({ icon: Icon, title, description, action }: ExplorerEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <Icon aria-hidden="true" className="mb-3 h-7 w-7 text-muted-foreground/70" />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
      {action && <Button onClick={action.onClick} size="sm" variant="outline" className="mt-4">{action.label}</Button>}
    </div>
  )
}

/** A section this admin's role cannot read. The rest of the page still works. */
export function NoAccess({ what }: { what: string }) {
  return <ExplorerEmptyState icon={Lock} title={`You do not have access to ${what}`} description="Ask a super admin to add the permission to your role." />
}
