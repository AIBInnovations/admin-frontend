import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Package } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FactGrid, apiErrorMessage } from '@/components/common/detail'
import { liveSessionsService, LiveSession } from '@/services/liveSessions.service'
import { packageTypesService } from '@/services/packageTypes.service'
import { Field, Note, UnitInput } from '@/components/forms/editor/fields'
import { RefPicker, useOptions } from '@/components/forms/editor/pickers'

interface Props { open: boolean; onClose: () => void; session: LiveSession; recordingCount: number }

async function loadTypes() {
  const res = await packageTypesService.getAllPublic()
  if (!res.success || !res.data) throw new Error(res.message || 'Package types could not be loaded.')
  return res.data.map((t) => ({ id: t._id, name: t.name }))
}

export function ConvertToPackageDialog({ open, onClose, session, recordingCount }: Props) {
  const navigate = useNavigate()
  const types = useOptions(loadTypes, open)
  const [typeId, setTypeId] = useState('')
  const [price, setPrice] = useState('0')
  const [days, setDays] = useState('365')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTypeId(''); setPrice(String(session.price ?? 0)); setDays('365'); setFailure(null)
  }, [open, session.price])

  const priceError = price.trim() === '' || Number(price) >= 0 ? undefined : 'Price cannot be negative'
  const daysError = days.trim() === '' || (Number.isInteger(Number(days)) && Number(days) >= 1) ? undefined : 'Enter a whole number of days, 1 or more'

  const submit = async () => {
    if (!typeId || busy || priceError || daysError) return
    setBusy(true); setFailure(null)
    try {
      const res = await liveSessionsService.convertToPackage(session._id, {
        package_type_id: typeId,
        price: parseFloat(price) || 0,
        duration_days: parseInt(days, 10) || 365,
      })
      if (!res.success || !res.data) throw new Error(res.message || 'Failed to convert session to package')
      const { video_count: videos, purchases_migrated: moved, package_id: packageId } = res.data
      toast.success(`Package created with ${videos} video${videos === 1 ? '' : 's'}.${moved ? ` ${moved} session buyer${moved === 1 ? '' : 's'} granted package access.` : ''}`)
      onClose()
      navigate(`/content/packages/${packageId}`)
    } catch (e) {
      setFailure(apiErrorMessage(e, 'Failed to convert session to package'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert Session to Package</DialogTitle>
          <DialogDescription>This will create a new package with the session recordings as videos.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-card">
          <FactGrid
            facts={[
              { label: 'Package', value: session.title },
              { label: 'Subject', value: session.subject_id && typeof session.subject_id === 'object' ? session.subject_id.name : 'Deleted subject' },
              { label: 'Will create', value: `1 series, 1 module, ${recordingCount} video${recordingCount === 1 ? '' : 's'}` },
            ]}
          />
          <Field id="convert-type" label="Package Type" required>
            {(c) => <RefPicker control={c} value={typeId} onChange={setTypeId} list={types} placeholder="Select package type" emptyText="No package types found." disabled={busy} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="convert-price" label="Price (INR)" error={priceError}>
              {(c) => <UnitInput {...c} prefix="₹" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} disabled={busy} />}
            </Field>
            <Field id="convert-duration" label="Duration (days)" error={daysError}>
              {(c) => <UnitInput {...c} suffix="days" min={1} step={1} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} disabled={busy} />}
            </Field>
          </div>
          {failure && <Note tone="danger">{failure}</Note>}
        </div>
        <DialogFooter>
          <Button variant="outline" className="bg-card" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !typeId || !!priceError || !!daysError}>
            {busy ? <><Loader2 aria-hidden="true" className="animate-spin" />Converting...</> : <><Package aria-hidden="true" />Create Package</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
