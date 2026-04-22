import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import { documentsService } from '@/services/documents.service'
import type { DocRowData } from '../components/rows/DocumentRow'

interface DocumentFormDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  document: DocRowData
}

export function DocumentFormDialog({ open, onClose, onSuccess, document: doc }: DocumentFormDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isFree, setIsFree] = useState(false)
  const [displayOrder, setDisplayOrder] = useState(1)

  useEffect(() => {
    if (!open) return
    setTitle(doc.title)
    setDescription(doc.description ?? '')
    setIsFree(doc.is_free)
    setDisplayOrder(doc.display_order)
  }, [open, doc])

  const saveMutation = useExplorerMutation({
    name: 'Update document',
    fn: () =>
      documentsService.update(doc._id, {
        title: title.trim(),
        description: description.trim(),
        is_free: isFree,
        display_order: displayOrder,
      }),
    onSuccess: () => { onClose(); onSuccess() },
    successMessage: `"${title}" updated`,
  })

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-120">
        <DialogHeader>
          <DialogTitle>Edit Document</DialogTitle>
          <DialogDescription>
            <strong>"{doc.title}"</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="df-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="df-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="df-desc">Description</Label>
            <Textarea
              id="df-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div className="flex items-center justify-between border rounded-md px-3 py-2">
              <Label htmlFor="df-free" className="cursor-pointer">Free access</Label>
              <Switch id="df-free" checked={isFree} onCheckedChange={setIsFree} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="df-order">Display order</Label>
              <Input
                id="df-order"
                type="number"
                min={1}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saveMutation.loading}>
            Cancel
          </Button>
          <Button
            onClick={saveMutation.execute}
            disabled={!title.trim() || saveMutation.loading}
          >
            {saveMutation.loading ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving…</>
            ) : (
              'Save changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
