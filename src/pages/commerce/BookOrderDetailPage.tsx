import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Check, Loader2, ShoppingBag, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DetailHeader, DetailSkeleton, ErrorState, FactGrid, Section, Stat, StatusPill, Timeline, apiErrorMessage, type TimelineEntry } from '@/components/common/detail'
import { useUnsavedChanges } from '@/components/layouts/workspaceStore'
import { useAuth } from '@/contexts/AuthContext'
import { formatINR } from '@/lib/format'
import { cn } from '@/lib/utils'
import { bookOrdersService, type BookOrder, type BookOrderDetail } from '@/services/bookOrders.service'
import { DISPUTE, ORDER_STATUS, PAYMENT_STATUS, istDay, istDayTime, TWO_COLS } from './components/labels'
import { StudentSection } from './components/PurchaseSections'
import { useBack, useRecord } from './components/useRecord'

type Status = BookOrder['order_status']
const STEPS: Status[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']
const VERB: Record<Status, string> = { pending: 'Mark pending', confirmed: 'Confirm order', processing: 'Start processing', shipped: 'Mark shipped', delivered: 'Mark delivered', cancelled: 'Cancel order' }

export function BookOrderDetailPage() {
  const { orderId = '' } = useParams()
  const { hash } = useLocation()
  const { hasPermission } = useAuth()
  const canUpdate = hasPermission('book_orders.update')
  const back = useBack({ label: 'Book Orders', href: '/commerce/book-orders' })
  const { data: o, loading, error, reload } = useRecord(orderId, async () => (await bookOrdersService.getById(orderId)).data!)
  const [saving, setSaving] = useState<Status | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const ready = !!o

  useEffect(() => {
    if (!ready || hash !== '#shipping') return
    document.getElementById('shipping')?.scrollIntoView({ block: 'center' })
    document.getElementById('tracking-number')?.focus({ preventScroll: true })
  }, [ready, hash])

  if (!o) {
    if (loading) return <DetailSkeleton />
    const missing = error?.status === 404 || error?.status === 400
    return <ErrorState title={missing ? 'This order was not found' : undefined} message={missing ? 'It may have been removed, or the link is wrong.' : error?.message} onRetry={missing ? undefined : reload} back={back} />
  }

  const setStatus = async (to: Status) => {
    if (saving) return
    setSaving(to)
    try {
      await bookOrdersService.updateStatus(o._id, to)
      toast.success(`Order marked ${ORDER_STATUS[to].label.toLowerCase()}`)
      setConfirmCancel(false)
      await reload()
    } catch (e) {
      toast.error(apiErrorMessage(e, 'The order status could not be changed.'))
      reload()
    } finally {
      setSaving(null)
    }
  }

  const status = ORDER_STATUS[o.order_status]
  const pay = PAYMENT_STATUS[o.payment_status]
  const unpaid = o.payment_status !== 'completed'
  const user = o.user_id && typeof o.user_id === 'object' ? { ...o.user_id, student_id: o.user_id.student_id ?? null } : null
  const next = o.allowed_statuses.filter((s) => s !== 'cancelled')
  const units = o.items.reduce((n, i) => n + i.quantity, 0)

  return (
    <div className="space-y-6">
      <DetailHeader
        back={back}
        title={<span className="break-all font-mono text-[20px] sm:text-[23px]">{o.order_number || 'Book order'}</span>}
        status={<><StatusPill tone={status?.tone}>{status?.label || o.order_status}</StatusPill><StatusPill tone={pay?.tone}>Payment {pay?.label.toLowerCase() || o.payment_status}</StatusPill>{o.dispute_status && <StatusPill tone={DISPUTE[o.dispute_status].tone}>{DISPUTE[o.dispute_status].label}</StatusPill>}</>}
        subtitle={<>{units} book{units === 1 ? '' : 's'} for {o.recipient_name}, ordered {istDayTime(o.createdAt)} IST</>}
        actions={hasPermission('payments.read') ? <Button asChild variant="outline"><Link to={`/commerce/purchases/book/${o._id}`}><ShoppingBag aria-hidden="true" />Open purchase</Link></Button> : undefined}
      />

      {error && <p role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-danger-soft px-4 py-2.5 text-sm text-danger">{error.message} Showing what was loaded before.<Button size="sm" variant="outline" onClick={reload}>Try again</Button></p>}
      {o.payment_status === 'refunded' && <p className="rounded-lg bg-danger-soft px-4 py-2.5 text-sm text-danger">This order was refunded{o.refunded_at ? ` on ${istDay(o.refunded_at)}` : ''}{o.refund_amount != null ? `, ${formatINR(o.refund_amount)}` : ''}. Do not ship it.</p>}
      {unpaid && o.payment_status !== 'refunded' && o.order_status !== 'cancelled' && <p className="rounded-lg bg-warning-soft px-4 py-2.5 text-sm text-warning">This order has not been paid for. Check the payment before you send anything.</p>}

      <Section title="Progress">
        <Steps o={o} />
        {canUpdate && (next.length > 0 || o.allowed_statuses.includes('cancelled')) && (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            {next.map((s) => (
              <Button key={s} onClick={() => setStatus(s)} disabled={saving !== null}>
                {saving === s && <Loader2 aria-hidden="true" className="animate-spin" />}{saving === s ? 'Saving…' : VERB[s]}
              </Button>
            ))}
            {o.allowed_statuses.includes('cancelled') && !confirmCancel && (
              <Button variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setConfirmCancel(true)} disabled={saving !== null}>Cancel order</Button>
            )}
            {confirmCancel && (
              <div role="alert" className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg bg-danger-soft px-4 py-2.5">
                <span className="text-sm text-danger">Cancel this order? {['confirmed', 'processing'].includes(o.order_status) ? 'The books go back to stock. ' : ''}This does not refund the payment.</span>
                <span className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setConfirmCancel(false)} disabled={saving !== null}>Keep order</Button>
                  <Button size="sm" variant="destructive" onClick={() => setStatus('cancelled')} disabled={saving !== null}>{saving === 'cancelled' && <Loader2 aria-hidden="true" className="animate-spin" />}{saving === 'cancelled' ? 'Cancelling…' : 'Cancel order'}</Button>
                </span>
              </div>
            )}
          </div>
        )}
      </Section>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Total" value={formatINR(o.total_amount)} hint="Before GST" />
        <Stat label="Charged" value={formatINR(o.gateway_amount ?? o.total_amount)} hint={o.gateway_amount != null ? 'GST included' : 'Gateway total not stored'} />
        <Stat label="Books" value={units} hint={`${o.items.length} title${o.items.length === 1 ? '' : 's'}`} />
        <Stat label="Invoice" value={o.invoice?.invoice_number || 'None'} href={o.invoice && hasPermission('invoices.read') ? `/commerce/invoices/${o.invoice._id}` : undefined} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Section title="Items" flush>
            <ul className="divide-y divide-border border-t border-border">
              {o.items.map((i, n) => {
                const book = i.book_id && typeof i.book_id === 'object' ? i.book_id : null
                return (
                  <li key={n} className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
                    <span className="min-w-0">
                      {book && hasPermission('books.read') ? <Link to={`/content/books/${book._id}`} className="font-medium text-primary hover:underline">{i.title}</Link> : <span className="font-medium">{i.title}</span>}
                      <span className="block text-xs text-muted-foreground">{formatINR(i.price_at_purchase)} x {i.quantity}{!book && ', book deleted'}</span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">{formatINR(i.price_at_purchase * i.quantity)}</span>
                  </li>
                )
              })}
            </ul>
            <dl className="space-y-1.5 border-t border-border px-5 py-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular-nums">{formatINR(o.subtotal)}</dd></div>
              {o.coupon_code && <div className="flex justify-between"><dt className="text-muted-foreground">Coupon <span className="font-mono">{o.coupon_code}</span></dt><dd className="tabular-nums">- {formatINR(o.coupon_discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd className="tabular-nums">{o.shipping_cost === 0 ? 'Free' : formatINR(o.shipping_cost)}</dd></div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatINR(o.total_amount)}</dd></div>
            </dl>
          </Section>

          <Section title="Ship to">
            <FactGrid
              className={TWO_COLS}
              facts={[
                { label: 'Recipient', value: o.recipient_name, copy: o.recipient_name },
                { label: 'Phone', value: o.shipping_phone, copy: o.shipping_phone, mono: true },
                { label: 'Address', value: o.shipping_address, copy: `${o.recipient_name}\n${o.shipping_address}\n${o.shipping_phone}`, wide: true },
              ]}
            />
          </Section>

          <ShippingSection o={o} canUpdate={canUpdate} onSaved={reload} />
          <StudentSection user={user} userId={null} />
        </div>
        <div className="min-w-0 space-y-6">
          <NotesSection o={o} canUpdate={canUpdate} onSaved={reload} />
          <Section title="Timeline"><Timeline entries={timeline(o)} /></Section>
        </div>
      </div>
    </div>
  )
}

function Steps({ o }: { o: BookOrderDetail }) {
  const cancelled = o.order_status === 'cancelled'
  const at = STEPS.indexOf(o.order_status)
  if (cancelled) return <p className="flex items-center gap-2 text-sm text-danger"><X aria-hidden="true" className="h-4 w-4" />This order was cancelled.</p>
  return (
    <ol className="flex flex-wrap gap-x-2 gap-y-3">
      {STEPS.map((s, i) => {
        const done = i < at || (s === 'delivered' && at === i)
        const current = i === at
        return (
          <li key={s} aria-current={current ? 'step' : undefined} className="flex items-center gap-2">
            <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold', done ? 'bg-success text-white' : current ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
              {done ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cn('text-sm', current ? 'font-semibold' : done ? '' : 'text-muted-foreground')}>{ORDER_STATUS[s].label}<span className="sr-only">{done ? ' (done)' : current ? ' (current)' : ''}</span></span>
            {i < STEPS.length - 1 && <span aria-hidden="true" className="mx-1 hidden h-px w-8 bg-border sm:block" />}
          </li>
        )
      })}
    </ol>
  )
}

function ShippingSection({ o, canUpdate, onSaved }: { o: BookOrderDetail; canUpdate: boolean; onSaved: () => void }) {
  const [tracking, setTracking] = useState(o.tracking_number || '')
  const [courier, setCourier] = useState(o.courier_name || '')
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const editable = canUpdate && o.shipping_editable
  const dirty = editable && (tracking.trim() !== (o.tracking_number || '') || courier.trim() !== (o.courier_name || ''))
  useUnsavedChanges(dirty)

  const saved = `${o.tracking_number}|${o.courier_name}`
  const lastSaved = useRef(saved)
  useEffect(() => {
    if (lastSaved.current === saved) return
    lastSaved.current = saved
    setTracking(o.tracking_number || ''); setCourier(o.courier_name || '')
  }, [saved, o.tracking_number, o.courier_name])

  const badTracking = tracking.trim().length < 5
  const badCourier = courier.trim().length < 2
  const ships = o.order_status !== 'shipped'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (badTracking) { document.getElementById('tracking-number')?.focus(); return }
    if (badCourier) { document.getElementById('courier-name')?.focus(); return }
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      await bookOrdersService.updateShipping(o._id, tracking.trim(), courier.trim())
      toast.success(ships ? 'Shipping details saved, order marked shipped' : 'Shipping details saved')
      setTouched(false)
      onSaved()
    } catch (err) {
      setError(apiErrorMessage(err, 'The shipping details could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section id="shipping" title="Shipping and tracking">
      {!editable ? (
        <FactGrid
          className={TWO_COLS}
          facts={[
            { label: 'Courier', value: o.courier_name },
            { label: 'Tracking number', value: o.tracking_number, copy: o.tracking_number, mono: true },
            !!o.shipped_at && { label: 'Shipped', value: `${istDayTime(o.shipped_at)} IST` },
            !!o.delivered_at && { label: 'Delivered', value: `${istDayTime(o.delivered_at)} IST` },
          ]}
        />
      ) : (
        <form onSubmit={submit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tracking-number" className="text-sm font-medium">Tracking number</label>
              <Input id="tracking-number" className="mt-1.5 bg-card font-mono" maxLength={50} value={tracking} disabled={saving} aria-invalid={touched && badTracking} aria-describedby={touched && badTracking ? 'tracking-error' : undefined} onChange={(e) => setTracking(e.target.value)} />
              {touched && badTracking && <p id="tracking-error" className="mt-1 text-xs text-danger">Enter at least 5 characters.</p>}
            </div>
            <div>
              <label htmlFor="courier-name" className="text-sm font-medium">Courier</label>
              <Input id="courier-name" className="mt-1.5 bg-card" maxLength={50} placeholder="For example: Delhivery" value={courier} disabled={saving} aria-invalid={touched && badCourier} aria-describedby={touched && badCourier ? 'courier-error' : undefined} onChange={(e) => setCourier(e.target.value)} />
              {touched && badCourier && <p id="courier-error" className="mt-1 text-xs text-danger">Enter the courier's name.</p>}
            </div>
          </div>
          {o.shipped_at && <p className="mt-3 text-[13px] text-muted-foreground">Shipped {istDayTime(o.shipped_at)} IST</p>}
          {error && <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</p>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] text-muted-foreground">{ships ? 'Saving also marks the order as shipped.' : ''}</p>
            <Button type="submit" disabled={saving || (!dirty && !ships)}>{saving && <Loader2 aria-hidden="true" className="animate-spin" />}{saving ? 'Saving…' : ships ? 'Save and mark shipped' : 'Save shipping details'}</Button>
          </div>
        </form>
      )}
    </Section>
  )
}

function NotesSection({ o, canUpdate, onSaved }: { o: BookOrderDetail; canUpdate: boolean; onSaved: () => void }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  useUnsavedChanges(note.trim().length > 0)
  const notes = o.events.filter((e) => e.type === 'note')

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = note.trim()
    if (text.length < 2 || saving) return
    setSaving(true)
    try {
      await bookOrdersService.addNote(o._id, text)
      toast.success('Note added')
      setNote('')
      onSaved()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'The note could not be added.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section title="Notes">
      <div className="space-y-4 text-sm">
        {o.notes && <div><p className="text-[13px] text-muted-foreground">From the student</p><p className="mt-0.5 whitespace-pre-wrap break-words">{o.notes}</p></div>}
        {notes.map((n) => (
          <div key={n._id}><p className="text-[13px] text-muted-foreground">{n.admin_name || 'Admin'}, {istDayTime(n.at)} IST</p><p className="mt-0.5 whitespace-pre-wrap break-words">{n.note}</p></div>
        ))}
        {!o.notes && notes.length === 0 && <p className="text-muted-foreground">No notes yet.</p>}
        {canUpdate && (
          <form onSubmit={add}>
            <label htmlFor="order-note" className="sr-only">Add an internal note</label>
            <Textarea id="order-note" className="bg-card" rows={2} maxLength={1000} placeholder="Add an internal note. The student does not see it." value={note} disabled={saving} onChange={(e) => setNote(e.target.value)} />
            <div className="mt-2 flex justify-end"><Button type="submit" size="sm" variant="outline" disabled={saving || note.trim().length < 2}>{saving && <Loader2 aria-hidden="true" className="animate-spin" />}{saving ? 'Adding…' : 'Add note'}</Button></div>
          </form>
        )}
      </div>
    </Section>
  )
}

function timeline(o: BookOrderDetail): TimelineEntry[] {
  const items: (TimelineEntry & { at: string })[] = [{ id: 'placed', at: o.createdAt, title: 'Order placed' }]
  for (const e of o.events) {
    if (e.type === 'note') continue
    const title = e.type === 'order_status' ? `Marked ${(ORDER_STATUS[e.to || '']?.label || e.to || '').toLowerCase()}`
      : e.type === 'shipping_updated' ? 'Shipping details saved'
        : e.type === 'refund_recorded' ? 'Refund recorded'
          : e.type === 'invoice_emailed' ? 'Invoice emailed again' : e.type === 'invoice_refreshed' ? 'Invoice regenerated' : e.type
    items.push({ id: e._id, at: e.at, title, body: e.note || undefined, meta: e.admin_name, tone: e.type === 'refund_recorded' || e.to === 'cancelled' ? 'danger' : e.to === 'delivered' ? 'success' : undefined })
  }
  // Orders from before the log have only these two dates.
  if (o.shipped_at && !o.events.some((e) => e.type === 'shipping_updated' || e.to === 'shipped')) items.push({ id: 'shipped', at: o.shipped_at, title: 'Shipped' })
  if (o.delivered_at && !o.events.some((e) => e.to === 'delivered')) items.push({ id: 'delivered', at: o.delivered_at, title: 'Delivered', tone: 'success' })
  return items
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .map(({ at, meta, ...e }) => ({ ...e, meta: `${istDayTime(at)} IST${meta ? ` by ${meta}` : ''}` }))
}
