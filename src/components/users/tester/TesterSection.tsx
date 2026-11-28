import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FlaskConical, Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Section, StatusPill, apiErrorInfo, apiErrorMessage } from '@/components/common/detail'
import { ConfirmDock } from '@/components/users/kit'
import { dayIST, dayTimeIST, errText, plural } from '@/components/users/lib'
import { formatINR } from '@/lib/format'
import { testerApi, type RealPurchase, type ResetPreview, type TesterSummary } from './api'

const TYPE_WORD: Record<string, [string, string]> = {
  package: ['package purchase', 'package purchases'],
  session: ['session purchase', 'session purchases'],
  workshop: ['workshop purchase', 'workshop purchases'],
  ebook: ['e-book purchase', 'e-book purchases'],
  form: ['form payment', 'form payments'],
  book: ['printed book order', 'printed book orders'],
}

interface TesterSectionProps {
  userId: string
  name: string
  tester?: TesterSummary
  /** users.update: may turn the flag on or off */
  canUpdate: boolean
  /** Super admin: may reset the account */
  canReset: boolean
  onChanged: () => void
}

/**
 * "Tester account" on the student page (owner, 27 Nov 2026). The owner tests
 * the new-buyer journey on his own account: while on, every checkout costs
 * INR 1 and stays out of the numbers. A super admin can reset the account to a
 * new buyer, as often as needed.
 */
export function TesterSection({ userId, name, tester, canUpdate, canReset, onChanged }: TesterSectionProps) {
  const isTester = tester?.is_tester === true
  const price = formatINR(tester?.test_price ?? 1)
  const [asking, setAsking] = useState<boolean | null>(null) // the value being confirmed
  const [resetOpen, setResetOpen] = useState(false)

  const toggle = async () => {
    if (asking === null) return
    const res = await testerApi.set(userId, asking)
    toast.success(asking ? 'Tester account turned on' : 'Tester account turned off')
    if (!res.tester.is_tester) setResetOpen(false)
    onChanged()
  }

  return (
    <Section
      id="tester"
      title={<span className="flex items-center gap-2"><FlaskConical aria-hidden="true" className="h-4 w-4 text-muted-foreground" />Tester account{isTester && <StatusPill tone="warning">Tester</StatusPill>}</span>}
      description="For testing the buying journey with a real account. Not for students."
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-2xl space-y-1.5 text-sm">
          <p>
            While this is on, every checkout on this account costs <strong className="tabular-nums">{price}</strong>, whatever the product, plan, GST or coupon.
            The payment goes through the real Zoho Payments checkout, so the whole journey can be tested.
          </p>
          <p className="text-muted-foreground">
            Test orders get no Zoho Books invoice, are marked Test in Purchases, and are left out of revenue, analytics, sales counts and exports.
            Coupons entered on this account never use up a coupon's limits.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <label htmlFor="tester-switch" className="text-sm font-medium">{isTester ? 'On' : 'Off'}</label>
          <Switch
            id="tester-switch"
            checked={isTester}
            disabled={!canUpdate}
            aria-describedby="tester-who"
            onCheckedChange={(v) => setAsking(v)}
          />
        </div>
      </div>

      <dl id="tester-who" className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
        <Fact label={isTester ? 'Turned on' : 'Last changed'} value={tester?.set_at ? `${dayIST(tester.set_at)}${tester.set_by ? ` by ${tester.set_by.name}` : ''}` : 'Never'} />
        <Fact label="Last reset" value={tester?.last_reset_at ? `${dayTimeIST(tester.last_reset_at)}${tester.last_reset_by ? ` by ${tester.last_reset_by.name}` : ''}` : 'Never'} />
        <Fact
          label="Test orders"
          value={(tester?.test_orders || 0) > 0 || (tester?.ended_by_reset || 0) > 0
            ? (
              <Link to={`/commerce/purchases?type=all&user_id=${userId}&test=include`} className="font-medium text-primary hover:underline">
                {plural(tester?.test_orders || 0, 'test order')}{(tester?.ended_by_reset || 0) > 0 ? `, ${tester?.ended_by_reset} ended by a reset` : ''}
              </Link>
            )
            : 'None'}
        />
      </dl>
      {!canUpdate && <p className="mt-3 text-xs text-muted-foreground">You need permission to update users to change this.</p>}

      {isTester && (
        <div className="mt-4 border-t border-border pt-4">
          {!resetOpen ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Reset to new buyer: ends every purchase and form submission, and clears progress, ratings and notifications, so the account looks like a brand-new sign-up. The sign-in is kept.
              </p>
              {canReset
                ? <Button variant="outline" className="shrink-0 text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setResetOpen(true)}><RotateCcw aria-hidden="true" />Reset to new buyer</Button>
                : <p className="shrink-0 text-xs text-muted-foreground">Only a super admin can reset.</p>}
            </div>
          ) : (
            <ResetPanel userId={userId} name={name} onCancel={() => setResetOpen(false)} onDone={() => { setResetOpen(false); onChanged() }} />
          )}
        </div>
      )}

      <ConfirmDock
        open={asking !== null}
        onClose={() => setAsking(null)}
        onConfirm={toggle}
        tone={asking ? 'default' : 'destructive'}
        title={asking ? `Make ${name} a tester account?` : `Turn off the tester account for ${name}?`}
        description={asking
          ? `Every checkout on this account will cost ${price} through the real Zoho Payments checkout, with no invoice and out of the numbers. Use it only for an account you test with.`
          : 'Checkouts go back to real prices. An order already placed at the tester price and not yet paid will not be activated if it is paid now; it opens a payment case instead.'}
        confirmLabel={asking ? 'Turn on tester account' : 'Turn off tester account'}
        workingLabel={asking ? 'Turning on…' : 'Turning off…'}
      />
    </Section>
  )
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words font-medium">{value}</dd>
    </div>
  )
}

