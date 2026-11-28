import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, Pencil, Power, Trash2, Ticket } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { useAuth } from '@/contexts/AuthContext'
import { formatCount, formatDayTime, formatINR } from '@/lib/format'
import { couponsService, Coupon, CouponRedemption } from '@/services/coupons.service'
import { CouponTarget, resolveTarget, TYPE_LABELS } from '@/components/coupons/CouponProductPicker'
import { CouponTicket, couponState } from '@/components/coupons/CouponTicket'
import { StudentLink, openableRow, useStudentPage } from '@/components/students/StudentLink'

const PAGE_SIZE = 25

export function CouponDetailPage() {
  const { couponId } = useParams<{ couponId: string }>()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const student = useStudentPage('Coupon')
  const canEdit = hasPermission('coupons.update')
  const canDelete = hasPermission('coupons.delete')

  const [coupon, setCoupon] = useState<Coupon | null>(null)
  const [targets, setTargets] = useState<CouponTarget[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [redemptions, setRedemptions] = useState<CouponRedemption[]>([])
  const [redTotal, setRedTotal] = useState(0)
  const [redPage, setRedPage] = useState(1)
  const [redLoading, setRedLoading] = useState(true)
  const [redError, setRedError] = useState(false)

  const load = useCallback(async () => {
    if (!couponId) return
    setLoading(true)
    try {
      const res = await couponsService.getById(couponId)
      if (!res.success || !res.data) { setError(res.message || 'This coupon could not be loaded.'); return }
      setCoupon(res.data)
      const initial: CouponTarget[] = (res.data.applicable_products || []).map((p) => ({
        product_type: p.product_type,
        product_id: String(p.product_id),
        tier_ids: (p.tier_ids || []).map(String),
        label: p.product_name ?? null,
        tiers: p.tiers,
      }))
      setTargets(initial)
      if (res.data.applies_to === 'products') setTargets(await Promise.all(initial.map(resolveTarget)))
    } catch (e: any) {
      setError(e?.message || 'This coupon could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [couponId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!couponId) return
    let cancelled = false
    ;(async () => {
      setRedLoading(true)
      setRedError(false)
      try {
        const res = await couponsService.getRedemptions(couponId, { page: redPage, limit: PAGE_SIZE })
        if (cancelled) return
        if (res.success && res.data) {
          setRedemptions(res.data.redemptions || [])
          setRedTotal(res.data.pagination?.total ?? (res.data.redemptions || []).length)
        } else setRedError(true)
      } catch {
        if (!cancelled) setRedError(true)
      } finally {
        if (!cancelled) setRedLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [couponId, redPage])

  const toggle = async () => {
    if (!coupon) return
    setToggling(true)
    try {
      const res = await couponsService.toggleActiveStatus(coupon._id)
      if (res.success) {
        toast.success(coupon.is_active ? `${coupon.code} paused` : `${coupon.code} is live`)
        setCoupon({ ...coupon, is_active: !coupon.is_active })
      } else toast.error(res.message || 'Could not change the status')
    } catch (e: any) {
      toast.error(e?.message || 'Could not change the status')
    } finally {
      setToggling(false)
    }
  }

  const confirmDelete = async () => {
    if (!coupon) return
    const res = await couponsService.delete(coupon._id)
    if (res.success) {
      toast.success(`${coupon.code} deleted`)
      navigate('/commerce/coupons')
    } else {
      toast.error(res.message || 'Could not delete the coupon')
      throw new Error(res.message)
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Coupon not available" breadcrumbs={[{ label: 'Commerce' }, { label: 'Coupons', href: '/commerce/coupons' }]} />
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button asChild variant="outline" className="mt-4"><Link to="/commerce/coupons">Back to coupons</Link></Button>
        </div>
      </div>
    )
  }

  if (loading || !coupon) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-card p-8 text-sm text-muted-foreground" aria-live="polite">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading coupon…
      </div>
    )
  }

  const state = couponState(coupon)
  const view = { ...coupon, applicable_products: targets }
  const used = coupon.redemption_count || 0
  const cap = coupon.max_redemptions
  const pageDiscount = redemptions.reduce((s, r) => s + Number(r.discount_amount || 0), 0)
  const totalPages = Math.max(1, Math.ceil(redTotal / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <PageHeader
        title={coupon.code}
        description={coupon.description || undefined}
        breadcrumbs={[{ label: 'Commerce' }, { label: 'Coupons', href: '/commerce/coupons' }, { label: coupon.code }]}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <Button variant="outline" onClick={toggle} disabled={toggling}>
                {toggling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Power className="mr-2 h-4 w-4" aria-hidden="true" />}
                {coupon.is_active ? 'Pause' : 'Make live'}
              </Button>
            )}
            {canDelete && (
              <Button variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />Delete
              </Button>
            )}
            {canEdit && (
              <Button asChild>
                <Link to={`/commerce/coupons/${coupon._id}/edit`}><Pencil className="mr-2 h-4 w-4" aria-hidden="true" />Edit</Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <CouponTicket coupon={view} state={state} expanded />

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border shadow-card">
          <Stat label="Times used" value={formatCount(used)} sub={cap != null ? `of ${formatCount(cap)} allowed` : 'No total limit'}>
            {cap != null && cap > 0 && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={cap} aria-valuenow={used} aria-label="Uses so far">
                <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.min(100, (used / cap) * 100)}%` }} />
              </div>
            )}
          </Stat>
          <Stat label="Per student" value={coupon.per_user_limit != null ? formatCount(coupon.per_user_limit) : 'Unlimited'} sub={coupon.per_user_limit === 1 ? 'use each' : 'uses each'} />
          <Stat label="Created" value={formatDayTime(coupon.createdAt)} small />
          <Stat label="Last changed" value={formatDayTime(coupon.updatedAt)} small />
        </dl>
      </div>

      <section className="overflow-hidden rounded-xl border bg-card shadow-card">
        <header className="flex flex-wrap items-baseline justify-between gap-2 border-b px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold">Redemptions</h2>
            <p className="text-sm text-muted-foreground">Each paid order that used this code, newest first.</p>
          </div>
          {redemptions.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Discount on this page: <span className="font-mono font-semibold text-foreground">{formatINR(pageDiscount)}</span>
            </p>
          )}
        </header>
        {redLoading ? (
          <p className="px-5 py-8 text-sm text-muted-foreground" aria-live="polite">Loading redemptions…</p>
        ) : redError ? (
          <p className="px-5 py-8 text-sm text-danger">Could not load redemptions. Refresh the page to try again.</p>
        ) : redemptions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <Ticket className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">No one has used this code yet</p>
            <p className="text-sm text-muted-foreground">Redemptions appear here once a student pays with it.</p>
          </div>
        ) : (
          <>
            <div className="pg-scroll-x overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 font-medium">Student</th>
                    <th scope="col" className="px-5 py-2.5 font-medium">Bought</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-medium">Discount</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-medium">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {redemptions.map((r) => (
                    <tr key={r._id} {...openableRow(student.hrefOf(r.user_id) ? () => student.open(r.user_id) : undefined, 'hover:bg-muted/40')}>
                      <td className="px-5 py-3">
                        <StudentLink student={r.user_id} fallback="Student" from="Coupon" className="text-foreground hover:text-primary" />
                        {r.user_id?.student_id && <span className="ml-2 font-mono text-xs text-muted-foreground">{r.user_id.student_id}</span>}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{TYPE_LABELS[r.purchase_type] || r.purchase_type}</td>
                      <td className="px-5 py-3 text-right font-mono">{formatINR(r.discount_amount)}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-muted-foreground">{formatDayTime(r.redeemed_at || r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-5 py-3 text-sm">
                <span className="text-muted-foreground">Page {redPage} of {totalPages} · {formatCount(redTotal)} total</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={redPage <= 1} onClick={() => setRedPage((p) => p - 1)}>Previous</Button>
                  <Button size="sm" variant="outline" disabled={redPage >= totalPages} onClick={() => setRedPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <DeleteModal open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={confirmDelete} title="Delete coupon" itemName={coupon.code} />
    </div>
  )
}

function Stat({ label, value, sub, small, children }: { label: string; value: string; sub?: string; small?: boolean; children?: React.ReactNode }) {
  return (
    <div className="bg-card p-5">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className={small ? 'mt-1.5 text-sm font-medium' : 'mt-1 font-display text-[28px] font-semibold leading-none tracking-tight'} data-numeric>{value}</dd>
      {sub && <dd className="mt-1 text-xs text-muted-foreground">{sub}</dd>}
      {children}
    </div>
  )
}
