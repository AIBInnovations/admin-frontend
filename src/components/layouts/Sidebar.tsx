import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { activeHref, visibleNavigation, type NavItem } from './navigation'

function initials(name?: string | null) {
  if (!name) return '·'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '·'
}

interface SidebarProps {
  /** Desktop: icons only. Ignored on small screens, where the menu is a drawer. */
  collapsed: boolean
  onToggleCollapsed: () => void
  isDesktop: boolean
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ collapsed, onToggleCollapsed, isDesktop, mobileOpen, onMobileClose }: SidebarProps) {
  const { hasPermission, user } = useAuth()
  const { pathname } = useLocation()
  const asideRef = useRef<HTMLElement>(null)
  const items = useMemo(() => visibleNavigation(hasPermission), [hasPermission, user])
  const active = activeHref(items, pathname)
  const rail = isDesktop && collapsed
  const hidden = !isDesktop && !mobileOpen

  // Drawer: move focus in, close on Escape, give focus back.
  useEffect(() => {
    if (isDesktop || !mobileOpen) return
    const before = document.activeElement as HTMLElement | null
    asideRef.current?.querySelector<HTMLElement>('a, button')?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onMobileClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      before?.focus?.()
    }
  }, [isDesktop, mobileOpen, onMobileClose])

  return (
    <TooltipProvider delayDuration={0}>
      <div
        aria-hidden="true"
        className={cn(
          'fixed inset-0 z-[45] touch-none bg-ink/50 transition-opacity duration-300 lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onMobileClose}
      />
      <aside
        ref={asideRef}
        aria-label="Main menu"
        // Off-screen must also mean out of the tab order
        inert={hidden}
        className={cn(
          'flex shrink-0 flex-col bg-rail text-rail-foreground transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none lg:transition-none',
          // Mobile: fixed overlay, always full-width, slide in/out
          'fixed inset-y-0 left-0 z-50 w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: in the flow, width toggles. Above the header (z-40), so the
          // collapsed arrow, which sits past the rail's edge, stays visible.
          'lg:relative lg:z-[45] lg:translate-x-0',
          rail ? 'lg:w-[68px]' : 'lg:w-64'
        )}
      >
        {/* Brand edge: the cobalt-to-sky rule that runs down the rail */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-[2px]" style={{ backgroundImage: 'var(--brand-gradient-v)' }} />

        {/* Logo and the collapse arrow, as on the live panel */}
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-white/[0.06] px-4">
          <Link to="/" aria-label="PGME admin, go to dashboard" className="flex shrink-0 items-center gap-2 rounded-lg pointer-coarse:h-10">
            <img src="/favicon.svg" alt="" aria-hidden="true" width={36} height={36} className="h-9 w-9 shrink-0" />
            {!rail && <span className="whitespace-nowrap font-display text-lg font-semibold tracking-tight text-white">PGME</span>}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={isDesktop ? onToggleCollapsed : onMobileClose}
            aria-label={rail ? 'Expand menu' : isDesktop ? 'Collapse menu' : 'Close menu'}
            aria-expanded={!rail}
            className={cn(
              'ml-auto h-8 w-8 shrink-0',
              rail ? 'ml-0 text-foreground' : 'text-rail-muted hover:bg-rail-hover hover:text-white'
            )}
          >
            <ChevronLeft aria-hidden="true" className={cn('h-4 w-4 transition-transform duration-200', rail && 'rotate-180')} />
          </Button>
        </div>

        <nav aria-label="Sections" className="pg-rail-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain py-3">
          <ul className="space-y-1 px-2">
            {items.map((item) => (
              <li key={item.name}>
                {rail ? <RailItem item={item} active={active} /> : <FullItem item={item} active={active} />}
              </li>
            ))}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-white/[0.06] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className={cn('flex items-center gap-3 overflow-hidden', rail && 'justify-center')} title={rail ? user?.name || undefined : undefined}>
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
              {initials(user?.name)}
            </span>
            {!rail && (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{user?.name || 'Signed in'}</span>
                <span className="block truncate text-xs text-rail-muted">{user?.role_name || user?.email || ''}</span>
              </span>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}

const railButton = 'relative flex h-10 w-full items-center justify-center rounded-lg transition-colors'

/** Collapsed: single pages are tooltipped links, groups open a flyout. */
function RailItem({ item, active }: { item: NavItem; active: string | null }) {
  const [open, setOpen] = useState(false)
  const { pathname, search } = useLocation()
  const Icon = item.icon
  useEffect(() => { setOpen(false) }, [pathname, search])

  if (!item.children) {
    const isActive = active === item.href
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={item.href!}
            aria-label={item.name}
            aria-current={isActive ? 'page' : undefined}
            className={cn(railButton, isActive ? 'bg-rail-active text-white' : 'text-rail-muted hover:bg-rail-hover hover:text-white')}
          >
            <Icon aria-hidden="true" className="h-5 w-5" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{item.name}</TooltipContent>
      </Tooltip>
    )
  }

  const hasActive = item.children.some((c) => c.href === active)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip open={open ? false : undefined}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`${item.name} menu`}
              aria-expanded={open}
              className={cn(railButton, hasActive ? 'bg-rail-active text-white' : open ? 'bg-rail-hover text-white' : 'text-rail-muted hover:bg-rail-hover hover:text-white')}
            >
              <Icon aria-hidden="true" className="h-5 w-5" />
              <span aria-hidden="true" className="absolute right-1 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[3px] border-l-[4px] border-y-transparent border-l-current opacity-50" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">{item.name}</TooltipContent>
      </Tooltip>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={14}
        collisionPadding={12}
        className="max-h-[min(70dvh,480px)] w-56 overflow-y-auto rounded-lg border-border p-1.5"
      >
        <p className="px-2.5 pb-1 pt-1.5 text-xs font-semibold text-muted-foreground">{item.name}</p>
        <ul>
          {item.children.map((child) => {
            const isActive = child.href === active
            return (
              <li key={child.href}>
                <Link
                  to={child.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex min-h-9 items-center rounded-md px-2.5 py-1.5 text-[13.5px] transition-colors',
                    isActive ? 'bg-accent font-medium text-accent-foreground' : 'text-foreground hover:bg-muted'
                  )}
                >
                  {child.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

function FullItem({ item, active }: { item: NavItem; active: string | null }) {
  const hasActive = !!item.children?.some((c) => c.href === active)
  const [open, setOpen] = useState(hasActive)
  const Icon = item.icon
  const listId = `nav-${item.name.replace(/\s+/g, '-').toLowerCase()}`

  // Arriving on one of its pages opens the group; it can still be closed after.
  useEffect(() => { if (hasActive) setOpen(true) }, [hasActive])

  if (!item.children) {
    const isActive = active === item.href
    return (
      <Link
        to={item.href!}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
          isActive ? 'bg-rail-active text-white' : 'text-rail-foreground/85 hover:bg-rail-hover hover:text-white'
        )}
      >
        <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
        <span className="truncate">{item.name}</span>
      </Link>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className={cn(
          'flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
          hasActive ? 'text-white' : 'text-rail-foreground/85 hover:bg-rail-hover hover:text-white'
        )}
      >
        <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">{item.name}</span>
        {hasActive && !open && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-sky" />}
        <ChevronDown aria-hidden="true" className={cn('h-4 w-4 shrink-0 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <ul id={listId} className="ml-4 mt-1 space-y-0.5 border-l border-white/[0.1] pl-3">
          {item.children.map((child) => {
            const isActive = child.href === active
            return (
              <li key={child.href}>
                <Link
                  to={child.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-colors pointer-coarse:h-10',
                    isActive ? 'bg-rail-active text-white shadow-sm' : 'text-rail-muted hover:bg-rail-hover hover:text-white'
                  )}
                >
                  <span className="truncate">{child.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
