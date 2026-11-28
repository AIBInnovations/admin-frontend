import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Download, FileCheck2, Loader2, Mail, Send, X } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { formatINR, subscriptionLabel } from '@/lib/format'
import { StudentLink } from '@/components/students/StudentLink'
import {
  deliveryNotesService, DeliveryNote, DeliveryNotePurchaseType, DeliveryNoteStatus,
} from '@/services/deliveryNotes.service'

const PAGE_SIZE = 25

// Notes are legal evidence for disputes, so times are always shown in IST.
const ist = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
const istTime = (iso: string | null | undefined) => (iso ? `${ist.format(new Date(iso))} IST` : '—')

const STATUS: Record<DeliveryNoteStatus, { label: string; cls: string }> = {
  sent: { label: 'Emailed', cls: 'bg-success-soft text-success' },
  generated: { label: 'Not emailed yet', cls: 'bg-warning-soft text-warning' },
  failed: { label: 'Email failed', cls: 'bg-danger-soft text-danger' },
}

/**
 * The student's current name, opening their page. The note keeps the name it
 * was issued with (that is what the PDF shows); it is used only when the
 * account has no name now, or when the account is gone.
 */
function NoteStudent({ note: n }: { note: DeliveryNote }) {
  // An older backend sends no `student`: fall back to the note's snapshot.
  if (n.student === undefined) {
    return (
      <>
        <StudentLink student={{ _id: n.user_id, name: n.student_name, email: n.student_email }} fallback="Student" from="Delivery notes" />
        {n.student_id && <p className="font-mono text-xs text-muted-foreground">{n.student_id}</p>}
      </>
    )
  }
  const s = n.student
  const studentId = s?.student_id || n.student_id
  return (
    <>
      <StudentLink student={s && { ...s, name: s.name?.trim() || n.student_name?.trim() || null }} fallback="Student" from="Delivery notes" />
      {studentId && <p className="font-mono text-xs text-muted-foreground">{studentId}</p>}
      {!s && n.student_name && <p className="text-xs text-muted-foreground">Name on the note: {n.student_name}</p>}
    </>
  )
}

