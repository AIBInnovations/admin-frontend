import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Ban, BellRing, BookOpen, Calendar, CalendarCheck, CalendarClock, CreditCard, Edit, Gift, Globe, GraduationCap, History, Loader2, Mail, MailX, MapPin,
  Package, Phone, Settings, ShieldBan, ShieldCheck, ShoppingBag, Smartphone, Truck, Video,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { CopyButton, DetailSkeleton, ErrorState, Section, StatusPill, type Tone } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDock, PersonAvatar, StaleNotice, personName } from '@/components/users/kit'
import { DeviceSessionsSection } from '@/components/devices/DeviceSessionsSection'
import { SignInLogSection } from '@/components/devices/SignInLogSection'
import { TesterSection } from '@/components/users/tester/TesterSection'
import type { TesterSummary } from '@/components/users/tester/api'
import { dayIST, dayTimeIST, ensureOk, errText, plural, unwrap, useResource } from '@/components/users/lib'
import { StudentPageBack } from '@/components/students/StudentLink'
import { RevokeAccess } from '@/pages/commerce/components/RevokeAccess'
import { ExtendValidityDrawer } from '@/pages/subscriptions/components/ExtendValidityDrawer'
import { ReminderDrawer } from '@/pages/subscriptions/components/ReminderDrawer'
import { formatINR, subscriptionLabel } from '@/lib/format'
import { formatExpiry } from '@/lib/relativeTime'
import { useAuth } from '@/contexts/AuthContext'
import {
  usersService, type BookOrder, type EbookPurchase, type SessionEnrollment, type SessionPurchase, type UserDetail, type UserPurchase,
} from '@/services/users.service'
import { ProductCodeText } from '@/components/common/ProductCode'
import type { ReminderItem, SubscriptionRecord } from '@/services/subscriptions.service'

// ── Reading a record ─────────────────────────────────────────────────────

const isObj = <T extends object>(v: T | string | null | undefined): v is T => !!v && typeof v === 'object'
const packageTitle = (p: UserPurchase) => subscriptionLabel(isObj(p.package_id) ? p.package_id.name : 'Deleted package', p)
const bookTitle = (p: EbookPurchase) => (isObj(p.book_id) ? p.book_id.title : 'Deleted e-book')
const sessionTitle = (p: SessionPurchase) => (isObj(p.session_id) ? p.session_id.title : 'Deleted session')
const codeOf = (v: { product_code?: string | null } | string | null | undefined) => (v && typeof v === 'object' ? v.product_code ?? null : null)

