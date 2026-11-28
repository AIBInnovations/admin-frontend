import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { DeleteImpactResponse } from '@/types/api.types'
import { Note } from './fields'

interface ConfirmDockProps {
  open: boolean
  onClose: () => void
  title: string
  children?: ReactNode
  confirmLabel: string
  busyLabel: string
  /** The button that closes without doing anything. */
  dismissLabel?: string
  tone?: 'default' | 'danger'
  /** Throw to keep the dock open; the message is shown in it. */
  onConfirm: (reason: string) => Promise<void>
  /** Asks the server what depends on the record before letting the admin go on. */
  loadImpact?: () => Promise<DeleteImpactResponse | null>
  blockedText?: string
  /** Optional reason box. */
  reason?: { label: string; placeholder?: string; maxLength?: number }
  /** The admin has to type this to confirm. */
  typeToConfirm?: string
}

/** A question docked at the bottom of the screen, with what it will affect. */
export function ConfirmDock({ open, onClose, title, children, confirmLabel, busyLabel, dismissLabel = 'Cancel', tone = 'default', onConfirm, loadImpact, blockedText, reason, typeToConfirm }: ConfirmDockProps) {
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [why, setWhy] = useState('')
  const [typed, setTyped] = useState('')
  const [impact, setImpact] = useState<DeleteImpactResponse | null>(null)
  const [checking, setChecking] = useState(false)
  const [impactError, setImpactError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const loadRef = useRef(loadImpact)
  loadRef.current = loadImpact
  const hasImpact = !!loadImpact

  useEffect(() => {
    if (!open) return
    setBusy(false); setFailure(null); setWhy(''); setTyped('')
  }, [open])

  useEffect(() => {
    if (!open || !hasImpact) return
    let alive = true
    setImpact(null); setImpactError(null); setChecking(true)
    loadRef.current?.()
      .then((r) => { if (alive) setImpact(r) })
      .catch((e: Error) => { if (alive) setImpactError(e.message || 'What this affects could not be checked.') })
      .finally(() => { if (alive) setChecking(false) })
    return () => { alive = false }
  }, [open, hasImpact, tick])

  const blocked = !!impact?.blocked
  const ready = !busy && !checking && !blocked && !impactError && (!typeToConfirm || typed.trim() === typeToConfirm.trim())

  const confirm = async () => {
    if (!ready) return
    setBusy(true); setFailure(null)
    try {
      await onConfirm(why.trim())
      onClose()
    } catch (e) {
      setFailure((e as Error)?.message || 'That did not work. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const deps = impact?.dependencies ?? []
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o && !busy) onClose() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              {!blocked && children}
              {checking && <p role="status" className="flex items-center gap-2"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Checking what this affects</p>}
              {impactError && (
                <Note tone="danger">
                  {impactError}{' '}
                  <button type="button" className="font-medium underline underline-offset-2" onClick={() => setTick((t) => t + 1)}>Try again</button>
                </Note>
              )}
              {deps.length > 0 && (
                <div className={blocked ? 'rounded-md bg-danger-soft px-3.5 py-3 text-danger' : 'rounded-md bg-warning-soft px-3.5 py-3 text-warning'}>
                  <p className="font-medium">{blocked ? blockedText || 'Remove these first:' : 'This also affects:'}</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {deps.filter((d) => !blocked || d.blocking).map((d, i) => (
                      <li key={i}>{d.count != null ? `${d.count} ${d.label}` : d.label}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {!blocked && reason && (
          <div className="space-y-1.5">
            <Label htmlFor="confirm-reason" className="text-[13px]">{reason.label} <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea id="confirm-reason" rows={2} value={why} onChange={(e) => setWhy(e.target.value)} placeholder={reason.placeholder} maxLength={reason.maxLength ?? 500} disabled={busy} className="bg-card" />
          </div>
        )}
        {!blocked && typeToConfirm && (
          <div className="space-y-1.5">
            <Label htmlFor="confirm-type" className="text-[13px]">Type <span className="font-semibold">{typeToConfirm}</span> to confirm</Label>
            <Input id="confirm-type" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={busy} className="bg-card" />
          </div>
        )}
        {failure && <Note tone="danger">{failure}</Note>}
        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>{blocked ? 'Close' : dismissLabel}</Button>
          {!blocked && (
            <Button variant={tone === 'danger' ? 'destructive' : 'default'} onClick={confirm} disabled={!ready}>
              {busy ? <><Loader2 aria-hidden="true" className="animate-spin" />{busyLabel}</> : confirmLabel}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Unwraps a delete-impact answer for ConfirmDock. */
export async function impactOf(call: Promise<{ success: boolean; message?: string; data?: DeleteImpactResponse }>): Promise<DeleteImpactResponse | null> {
  const res = await call
  if (!res.success) throw new Error(res.message || 'What this affects could not be checked.')
  return res.data ?? null
}

/** Throws when an API answer says it failed, so the dock stays open and says why. */
export function must<T extends { success: boolean; message?: string }>(res: T, fallback: string): T {
  if (!res.success) throw new Error(res.message || fallback)
  return res
}
