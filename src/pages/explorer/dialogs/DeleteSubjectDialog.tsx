import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { subjectsService } from '@/services/subjects.service'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import { Checking, ImpactBox } from './Impact'
import { useImpact } from './useImpact'

interface Props { subjectId: string; subjectName: string; onClose: () => void; onSuccess: () => Promise<void> | void }

export function DeleteSubjectDialog({ subjectId, subjectName, onClose, onSuccess }: Props) {
  const { impact, loading, error, retry } = useImpact(async () => (await subjectsService.getDeleteImpact(subjectId)).data, 'deleting subjects')
  const remove = useExplorerMutation({
    name: 'Delete subject',
    what: 'deleting subjects',
    fn: () => subjectsService.deleteSubject(subjectId),
    onSuccess: () => onSuccess(),
    successMessage: `"${subjectName}" deleted: it is inactive now`,
  })
  const blocking = impact?.dependencies.filter((d) => d.blocking) ?? []
  const affected = impact?.dependencies.filter((d) => !d.blocking) ?? []
  const blocked = impact?.blocked ?? false

  return (
    <Dialog variant="dock" open onOpenChange={(v) => { if (!v && !remove.loading) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this subject?</DialogTitle>
          <DialogDescription><strong className="break-words font-medium text-foreground">{subjectName}</strong> will be hidden from students and marked inactive. Its record is kept, so you can make it active again.</DialogDescription>
        </DialogHeader>
        <div aria-live="polite" className="space-y-2">
          {loading && <Checking>Checking what depends on it</Checking>}
          {error && <ImpactBox tone="danger" title="The check did not work">{error} <button type="button" onClick={retry} className="font-medium text-primary underline-offset-2 hover:underline">Try again</button></ImpactBox>}
          {blocked && (
            <ImpactBox tone="danger" title="It cannot be deleted yet">
              <ul className="list-disc pl-4">{blocking.map((d) => <li key={d.type}>{d.count} {d.label}</li>)}</ul>
              <p className="mt-1">Move or remove these first.</p>
            </ImpactBox>
          )}
          {!blocked && affected.length > 0 && (
            <ImpactBox tone="warning" title="This also affects"><ul className="list-disc pl-4">{affected.map((d) => <li key={d.type}>{d.count} {d.label}</li>)}</ul></ImpactBox>
          )}
          {impact && !blocked && affected.length === 0 && <ImpactBox tone="success" title="Nothing else uses it." />}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={remove.loading}>Keep subject</Button>
          <Button variant="destructive" onClick={() => void remove.execute()} disabled={blocked || !impact || remove.loading}>
            {remove.loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</> : <><Trash2 className="h-4 w-4" /> Delete subject</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
