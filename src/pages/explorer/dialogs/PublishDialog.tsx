import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { publishService, type EntityType, type PublishInfo, type PublishOptions } from '@/services/publish.service'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import type { PanelEntityKind } from '../panel/panelTypes'
import { plural } from '../ui/text'
import { Checking, ImpactBox } from './Impact'
import { useImpact } from './useImpact'

interface Props {
  entityType: EntityType
  kind: PanelEntityKind
  id: string
  name: string
  status: 'draft' | 'published'
  onClose: () => void
  onSuccess: () => Promise<void> | void
}

function Choice({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 pt-1">
      <Label htmlFor={id} className="text-sm font-normal">{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

export function PublishDialog({ entityType, kind, id, name, status, onClose, onSuccess }: Props) {
  const publishing = status === 'draft'
  // Publishing includes drafts inside by default; unpublishing leaves children alone by default.
  const [cascade, setCascade] = useState(publishing)
  const [activateAll, setActivateAll] = useState(false)
  const [parentsToo, setParentsToo] = useState(true)
  const { impact: info, loading, error, retry } = useImpact(async () => (await publishService.getPublishInfo(entityType, id)) as PublishInfo | null, `publishing ${kind}s`)

  const cs = info?.children_summary
  const drafts = (cs?.draft_series ?? 0) + (cs?.draft_modules ?? 0) + (cs?.draft_videos ?? 0) + (cs?.draft_documents ?? 0)
  const published = (cs?.published_series ?? 0) + (cs?.published_modules ?? 0) + (cs?.published_videos ?? 0) + (cs?.published_documents ?? 0)
  const failed = info?.failed_videos ?? 0
  const processing = info?.processing_videos ?? 0
  const parents = info?.unpublished_ancestors ?? []
  const purchases = info?.active_purchases ?? 0
  const enrolments = info?.active_enrollments ?? 0

  const run = useExplorerMutation({
    name: publishing ? `Publish ${kind}` : `Unpublish ${kind}`,
    what: `publishing ${kind}s`,
    fn: () => {
      if (!publishing) return publishService.unpublish(entityType, id, cascade && published > 0 ? { cascade: true } : {})
      const opts: PublishOptions = {}
      if (cascade) opts.cascade = true
      if (cascade && activateAll) opts.activate_all = true
      if (parentsToo && parents.length > 0) opts.publish_ancestors = true
      return publishService.publish(entityType, id, opts)
    },
    onSuccess: () => onSuccess(),
    successMessage: publishing ? `"${name}" published` : `"${name}" unpublished`,
  })

  return (
    <Dialog variant="dock" open onOpenChange={(v) => { if (!v && !run.loading) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{publishing ? `Publish this ${kind}?` : `Unpublish this ${kind}?`}</DialogTitle>
          <DialogDescription>
            <strong className="break-words font-medium text-foreground">{name}</strong>{publishing ? ' will be visible to students who have access.' : ' will be hidden from students at once.'}
          </DialogDescription>
        </DialogHeader>
        <div aria-live="polite" className="space-y-3">
          {loading && <Checking>{publishing ? 'Checking that it is ready' : 'Checking what this affects'}</Checking>}
          {error && <ImpactBox tone="danger" title="The check did not work">{error} <button type="button" onClick={retry} className="font-medium text-primary underline-offset-2 hover:underline">Try again</button></ImpactBox>}
          {publishing && info && (
            <>
              {failed > 0 && <ImpactBox tone="danger" title="It cannot be published yet">{plural(failed, 'video')} failed processing. Fix or archive {failed === 1 ? 'it' : 'them'} first.</ImpactBox>}
              {processing > 0 && <ImpactBox tone="warning">{plural(processing, 'video')} still processing. {processing === 1 ? 'It' : 'They'} will play once ready.</ImpactBox>}
              {parents.length > 0 && (
                <ImpactBox tone="warning" title="What it belongs to is not published">
                  <ul className="list-disc pl-4">{parents.map((a) => <li key={a.id}>{a.name} ({a.type})</li>)}</ul>
                  <Choice id="pd-parents" label="Publish these too" checked={parentsToo} onChange={setParentsToo} />
                </ImpactBox>
              )}
              {drafts > 0 && (
                <ImpactBox tone="warning" title={`${plural(drafts, 'draft item')} inside`}>
                  <Choice id="pd-drafts" label="Publish everything inside" checked={cascade} onChange={setCascade} />
                  {cascade && (cs?.inactive_items ?? 0) > 0 && <Choice id="pd-activate" label={`Activate ${plural(cs?.inactive_items ?? 0, 'inactive item')} too`} checked={activateAll} onChange={setActivateAll} />}
                </ImpactBox>
              )}
              {failed === 0 && processing === 0 && drafts === 0 && parents.length === 0 && <ImpactBox tone="success" title="Ready to publish." />}
            </>
          )}
          {!publishing && info && (
            <>
              {purchases > 0 && <ImpactBox tone="danger" title={`${plural(purchases, 'active purchase')}`}>These students lose access until it is published again.</ImpactBox>}
              {enrolments > 0 && <ImpactBox tone="danger" title={`${plural(enrolments, 'active enrolment')} affected`} />}
              {published > 0 && (
                <ImpactBox tone="warning" title={`${plural(published, 'published item')} inside`}>
                  <Choice id="pd-children" label="Unpublish everything inside too" checked={cascade} onChange={setCascade} />
                </ImpactBox>
              )}
              {purchases === 0 && enrolments === 0 && published === 0 && <ImpactBox tone="success" title="No purchases or published items depend on it." />}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={run.loading}>Cancel</Button>
          <Button variant={publishing ? 'default' : 'destructive'} onClick={() => void run.execute()} disabled={!info || (publishing && failed > 0) || run.loading}>
            {run.loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Working…</> : publishing ? <><Eye className="h-4 w-4" /> Publish {kind}</> : <><EyeOff className="h-4 w-4" /> Unpublish {kind}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
