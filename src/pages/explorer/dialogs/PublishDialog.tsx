import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import { publishService } from '@/services/publish.service'
import type { EntityType, PublishInfo, PublishOptions } from '@/services/publish.service'

interface PublishDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  entityType: EntityType
  entityId: string
  entityName: string
  currentStatus: 'draft' | 'published'
}

export function PublishDialog({
  open,
  onClose,
  onSuccess,
  entityType,
  entityId,
  entityName,
  currentStatus,
}: PublishDialogProps) {
  const isPublishing = currentStatus === 'draft'
  const [info, setInfo] = useState<PublishInfo | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(false)

  // Defaults differ by direction:
  //   publish   -> cascade ON (safe: only touches draft children)
  //   unpublish -> cascade OFF (destructive: would hide children silently)
  const [cascade, setCascade] = useState(isPublishing)
  const [activateAll, setActivateAll] = useState(false)
  const [publishAncestors, setPublishAncestors] = useState(true)

  useEffect(() => {
    if (!open) { setInfo(null); return }
    // Reset choices every time the dialog opens so a previous toggle
    // doesn't silently carry over to a different entity.
    setCascade(isPublishing)
    setActivateAll(false)
    setPublishAncestors(true)
    // Fetch impact for BOTH directions — unpublish must warn about active
    // purchases/enrollments + published children, like the legacy modal.
    setLoadingInfo(true)
    publishService
      .getPublishInfo(entityType, entityId)
      .then((data) => { if (data) setInfo(data as PublishInfo) })
      .catch(() => {})
      .finally(() => setLoadingInfo(false))
  }, [open, entityType, entityId, isPublishing])

  const hasFailed = (info?.failed_videos ?? 0) > 0
  const hasProcessing = (info?.processing_videos ?? 0) > 0
  const unpublishedAncestors = info?.unpublished_ancestors ?? []
  const cs = info?.children_summary

  const publishedChildren =
    (cs?.published_series ?? 0) +
    (cs?.published_modules ?? 0) +
    (cs?.published_videos ?? 0) +
    (cs?.published_documents ?? 0)
  const activePurchases = info?.active_purchases ?? 0
  const activeEnrollments = info?.active_enrollments ?? 0

  const draftChildren =
    (cs?.draft_series ?? 0) +
    (cs?.draft_modules ?? 0) +
    (cs?.draft_videos ?? 0) +
    (cs?.draft_documents ?? 0)

  const publishMutation = useExplorerMutation({
    name: isPublishing ? `Publish ${entityType}` : `Unpublish ${entityType}`,
    fn: () => {
      if (isPublishing) {
        const opts: PublishOptions = {}
        if (cascade) opts.cascade = true
        if (activateAll) opts.activate_all = true
        if (publishAncestors && unpublishedAncestors.length > 0) opts.publish_ancestors = true
        return publishService.publish(entityType, entityId, opts)
      }
      return publishService.unpublish(entityType, entityId, cascade ? { cascade: true } : {})
    },
    onSuccess: () => { onClose(); onSuccess() },
    successMessage: isPublishing ? `"${entityName}" published` : `"${entityName}" unpublished`,
  })

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPublishing
              ? <><Eye className="w-4 h-4 text-primary" /> Publish {entityType}</>
              : <><EyeOff className="w-4 h-4 text-amber-500" /> Unpublish {entityType}</>}
          </DialogTitle>
          <DialogDescription>
            <strong>"{entityName}"</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {loadingInfo && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {isPublishing ? 'Checking publish readiness…' : 'Checking impact…'}
            </div>
          )}

          {/* Hard block: failed videos */}
          {isPublishing && hasFailed && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">Cannot publish</p>
                <p className="text-muted-foreground mt-0.5">
                  {info?.failed_videos} video{info!.failed_videos > 1 ? 's have' : ' has'} failed processing.
                  Fix or remove them before publishing.
                </p>
              </div>
            </div>
          )}

          {/* Processing warning */}
          {isPublishing && hasProcessing && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                {info?.processing_videos} video{info!.processing_videos > 1 ? 's are' : ' is'} still processing.
                The content will be available once processing completes.
              </p>
            </div>
          )}

          {/* Unpublished ancestors */}
          {isPublishing && unpublishedAncestors.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <p className="text-sm font-medium">Unpublished parent items</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 pl-4 list-disc">
                {unpublishedAncestors.map((a) => (
                  <li key={a.id}>{a.type}: {a.name}</li>
                ))}
              </ul>
              <div className="flex items-center justify-between pt-1">
                <Label htmlFor="pd-ancestors" className="text-sm">
                  Publish parent items too
                </Label>
                <Switch
                  id="pd-ancestors"
                  checked={publishAncestors}
                  onCheckedChange={setPublishAncestors}
                />
              </div>
            </div>
          )}

          {/* Draft children */}
          {isPublishing && draftChildren > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <p className="text-sm font-medium">{draftChildren} draft item{draftChildren > 1 ? 's' : ''} inside</p>
              <p className="text-xs text-muted-foreground">
                These remain hidden from students unless you cascade.
              </p>
              <div className="flex items-center justify-between pt-1">
                <Label htmlFor="pd-cascade" className="text-sm">
                  Publish all draft children
                </Label>
                <Switch
                  id="pd-cascade"
                  checked={cascade}
                  onCheckedChange={setCascade}
                />
              </div>
              {cascade && (cs?.inactive_items ?? 0) > 0 && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="pd-activate" className="text-sm">
                    Activate inactive items too
                  </Label>
                  <Switch
                    id="pd-activate"
                    checked={activateAll}
                    onCheckedChange={setActivateAll}
                  />
                </div>
              )}
            </div>
          )}

          {/* All clear */}
          {isPublishing && !loadingInfo && info && !hasFailed && draftChildren === 0 && unpublishedAncestors.length === 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-sm text-green-800">Ready to publish. No blockers found.</p>
            </div>
          )}

          {/* Unpublish: impact + cascade option */}
          {!isPublishing && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This will hide the content from students immediately.
              </p>

              {/* Active purchases — revokes access */}
              {activePurchases > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">
                    {activePurchases} active purchase{activePurchases > 1 ? 's' : ''} — unpublishing revokes their access.
                  </p>
                </div>
              )}

              {/* Active enrollments */}
              {activeEnrollments > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">
                    {activeEnrollments} active enrollment{activeEnrollments > 1 ? 's' : ''} will be affected.
                  </p>
                </div>
              )}

              {/* Published children */}
              {publishedChildren > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <p className="text-sm text-amber-800">
                    {publishedChildren} published child item{publishedChildren > 1 ? 's' : ''} inside — these may become inaccessible.
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <Label htmlFor="pd-un-cascade" className="text-sm">Unpublish all children too</Label>
                    <Switch id="pd-un-cascade" checked={cascade} onCheckedChange={setCascade} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={publishMutation.loading}>
            Cancel
          </Button>
          <Button
            variant={isPublishing ? 'default' : 'outline'}
            onClick={publishMutation.execute}
            disabled={
              (isPublishing && (loadingInfo || hasFailed)) ||
              publishMutation.loading
            }
            className={!isPublishing ? 'text-amber-600 border-amber-300 hover:bg-amber-50' : ''}
          >
            {publishMutation.loading ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Working…</>
            ) : isPublishing ? (
              <><Eye className="w-3.5 h-3.5 mr-1.5" /> Publish</>
            ) : (
              <><EyeOff className="w-3.5 h-3.5 mr-1.5" /> Unpublish</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
