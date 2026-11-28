import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <h1 className="font-display text-2xl font-semibold">There is no page at this address</h1>
      <p className="max-w-sm text-sm text-muted-foreground">The link may be old, or the item may have been removed. Use the menu or search to find it.</p>
      <Button asChild><Link to="/">Go to dashboard</Link></Button>
    </div>
  )
}
