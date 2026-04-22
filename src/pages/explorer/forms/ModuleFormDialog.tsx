import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import { modulesService } from '@/services/modules.service'
import type { PackageDetailModule } from '@/services/packages.service'

interface ModuleFormDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  seriesId: string
  module?: PackageDetailModule
}

export function ModuleFormDialog({
  open,
  onClose,
  onSuccess,
  seriesId,
  module,
}: ModuleFormDialogProps) {
  const isEdit = !!module

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [displayOrder, setDisplayOrder] = useState('')

  useEffect(() => {
    if (!open) return
    setName(module?.name ?? '')
    setDescription(module?.description ?? '')
    setDurationMinutes(
      module?.estimated_duration_minutes && module.estimated_duration_minutes > 0
        ? module.estimated_duration_minutes.toString()
        : '',
    )
    setIsActive(module?.is_active ?? true)
    setDisplayOrder(module?.display_order?.toString() ?? '')
  }, [open, module])

  const mutation = useExplorerMutation({
    name: isEdit ? 'Update module' : 'Create module',
    fn: () => {
      const data = {
        series_id: seriesId,
        name: name.trim(),
        description: description.trim(),
        estimated_duration_minutes: durationMinutes ? Number(durationMinutes) : 0,
        is_active: isActive,
        display_order: displayOrder ? Number(displayOrder) : undefined,
      }
      return isEdit
        ? modulesService.update(module!._id, data)
        : modulesService.create(data)
    },
    onSuccess: () => { onClose(); onSuccess() },
    successMessage: isEdit ? 'Module updated' : 'Module created',
  })

  const valid = name.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Module' : 'New Module'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="m-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="m-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Module 1: Introduction"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-desc">Description</Label>
            <Textarea
              id="m-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this module covers…"
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-dur">Estimated Duration (minutes)</Label>
            <Input
              id="m-dur"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="e.g. 45"
              type="number"
              min={0}
              className="w-40"
            />
            <p className="text-xs text-muted-foreground">
              This is overwritten by Recalculate Stats once videos are added.
            </p>
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <Label htmlFor="m-active" className="text-sm font-medium">Active</Label>
              <p className="text-xs text-muted-foreground">Visible to enrolled students</p>
            </div>
            <Switch id="m-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-order">Display Order</Label>
            <Input
              id="m-order"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              placeholder="e.g. 1"
              type="number"
              min={0}
              className="w-32"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.loading}>
            Cancel
          </Button>
          <Button onClick={mutation.execute} disabled={!valid || mutation.loading}>
            {mutation.loading ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving…</>
            ) : isEdit ? 'Save changes' : 'Create module'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