/** The strong confirmation: what the reset clears, with the counts, typed confirmation. Inline, never a popup. */
function ResetPanel({ userId, name, onCancel, onDone }: { userId: string; name: string; onCancel: () => void; onDone: () => void }) {
  const [preview, setPreview] = useState<ResetPreview | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [real, setReal] = useState<RealPurchase[] | null>(null)
  const [choice, setChoice] = useState<'end' | 'keep' | null>(null)
  const [typed, setTyped] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    let off = false
    testerApi.preview(userId)
      .then((p) => { if (!off) { setPreview(p); setReal(p.real_purchases.length ? p.real_purchases : null) } })
      .catch((e) => { if (!off) setLoadError(errText(e, 'What the reset would clear could not be loaded.')) })
    return () => { off = true }
  }, [userId])
  useEffect(() => { ref.current?.focus({ preventScroll: true }); ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [])

  const confirmed = typed.trim().toUpperCase() === 'RESET'
  const submit = async () => {
    if (saving || !confirmed || (real && !choice)) return
    setSaving(true)
    setError(null)
    try {
      const res = await testerApi.reset(userId, real ? choice! : undefined)
      toast.success(`Account reset to a new buyer (${plural(res.purchases_ended_total, 'purchase')} ended)`)
      onDone()
    } catch (e) {
      const { code, details } = apiErrorInfo<{ real_purchases?: RealPurchase[] }>(e)
      if (code === 'TESTER_RESET_REAL_PURCHASES' && Array.isArray(details?.real_purchases)) {
        setReal(details.real_purchases)
        setChoice(null)
      } else {
        setError(apiErrorMessage(e))
      }
    } finally {
      setSaving(false)
    }
  }

  const items = preview ? [
    ...Object.entries(preview.purchases).filter(([, n]) => n > 0).map(([t, n]) => `${plural(n, TYPE_WORD[t][0], TYPE_WORD[t][1])} ended (kept for audit, no longer shown to the student)`),
    preview.registrations.sessions > 0 && `${plural(preview.registrations.sessions, 'session registration')} removed`,
    preview.registrations.workshops > 0 && `${plural(preview.registrations.workshops, 'workshop registration')} removed`,
    preview.attendance > 0 && `${plural(preview.attendance, 'live session attendance record')} removed`,
    preview.certificates > 0 && `${plural(preview.certificates, 'workshop certificate')} withdrawn`,
    preview.progress > 0 && `Video progress and watch history cleared (${plural(preview.progress, 'item')})`,
    preview.library > 0 && `${plural(preview.library, 'library item')} removed`,
    preview.bookmarks > 0 && `${plural(preview.bookmarks, 'bookmark')} removed`,
    preview.highlights > 0 && `${plural(preview.highlights, 'highlight and note', 'highlights and notes')} removed`,
    preview.reviews > 0 && `${plural(preview.reviews, 'video rating or review', 'video ratings and reviews')} removed (they no longer count in video and faculty ratings)`,
    preview.notifications > 0 && `${plural(preview.notifications, 'notification')} removed from the in-app list`,
    preview.form_submissions > 0 && `${plural(preview.form_submissions, 'form submission')} ended (kept for audit, no longer shown to the student)`,
  ].filter(Boolean) as string[] : []

  return (
    <section ref={ref} tabIndex={-1} aria-labelledby="reset-title" className="rounded-xl border border-danger/30 bg-card p-5 outline-none">
      <h3 id="reset-title" className="text-[15px] font-semibold">Reset {name} to a new buyer?</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Afterwards the app, the web store and this panel show the account like a brand-new sign-up: nothing bought, every package buyable. Nobody is signed out.
      </p>

      {!preview && !loadError && <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Checking what the reset would clear…</p>}
      {loadError && <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{loadError}</p>}

      {preview && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium">This clears</p>
            {items.length
              ? <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm">{items.map((t) => <li key={t}>{t}</li>)}</ul>
              : <p className="mt-1.5 text-sm text-muted-foreground">Nothing: the account already looks like a new buyer.</p>}
          </div>
          <div>
            <p className="text-sm font-medium">This keeps</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{preview.keeps.map((t) => <li key={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</li>)}</ul>
          </div>
        </div>
      )}

      {real && (
        <div className="mt-5" aria-live="polite">
          <p className="text-sm font-medium">This account also has {plural(real.length, 'real paid purchase')} (money collected, not test orders)</p>
          <ul className="mt-2 max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {real.map((r) => (
              <li key={r.purchase_id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3.5 py-2.5 text-sm">
                <Link to={`/commerce/purchases/${r.purchase_type}/${r.purchase_id}`} className="min-w-0 break-words font-medium text-primary hover:underline">{r.item_name}{r.tier_name ? `, ${r.tier_name}` : ''}</Link>
                <span className="tabular-nums text-muted-foreground">{formatINR(r.amount)}{r.purchased_at ? `, bought ${dayIST(r.purchased_at)}` : ''}</span>
              </li>
            ))}
          </ul>
          <fieldset className="mt-3 space-y-2" disabled={saving}>
            <legend className="sr-only">What should happen to the real paid purchases?</legend>
            <Choice checked={choice === 'keep'} onSelect={() => setChoice('keep')} title="Keep them" text="They stay active and keep counting as sales. Only test orders, free grants and progress are cleared." />
            <Choice checked={choice === 'end'} onSelect={() => setChoice('end')} title="End them too" text="Access ends like a revoke and they stop counting as sales. No money is returned." />
          </fieldset>
        </div>
      )}

      {preview && (
        <div className="mt-5 max-w-sm">
          <label htmlFor="reset-confirm" className="text-sm font-medium">Type RESET to confirm</label>
          <Input id="reset-confirm" className="mt-1.5 font-mono" autoComplete="off" value={typed} disabled={saving} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void submit() }} />
        </div>
      )}

      {error && <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</p>}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Keep everything</Button>
        <Button type="button" variant="destructive" onClick={() => void submit()} disabled={saving || !preview || !confirmed || (!!real && !choice)}>
          {saving && <Loader2 aria-hidden="true" className="animate-spin" />}
          {saving ? 'Resetting…' : 'Reset to new buyer'}
        </Button>
      </div>
    </section>
  )
}

function Choice({ checked, onSelect, title, text }: { checked: boolean; onSelect: () => void; title: string; text: string }) {
  return (
    <label className={cn('flex cursor-pointer gap-3 rounded-lg border px-3.5 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[hsl(var(--ring))]', checked ? 'border-primary bg-accent' : 'border-border hover:bg-muted/60')}>
      <input type="radio" name="real-purchases" className="mt-1 accent-[hsl(var(--primary))] focus-visible:outline-none" checked={checked} onChange={onSelect} />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-[13px] text-muted-foreground">{text}</span>
      </span>
    </label>
  )
}
