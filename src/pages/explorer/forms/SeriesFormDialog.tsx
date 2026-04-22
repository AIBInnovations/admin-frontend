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
import { seriesService } from '@/services/series.service'
import type { PackageDetailSeries } from '@/services/packages.service'

interface SeriesFormDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  packageId: string
  series?: PackageDetailSeries
}

export function SeriesFormDialog({
  open,
  onClose,
  onSuccess,
  packageId,
  series,
}: SeriesFormDialogProps) {
  const isEdit = !!series

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [displayOrder, setDisplayOrder] = useState('')

  useEffect(() => {
    if (!open) return
    setName(series?.name ?? '')
    setDescription(series?.description ?? '')
    setIsActive(series?.is_active ?? true)
    setDisplayOrder(series?.display_order?.toString() ?? '')
  }, [open, series])

  const mutation = useExplorerMutation({
    name: isEdit ? 'Update series' : 'Create series',
    fn: () => {
      const data = {
        package_id: packageId,
        name: name.trim(),
        description: description.trim(),
        is_active: isActive,
        display_order: displayOrder ? Number(displayOrder) : undefined,
      }
      return isEdit
        ? seriesService.update(series!._id, data)
        : seriesService.create(data)
    },
    onSuccess: () => { onClose(); onSuccess() },
    successMessage: isEdit ? 'Series updated' : 'Series created',
  })

  const valid = name.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Series' : 'New Series'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="sr-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sr-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Unit 1: Basics"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sr-desc">Description</Label>
            <Textarea
              id="sr-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this series cover…"
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <Label htmlFor="sr-active" className="text-sm font-medium">Active</Label>
              <p className="text-xs text-muted-foreground">Visible to enrolled students</p>
            </div>
            <Switch id="sr-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sr-order">Display Order</Label>
            <Input
              id="sr-order"
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
            ) : isEdit ? 'Save changes' : 'Create series'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
