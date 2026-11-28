import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, Bell, Briefcase, ChevronDown, FileWarning, Film, LogOut, Menu, MessageSquareText, PackageX, Shield, User, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/AuthContext'
import { adminAlertsService, type AdminAlert } from '@/services/adminAlerts.service'
import { relativeTime } from '@/lib/relativeTime'
import { cn } from '@/lib/utils'
import { GlobalSearch } from './GlobalSearch'

const ALERT_ICON: Record<AdminAlert['kind'], LucideIcon> = {
  payment_case: AlertTriangle,
  feedback: MessageSquareText,
  delivery_note: FileWarning,
  video: Film,
  zoho_item: PackageX,
  career_application: Briefcase,
}

const REFRESH_MS = 3 * 60 * 1000
// The API limits requests per IP, so browsing quickly must not refetch each time.
const MIN_GAP_MS = 45 * 1000

/** Counts of what is waiting. Refreshes on navigation and while the tab is in view. */
function useAlerts() {
  const [alerts, setAlerts] = useState<AdminAlert[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const { pathname } = useLocation()

  const lastLoad = useRef(0)

  const load = useCallback(async (force = false) => {
    if (!force && Date.now() - lastLoad.current < MIN_GAP_MS) return
    lastLoad.current = Date.now()
    try {
      const res = await adminAlertsService.list()
      setAlerts(res.data?.alerts ?? [])
      setState('ready')
    } catch {
      setState('error')
    }
  }, [])

  useEffect(() => { void load() }, [load, pathname])
  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load(true) }, REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  return { alerts, state, reload: load }
}

interface HeaderProps {
  onMenuClick: () => void
  menuOpen: boolean
}

export function Header({ onMenuClick, menuOpen }: HeaderProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { alerts, state, reload } = useAlerts()
  const total = alerts.reduce((n, a) => n + a.count, 0)

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const userInitials = (() => {
    if (!user?.name) return 'U'
    const names = user.name.trim().split(/\s+/)
    return (names.length >= 2 ? `${names[0][0]}${names[1][0]}` : user.name.substring(0, 2)).toUpperCase()
  })()

  return (
    <header className="relative z-40 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:gap-4 sm:px-6">
      <Button variant="ghost" size="icon" onClick={onMenuClick} aria-label="Open menu" aria-expanded={menuOpen} className="h-9 w-9 shrink-0 lg:hidden">
        <Menu className="h-5 w-5" />
      </Button>

      <GlobalSearch />
      <div className="flex-1" />

      <div className="flex shrink-0 items-center gap-1">
        <DropdownMenu onOpenChange={(open) => { if (open) void reload(true) }}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label={total > 0 ? `Alerts, ${total} waiting` : 'Alerts, none waiting'}>
              <Bell className="h-[18px] w-[18px]" />
              {total > 0 && (
                <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-white">
                  {total > 99 ? '99+' : total}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[min(360px,calc(100vw-1.5rem))] p-1.5">
            <DropdownMenuLabel className="px-2.5">Waiting for someone</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[min(60dvh,420px)] overflow-y-auto">
              {state === 'error' && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Alerts could not be loaded. They will retry on their own.</p>}
              {state === 'loading' && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Checking…</p>}
              {state === 'ready' && alerts.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing is waiting. New disputes, low ratings and failed deliveries show up here.</p>}
              {alerts.map((alert) => {
                const Icon = ALERT_ICON[alert.kind] ?? Bell
                return (
                  <DropdownMenuItem key={alert.id} onSelect={() => navigate(alert.href)} className="cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2.5">
                    <Icon aria-hidden="true" className={cn('mt-0.5 h-4 w-4 shrink-0', alert.severity === 'high' ? 'text-danger' : 'text-warning')} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{alert.title}</span>
                      <span className="block text-xs text-muted-foreground">{alert.description}</span>
                      {alert.latest_at && <span className="mt-0.5 block text-xs text-muted-foreground">Latest {relativeTime(alert.latest_at)}</span>}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground">{alert.count}</span>
                  </DropdownMenuItem>
                )
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2" aria-label={`Account: ${user?.name || 'Admin'}`}>
              <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">{userInitials}</span>
              <span className="hidden max-w-40 truncate text-sm font-medium md:inline">{user?.name || 'Admin'}</span>
              <ChevronDown aria-hidden="true" className="hidden h-3.5 w-3.5 text-muted-foreground md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <p className="truncate text-sm font-medium">{user?.name || 'Admin user'}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">{user?.email || ''}</p>
              {user?.role_name && <p className="mt-1 truncate text-xs font-normal text-muted-foreground">{user.role_name}</p>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/profile"><User className="mr-2 h-4 w-4" />Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="justify-between">
              <span className="flex items-center"><Shield className="mr-2 h-4 w-4" />Audit logs</span>
              <span className="text-xs">Not available yet</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-danger focus:text-danger" onSelect={() => void handleLogout()}>
              <LogOut className="mr-2 h-4 w-4" />Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
