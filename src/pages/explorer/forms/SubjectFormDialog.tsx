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
import { subjectsService } from '@/services/subjects.service'
import type { Subject, SubjectDetail } from '@/services/subjects.service'

interface SubjectFormDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  subject?: Subject | SubjectDetail
}

export function SubjectFormDialog({ open, onClose, onSuccess, subject }: SubjectFormDialogProps) {
  const isEdit = !!subject

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [whatsappLink, setWhatsappLink] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [displayOrder, setDisplayOrder] = useState('')

  useEffect(() => {
    if (!open) return
    setName(subject?.name ?? '')
    setDescription(subject?.description ?? '')
    setWhatsappLink(subject?.whatsapp_community_link ?? '')
    setIsActive(subject?.is_active ?? true)
    setDisplayOrder(subject?.display_order?.toString() ?? '')
  }, [open, subject])

  const mutation = useExplorerMutation({
    name: isEdit ? 'Update subject' : 'Create subject',
    fn: () => {
      const data = {
        name: name.trim(),
        description: description.trim() || undefined,
        whatsapp_community_link: whatsappLink.trim() || undefined,
        is_active: isActive,
        display_order: displayOrder ? Number(displayOrder) : undefined,
      }
      return isEdit
        ? subjectsService.updateSubject(subject!._id, data)
        : subjectsService.createSubject(data)
    },
    onSuccess: () => { onClose(); onSuccess() },
    successMessage: isEdit ? 'Subject updated' : 'Subject created',
  })

  const valid = name.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Subject' : 'New Subject'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="s-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="s-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cardiology"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s-desc">Description</Label>
            <Textarea
              id="s-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this subject…"
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s-whatsapp">WhatsApp Community Link</Label>
            <Input
              id="s-whatsapp"
              value={whatsappLink}
              onChange={(e) => setWhatsappLink(e.target.value)}
              placeholder="https://chat.whatsapp.com/…"
              type="url"
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <Label htmlFor="s-active" className="text-sm font-medium">Active</Label>
              <p className="text-xs text-muted-foreground">Visible to students</p>
            </div>
            <Switch id="s-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s-order">Display Order</Label>
            <Input
              id="s-order"
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
            ) : isEdit ? 'Save changes' : 'Create subject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
