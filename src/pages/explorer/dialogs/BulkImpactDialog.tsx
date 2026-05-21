import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { BulkClassification } from './bulkImpact'

export interface BulkItem {
  id: string
  name: string
}

interface Row extends BulkItem {
  blocked: boolean
  reasons: string[]
}

interface BulkImpactDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  title: string
  actionLabel: string
  destructive?: boolean
  items: BulkItem[]
  /** Per-item impact. Skipped for non-impactful ops (e.g. activate). */
  classify?: (id: string) => Promise<BulkClassification>
  /** Run the action on one item. */
  runOne: (id: string) => Promise<unknown>
}

/**
 * Bulk action with per-item dependency gating: classifies every selected item,
 * lists blockers + warnings, skips blocked items, runs the rest, reports results.
 */
export function BulkImpactDialog({
  open, onClose, onSuccess, title, actionLabel, destructive, items, classify, runOne,
}: BulkImpactDialogProps) {
  const [checking, setChecking] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) { setRows([]); return }
    if (!classify) {
      setRows(items.map((it) => ({ ...it, blocked: false, reasons: [] })))
      return
    }
    let live = true
    setChecking(true)
    Promise.all(
      items.map(async (it) => {
        const c = await classify(it.id).catch(() => ({ blocked: false, reasons: [] as string[] }))
        return { ...it, blocked: c.blocked, reasons: c.reasons }
      }),
    ).then((res) => { if (live) setRows(res) }).finally(() => { if (live) setChecking(false) })
    return () => { live = false }
  }, [open, items, classify])

  const blocked = rows.filter((r) => r.blocked)
  const warned = rows.filter((r) => !r.blocked && r.reasons.length > 0)
  const clean = rows.filter((r) => !r.blocked && r.reasons.length === 0)
  const proceedable = rows.filter((r) => !r.blocked)

  async function proceed() {
    setSubmitting(true)
    const results = await Promise.allSettled(proceedable.map((r) => runOne(r.id)))
    const ok = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.length - ok
    setSubmitting(false)
    if (ok > 0) toast.success(`${actionLabel}: ${ok} done${failed ? `, ${failed} failed` : ''}${blocked.length ? `, ${blocked.length} skipped` : ''}`)
    else if (failed > 0) toast.error(`${actionLabel} failed for all ${failed} items`)
    onClose()
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !submitting && onClose()}>
      <DialogContent className="sm:max-w-120">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{items.length} selected. Review impact before proceeding.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1 max-h-96 overflow-y-auto">
          {checking ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking dependencies…
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                {clean.length > 0 && <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />{clean.length} ready</span>}
                {warned.length > 0 && <span className="inline-flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" />{warned.length} with warnings</span>}
                {blocked.length > 0 && <span className="inline-flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 text-destructive" />{blocked.length} blocked (skipped)</span>}
              </div>

              {blocked.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1.5">
                  <p className="text-sm font-medium text-destructive">Blocked — will be skipped</p>
                  {blocked.map((r) => (
                    <div key={r.id} className="text-xs text-slate-600">
                      <span className="font-medium text-slate-800">{r.name}</span>: {r.reasons.join('; ')}
                    </div>
                  ))}
                </div>
              )}

              {warned.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1.5">
                  <p className="text-sm font-medium text-amber-800">Will proceed with warnings</p>
                  {warned.map((r) => (
                    <div key={r.id} className="text-xs text-amber-800/90">
                      <span className="font-medium">{r.name}</span>: {r.reasons.join('; ')}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            variant={destructive ? 'outline' : 'default'}
            className={destructive ? 'text-amber-700 border-amber-300 hover:bg-amber-50' : ''}
            onClick={proceed}
            disabled={checking || submitting || proceedable.length === 0}
          >
            {submitting
              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Working…</>
              : `${actionLabel} ${proceedable.length} item${proceedable.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
