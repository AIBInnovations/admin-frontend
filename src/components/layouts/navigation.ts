import {
  LayoutDashboard, Compass, Users, BookOpen, Calendar, CalendarRange, GraduationCap, ShoppingBag, BarChart3, Download, Bell, Settings,
  MessageSquareText, Briefcase, type LucideIcon,
} from 'lucide-react'

export interface NavChild {
  name: string
  href: string
  /** Backend permission required to see this item. Omit = always visible. '*' = super admin only. */
  permission?: string
  /** Extra words the Ctrl+K search should match. */
  keywords?: string
}

export interface NavItem extends Omit<NavChild, 'href'> {
  href?: string
  icon: LucideIcon
  children?: NavChild[]
}

/**
 * The menu, in the order and with the names admins already know from the live
 * panel. The sidebar, its collapsed flyouts and Ctrl+K all read this.
 *
 * Only additions since then: Delivery Notes and Disputes & Refunds (Commerce),
 * Feedback, and Careers. Do not rename, reorder or remove entries.
 */
export const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, keywords: 'home overview' },
  { name: 'Explorer', href: '/content/explorer', icon: Compass, permission: 'subjects.read', keywords: 'content library subjects packages series modules videos documents books' },
  {
    name: 'Users',
    icon: Users,
    children: [
      { name: 'All Users', href: '/users', permission: 'users.read', keywords: 'students' },
      { name: 'Subscriptions', href: '/users/subscriptions', permission: 'users.read', keywords: 'expiring active extend' },
      { name: 'Grant Access', href: '/users/grant-access', permission: 'users.update', keywords: 'complimentary free' },
      { name: 'Email Excluded', href: '/users/email-excluded', permission: 'users.read' },
    ],
  },
  {
    name: 'Content',
    icon: BookOpen,
    children: [
      { name: 'Subjects', href: '/content/subjects', permission: 'subjects.read' },
      { name: 'Packages', href: '/content/packages', permission: 'packages.read', keywords: 'plans pricing tiers subscriptions 6 months 12 months' },
      { name: 'Series', href: '/content/series', permission: 'series.read' },
      { name: 'Modules', href: '/content/modules', permission: 'modules.read' },
      { name: 'Videos', href: '/content/videos', permission: 'videos.read' },
      { name: 'Video Reviews', href: '/content/video-reviews', permission: 'videos.read', keywords: 'ratings' },
      { name: 'Video Tags', href: '/content/video-tags', permission: 'video_tags.read' },
      { name: 'Documents', href: '/content/documents', permission: 'documents.read', keywords: 'notes pdf epub' },
      { name: 'Recordings', href: '/content/recordings', permission: 'live_sessions.read' },
      { name: 'Books', href: '/content/books', permission: 'books.read', keywords: 'ebook e-book' },
      { name: 'Banners', href: '/content/banners', permission: 'banners.read' },
      { name: 'Home Sections', href: '/content/home-sections', permission: 'home-sections.read' },
      { name: 'Forms', href: '/content/forms', permission: 'forms.read', keywords: 'submissions' },
      { name: 'Tutorials', href: '/content/tutorials', permission: 'tutorials.read' },
      { name: 'Archives', href: '/content/archives', permission: '*', keywords: 'deleted restore' },
    ],
  },
  { name: 'Live Sessions', href: '/sessions', icon: Calendar, permission: 'live_sessions.read', keywords: 'zoom classes' },
  { name: 'Workshops', href: '/workshops', icon: CalendarRange, permission: 'live_sessions.read' },
  { name: 'Faculty', href: '/faculty', icon: GraduationCap, permission: 'faculty.read', keywords: 'teachers lecturers' },
  { name: 'Feedback', href: '/feedback', icon: MessageSquareText, permission: 'videos.read', keywords: 'reviews ratings comments complaints' },
  { name: 'Careers', href: '/careers', icon: Briefcase, permission: 'careers.read', keywords: 'jobs applications hiring applicants' },
  {
    name: 'Commerce',
    icon: ShoppingBag,
    children: [
      { name: 'Purchases', href: '/commerce/purchases', permission: 'payments.read', keywords: 'orders sales' },
      { name: 'Payments', href: '/commerce/payments', permission: 'payments.read', keywords: 'transactions zoho' },
      { name: 'Invoices', href: '/commerce/invoices', permission: 'invoices.read', keywords: 'bills gst' },
      { name: 'Delivery Notes', href: '/commerce/delivery-notes', permission: 'payments.read', keywords: 'proof activation' },
      { name: 'Disputes & Refunds', href: '/commerce/cases', permission: 'payments.read', keywords: 'chargeback payment cases' },
      { name: 'Coupons', href: '/commerce/coupons', permission: 'coupons.read', keywords: 'discount offers' },
      { name: 'Book Orders', href: '/commerce/book-orders', permission: 'book_orders.read', keywords: 'shipping' },
      { name: 'Revenue', href: '/commerce/revenue', permission: 'analytics.read', keywords: 'income money' },
    ],
  },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, permission: 'analytics.read', keywords: 'charts reports trends' },
  { name: 'Exports', href: '/exports', icon: Download, permission: 'users.read', keywords: 'csv excel download' },
  { name: 'Notifications', href: '/notifications', icon: Bell, permission: 'notifications.read', keywords: 'push email sms' },
  {
    name: 'Settings',
    icon: Settings,
    children: [
      { name: 'Admin Users', href: '/settings/admin-users', permission: 'admin_users.read' },
      { name: 'Admin Roles', href: '/settings/admin-roles', permission: 'admin_roles.read', keywords: 'permissions' },
      { name: 'App Settings', href: '/settings/app', permission: 'settings.read' },
      { name: 'Web Store Redirect', href: '/settings/web-store-redirect', permission: 'settings.read' },
      { name: 'Student Profile Fields', href: '/settings/profile-fields', permission: 'settings.read', keywords: 'sign up onboarding profile ug college pg college mandatory required optional' },
    ],
  },
]

/** Drops what this admin may not see; a group with nothing left goes too. */
export function visibleNavigation(hasPermission: (p: string) => boolean): NavItem[] {
  return navigation.flatMap((item) => {
    if (item.children) {
      const children = item.children.filter((c) => !c.permission || hasPermission(c.permission))
      return children.length ? [{ ...item, children }] : []
    }
    return !item.permission || hasPermission(item.permission) ? [item] : []
  })
}

/** The menu entry the current URL belongs to: exact, else the longest parent path. */
export function activeHref(items: NavItem[], pathname: string): string | null {
  const hrefs = items.flatMap((i) => (i.children ? i.children.map((c) => c.href) : i.href ? [i.href] : []))
  return hrefs
    .filter((h) => (h === '/' ? pathname === '/' : pathname === h || pathname.startsWith(h + '/')))
    .sort((a, b) => b.length - a.length)[0] ?? null
}