// ── A live session registration (28 Nov 2026) ───────────────────────────
// A free registration has no purchase row, so Session Purchases never showed
// it; this lists every one: free, included with a package, paid, admin-added.
type RegSession = Exclude<SessionEnrollment['session_id'], string | null>
const regSession = (e: SessionEnrollment): RegSession | null => (isObj(e.session_id) ? e.session_id : null)
const regTitle = (e: SessionEnrollment) => regSession(e)?.title ?? 'Deleted session'
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const clock12 = (hhmm?: string) => {
  const [h, m] = (hhmm || '').split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return ''
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
const regWhen = (s: RegSession) => {
  const r = s.repeat
  if (!r?.weekly) return s.scheduled_start_time ? dayTimeIST(s.scheduled_start_time) : ''
  const days = (r.days || []).map((d) => WEEKDAY[d]).filter(Boolean).join(', ')
  const time = r.start_time ? `${clock12(r.start_time)}${r.end_time ? ` to ${clock12(r.end_time)}` : ''} IST` : ''
  return ['Weekly', days && `on ${days}`, time && `, ${time}`].filter(Boolean).join(' ').replace(' ,', ',')
}
const REG_HOW: Record<SessionEnrollment['enrollment_type'], string> = {
  free: 'Free', paid: 'Paid', admin_override: 'Added by admin', subscription: 'Included with a package',
}
const regHow = (e: SessionEnrollment) => (e.enrollment_type === 'subscription' && e.access_package_name ? `Included with ${e.access_package_name}` : REG_HOW[e.enrollment_type] ?? e.enrollment_type)
const regRevoked = (e: SessionEnrollment) => e.enrollment_status === 'cancelled' && /^Admin revoked/i.test(e.cancellation_reason || '')
const isBundled = (p: UserPurchase) => !!p.bundled_from_purchase_id || !!p.zoho_payment_session_id?.startsWith('BUNDLE_')
const paid = (p: { gateway_amount?: number | null; amount_paid?: number | null }) => Number(p.gateway_amount ?? p.amount_paid ?? 0) || 0
// A tester's INR 1 order (27 Nov 2026): labelled Test, never a paid purchase
const isTest = (p: object) => (p as { is_test?: boolean }).is_test === true
const TestPill = ({ row }: { row: object }) => (isTest(row) ? <StatusPill tone="warning" className="ml-1.5 align-middle">Test</StatusPill> : null)

const PAYMENT: Record<string, { label: string; tone: Tone }> = {
  completed: { label: 'Completed', tone: 'success' }, paid: { label: 'Paid', tone: 'success' }, pending: { label: 'Pending', tone: 'warning' },
  failed: { label: 'Failed', tone: 'danger' }, refunded: { label: 'Refunded', tone: 'info' }, revoked: { label: 'Revoked', tone: 'danger' },
}
const ORDER: Record<string, { label: string; tone: Tone }> = {
  pending: { label: 'Pending', tone: 'neutral' }, confirmed: { label: 'Confirmed', tone: 'warning' }, processing: { label: 'Processing', tone: 'warning' },
  shipped: { label: 'Shipped', tone: 'info' }, delivered: { label: 'Delivered', tone: 'success' }, cancelled: { label: 'Cancelled', tone: 'danger' },
}

const payment = (status: string) => PAYMENT[status] ?? { label: status || 'Unknown', tone: 'neutral' as Tone }
// "Send reminder now" (28 Nov 2026): paid, switched on, not revoked, not ended yet
const live = (p: { payment_status: string; is_active: boolean; is_revoked?: boolean }) => p.payment_status === 'completed' && p.is_active && !p.is_revoked
const remindablePackage = (p: UserPurchase) => live(p) && !!p.expires_at && new Date(p.expires_at).getTime() > Date.now()
const remindableSession = (p: SessionPurchase) => live(p) && isObj(p.session_id) && !!p.session_id.scheduled_start_time && new Date(p.session_id.scheduled_start_time).getTime() > Date.now()

type RevokeTarget = { type: 'package' | 'ebook' | 'session'; id: string; name: string }

export function UserDetailPage() {
  const { userId = '' } = useParams<{ userId: string }>()
  const { hasPermission } = useAuth()
  const canUpdate = hasPermission('users.update')
  const isSuperAdmin = hasPermission('*')

  const { data: user, loading, error, status, reload } = useResource<UserDetail>(
    async () => unwrap(await usersService.getById(userId), 'User not found'), [userId],
  )

  const [revoke, setRevoke] = useState<RevokeTarget | null>(null)
  const [extendTarget, setExtendTarget] = useState<UserPurchase | null>(null)
  const [remindTarget, setRemindTarget] = useState<ReminderItem[] | null>(null)
  const [blockOpen, setBlockOpen] = useState(false)
  const [unblocking, setUnblocking] = useState(false)
  const [togglingEmail, setTogglingEmail] = useState(false)

  // The panel opens under its section's title; bring it to the admin
  useEffect(() => {
    if (!revoke) return
    const panel = document.getElementById('revoke-panel')
    panel?.focus({ preventScroll: true })
    panel?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [revoke])

  const numbers = useMemo(() => {
    if (!user) return null
    const now = Date.now()
    // A combo's included packages come with it: one subscription, not three
    const active = (user.purchases || []).filter((p) => p.payment_status === 'completed' && p.is_active && !p.is_revoked && !isBundled(p) && new Date(p.expires_at).getTime() > now).length
    const sales = [
      ...(user.purchases || []).filter((p) => p.payment_status === 'completed' && !p.is_revoked && !isTest(p) && !isBundled(p) && Number(p.amount_paid) > 0).map(paid),
      ...(user.ebook_purchases || []).filter((p) => p.payment_status === 'completed' && !p.is_revoked && !isTest(p) && Number(p.amount_paid) > 0).map(paid),
      ...(user.session_purchases || []).filter((p) => p.payment_status === 'completed' && !p.is_revoked && !isTest(p) && Number(p.amount_paid) > 0).map(paid),
      ...(user.book_orders || []).filter((o) => o.payment_status === 'completed' && !isTest(o) && Number(o.total_amount) > 0).map((o) => Number(o.total_amount)),
    ]
    return { active, sales: sales.length, collected: sales.reduce((a, b) => a + b, 0) }
  }, [user])

  if (loading && !user) return <DetailSkeleton />
  if (!user) {
    const gone = status === 404 || status === 400
    return (
      <ErrorState
        title={gone ? 'User not found' : status === 403 ? 'You do not have access to this user' : 'This user could not be loaded'}
        message={gone ? 'The account may have been deleted, or the link is wrong.' : error ?? undefined}
        onRetry={gone || status === 403 ? undefined : () => reload()}
        back={{ label: 'Back to Users', href: '/users' }}
      />
    )
  }

  const name = user.name?.trim() || 'Unnamed User'
  const toggleBlock = async () => {
    const res = user.is_active ? await usersService.blockUser(user._id) : await usersService.unblockUser(user._id)
    ensureOk(res, 'Failed to update user status')
    toast.success(user.is_active ? 'User blocked' : 'User unblocked')
    await reload({ silent: true })
  }
  const unblock = async () => {
    if (unblocking) return
    setUnblocking(true)
    try { await toggleBlock() } catch (err) { toast.error(errText(err, 'Failed to update user status')) } finally { setUnblocking(false) }
  }
  const toggleEmail = async () => {
    if (togglingEmail) return
    setTogglingEmail(true)
    try {
      ensureOk(user.email_excluded ? await usersService.includeInEmails(user._id) : await usersService.excludeFromEmails(user._id))
      toast.success(user.email_excluded ? 'User re-included in emails' : 'User excluded from emails')
      await reload({ silent: true })
    } catch (err) {
      toast.error(errText(err, 'Failed to update email exclusion'))
    } finally {
      setTogglingEmail(false)
    }
  }

  const revokePanel = (type: RevokeTarget['type']) => revoke?.type === type && (
    <div id="revoke-panel" tabIndex={-1} className="scroll-mt-4 border-t border-border bg-muted/30 p-4 outline-none">
      <RevokeAccess
        key={revoke.id}
        userId={user._id} purchaseId={revoke.id} itemName={revoke.name} type={revoke.type}
        onDone={() => { setRevoke(null); void reload({ silent: true }) }}
        onCancel={() => setRevoke(null)}
      />
    </div>
  )

  return (
    <div className="relative space-y-6">
      <div className="mb-1!"><StudentPageBack userId={user._id} /></div>
      <PageHeader
        title={name}
        description={user.phone_number}
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Users', href: '/users' }, { label: user.name || user.phone_number }]}
        action={canUpdate ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link to={`/users/${user._id}/grant?type=package`}><Gift aria-hidden="true" /><span><span className="hidden sm:inline">Grant </span>Package</span></Link></Button>
            <Button asChild variant="outline" size="sm"><Link to={`/users/${user._id}/grant?type=ebook`}><Gift aria-hidden="true" /><span><span className="hidden sm:inline">Grant </span>Ebook</span></Link></Button>
            <Button asChild variant="outline" size="sm"><Link to={`/users/${user._id}/grant?type=session`}><Gift aria-hidden="true" /><span><span className="hidden sm:inline">Grant </span>Session</span></Link></Button>
            <Button asChild variant="outline" size="sm"><Link to={`/users/${user._id}/edit`}><Edit aria-hidden="true" />Edit</Link></Button>
            <Button variant="outline" size="sm" onClick={toggleEmail} disabled={togglingEmail} title={user.email_excluded ? 'Re-include in marketing emails' : 'Exclude from marketing emails'}>
              {togglingEmail ? <Loader2 aria-hidden="true" className="animate-spin" /> : user.email_excluded ? <Mail aria-hidden="true" /> : <MailX aria-hidden="true" />}
              {user.email_excluded ? 'Re-include Emails' : 'Exclude Emails'}
            </Button>
            <Button variant={user.is_active ? 'destructive' : 'default'} size="sm" disabled={unblocking} onClick={() => (user.is_active ? setBlockOpen(true) : unblock())}>
              {unblocking ? <Loader2 aria-hidden="true" className="animate-spin" /> : user.is_active ? <ShieldBan aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
              {user.is_active ? 'Block' : 'Unblock'}
            </Button>
          </div>
        ) : undefined}
      />

      {error && <StaleNotice message={error} onRetry={() => reload({ silent: true })} />}

      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Profile">
          <div className="flex items-start gap-4">
            <PersonAvatar name={user.name} photo={user.photo_url} size="lg" />
            <div className="min-w-0 flex-1 space-y-3.5">
              <div>
                <p className="break-words text-lg font-medium">{user.name || 'Unnamed User'}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <StatusPill tone={user.is_active ? 'success' : 'danger'}>{user.is_active ? 'Active' : 'Blocked'}</StatusPill>
                  <StatusPill tone={user.onboarding_completed ? 'neutral' : 'warning'}>{user.onboarding_completed ? 'Onboarding done' : 'Onboarding pending'}</StatusPill>
                  {user.email_excluded && (
                    <span title={`${user.email_excluded_reason === 'user_unsubscribed' ? 'Self-unsubscribed' : 'Excluded by admin'}${user.email_excluded_at ? ` on ${dayIST(user.email_excluded_at)}` : ''}`}>
                      <StatusPill tone="warning">Email Excluded{user.email_excluded_reason === 'user_unsubscribed' ? ' (self)' : ''}</StatusPill>
                    </span>
                  )}
                </div>
              </div>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2"><Phone aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="sr-only">Phone</span><span className="font-mono text-[13px]">{user.phone_number || 'No phone'}</span>{user.phone_number && <CopyButton value={user.phone_number} label="Phone" />}</li>
                {user.email && <li className="flex min-w-0 items-center gap-2"><Mail aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="sr-only">Email</span><span className="min-w-0 break-all">{user.email}</span><CopyButton value={user.email} label="Email" /></li>}
              </ul>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground"><span id="profile-completion">Profile completion</span><span className="tabular-nums">{Math.round(user.profile_completion_percentage || 0)}%</span></div>
                <div role="progressbar" aria-labelledby="profile-completion" aria-valuenow={Math.round(user.profile_completion_percentage || 0)} aria-valuemin={0} aria-valuemax={100} className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, user.profile_completion_percentage || 0))}%` }} />
                </div>
              </div>
              <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:gap-4">
                <span>Joined {dayIST(user.createdAt)}</span>
                <span>Last login {user.last_login ? dayIST(user.last_login) : 'not recorded'}</span>
              </div>
            </div>
          </div>
          {numbers && (
            <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4">
              {[
                ['Active subscriptions', numbers.active.toLocaleString('en-IN')],
                ['Paid purchases', numbers.sales.toLocaleString('en-IN')],
                ['Collected', formatINR(numbers.collected)],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 break-words font-display text-lg font-semibold tabular-nums tracking-[-0.01em]">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </Section>

        <Section title="Personal Information">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            <Info icon={Calendar} label="Date of Birth" value={user.date_of_birth ? dayIST(user.date_of_birth) : null} />
            <Info label="Gender" value={user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : null} />
            <Info icon={MapPin} label="Address" value={user.address} />
            <Info label="Student ID" value={user.student_id} mono copy />
            <Info icon={GraduationCap} label="UG College" value={user.ug_college} />
            <Info icon={GraduationCap} label="PG College" value={user.pg_college} />
            <Info label="Organisation" value={user.affiliated_organisation} />
            <Info label="Designation" value={user.current_designation} />
            <Info icon={Globe} label="Timezone" value={user.timezone} />
          </dl>
        </Section>
      </div>

      <TesterSection
        userId={user._id}
        name={personName(user)}
        tester={(user as UserDetail & { tester?: TesterSummary }).tester}
        canUpdate={canUpdate}
        canReset={isSuperAdmin}
        onChanged={() => { void reload({ silent: true }) }}
      />

      {(user.subject_selections || []).some((s) => s.subject_id) && (
        <Section title={<Title icon={BookOpen} count={user.subject_selections.filter((s) => s.subject_id).length}>Subject Selections</Title>}>
          <ul className="flex flex-wrap gap-2">
            {user.subject_selections.filter((s) => s.subject_id).map((s, i) => (
              <li key={i} className={s.is_primary ? 'inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground' : 'inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium'}>
                {isObj(s.subject_id) ? s.subject_id.name || 'Deleted subject' : 'Deleted subject'}
                {s.is_primary && <span className="font-normal opacity-80">Primary</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section flush title={<Title icon={CreditCard} count={user.purchases?.length || 0}>Package Purchases</Title>}>
        {revokePanel('package')}
        <RecordTable<UserPurchase>
          rows={user.purchases || []} empty={{ icon: Package, text: 'No package purchases' }} minWidth="min-w-[860px]" itemWord="purchase"
          hrefOf={(p) => `/commerce/purchases/package/${p._id}`} keyOf={(p) => p._id} labelOf={packageTitle}
          head={['Package', 'Amount', 'Status', 'Purchased', 'Expires', 'Active', '']}
          cells={(p) => {
            const expiry = formatExpiry(p.expires_at)
            const expired = expiry.status === 'expired'
            const note = isBundled(p) ? 'Came with a combo package'
              : p.is_admin_granted ? `Admin granted${p.admin_grant_reason ? `: ${p.admin_grant_reason}` : ''}`
                : p.coupon_code ? `Coupon ${p.coupon_code}` : null
            return [
              <div key="n" className="max-w-[360px]"><p className="break-words text-sm font-medium">{packageTitle(p)}<TestPill row={p} /></p><ProductCodeText code={codeOf(p.package_id)} />{note && <p className="truncate text-xs text-muted-foreground" title={note}>{note}</p>}</div>,
              <Amount key="a" value={paid(p)} />,
              <StatusPill key="s" tone={payment(p.payment_status).tone}>{payment(p.payment_status).label}</StatusPill>,
              <Muted key="p">{dayIST(p.purchased_at || p.createdAt)}</Muted>,
              <div key="e"><Muted>{p.expires_at ? dayIST(p.expires_at) : 'Not set'}</Muted>{p.is_active && !p.is_revoked && p.payment_status === 'completed' && p.expires_at && <p className={expiry.status === 'soon' ? 'text-xs font-medium text-warning' : 'text-xs text-muted-foreground'}>{expiry.relative}</p>}</div>,
              p.is_revoked || p.payment_status === 'revoked'
                ? <div key="x"><StatusPill tone="danger">Revoked</StatusPill>{p.revoked_at && <p className="mt-0.5 max-w-[160px] truncate text-xs text-muted-foreground" title={p.revoked_reason || undefined}>{dayIST(p.revoked_at)}{p.revoked_reason ? ` · ${p.revoked_reason}` : ''}</p>}</div>
                : <StatusPill key="x" tone={p.is_active && !expired && p.payment_status === 'completed' ? 'success' : 'neutral'}>{p.payment_status === 'completed' && expired ? 'Expired' : p.is_active && p.payment_status === 'completed' ? 'Yes' : 'No'}</StatusPill>,
              canUpdate ? (
                <div key="b" className="flex items-center justify-end gap-1 whitespace-nowrap">
                  {remindablePackage(p) && <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setRemindTarget([{ type: 'package', purchase_id: p._id }])} aria-label={`Send reminder now for ${packageTitle(p)}`}><BellRing aria-hidden="true" className="!size-3" />Remind</Button>}
                  {!p.is_revoked && p.payment_status === 'completed' && <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setExtendTarget(p)}><CalendarClock aria-hidden="true" className="!size-3" />Extend</Button>}
                  {p.is_active && p.payment_status === 'completed' && <RevokeButton onClick={() => setRevoke({ type: 'package', id: p._id, name: packageTitle(p) })} />}
                </div>
              ) : null,
            ]
          }}
        />
      </Section>

      <Section flush title={<Title icon={BookOpen} count={user.ebook_purchases?.length || 0}>Ebook Purchases</Title>}>
        {revokePanel('ebook')}
        <RecordTable<EbookPurchase>
          rows={user.ebook_purchases || []} empty={{ icon: BookOpen, text: 'No ebook purchases' }} minWidth="min-w-[700px]" itemWord="purchase"
          hrefOf={(p) => `/commerce/purchases/ebook/${p._id}`} keyOf={(p) => p._id} labelOf={bookTitle}
          head={['Book', 'Amount', 'Status', 'Purchased', 'Active', '']}
          cells={(p) => [
            <ItemName key="n" title={bookTitle(p)} code={codeOf(p.book_id)} granted={p.is_admin_granted} reason={p.admin_grant_reason} test={isTest(p)} />,
            <Amount key="a" value={paid(p)} />,
            <StatusPill key="s" tone={payment(p.payment_status).tone}>{payment(p.payment_status).label}</StatusPill>,
            <Muted key="p">{dayIST(p.purchased_at || p.createdAt)}</Muted>,
            <ActiveCell key="x" row={p} />,
            canUpdate && p.is_active && p.payment_status === 'completed' ? <div key="b" className="text-right"><RevokeButton onClick={() => setRevoke({ type: 'ebook', id: p._id, name: bookTitle(p) })} /></div> : null,
          ]}
        />
      </Section>

      <Section flush title={<Title icon={Video} count={user.session_purchases?.length || 0}>Session Purchases</Title>}>
        {revokePanel('session')}
        <RecordTable<SessionPurchase>
          rows={user.session_purchases || []} empty={{ icon: Video, text: 'No session purchases' }} minWidth="min-w-[700px]" itemWord="purchase"
          hrefOf={(p) => `/commerce/purchases/session/${p._id}`} keyOf={(p) => p._id} labelOf={sessionTitle}
          head={['Session', 'Amount', 'Status', 'Purchased', 'Active', '']}
          cells={(p) => [
            <div key="n"><ItemName title={sessionTitle(p)} code={codeOf(p.session_id)} granted={p.is_admin_granted} reason={p.admin_grant_reason} test={isTest(p)} />{isObj(p.session_id) && p.session_id.scheduled_start_time && <p className="text-xs text-muted-foreground">{dayTimeIST(p.session_id.scheduled_start_time)}</p>}</div>,
            <Amount key="a" value={paid(p)} />,
            <StatusPill key="s" tone={payment(p.payment_status).tone}>{payment(p.payment_status).label}</StatusPill>,
            <Muted key="p">{dayIST(p.purchased_at || p.createdAt)}</Muted>,
            <ActiveCell key="x" row={p} />,
            canUpdate && p.is_active && p.payment_status === 'completed' ? (
              <div key="b" className="flex items-center justify-end gap-1 whitespace-nowrap">
                {remindableSession(p) && <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setRemindTarget([{ type: 'session', purchase_id: p._id }])} aria-label={`Send reminder now for ${sessionTitle(p)}`}><BellRing aria-hidden="true" className="!size-3" />Remind</Button>}
                <RevokeButton onClick={() => setRevoke({ type: 'session', id: p._id, name: sessionTitle(p) })} />
              </div>
            ) : null,
          ]}
        />
      </Section>

      <Section
        flush
        title={<Title icon={CalendarCheck} count={user.session_enrollments?.length || 0}>Live Session Registrations</Title>}
        description="Every registration, free ones included. A paid seat is also listed under Session Purchases."
      >
        <RecordTable<SessionEnrollment>
          rows={user.session_enrollments || []} empty={{ icon: CalendarCheck, text: 'No live session registrations' }} minWidth="min-w-[860px]" itemWord="registration"
          hrefOf={(e) => (regSession(e) ? `/sessions/${regSession(e)!._id}` : '')} keyOf={(e) => e._id} labelOf={regTitle}
          head={['Session', 'How', 'Status', 'Registered', 'Attended']}
          cells={(e) => {
            const s = regSession(e)
            const revoked = regRevoked(e)
            const status = e.enrollment_status === 'confirmed' ? { label: 'Registered', tone: 'success' as Tone }
              : e.enrollment_status === 'waitlisted' ? { label: 'Waitlisted', tone: 'warning' as Tone }
                : revoked ? { label: 'Revoked', tone: 'danger' as Tone } : { label: 'Cancelled', tone: 'neutral' as Tone }
            const why = e.enrollment_status === 'cancelled' ? (e.cancellation_reason || '').replace(/^Admin revoked access:\s*/i, '') : ''
            return [
              <div key="n" className="max-w-[360px]">
                <p className="break-words text-sm font-medium">{regTitle(e)}</p>
                {s && regWhen(s) && <p className="text-xs text-muted-foreground">{regWhen(s)}</p>}
                <ProductCodeText code={s?.product_code} />
              </div>,
              <span key="h" className="text-sm">{regHow(e)}</span>,
              <div key="s">
                <StatusPill tone={status.tone}>{status.label}</StatusPill>
                {e.enrollment_status === 'cancelled' && e.cancelled_at && <p className="mt-0.5 max-w-[200px] truncate text-xs text-muted-foreground" title={why || undefined}>{dayIST(e.cancelled_at)}{why ? ` · ${why}` : ''}</p>}
              </div>,
              <Muted key="r">{dayIST(e.enrolled_at)}</Muted>,
              e.attendance_id ? <StatusPill key="a" tone="success">Yes</StatusPill> : <Muted key="a">No</Muted>,
            ]
          }}
        />
      </Section>

      <Section flush title={<Title icon={ShoppingBag} count={user.book_orders?.length || 0}>Book Orders</Title>}>
        <RecordTable<BookOrder>
          rows={user.book_orders || []} empty={{ icon: ShoppingBag, text: 'No book orders' }} minWidth="min-w-[860px]" itemWord="order"
          hrefOf={(o) => `/commerce/purchases/book/${o._id}`} keyOf={(o) => o._id} labelOf={(o) => `order ${o.order_number}`}
          head={['Order', 'Items', 'Amount', 'Payment', 'Status', 'Tracking', 'Date']}
          cells={(o) => {
            const order = ORDER[o.order_status] ?? { label: o.order_status, tone: 'neutral' as Tone }
            return [
              <span key="o" className="whitespace-nowrap font-mono text-[13px] font-medium">{o.order_number}<TestPill row={o} /></span>,
              <ul key="i" className="max-w-[320px] text-sm">{(o.items || []).filter(Boolean).map((item, i) => <li key={item.book_id || i} className="truncate">{item.title || 'Unknown'} x{item.quantity}</li>)}</ul>,
              <Amount key="a" value={Number(o.total_amount) || 0} />,
              <StatusPill key="s" tone={payment(o.payment_status).tone}>{payment(o.payment_status).label}</StatusPill>,
              <StatusPill key="os" tone={order.tone}>{order.label}</StatusPill>,
              o.tracking_number ? <span key="t" className="inline-flex items-center gap-1 whitespace-nowrap font-mono text-xs text-muted-foreground"><Truck aria-hidden="true" className="h-3 w-3" />{o.tracking_number}<CopyButton value={o.tracking_number} label="Tracking number" /></span> : <Muted key="t">None</Muted>,
              <Muted key="d">{dayIST(o.createdAt)}</Muted>,
            ]
          }}
        />
      </Section>

      {/* Keyed on the block state: blocking signs every device out, so both sections reload after it */}
      <DeviceSessionsSection
        key={`devices-${user.is_active}`}
        userId={user._id}
        fallback={user.device_sessions || []}
        canUpdate={canUpdate}
        title={(count) => <Title icon={Smartphone} count={count}>Device Sessions</Title>}
      />

      <SignInLogSection key={`log-${user.is_active}`} userId={user._id} title={(count) => <Title icon={History} count={count}>Sign-in log</Title>} />

      {user.preferences && (
        <Section title={<Title icon={Settings}>Preferences</Title>}>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2 md:grid-cols-3">
            <Info label="Dark Mode" value={user.preferences.dark_mode_enabled ? 'Enabled' : 'Disabled'} />
            <Info label="Push Notifications" value={user.preferences.push_notifications_enabled ? 'Enabled' : 'Disabled'} />
            <Info label="Video Quality" value={user.preferences.video_quality_preference} />
            <Info label="Playback Speed" value={user.preferences.playback_speed_default ? `${user.preferences.playback_speed_default}x` : null} />
            <Info label="Language" value={user.preferences.language === 'en' ? 'English' : user.preferences.language === 'hi' ? 'Hindi' : user.preferences.language} />
          </dl>
        </Section>
      )}

      <ConfirmDock
        open={blockOpen} onClose={() => setBlockOpen(false)} onConfirm={toggleBlock}
        title={`Block ${personName(user)}?`}
        description="They are signed out of every device and cannot sign in until you unblock them. Their purchases are kept."
        confirmLabel="Block user" workingLabel="Blocking…"
      />

      <ExtendValidityDrawer
        record={extendTarget ? ({
          purchase_id: extendTarget._id,
          type: 'package',
          expires_at: extendTarget.expires_at,
          purchased_at: extendTarget.purchased_at,
          is_active: extendTarget.is_active,
          is_admin_granted: !!extendTarget.is_admin_granted,
          tier_name: extendTarget.tier_name ?? null,
          tier_duration_days: extendTarget.tier_duration_days ?? null,
          amount_paid: extendTarget.amount_paid,
          currency: extendTarget.currency,
          extendable: true,
          item_name: isObj(extendTarget.package_id) ? extendTarget.package_id.name : 'Package',
          user: { _id: user._id, name: personName(user), email: user.email || '', phone_number: user.phone_number || '', photo_url: user.photo_url ?? null },
        } satisfies SubscriptionRecord) : null}
        canExtend={canUpdate}
        onClose={() => setExtendTarget(null)}
        onExtended={() => { setExtendTarget(null); void reload({ silent: true }) }}
      />

      <ReminderDrawer items={remindTarget} canSend={canUpdate} onClose={() => setRemindTarget(null)} />
    </div>
  )
}

// ── Pieces ───────────────────────────────────────────────────────────────

function Title({ icon: Icon, count, children }: { icon: ComponentType<{ className?: string }>; count?: number; children: ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <Icon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
      {children}
      {count !== undefined && <span className="rounded-full bg-muted px-2 py-px text-xs font-semibold tabular-nums text-muted-foreground">{count.toLocaleString('en-IN')}</span>}
    </span>
  )
}

function Info({ icon: Icon, label, value, mono, copy }: { icon?: ComponentType<{ className?: string }>; label: string; value?: string | null; mono?: boolean; copy?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">{Icon && <Icon aria-hidden="true" className="h-3.5 w-3.5" />}{label}</dt>
      <dd className={mono ? 'mt-0.5 flex items-center gap-1.5 font-mono text-[13px] font-medium' : 'mt-0.5 flex items-center gap-1.5 font-medium'}>
        {value ? <span className="min-w-0 break-words">{value}</span> : <span className="font-normal text-muted-foreground">Not set</span>}
        {copy && value && <CopyButton value={value} label={label} />}
      </dd>
    </div>
  )
}

const Muted = ({ children }: { children: ReactNode }) => <span className="whitespace-nowrap text-xs text-muted-foreground">{children}</span>
const Amount = ({ value }: { value: number }) => <span className="whitespace-nowrap text-sm tabular-nums">{value > 0 ? formatINR(value) : <span className="text-muted-foreground">Free</span>}</span>

function ItemName({ title, code, granted, reason, test }: { title: string; code?: string | null; granted?: boolean; reason?: string | null; test?: boolean }) {
  return (
    <div className="max-w-[360px]">
      <p className="break-words text-sm font-medium">{title}{test && <StatusPill tone="warning" className="ml-1.5 align-middle">Test</StatusPill>}</p>
      <ProductCodeText code={code} />
      {granted && <p className="truncate text-xs text-muted-foreground" title={reason || undefined}>Admin Granted{reason ? `: ${reason}` : ''}</p>}
    </div>
  )
}

function ActiveCell({ row }: { row: { is_active: boolean; is_revoked?: boolean; payment_status: string; revoked_at?: string | null; revoked_reason?: string | null } }) {
  if (row.is_revoked || row.payment_status === 'revoked') {
    return (
      <div>
        <StatusPill tone="danger">Revoked</StatusPill>
        {row.revoked_at && <p className="mt-0.5 max-w-[160px] truncate text-xs text-muted-foreground" title={row.revoked_reason || undefined}>{dayIST(row.revoked_at)}{row.revoked_reason ? ` · ${row.revoked_reason}` : ''}</p>}
      </div>
    )
  }
  return <StatusPill tone={row.is_active ? 'success' : 'neutral'}>{row.is_active ? 'Yes' : 'No'}</StatusPill>
}

function RevokeButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-danger hover:bg-danger-soft hover:text-danger" onClick={onClick}>
      <Ban aria-hidden="true" className="!size-3" />Revoke
    </Button>
  )
}

const CHUNK = 20

/** A section's table. Rows with a page open it; long lists load 20 at a time. */
function RecordTable<T>({ rows, head, cells, keyOf, labelOf, hrefOf, empty, minWidth, itemWord }: {
  rows: T[]
  head: string[]
  cells: (row: T) => ReactNode[]
  keyOf: (row: T) => string
  labelOf: (row: T) => string
  hrefOf?: (row: T) => string
  empty: { icon: ComponentType<{ className?: string }>; text: string }
  minWidth: string
  itemWord: string
}) {
  const navigate = useNavigate()
  const [shown, setShown] = useState(CHUNK)
  if (rows.length === 0) {
    const Icon = empty.icon
    return (
      <div className="border-t border-border px-5 py-9 text-center text-sm text-muted-foreground">
        <Icon aria-hidden="true" className="mx-auto mb-2 h-7 w-7 opacity-40" />
        {empty.text}
      </div>
    )
  }
  return (
    <div className="border-t border-border">
      <Table className={minWidth}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {head.map((h, i) => <TableHead key={i} scope="col" className={i === 0 ? 'pl-5' : i === head.length - 1 ? 'pr-5' : ''}>{h || <span className="sr-only">Actions</span>}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.slice(0, shown).map((row) => {
            const href = hrefOf?.(row)
            return (
              <TableRow
                key={keyOf(row)}
                tabIndex={href ? 0 : undefined}
                aria-label={href ? `Open ${labelOf(row)}` : undefined}
                onClick={href ? (e) => {
                  if ((e.target as HTMLElement).closest('button, a, [data-no-row-click]')) return
                  navigate(href)
                } : undefined}
                onKeyDown={href ? (e) => { if (e.key === 'Enter' && e.target === e.currentTarget) navigate(href) } : undefined}
                className={href ? 'cursor-pointer hover:bg-accent/50 focus-visible:bg-accent/60 focus-visible:outline-2 focus-visible:-outline-offset-2' : 'hover:bg-transparent'}
              >
                {cells(row).map((c, i, all) => <TableCell key={i} className={i === 0 ? 'py-2.5 pl-5' : i === all.length - 1 ? 'py-2.5 pr-5' : 'py-2.5'}>{c}</TableCell>)}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {rows.length > shown && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm">
          <span className="text-muted-foreground">Showing {shown} of {plural(rows.length, itemWord)}</span>
          <Button size="sm" variant="outline" className="bg-card" onClick={() => setShown((n) => n + CHUNK)}>Show {Math.min(CHUNK, rows.length - shown)} more</Button>
        </div>
      )}
    </div>
  )
}
