import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DetailHeader, DetailSkeleton, ErrorState, FactGrid, Section, Stat, apiErrorMessage, type Fact } from '@/components/common/detail'
import { formatDuration, formatINR } from '@/lib/format'
import { paymentCasesService } from '@/services/paymentCases.service'
import { istDay, istDayTime, TWO_COLS } from './components/labels'
import { useRecord } from './components/useRecord'

const at = (iso: string | null | undefined) => (iso ? `${istDayTime(iso)} IST` : null)

/** Everything the bank asks for, on one page, with a PDF to send. */
export function CaseEvidencePage() {
  const { caseId = '' } = useParams()
  const back = { label: 'Back to the case', href: `/commerce/cases/${caseId}` }
  const { data: e, loading, error, reload } = useRecord(caseId, () => paymentCasesService.evidence(caseId))
  const [downloading, setDownloading] = useState(false)

  if (!e) {
    if (loading) return <DetailSkeleton />
    return <ErrorState title={error?.status === 404 ? 'This case was not found' : undefined} message={error?.message} onRetry={error?.status === 404 || error?.status === 400 ? undefined : reload} back={back} />
  }

  const download = async () => {
    if (downloading) return
    setDownloading(true)
    try { await paymentCasesService.downloadEvidence(caseId, e.case.case_number) } catch (err) { toast.error(apiErrorMessage(err, 'The PDF could not be made.')) } finally { setDownloading(false) }
  }

  const digital = e.purchase.type === 'package' || e.purchase.type === 'ebook'
  const u = e.usage
  const bought: (Fact | null | false)[] = [
    { label: 'Product', value: e.purchase.item },
    { label: 'Type', value: e.purchase.type_label },
    !!(e.purchase.tier_duration_days || e.purchase.tier_name) && { label: 'Plan', value: e.purchase.tier_duration_days ? formatDuration(e.purchase.tier_duration_days) : e.purchase.tier_name },
    { label: 'Date', value: at(e.purchase.at) },
    e.purchase.included.length > 0 && { label: 'Includes', value: e.purchase.included.join(', '), wide: true },
    e.purchase.lines.length > 0 && { label: 'Items', value: e.purchase.lines.map((l) => `${l.title} x ${l.quantity}`).join(', '), wide: true },
  ]

  return (
    <div className="space-y-6">
      <DetailHeader
        back={back}
        title={<>Evidence pack <span className="font-mono text-[18px] font-medium text-muted-foreground sm:text-[21px]">{e.case.case_number}</span></>}
        subtitle={e.case.evidence_due_at ? `Evidence due ${istDay(e.case.evidence_due_at)}. Built from our records just now.` : 'Built from our records just now.'}
        actions={<Button onClick={download} disabled={downloading}>{downloading ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Download aria-hidden="true" />}{downloading ? 'Making the PDF…' : 'Download PDF'}</Button>}
      />

      {e.missing.length > 0 && (
        <div className="rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning">
          <p className="font-medium">Before you send it</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">{e.missing.map((m) => <li key={m}>{m}</li>)}</ul>
          {e.purchase.type && <p className="mt-2"><Link to={back.href} className="font-medium underline underline-offset-4">Open the case</Link> to reach the purchase and its documents.</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Disputed" value={formatINR(e.case.amount)} hint={e.case.gateway_reference || undefined} />
        <Stat label="Delivery note" value={e.delivery.delivery_note_number || (digital ? 'Not issued' : 'Not used')} hint={e.delivery.emailed_at ? `Emailed ${istDay(e.delivery.emailed_at)}` : undefined} />
        <Stat label="First use" value={u.first_use ? istDay(u.first_use) : u.attendance?.attended_at ? istDay(u.attendance.attended_at) : 'None recorded'} hint={u.last_use ? `Last ${istDay(u.last_use)}` : undefined} />
        <Stat label={e.purchase.type === 'package' ? 'Videos opened' : 'Devices'} value={e.purchase.type === 'package' ? u.videos_opened : u.devices} hint={e.purchase.type === 'package' && u.videos_completed ? `${u.videos_completed} finished` : undefined} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Section title="Dispute">
          <FactGrid className={TWO_COLS} facts={[
            { label: 'Reason given', value: e.case.reason, wide: true },
            { label: 'Bank or gateway reference', value: e.case.gateway_reference, copy: e.case.gateway_reference, mono: true },
            { label: 'Opened', value: at(e.case.opened_at) },
          ]} />
        </Section>
        <Section title="Student">
          <FactGrid className={TWO_COLS} facts={e.student
            ? [{ label: 'Name', value: e.student.name }, { label: 'Phone', value: e.student.phone, mono: true }, { label: 'Email', value: e.student.email }, { label: 'Student ID', value: e.student.student_id, mono: true }]
            : [{ label: 'Account', value: 'Deleted' }]} />
        </Section>
        <Section title="What was bought"><FactGrid className={TWO_COLS} facts={bought} /></Section>
        <Section title="Payment">
          <FactGrid className={TWO_COLS} facts={[
            { label: 'Amount charged', value: formatINR(e.payment.amount) },
            e.payment.gst != null && { label: 'GST in that amount', value: formatINR(e.payment.gst) },
            { label: 'Payment id', value: e.payment.payment_id, copy: e.payment.payment_id, mono: true },
            { label: 'Session id', value: e.payment.session_id, copy: e.payment.session_id, mono: true },
            { label: 'Invoice', value: e.payment.invoice_number, mono: true },
            !!e.payment.coupon && { label: 'Coupon', value: `${e.payment.coupon.code} (${formatINR(e.payment.coupon.discount)} off)` },
          ]} />
        </Section>
        <Section title="Delivery">
          <FactGrid className={TWO_COLS} facts={[
            digital && { label: 'Delivery note', value: e.delivery.delivery_note_number || 'Not issued', mono: !!e.delivery.delivery_note_number },
            !!e.delivery.emailed_at && { label: 'Emailed', value: `${at(e.delivery.emailed_at)} to ${e.delivery.emailed_to || 'the student'}` },
            { label: 'Access', value: e.delivery.access_status },
            !!e.delivery.activated_at && { label: 'Activated', value: at(e.delivery.activated_at) },
            !!e.delivery.access_start && e.delivery.access_start !== e.delivery.activated_at && { label: 'From', value: at(e.delivery.access_start) },
            e.delivery.lifetime ? { label: 'Until', value: 'Lifetime' } : !!e.delivery.access_end && { label: 'Until', value: at(e.delivery.access_end) },
            !!e.purchase.order?.tracking_number && { label: 'Tracking', value: `${e.purchase.order.courier_name || ''} ${e.purchase.order.tracking_number}`.trim() },
            !!e.purchase.order?.delivered_at && { label: 'Delivered', value: at(e.purchase.order.delivered_at) },
          ]} />
        </Section>
        <Section title="Terms and device">
          <FactGrid className={TWO_COLS} facts={[
            { label: 'Terms accepted', value: e.terms.accepted ? `${at(e.terms.at) || 'Yes'}${e.terms.version ? ` (version ${e.terms.version})` : ''}` : 'Not recorded' },
            { label: 'Accepted from IP', value: e.terms.ip || 'Not recorded (older purchase)', mono: !!e.terms.ip },
            { label: 'Ordered from IP', value: e.order_device.ip || 'Not recorded (older purchase)', mono: !!e.order_device.ip },
            { label: 'Ordered on', value: e.order_device.user_agent || 'Not recorded (older purchase)' },
          ]} />
        </Section>
      </div>

      <Section title="Use of the account and content" description="Content use counts from the moment access was activated.">
        <FactGrid facts={[
          { label: 'First sign-in on record', value: at(u.first_sign_in) },
          { label: 'Last active', value: at(u.last_active) },
          { label: 'Devices', value: u.devices ? `${u.devices}${u.device_list.length ? ` (${u.device_list.map((d) => d.name).slice(0, 3).join(', ')}${u.device_list.length > 3 ? '…' : ''})` : ''}` : 'None' },
          digital && { label: 'First use', value: at(u.first_use) || 'None recorded' },
          digital && { label: 'Last use', value: at(u.last_use) || 'None recorded' },
          e.purchase.type === 'package' && { label: 'Opened', value: `${u.videos_opened} video${u.videos_opened === 1 ? '' : 's'}, ${u.documents_opened} note${u.documents_opened === 1 ? '' : 's'}` },
          !!u.attendance && { label: 'Attendance', value: u.attendance.attended_at ? at(u.attendance.attended_at) : u.attendance.days_attended != null ? `${u.attendance.days_attended} day${u.attendance.days_attended === 1 ? '' : 's'}` : 'Did not attend' },
        ]} />
        {u.videos.length > 0 && (
          <div className="pg-scroll-x mt-5 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[440px] text-sm">
              <caption className="sr-only">Videos watched, latest first</caption>
              <thead className="bg-muted/60 text-left text-xs text-muted-foreground"><tr><th scope="col" className="px-4 py-2 font-medium">Video</th><th scope="col" className="px-4 py-2 text-right font-medium">Watched</th><th scope="col" className="px-4 py-2 text-right font-medium">Last opened</th></tr></thead>
              <tbody className="divide-y divide-border">
                {u.videos.map((v, i) => <tr key={i}><td className="px-4 py-2">{v.title}</td><td className="px-4 py-2 text-right tabular-nums">{v.percent != null ? `${v.percent}%` : 'Opened'}</td><td className="whitespace-nowrap px-4 py-2 text-right text-muted-foreground">{at(v.last_watched)}</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}
