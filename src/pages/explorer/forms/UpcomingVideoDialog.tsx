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
import { videosService } from '@/services/videos.service'
import { facultyService } from '@/services/faculty.service'
import type { Faculty } from '@/services/faculty.service'

interface UpcomingVideoDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  moduleId: string
}

export function UpcomingVideoDialog({ open, onClose, onSuccess, moduleId }: UpcomingVideoDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [facultyId, setFacultyId] = useState('')
  const [isFree, setIsFree] = useState(false)
  const [displayOrder, setDisplayOrder] = useState(1)
  const [scheduledAt, setScheduledAt] = useState('')
  const [facultyList, setFacultyList] = useState<Faculty[]>([])

  useEffect(() => {
    if (!open) {
      setTitle('')
      setDescription('')
      setFacultyId('')
      setIsFree(false)
      setDisplayOrder(1)
      setScheduledAt('')
      return
    }
    if (facultyList.length > 0) return
    facultyService
      .getAll({ limit: 200 })
      .then((res) => { if (res.success && res.data) setFacultyList(res.data.entities) })
      .catch(() => {})
  }, [open])

  const createMutation = useExplorerMutation({
    name: 'Create upcoming video',
    fn: () =>
      videosService.createUpcoming({
        title: title.trim(),
        description: description.trim(),
        module_id: moduleId,
        faculty_id: facultyId || undefined,
        is_free: isFree,
        display_order: displayOrder,
        scheduled_release_at: new Date(scheduledAt).toISOString(),
      }),
    onSuccess: () => { onClose(); onSuccess() },
    successMessage: `"${title}" upcoming video created`,
  })

  const canCreate = title.trim().length > 0 && scheduledAt.length > 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Upcoming Video</DialogTitle>
          <DialogDescription>
            Create a placeholder for a video not yet uploaded. Students see the scheduled release date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="uv-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="uv-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Lecture title…"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="uv-desc">Description</Label>
            <Textarea
              id="uv-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief description…"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="uv-schedule">
              Release date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="uv-schedule"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="uv-faculty">Faculty</Label>
            <select
              id="uv-faculty"
              value={facultyId}
              onChange={(e) => setFacultyId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— None —</option>
              {facultyList.map((f) => (
                <option key={f._id} value={f._id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div className="flex items-center justify-between border rounded-md px-3 py-2">
              <Label htmlFor="uv-free" className="cursor-pointer">Free access</Label>
              <Switch id="uv-free" checked={isFree} onCheckedChange={setIsFree} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uv-order">Display order</Label>
              <Input
                id="uv-order"
                type="number"
                min={1}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createMutation.loading}>
            Cancel
          </Button>
          <Button
            onClick={createMutation.execute}
            disabled={!canCreate || createMutation.loading}
          >
            {createMutation.loading ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Creating…</>
            ) : (
              'Create upcoming video'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
