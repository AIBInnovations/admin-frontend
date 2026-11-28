import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { BulkItem, BulkRequest } from '../actions/ActionsContext'
import { explain } from '../access'
import { plural } from '../ui/text'
import { Checking, ImpactBox } from './Impact'

interface Row extends BulkItem { blocked: boolean; reasons: string[] }

const AT_ONCE = 5

/** Run `work` on every item, a few at a time, so 200 items do not mean 200 requests at once. */
async function inBatches<A, B>(items: A[], work: (item: A, index: number) => Promise<B>): Promise<PromiseSettledResult<B>[]> {
  const out: PromiseSettledResult<B>[] = []
  for (let i = 0; i < items.length; i += AT_ONCE) {
    out.push(...await Promise.allSettled(items.slice(i, i + AT_ONCE).map((item, j) => work(item, i + j))))
  }
  return out
}

function ItemList({ rows }: { rows: { id: string; name: string; text: string }[] }) {
  return (
    <ul className="max-h-40 space-y-1 overflow-y-auto">
      {rows.map((r) => <li key={r.id} className="break-words"><span className="font-medium text-foreground">{r.name}</span>: {r.text}</li>)}
    </ul>
  )
}

interface Props { request: BulkRequest; onClose: () => void; onFinished: () => Promise<void> | void }

/** One action on many items: check each, leave blocked ones out, run the rest, report what failed. */
export function BulkImpactDialog({ request, onClose, onFinished }: Props) {
  const { title, actionLabel, doneLabel, destructive, items, classify, runOne, onDone } = request
  const [rows, setRows] = useState<Row[] | null>(classify ? null : items.map((it) => ({ ...it, blocked: false, reasons: [] })))
  const [progress, setProgress] = useState<number | null>(null)
  const [failures, setFailures] = useState<{ id: string; name: string; text: string }[] | null>(null)
  const working = progress !== null

  useEffect(() => {
    if (!classify) return
    let live = true
    void inBatches(items, (it) => classify(it.id)).then((results) => {
      if (!live) return
      setRows(items.map((it, i) => {
        const r = results[i]
        return r.status === 'fulfilled' ? { ...it, ...r.value } : { ...it, blocked: false, reasons: ['The check did not work'] }
      }))
    })
    return () => { live = false }
  }, [items, classify])

  const blocked = rows?.filter((r) => r.blocked) ?? []
  const warned = rows?.filter((r) => !r.blocked && r.reasons.length > 0) ?? []
  const ready = rows?.filter((r) => !r.blocked) ?? []
  const asText = (list: Row[]) => list.map((r) => ({ id: r.id, name: r.name, text: r.reasons.join('; ') }))

  async function proceed() {
    if (working) return
    setProgress(0)
    let finished = 0
    const results = await inBatches(ready, async (r) => {
      try { return await runOne(r.id) } finally { finished += 1; setProgress(finished) }
    })
    const failed = ready.flatMap((r, i) => {
      const res = results[i]
      return res.status === 'rejected' ? [{ id: r.id, name: r.name, text: explain(res.reason, 'this action') }] : []
    })
    const ok = ready.length - failed.length
    if (ok > 0) toast.success(`${plural(ok, 'item')} ${doneLabel}${blocked.length ? `, ${blocked.length} left out` : ''}`)
    onDone([...failed.map((f) => f.id), ...blocked.map((b) => b.id)])
    await onFinished()
    setProgress(null)
    if (failed.length === 0) onClose()
    else setFailures(failed)
  }

  return (
    <Dialog variant="dock" open onOpenChange={(v) => { if (!v && !working) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{failures ? `${plural(failures.length, 'item')} did not work and stayed selected.` : `${plural(items.length, 'item')} selected. Check what this affects first.`}</DialogDescription>
        </DialogHeader>
        <div aria-live="polite" className="space-y-3">
          {failures ? <ImpactBox tone="danger" title="Did not work"><ItemList rows={failures} /></ImpactBox> : (
            <>
              {!rows && <Checking>Checking {plural(items.length, 'item')}</Checking>}
              {blocked.length > 0 && <ImpactBox tone="danger" title={`${plural(blocked.length, 'item')} will be left out`}><ItemList rows={asText(blocked)} /></ImpactBox>}
              {warned.length > 0 && <ImpactBox tone="warning" title={`${plural(warned.length, 'item')} to look at`}><ItemList rows={asText(warned)} /></ImpactBox>}
              {rows && blocked.length === 0 && warned.length === 0 && <ImpactBox tone="success" title="Nothing stands in the way." />}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={working}>{failures ? 'Close' : 'Cancel'}</Button>
          {!failures && (
            <Button variant={destructive ? 'destructive' : 'default'} onClick={() => void proceed()} disabled={!rows || working || ready.length === 0}>
              {working ? <><Loader2 className="h-4 w-4 animate-spin" /> {progress} of {ready.length}</> : `${actionLabel} ${plural(ready.length, 'item')}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
