/**
 * Every permission the API checks, grouped by the area an admin knows it by.
 * Keys are `resource.action`. A role may also hold `resource.*` (all actions of
 * one resource) or `*` (everything, including things added later).
 */
export interface PermissionResource { key: string; label: string; actions: string[] }
export interface PermissionArea { group: string; resources: PermissionResource[] }

const CRUD = ['read', 'create', 'update', 'delete']

export const PERMISSION_AREAS: PermissionArea[] = [
  { group: 'Users', resources: [{ key: 'users', label: 'Users, subscriptions and exports', actions: ['read', 'create', 'update'] }] },
  {
    group: 'Content',
    resources: [
      { key: 'subjects', label: 'Subjects', actions: CRUD },
      { key: 'series', label: 'Series', actions: CRUD },
      { key: 'modules', label: 'Modules', actions: CRUD },
      { key: 'video_tags', label: 'Video tags', actions: CRUD },
      { key: 'banners', label: 'Banners', actions: CRUD },
      { key: 'home-sections', label: 'Home sections', actions: CRUD },
      { key: 'forms', label: 'Forms', actions: CRUD },
      { key: 'tutorials', label: 'Tutorials', actions: CRUD },
    ],
  },
  { group: 'Packages', resources: [{ key: 'packages', label: 'Packages and package types', actions: CRUD }] },
  { group: 'Videos', resources: [{ key: 'videos', label: 'Videos and video reviews', actions: CRUD }] },
  { group: 'Documents', resources: [{ key: 'documents', label: 'Documents', actions: CRUD }] },
  { group: 'Faculty', resources: [{ key: 'faculty', label: 'Faculty', actions: CRUD }] },
  { group: 'Careers', resources: [{ key: 'careers', label: 'Career applications', actions: ['read', 'update', 'delete'] }] },
  {
    group: 'Sessions',
    resources: [
      { key: 'live_sessions', label: 'Live sessions, workshops and recordings', actions: CRUD },
      { key: 'sessions', label: 'Session enrollments', actions: ['read', 'update'] },
    ],
  },
  {
    group: 'Commerce',
    resources: [
      { key: 'payments', label: 'Purchases, payments, disputes and delivery notes', actions: ['read'] },
      { key: 'invoices', label: 'Invoices', actions: ['read', 'create', 'update'] },
      { key: 'coupons', label: 'Coupons', actions: CRUD },
      { key: 'book_orders', label: 'Book orders', actions: ['read', 'update'] },
      { key: 'books', label: 'Books', actions: CRUD },
    ],
  },
  { group: 'Notifications', resources: [{ key: 'notifications', label: 'Notifications (push, email, SMS)', actions: ['read', 'create', 'delete'] }] },
  {
    group: 'Admin',
    resources: [
      { key: 'admin_users', label: 'Admin users', actions: CRUD },
      { key: 'admin_roles', label: 'Admin roles', actions: CRUD },
      { key: 'settings', label: 'App settings and web store redirect', actions: ['read', 'update', 'delete'] },
    ],
  },
  { group: 'Analytics', resources: [{ key: 'analytics', label: 'Analytics and revenue', actions: ['read', 'dashboard'] }] },
]

export const ACTION_LABEL: Record<string, string> = { read: 'View', create: 'Create', update: 'Edit', delete: 'Delete', dashboard: 'Dashboard' }

const RESOURCES = new Map(PERMISSION_AREAS.flatMap((a) => a.resources.map((r) => [r.key, r] as const)))
export const ALL_PERMISSIONS = PERMISSION_AREAS.flatMap((a) => a.resources.flatMap((r) => r.actions.map((x) => `${r.key}.${x}`)))
const KNOWN = new Set(ALL_PERMISSIONS)

/** Same rule the server uses. */
export function isGranted(raw: string[], permission: string): boolean {
  return raw.includes('*') || raw.includes(permission) || raw.includes(`${permission.split('.')[0]}.*`)
}

/** Saved permissions this screen has no row for. They are kept on save. */
export const unknownPermissions = (raw: string[]) =>
  raw.filter((p) => p !== '*' && !KNOWN.has(p) && !(p.endsWith('.*') && RESOURCES.has(p.slice(0, -2))))

/** Turns some permissions on or off, opening up `resource.*` when one action is removed. */
export function setPermissions(raw: string[], permissions: string[], on: boolean): string[] {
  const next = new Set(raw)
  for (const p of permissions) {
    const resource = p.split('.')[0]
    if (on) { if (!isGranted([...next], p)) next.add(p); continue }
    if (next.has(`${resource}.*`)) {
      next.delete(`${resource}.*`)
      for (const action of RESOURCES.get(resource)?.actions ?? []) next.add(`${resource}.${action}`)
    }
    next.delete(p)
  }
  return [...next]
}

export const grantedCount = (raw: string[]) => ALL_PERMISSIONS.filter((p) => isGranted(raw, p)).length

/** "View, create" per resource, for the summary and the role cards. */
export function describeRole(raw: string[]): { group: string; lines: { label: string; actions: string[]; all: boolean }[] }[] {
  return PERMISSION_AREAS.map((a) => ({
    group: a.group,
    lines: a.resources
      .map((r) => {
        const actions = r.actions.filter((x) => isGranted(raw, `${r.key}.${x}`))
        return { label: r.label, actions, all: actions.length === r.actions.length }
      })
      .filter((l) => l.actions.length > 0),
  })).filter((a) => a.lines.length > 0)
}

/** One line per area for the role cards: "everything", the resources, or the actions. */
export function areaLine(raw: string[], group: string): string {
  const area = PERMISSION_AREAS.find((a) => a.group === group)
  const lines = describeRole(raw).find((a) => a.group === group)?.lines ?? []
  if (!area) return ''
  if (lines.length === area.resources.length && lines.every((l) => l.all)) return 'everything'
  const words = (actions: string[]) => actions.map((x) => (ACTION_LABEL[x] ?? x).toLowerCase()).join(', ')
  if (area.resources.length === 1) return words(lines[0]?.actions ?? [])
  return lines.map((l) => `${l.label.toLowerCase()}${l.all ? '' : ` (${words(l.actions)})`}`).join(', ')
}

/** Permissions arrive as an array or as a JSON string. */
export function permissionList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.map(String) : [] } catch { return [] }
  }
  return []
}
