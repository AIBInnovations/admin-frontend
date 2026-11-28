import { Suspense, useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { NavigationGuard } from './NavigationGuard'
import { useWorkspaceState } from './workspaceStore'
import { PageSkeleton } from '@/components/common/PageSkeleton'
import { PageErrorBoundary } from '@/components/common/PageErrorBoundary'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { usePersistentState } from '@/hooks/usePersistentState'

export function DashboardLayout() {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [collapsed, setCollapsed] = usePersistentState('pgme.nav.collapsed', false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const { count } = useWorkspaceState()
  const workspaceOpen = count > 0

  // The drawer closes when a link is followed, and never survives a resize.
  useEffect(() => { setMobileOpen(false) }, [location.pathname, location.search, isDesktop])
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  // New page, top of page. Hash-only changes (opening a form) keep the scroll.
  useEffect(() => { document.getElementById('main-content')?.scrollTo({ top: 0 }) }, [location.pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') {
        const el = document.activeElement as HTMLElement | null
        if (el?.isContentEditable) return // bold, in a rich text field
        e.preventDefault()
        if (isDesktop) setCollapsed((c) => !c)
        else setMobileOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isDesktop, setCollapsed])

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow-raised">
        Skip to content
      </a>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        isDesktop={isDesktop}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobile}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileOpen(true)} menuOpen={mobileOpen} />

        <div className="relative min-h-0 flex-1">
          <main
            id="main-content"
            tabIndex={-1}
            // A workspace covers the page; keep it out of the tab order and the a11y tree
            inert={workspaceOpen}
            className="relative h-full overflow-y-auto overscroll-contain p-4 outline-none sm:p-6 lg:px-8"
          >
            {/* One short entrance per page. Moving between folders of the Explorer is one page. */}
            <div key={location.pathname.startsWith('/content/explorer') ? '/content/explorer' : location.pathname} className="pg-rise mx-auto w-full max-w-[1440px]">
              <PageErrorBoundary>
                <Suspense fallback={<PageSkeleton />}>
                  <Outlet />
                </Suspense>
              </PageErrorBoundary>
            </div>
          </main>
          {/* Full-page forms render here (see ui/dialog) */}
          <div id="workspace-root" className="pointer-events-none absolute inset-0 z-30" />
        </div>
      </div>
      <NavigationGuard />
    </div>
  )
}
