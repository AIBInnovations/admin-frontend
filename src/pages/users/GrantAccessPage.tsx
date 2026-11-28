import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { History, Hash, Loader2, Mail, Phone, Search } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, Section, StatusPill, type Tone } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GRANT_TYPES, type GrantType } from '@/components/users/GrantForm'
import { PersonAvatar, RowsSkeleton, personName, useStudentSearch } from '@/components/users/kit'
import { dayIST, unwrap, useResource } from '@/components/users/lib'
import { formatINR, subscriptionLabel } from '@/lib/format'
import { usersService, type User, type UserDetail } from '@/services/users.service'
import { StudentLink } from '@/components/students/StudentLink'

interface GrantHistoryItem {
  id: string
  type: GrantType
  name: string
  amount: number
  invoiceCreated: boolean
  reason: string | null
  grantedAt: string
  expiresAt: string | null
  isActive: boolean
  isRevoked: boolean
  revokedReason: string | null
}

const TYPE_LABEL: Record<GrantType, string> = { package: 'Package', ebook: 'Ebook', session: 'Session' }

/** Everything an admin has given this student, newest first. */
function buildHistory(detail: UserDetail): GrantHistoryItem[] {
  const common = (p: { _id: string; gateway_amount?: number | null; amount_paid: number; zoho_invoice_id?: string | null; admin_grant_reason?: string | null; purchased_at: string; createdAt: string; is_active: boolean; is_revoked?: boolean; revoked_reason?: string | null }) => ({
    id: p._id, amount: Number(p.gateway_amount ?? p.amount_paid) || 0, invoiceCreated: !!p.zoho_invoice_id, reason: p.admin_grant_reason || null,
    grantedAt: p.purchased_at || p.createdAt, isActive: p.is_active, isRevoked: !!p.is_revoked, revokedReason: p.revoked_reason || null,
  })
  const items: GrantHistoryItem[] = [
    ...(detail.purchases || []).filter((p) => p.is_admin_granted).map((p) => ({ ...common(p), type: 'package' as const, name: subscriptionLabel(p.package_id && typeof p.package_id === 'object' ? p.package_id.name : 'Deleted package', p), expiresAt: p.expires_at || null })),
    ...(detail.ebook_purchases || []).filter((p) => p.is_admin_granted).map((p) => ({ ...common(p), type: 'ebook' as const, name: p.book_id && typeof p.book_id === 'object' ? p.book_id.title : 'Deleted e-book', expiresAt: null })),
    ...(detail.session_purchases || []).filter((p) => p.is_admin_granted).map((p) => ({ ...common(p), type: 'session' as const, name: p.session_id && typeof p.session_id === 'object' ? p.session_id.title : 'Deleted session', expiresAt: null })),
  ]
  return items.sort((a, b) => new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime())
}

function statusOf(item: GrantHistoryItem): { label: string; tone: Tone } {
  if (item.isRevoked) return { label: 'Revoked', tone: 'danger' }
  if (item.expiresAt && new Date(item.expiresAt) < new Date()) return { label: 'Expired', tone: 'warning' }
  return item.isActive ? { label: 'Active', tone: 'success' } : { label: 'Inactive', tone: 'neutral' }
}

