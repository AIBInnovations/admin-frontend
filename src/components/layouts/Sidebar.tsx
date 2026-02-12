import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Video,
  ShoppingBag,
  Calendar,
  BarChart3,
  Bell,
  Settings,
  FileText,
  GraduationCap,
  ChevronLeft,
  ChevronDown,
  Package,
  BookCopy,
  CreditCard,
  Receipt,
  TrendingUp,
  Tags,
  BookImage,
  Image,
  FileCheck,
  UserCog,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface NavChild {
  name: string
  href: string
  icon?: LucideIcon
}

interface NavItem {
  name: string
  href?: string
  icon: LucideIcon
  badge?: string
  children?: NavChild[]
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Users', href: '/users', icon: Users, badge: '1.2k' },
  {
    name: 'Content',
    icon: BookOpen,
    children: [
      { name: 'Subjects', href: '/content/subjects' },
      { name: 'Packages', href: '/content/packages' },
      { name: 'Series', href: '/content/series' },
      { name: 'Modules', href: '/content/modules' },
      { name: 'Videos', href: '/content/videos' },
      { name: 'Video Tags', href: '/content/video-tags' },
      { name: 'Documents', href: '/content/documents' },
      { name: 'Books', href: '/content/books' },
      { name: 'Banners', href: '/content/banners' },
    ],
  },
  { name: 'Live Sessions', href: '/sessions', icon: Calendar, badge: '3' },
  { name: 'Faculty', href: '/faculty', icon: GraduationCap },
  {
    name: 'Commerce',
    icon: ShoppingBag,
    children: [
      { name: 'Purchases', href: '/commerce/purchases' },
      { name: 'Payments', href: '/commerce/payments' },
      { name: 'Invoices', href: '/commerce/invoices' },
      { name: 'Book Orders', href: '/commerce/book-orders' },
      { name: 'Revenue', href: '/commerce/revenue' },
    ],
  },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Notifications', href: '/notifications', icon: Bell, badge: '12' },
  {
    name: 'Settings',
    icon: Settings,
    children: [
      { name: 'Admin Users', href: '/settings/admin-users' },
      { name: 'Admin Roles', href: '/settings/admin-roles' },
      { name: 'App Settings', href: '/settings/app' },
    ],
  },
]

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'relative flex flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] transition-all duration-300 ease-in-out',
          isOpen ? 'w-64' : 'w-[68px]'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-[hsl(var(--border))] px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0000C8] text-sm font-bold text-white">
            P
          </div>
          {isOpen && (
            <span className="text-lg font-semibold tracking-tight">
              PGME
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn('ml-auto h-8 w-8 shrink-0', !isOpen && 'ml-0')}
          >
            <ChevronLeft
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                !isOpen && 'rotate-180'
              )}
            />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-3">
          <nav className="space-y-1 px-2">
            {navigation.map((item) => (
              <NavItemComponent
                key={item.name}
                item={item}
                isOpen={isOpen}
              />
            ))}
          </nav>
        </ScrollArea>

        {/* User Profile (footer) */}
        <div className="border-t border-[hsl(var(--border))] p-3">
          <div className={cn('flex items-center gap-3', !isOpen && 'justify-center')}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0000C8]/10 text-sm font-semibold text-[#0000C8]">
              SA
            </div>
            {isOpen && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">Super Admin</p>
                <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">
                  admin@pgme.com
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}

function NavItemComponent({
  item,
  isOpen,
}: {
  item: NavItem
  isOpen: boolean
}) {
  const location = useLocation()
  const [isExpanded, setIsExpanded] = useState(() => {
    if (item.children) {
      return item.children.some((child) => location.pathname === child.href)
    }
    return false
  })

  const Icon = item.icon
  const isActive = item.href ? location.pathname === item.href : false
  const hasActiveChild = item.children?.some(
    (child) => location.pathname === child.href
  )

  // Collapsed sidebar with tooltip
  if (!isOpen) {
    if (item.children) {
      return (
        <div className="space-y-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                  'flex h-10 w-full items-center justify-center rounded-lg transition-colors',
                  hasActiveChild
                    ? 'bg-[#0000C8]/10 text-[#0000C8]'
                    : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {item.name}
            </TooltipContent>
          </Tooltip>
        </div>
      )
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={item.href!}
            className={cn(
              'relative flex h-10 items-center justify-center rounded-lg transition-colors',
              isActive
                ? 'bg-[#0000C8] text-white'
                : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]'
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {item.badge && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#0000C8] text-[9px] font-medium text-white">
                !
              </span>
            )}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">
          {item.name}
          {item.badge && ` (${item.badge})`}
        </TooltipContent>
      </Tooltip>
    )
  }

  // Expanded sidebar - parent with children
  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
            hasActiveChild
              ? 'text-[#0000C8]'
              : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]'
          )}
        >
          <Icon className="h-5 w-5 shrink-0" />
          <span className="flex-1 text-left">{item.name}</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          />
        </button>
        {isExpanded && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-[hsl(var(--border))] pl-3">
            {item.children.map((child) => {
              const childActive = location.pathname === child.href
              return (
                <Link
                  key={child.name}
                  to={child.href}
                  className={cn(
                    'flex h-9 items-center rounded-lg px-3 text-sm transition-colors',
                    childActive
                      ? 'bg-[#0000C8] font-medium text-white'
                      : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]'
                  )}
                >
                  {child.name}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Expanded sidebar - single item
  return (
    <Link
      to={item.href!}
      className={cn(
        'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
        isActive
          ? 'bg-[#0000C8] text-white'
          : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]'
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="flex-1">{item.name}</span>
      {item.badge && (
        <Badge
          variant="secondary"
          className="ml-auto h-5 px-1.5 text-[10px] font-medium"
        >
          {item.badge}
        </Badge>
      )}
    </Link>
  )
}
