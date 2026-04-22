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
import type { PackageDetailVideo } from '@/services/packages.service'

interface VideoFormDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  video: PackageDetailVideo
}

export function VideoFormDialog({ open, onClose, onSuccess, video }: VideoFormDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [facultyId, setFacultyId] = useState('')
  const [subtitleUrl, setSubtitleUrl] = useState('')
  const [transcriptUrl, setTranscriptUrl] = useState('')
  const [isFree, setIsFree] = useState(false)
  const [displayOrder, setDisplayOrder] = useState(1)
  const [scheduledAt, setScheduledAt] = useState('')
  const [facultyList, setFacultyList] = useState<Faculty[]>([])

  const isUpcoming = video.processing_status === 'upcoming'

  useEffect(() => {
    if (!open) return
    setTitle(video.title)
    setDescription(video.description ?? '')
    setFacultyId(video.faculty_id?._id ?? '')
    setSubtitleUrl(video.subtitle_url ?? '')
    setTranscriptUrl(video.transcript_url ?? '')
    setIsFree(video.is_free)
    setDisplayOrder(video.display_order)
    setScheduledAt(
      video.scheduled_release_at
        ? video.scheduled_release_at.slice(0, 16)
        : '',
    )
  }, [open, video])

  useEffect(() => {
    if (!open || facultyList.length > 0) return
    facultyService
      .getAll({ limit: 200 })
      .then((res) => { if (res.success && res.data) setFacultyList(res.data.entities) })
      .catch(() => {})
  }, [open])

  const saveMutation = useExplorerMutation({
    name: 'Update video',
    fn: () =>
      videosService.update(video._id, {
        title: title.trim(),
        description: description.trim(),
        faculty_id: facultyId || undefined,
        subtitle_url: subtitleUrl.trim() || undefined,
        transcript_url: transcriptUrl.trim() || undefined,
        is_free: isFree,
        display_order: displayOrder,
        ...(isUpcoming && scheduledAt
          ? { scheduled_release_at: new Date(scheduledAt).toISOString() }
          : {}),
      }),
    onSuccess: () => { onClose(); onSuccess() },
    successMessage: `"${title}" updated`,
  })

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Edit Video</DialogTitle>
          <DialogDescription>
            <strong>"{video.title}"</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="vf-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="vf-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vf-desc">Description</Label>
            <Textarea
              id="vf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vf-faculty">Faculty</Label>
            <select
              id="vf-faculty"
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="vf-subtitle">Subtitle URL</Label>
              <Input
                id="vf-subtitle"
                value={subtitleUrl}
                onChange={(e) => setSubtitleUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vf-transcript">Transcript URL</Label>
              <Input
                id="vf-transcript"
                value={transcriptUrl}
                onChange={(e) => setTranscriptUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>

          {isUpcoming && (
            <div className="space-y-1.5">
              <Label htmlFor="vf-schedule">Scheduled release</Label>
              <Input
                id="vf-schedule"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 items-end">
            <div className="flex items-center justify-between border rounded-md px-3 py-2">
              <Label htmlFor="vf-free" className="cursor-pointer">Free access</Label>
              <Switch id="vf-free" checked={isFree} onCheckedChange={setIsFree} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vf-order">Display order</Label>
              <Input
                id="vf-order"
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