/** Step 1 finds the student (kept in the URL), step 2 opens the grant page. */
export function GrantAccessPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const userId = params.get('user') || ''
  const type: GrantType = GRANT_TYPES.some((t) => t.value === params.get('type')) ? (params.get('type') as GrantType) : 'package'
  const [query, setQuery] = useState('')
  const { results, searching, searched, error: searchError } = useStudentSearch(userId ? '' : query)

  const { data: detail, loading, error, status, reload } = useResource<UserDetail | null>(
    async () => (userId ? unwrap(await usersService.getById(userId), 'User not found') : null), [userId],
  )
  const user = detail && detail._id === userId ? detail : null
  const history = useMemo(() => (user ? buildHistory(user) : []), [user])
  const notFound = !!userId && !loading && (status === 404 || status === 400)

  // A chosen student fills the search box, as before
  useEffect(() => { if (user) setQuery(user.name || user.phone_number || '') }, [user])

  const patch = (next: Record<string, string | null>) => setParams((prev) => {
    const p = new URLSearchParams(prev)
    for (const [k, v] of Object.entries(next)) { if (v) p.set(k, v); else p.delete(k) }
    return p
  }, { replace: true })

  return (
    <div className="relative space-y-6">
      <PageHeader
        title="Grant Access"
        description="Search for a user and grant them access to packages, ebooks, or live sessions"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Users', href: '/users' }, { label: 'Grant Access' }]}
      />

      <Section title="Step 1: Find User" description="Search by name, email, phone number, or student ID">
        <div className="space-y-4">
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Find user" placeholder="Search users..." value={query} autoComplete="off" className="pl-10 pr-10"
              onChange={(e) => { setQuery(e.target.value); if (userId) patch({ user: null }) }}
            />
            {searching && <Loader2 aria-hidden="true" className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
          </div>

          <div aria-live="polite" className="space-y-2">
            {searchError && <p className="text-sm text-danger">{searchError}</p>}
            {!userId && searching && results.length === 0 && [1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            {!userId && searched && !searching && !searchError && results.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">No users found for "{query.trim()}"</p>
            )}
            {!userId && results.length > 0 && (
              <ul className="max-h-96 space-y-1 overflow-y-auto">
                {results.map((u) => <li key={u._id}><UserOption user={u} onSelect={() => patch({ user: u._id })} /></li>)}
              </ul>
            )}
          </div>

          {userId && !user && loading && <Skeleton className="h-20 w-full rounded-lg" />}
          {notFound && <ErrorState title="User not found" message="The account may have been deleted. Search for another user." />}
          {userId && !user && !loading && !notFound && error && <ErrorState message={error} onRetry={() => reload()} />}

          {user && (
            <div className="flex flex-col gap-3 rounded-lg border border-primary bg-accent p-4 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                <PersonAvatar name={user.name} photo={user.photo_url} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate"><StudentLink student={user} fallback="Unnamed User" from="Grant access" /></p>
                  <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                    {user.phone_number && <span>{user.phone_number}</span>}
                    {user.email && <span className="min-w-0 truncate">{user.email}</span>}
                    {user.student_id && <span>ID: {user.student_id}</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill tone={user.is_active ? 'success' : 'danger'}>{user.is_active ? 'Active' : 'Blocked'}</StatusPill>
                <Link to={`/users/${user._id}`} className="whitespace-nowrap text-[13px] font-medium text-primary hover:underline hover:underline-offset-4">View Profile</Link>
              </div>
            </div>
          )}
        </div>
      </Section>

      {user && (
        <Section title="Step 2: Grant Access" description={<>Choose what to grant to <strong className="font-semibold text-foreground">{personName(user)}</strong></>}>
          <Tabs value={type} onValueChange={(v) => patch({ type: v === 'package' ? null : v })}>
            <TabsList className="h-auto w-full max-w-full justify-start overflow-x-auto sm:w-fit">
              {GRANT_TYPES.map((t) => <TabsTrigger key={t.value} value={t.value} className="gap-1.5 sm:gap-2"><t.icon aria-hidden="true" className="h-4 w-4" />{t.value === 'session' ? <span><span className="hidden sm:inline">Live </span>Session</span> : t.label}</TabsTrigger>)}
            </TabsList>
            {GRANT_TYPES.map((t) => (
              <TabsContent key={t.value} value={t.value} className="mt-5">
                <div className="max-w-md space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold">{t.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                  </div>
                  <Button onClick={() => navigate(`/users/${user._id}/grant?type=${t.value}&from=grant-access`)}>
                    <t.icon aria-hidden="true" />Grant {t.value === 'session' ? 'Session' : t.label}
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </Section>
      )}

      {userId && !notFound && (user || loading) && (
        <Section flush title={<span className="flex items-center gap-2"><History aria-hidden="true" className="h-4 w-4 text-muted-foreground" />Admin Grant History</span>} description={user ? <>All admin-granted access for <strong className="font-semibold text-foreground">{personName(user)}</strong></> : undefined}>
          <div className="border-t border-border">
            {!user ? <RowsSkeleton rows={2} /> : history.length === 0 ? (
              <p className="px-5 py-9 text-center text-sm text-muted-foreground">No admin grants found for this user.</p>
            ) : (
              <Table className="min-w-[860px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {['Type', 'Item', 'Amount', 'Invoice', 'Reason', 'Granted', 'Expires', 'Status'].map((h, i) => <TableHead key={h} scope="col" className={i === 0 ? 'pl-5' : ''}>{h}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => {
                    const s = statusOf(item)
                    const open = () => navigate(`/commerce/purchases/${item.type}/${item.id}`)
                    return (
                      <TableRow
                        key={`${item.type}:${item.id}`} tabIndex={0} aria-label={`Open ${item.name}`} onClick={open}
                        onKeyDown={(e) => { if (e.key === 'Enter') open() }}
                        className="cursor-pointer hover:bg-accent/50 focus-visible:bg-accent/60 focus-visible:outline-2 focus-visible:-outline-offset-2"
                      >
                        <TableCell className="whitespace-nowrap pl-5 text-sm text-muted-foreground">{TYPE_LABEL[item.type]}</TableCell>
                        <TableCell className="max-w-72 text-sm font-medium"><span className="break-words">{item.name}</span></TableCell>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums">{item.amount > 0 ? formatINR(item.amount) : 'Free'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.invoiceCreated ? 'Yes' : 'No'}</TableCell>
                        <TableCell className="max-w-44 truncate text-sm text-muted-foreground" title={item.reason || undefined}>{item.reason || 'None'}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{dayIST(item.grantedAt)}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{item.expiresAt ? dayIST(item.expiresAt) : 'Never'}</TableCell>
                        <TableCell>
                          <StatusPill tone={s.tone}>{s.label}</StatusPill>
                          {item.isRevoked && item.revokedReason && <p className="mt-0.5 max-w-40 truncate text-xs text-muted-foreground" title={item.revokedReason}>{item.revokedReason}</p>}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </Section>
      )}
    </div>
  )
}

function UserOption({ user, onSelect }: { user: User; onSelect: () => void }) {
  return (
    // The row picks the student for the grant; the name above it opens the student page
    <div className="relative flex w-full items-center gap-4 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/50">
      <button type="button" onClick={onSelect} aria-label={`Choose ${user.name || user.phone_number || 'this user'}`} className="absolute inset-0 rounded-lg" />
      <span className="pointer-events-none relative flex min-w-0 flex-1 items-center gap-4">
      <PersonAvatar name={user.name} photo={user.photo_url} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm"><StudentLink student={user} fallback="Unnamed User" from="Grant access" className="pointer-events-auto" /></span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {user.phone_number && <span className="flex items-center gap-1"><Phone aria-hidden="true" className="h-3 w-3" />{user.phone_number}</span>}
          {user.email && <span className="flex min-w-0 items-center gap-1 truncate"><Mail aria-hidden="true" className="h-3 w-3 shrink-0" />{user.email}</span>}
          {user.student_id && <span className="flex items-center gap-1"><Hash aria-hidden="true" className="h-3 w-3" />{user.student_id}</span>}
        </span>
      </span>
      <StatusPill tone={user.is_active ? 'success' : 'danger'}>{user.is_active ? 'Active' : 'Blocked'}</StatusPill>
      </span>
    </div>
  )
}