export function DeliveryNotesPage() {
  const [params, setParams] = useSearchParams()
  const { hasPermission } = useAuth()
  const canSend = hasPermission('invoices.update')

  const purchaseId = params.get('purchase_id') || undefined
  const purchaseType = (params.get('purchase_type') as DeliveryNotePurchaseType | null) || undefined
  const userId = params.get('user_id') || undefined
  const status = (params.get('status') as DeliveryNoteStatus | null) || undefined
  const page = Number(params.get('page')) || 1

  const [notes, setNotes] = useState<DeliveryNote[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmIssue, setConfirmIssue] = useState(false)
  const [issuing, setIssuing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await deliveryNotesService.list({ purchase_id: purchaseId, purchase_type: purchaseType, user_id: userId, status, page, limit: PAGE_SIZE })
      if (res.success && res.data) {
        setNotes(res.data.delivery_notes || [])
        setTotal(res.data.pagination?.total || 0)
      } else setError(res.message || 'Could not load delivery notes')
    } catch (e: any) {
      setError(e?.message || 'Could not load delivery notes')
    } finally {
      setLoading(false)
    }
  }, [purchaseId, purchaseType, userId, status, page])

  useEffect(() => { load() }, [load])

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    if (k !== 'page') next.delete('page')
    setParams(next)
  }

  const download = async (n: DeliveryNote) => {
    setBusyId(n._id)
    try {
      await deliveryNotesService.downloadPdf(n)
    } catch (e: any) {
      toast.error(e?.message || 'Could not download the PDF')
    } finally {
      setBusyId(null)
    }
  }

  const resend = async (n: DeliveryNote) => {
    setBusyId(n._id)
    try {
      const res = await deliveryNotesService.resend(n._id)
      const updated = res.data?.delivery_note
      if (res.success && updated?.status === 'sent') toast.success(`${n.note_number} emailed to ${updated.email_to || n.student_email || 'the student'}`)
      else toast.error(res.message || updated?.send_error || 'The email could not be sent')
      load()
    } catch (e: any) {
      toast.error(e?.message || 'The email could not be sent')
    } finally {
      setBusyId(null)
    }
  }

  const issue = async () => {
    if (!purchaseId || !purchaseType) return
    setIssuing(true)
    try {
      const res = await deliveryNotesService.issue(purchaseType, purchaseId)
      if (res.success && res.data) {
        const n = res.data.delivery_note
        toast.success(res.data.created ? `${n.note_number} issued and ${n.status === 'sent' ? 'emailed' : 'saved'}` : `${n.note_number} already existed`)
        setConfirmIssue(false)
        load()
      } else toast.error(res.message || 'Could not issue the delivery note')
    } catch (e: any) {
      toast.error(e?.message || 'Could not issue the delivery note')
    } finally {
      setIssuing(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const forOnePurchase = !!purchaseId && !!purchaseType

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery notes"
        description="Proof that a subscription was delivered: the plan, the access period and the payment, emailed to the student as a PDF when access is activated."
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Commerce' }, { label: 'Delivery notes' }]}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Status" className="flex w-fit flex-wrap gap-1 rounded-lg bg-muted p-1">
          {([[null, 'All'], ['sent', 'Emailed'], ['failed', 'Email failed'], ['generated', 'Not emailed yet']] as const).map(([v, label]) => (
            <button key={label} type="button" role="radio" aria-checked={(status || null) === v} onClick={() => setParam('status', v)}
              className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-[background-color,color] duration-150', (status || null) === v ? 'bg-card text-foreground shadow-card ring-1 ring-border' : 'text-muted-foreground hover:text-foreground')}>
              {label}
            </button>
          ))}
        </div>
        {(purchaseId || userId) && (
          <button type="button" onClick={() => { const next = new URLSearchParams(); if (status) next.set('status', status); setParams(next) }}
            className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/70">
            {purchaseId ? 'One purchase' : 'One student'} <X className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only">Clear filter</span>
          </button>
        )}
      </div>

      {/* One purchase with no note yet: offer to issue it (e.g. an older purchase under dispute) */}
      {forOnePurchase && !loading && !error && notes.length === 0 && (
        <section className="rounded-xl border bg-card p-5 shadow-card">
          <h2 className="text-[15px] font-semibold">No delivery note for this purchase yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Purchases activated before delivery notes existed have none. Issuing one creates the note from the purchase record and <strong className="text-foreground">emails it to the student straight away</strong>.
          </p>
          {canSend ? (
            confirmIssue ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-warning-soft px-4 py-3" role="alert">
                <span className="text-sm text-warning">The student will receive the email now. Continue?</span>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setConfirmIssue(false)} disabled={issuing}>Cancel</Button>
                  <Button size="sm" onClick={issue} disabled={issuing}>
                    {issuing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />Issuing…</> : <><Send className="mr-2 h-4 w-4" aria-hidden="true" />Issue and email</>}
                  </Button>
                </div>
              </div>
            ) : (
              <Button className="mt-4" onClick={() => setConfirmIssue(true)}><FileCheck2 className="mr-2 h-4 w-4" aria-hidden="true" />Issue delivery note</Button>
            )
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">You need the “invoices.update” permission to issue notes.</p>
          )}
        </section>
      )}

      {!(forOnePurchase && !loading && !error && notes.length === 0) && (
      <section className="overflow-hidden rounded-xl border bg-card shadow-card">
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground" aria-live="polite">Loading delivery notes…</p>
        ) : error ? (
          <p className="px-5 py-10 text-center text-sm text-danger">{error}. Refresh the page to try again.</p>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <FileCheck2 className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">No delivery notes {status ? 'with this status' : 'yet'}</p>
            <p className="max-w-md text-sm text-muted-foreground">Notes are issued automatically when a package or e-book is activated (once DELIVERY_NOTES_ENABLED is on). For an older purchase, open it from Commerce → Purchases.</p>
          </div>
        ) : (
          <div className="pg-scroll-x overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-medium">Note</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Student</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Subscription</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Access period</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Paid</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Email</th>
                  <th scope="col" className="px-5 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {notes.map((n) => (
                  <tr key={n._id} className="align-top">
                    <td className="px-5 py-3">
                      <p className="font-mono text-sm font-semibold">{n.note_number}</p>
                      {/* A tester's INR 1 order (27 Nov 2026): the note itself says TEST */}
                      {(n as DeliveryNote & { is_test?: boolean }).is_test && <span className="mt-0.5 inline-flex h-5 items-center rounded-full bg-warning-soft px-2 text-[11px] font-semibold text-warning">Test</span>}
                      <p className="text-xs text-muted-foreground">{istTime(n.issued_at)}</p>
                      {n.trigger === 'admin' && <p className="text-[11px] text-muted-foreground">Issued by an admin</p>}
                    </td>
                    <td className="px-5 py-3">
                      <NoteStudent note={n} />
                    </td>
                    <td className="max-w-[300px] px-5 py-3">
                      <p className="font-medium">{n.purchase_type === 'ebook' ? n.product_name : subscriptionLabel(n.product_name, n)}</p>
                      {n.included_packages.length > 0 && <p className="text-xs text-muted-foreground">Includes {n.included_packages.map((p) => p.name).join(', ')}</p>}
                      {n.is_extension && <p className="text-xs text-muted-foreground">Renewal: extends existing access</p>}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs">
                      <p>{istTime(n.access_start)}</p>
                      <p className="text-muted-foreground">to {n.access_end ? istTime(n.access_end) : 'lifetime access'}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <p className="font-mono" data-numeric>{formatINR(n.amount)}</p>
                      {n.invoice_number && <p className="font-mono text-xs text-muted-foreground">{n.invoice_number}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', STATUS[n.status]?.cls)} title={n.send_error || undefined}>{STATUS[n.status]?.label || n.status}</span>
                      {n.status === 'sent' && n.sent_at && <p className="mt-1 text-xs text-muted-foreground">{istTime(n.sent_at)}</p>}
                      {n.status === 'failed' && n.send_error && <p className="mt-1 max-w-[200px] truncate text-xs text-danger" title={n.send_error}>{n.send_error}</p>}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => download(n)} disabled={busyId === n._id} aria-label={`Download ${n.note_number} as PDF`}>
                          <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />PDF
                        </Button>
                        {canSend && (
                          <Button size="sm" variant="ghost" onClick={() => resend(n)} disabled={busyId === n._id} aria-label={`Email ${n.note_number} to the student again`}>
                            {busyId === n._id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <Mail className="mr-1.5 h-4 w-4" aria-hidden="true" />}
                            {n.status === 'sent' ? 'Resend' : 'Send'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-5 py-3 text-sm">
            <span className="text-muted-foreground">Page {page} of {totalPages} · {total} notes</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>Previous</Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setParam('page', String(page + 1))}>Next</Button>
            </div>
          </div>
        )}
      </section>
      )}
    </div>
  )
}
