import { RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** A refresh failed: the page keeps the old figures and says so. */
export function StaleNotice({ error, onRetry }: { error?: string | null; onRetry: () => void }) {
  if (!error) return null
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-danger-soft px-4 py-2.5 text-sm text-danger">
      <span>Could not refresh, showing what was loaded before. {error}</span>
      <Button variant="outline" size="sm" onClick={onRetry}><RotateCw aria-hidden="true" className="h-3.5 w-3.5" />Try again</Button>
    </div>
  )
}
