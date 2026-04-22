import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { EXPLORER_BASE } from '../parseExplorerPath'

interface ExplorerNotFoundProps {
  reason: string
  fallbackUrl: string
}

const REASON_LABELS: Record<string, string> = {
  malformed: 'The URL structure is invalid.',
  notfound: 'This item no longer exists.',
  chain_mismatch: 'The content path has changed.',
}

export function ExplorerNotFound({ reason, fallbackUrl: _fallbackUrl }: ExplorerNotFoundProps) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7 text-red-500" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">Page not found</h3>
      <p className="text-sm text-muted-foreground mb-5">
        {REASON_LABELS[reason] ?? 'Invalid URL.'} Redirecting…
      </p>
      <Button variant="outline" size="sm" onClick={() => navigate(EXPLORER_BASE)}>
        Go to Explorer home
      </Button>
    </div>
  )
}
