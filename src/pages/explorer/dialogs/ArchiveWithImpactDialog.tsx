import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertCircle, Archive, Info, Loader2 } from 'lucide-react'
import type { ApiResponse } from '@/services/api.service'
import type { DeleteImpactResponse } from '@/types/api.types'

interface ArchiveWithImpactDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<unknown> | void
  /** Fetches the impact / blocking dependencies for this entity. */
  fetchImpact: () => Promise<ApiResponse<DeleteImpactResponse>>
  /** User-facing entity name for copy. */
  entityName: string
  /** Entity label for the title ("video", "document"). */
  entityType: 'video' | 'document'
  loading?: boolean
}

/**
 * Pre-archive confirmation for Videos and Documents. Before allowing archive,
 * fetches `/:id/delete-impact` and shows blocking deps (e.g. active purchases)
 * that prevent archive; or non-blocking warnings (e.g. enrolled users) that
 * proceed with confirmation. Matches legacy VideosPage / DocumentsPage
 * archive behaviour.
 */
export function ArchiveWithImpactDialog({
  open,
  onClose,
  onConfirm,
  fetchImpact,
  entityName,
  entityType,
  loading,
}: ArchiveWithImpactDialogProps) {
  const [impact, setImpact] = useState<DeleteImpactResponse | null>(null)
  const [loadingImpact, setLoadingImpact] = useState(false)

  useEffect(() => {
    if (!open) { setImpact(null); return }
    setLoadingImpact(true)
    fetchImpact()
      .then((res) => { if (res.success && res.data) setImpact(res.data) })
      .finally(() => setLoadingImpact(false))
  }, [open, fetchImpact])

  const isBlocked = impact?.blocked ?? false
  const blockingDeps = impact?.dependencies.filter((d) => d.blocking) ?? []
  const warningDeps = impact?.dependencies.filter((d) => !d.blocking) ?? []

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Archive {entityType}</DialogTitle>
          <DialogDescription>
            <strong>"{entityName}"</strong> will be hidden from students. You can restore it
            from the Archived view within 30 days.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-2">
          {loadingImpact ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking dependencies…
            </div>
          ) : (
            <>
              {isBlocked && blockingDeps.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Cannot archive — dependencies exist
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1 pl-6 list-disc">
                    {blockingDeps.map((d) => (
                      <li key={d.type}>{d.count} {d.label}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    Remove the blockers above before archiving.
                  </p>
                </div>
              )}

              {!isBlocked && warningDeps.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                    <Info className="w-4 h-4 shrink-0" />
                    The following will be affected
                  </div>
                  <ul className="text-sm text-amber-800/80 space-y-1 pl-6 list-disc">
                    {warningDeps.map((d) => (
                      <li key={d.type}>{d.count} {d.label}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!isBlocked && warningDeps.length === 0 && impact && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  No dependencies found. Safe to archive.
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="outline"
            className="text-amber-700 border-amber-300 hover:bg-amber-50"
            onClick={() => void onConfirm()}
            disabled={isBlocked || loadingImpact || !impact || loading}
          >
            {loading
              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Archiving…</>
              : <><Archive className="w-3.5 h-3.5 mr-1.5" /> Archive</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
