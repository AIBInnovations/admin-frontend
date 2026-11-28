import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Keeps one broken page from blanking the whole panel. Remounted by the
 * layout's key on every route change, so leaving the page clears it.
 */
export class PageErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) { return { error } }

  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Page crashed:', error, info.componentStack) }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const stale = /dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(error.message)
    return (
      <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
        <AlertTriangle aria-hidden="true" className="h-8 w-8 text-warning" />
        <h1 className="font-display text-xl font-semibold">{stale ? 'The panel was updated' : 'This page could not be shown'}</h1>
        <p className="text-sm text-muted-foreground">
          {stale ? 'Reload to get the new version.' : 'Nothing was saved or changed. Reload the page, and report it if it happens again.'}
        </p>
        <Button onClick={() => window.location.reload()}>Reload page</Button>
      </div>
    )
  }
}
