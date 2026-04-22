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
import { AlertCircle, Loader2, Trash2 } from 'lucide-react'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import { modulesService } from '@/services/modules.service'
import type { DeleteImpactResponse } from '@/types/api.types'

interface DeleteModuleDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  moduleId: string
  moduleName: string
}

export function DeleteModuleDialog({
  open,
  onClose,
  onSuccess,
  moduleId,
  moduleName,
}: DeleteModuleDialogProps) {
  const [impact, setImpact] = useState<DeleteImpactResponse | null>(null)
  const [loadingImpact, setLoadingImpact] = useState(false)

  useEffect(() => {
    if (!open) { setImpact(null); return }
    setLoadingImpact(true)
    modulesService
      .getDeleteImpact(moduleId)
      .then((res) => { if (res.success && res.data) setImpact(res.data) })
      .finally(() => setLoadingImpact(false))
  }, [open, moduleId])

  const mutation = useExplorerMutation({
    name: 'Delete module',
    fn: () => modulesService.delete(moduleId),
    onSuccess: () => { onClose(); onSuccess() },
    successMessage: `"${moduleName}" deleted`,
  })

  const isBlocked = impact?.blocked ?? false
  const blockingDeps = impact?.dependencies.filter((d) => d.blocking) ?? []

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Delete module</DialogTitle>
          <DialogDescription>
            Permanently delete <strong>"{moduleName}"</strong>. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {loadingImpact ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking dependencies…
            </div>
          ) : isBlocked && blockingDeps.length > 0 ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Cannot delete — dependencies exist
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 pl-6 list-disc">
                {blockingDeps.map((d) => (
                  <li key={d.type}>{d.count} {d.label}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Archive all videos in this module before deleting it.
              </p>
            </div>
          ) : impact ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              No dependencies found. Module can be safely deleted.
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={mutation.execute}
            disabled={isBlocked || loadingImpact || !impact || mutation.loading}
          >
            {mutation.loading ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Deleting…</>
            ) : (
              <><Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete module</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
