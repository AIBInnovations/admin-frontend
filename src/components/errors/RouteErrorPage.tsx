import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { AlertCircle, LayoutDashboard, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Shown instead of React Router's developer error screen when a page throws
 * while rendering. Technical details appear only in development builds.
 */
export function RouteErrorPage() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error)

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div role="alert" className="w-full max-w-md rounded-xl border border-border bg-card px-6 py-10 text-center shadow-card">
        <AlertCircle aria-hidden="true" className="mx-auto h-8 w-8 text-danger" />
        <h1 className="mt-3 font-display text-lg font-semibold text-foreground">
          {notFound ? 'This page does not exist' : 'Something went wrong on this page'}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {notFound
            ? 'Check the address, or go back to the dashboard.'
            : 'Reload to try again. If it keeps happening, tell the tech team what you were doing when it happened.'}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          {!notFound && (
            <Button className="min-h-10" onClick={() => window.location.reload()}>
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              Reload
            </Button>
          )}
          {/* A plain link, so the dashboard starts from a clean state. */}
          <Button asChild variant="outline" className="min-h-10">
            <a href="/">
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Go to dashboard
            </a>
          </Button>
        </div>
        {import.meta.env.DEV && (
          <pre className="mt-6 max-h-48 overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs text-muted-foreground whitespace-pre-wrap break-words">
            {detail}
          </pre>
        )}
      </div>
    </main>
  )
}
