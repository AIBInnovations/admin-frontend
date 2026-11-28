import { Archive, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { documentsService } from '@/services/documents.service'
import { videosService } from '@/services/videos.service'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import { Checking, ImpactBox } from './Impact'
import { useImpact } from './useImpact'

interface Props {
  kind: 'video' | 'document'
  id: string
  name: string
  onClose: () => void
  onSuccess: () => Promise<void> | void
}

/** Archive one video or document, after showing what depends on it. */
export function ArchiveWithImpactDialog({ kind, id, name, onClose, onSuccess }: Props) {
  const service = kind === 'video' ? videosService : documentsService
  const { impact, loading, error, retry } = useImpact(async () => (await service.getDeleteImpact(id)).data, `archiving ${kind}s`)
  const archive = useExplorerMutation({
    name: `Archive ${kind}`,
    what: `archiving ${kind}s`,
    fn: () => service.archive(id),
    onSuccess: () => onSuccess(),
    successMessage: `"${name}" archived`,
  })
  const blocking = impact?.dependencies.filter((d) => d.blocking) ?? []
  const affected = impact?.dependencies.filter((d) => !d.blocking) ?? []
  const blocked = impact?.blocked ?? false

  return (
    <Dialog variant="dock" open onOpenChange={(v) => { if (!v && !archive.loading) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive this {kind}?</DialogTitle>
          <DialogDescription>
            <strong className="break-words font-medium text-foreground">{name}</strong> will be hidden from students. It can be restored from Archives for 30 days.
          </DialogDescription>
        </DialogHeader>
        <div aria-live="polite" className="space-y-2">
          {loading && <Checking>Checking what depends on it</Checking>}
          {error && <ImpactBox tone="danger" title="The check did not work">{error} <button type="button" onClick={retry} className="font-medium text-primary underline-offset-2 hover:underline">Try again</button></ImpactBox>}
          {blocked && (
            <ImpactBox tone="danger" title="It cannot be archived yet">
              <ul className="list-disc pl-4">{blocking.map((d) => <li key={d.type}>{d.count} {d.label}</li>)}</ul>
              <p className="mt-1">Remove these first.</p>
            </ImpactBox>
          )}
          {!blocked && affected.length > 0 && (
            <ImpactBox tone="warning" title="This also affects">
              <ul className="list-disc pl-4">{affected.map((d) => <li key={d.type}>{d.count} {d.label}</li>)}</ul>
            </ImpactBox>
          )}
          {impact && !blocked && affected.length === 0 && <ImpactBox tone="success" title="Nothing else uses it." />}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={archive.loading}>Keep {kind}</Button>
          <Button variant="destructive" onClick={() => void archive.execute()} disabled={blocked || !impact || archive.loading}>
            {archive.loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Archiving…</> : <><Archive className="h-4 w-4" /> Archive {kind}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
