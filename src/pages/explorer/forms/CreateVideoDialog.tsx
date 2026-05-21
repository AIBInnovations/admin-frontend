import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Loader2 } from 'lucide-react'
import { PanelField, PanelSelect, PanelSwitchRow, PanelText, PanelTextarea } from '../panel/fields'
import { FileUploadField } from '../media/FileUploadField'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import { videosService } from '@/services/videos.service'
import { facultyService, type Faculty } from '@/services/faculty.service'

interface CreateVideoDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  moduleId: string
}

type Phase = 'idle' | 'uploading' | 'completing' | 'confirming'

export function CreateVideoDialog({ open, onClose, onSuccess, moduleId }: CreateVideoDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [facultyId, setFacultyId] = useState('')
  const [isFree, setIsFree] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [faculty, setFaculty] = useState<Faculty[]>([])

  useEffect(() => {
    if (!open) return
    setTitle(''); setDescription(''); setFacultyId(''); setIsFree(false); setFile(null); setProgress(0); setPhase('idle')
    facultyService.getAll({ limit: 200, sort_by: 'name', sort_order: 'asc' }).then((res) => {
      if (res.success && res.data) setFaculty(res.data.entities)
    })
  }, [open])

  const upload = useExplorerMutation({
    name: 'Upload video',
    fn: () =>
      videosService.upload(
        { title: title.trim(), description: description.trim(), module_id: moduleId, faculty_id: facultyId || undefined, is_free: isFree },
        file as File,
        (p) => setProgress(p),
        (ph) => setPhase(ph),
      ),
    onSuccess: () => { setPhase('idle'); onClose(); onSuccess() },
    onError: () => setPhase('idle'),
    successMessage: 'Video uploaded — processing started',
  })

  const canUpload = title.trim().length >= 2 && description.trim().length >= 10 && !!file
  const phaseLabel = phase === 'uploading' ? `Uploading ${progress}%` : phase === 'completing' ? 'Assembling…' : phase === 'confirming' ? 'Finalising…' : ''

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !upload.loading && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Upload video</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <PanelField label="Title" required htmlFor="cv-title">
            <PanelText id="cv-title" value={title} onChange={setTitle} placeholder="Lecture title" autoFocus />
          </PanelField>
          <PanelField label="Description" required hint="Min 10 characters" htmlFor="cv-desc">
            <PanelTextarea id="cv-desc" value={description} onChange={setDescription} rows={3} />
          </PanelField>
          <PanelField label="Faculty" htmlFor="cv-fac">
            <PanelSelect id="cv-fac" value={facultyId} onChange={setFacultyId}>
              <option value="">None</option>
              {faculty.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
            </PanelSelect>
          </PanelField>
          <FileUploadField
            label="Video file"
            accept="video/mp4,video/mpeg,video/quicktime,video/x-msvideo,video/webm"
            maxMb={10240}
            buttonLabel={file ? `Selected: ${file.name}` : 'Choose video file'}
            hint="MP4/MOV/WebM · large files upload in parallel chunks"
            onPick={(f) => setFile(f)}
          />
          <PanelSwitchRow label="Free preview" hint="No purchase needed" checked={isFree} onChange={setIsFree} />

          {upload.loading && (
            <div className="space-y-1">
              <Progress value={phase === 'uploading' ? progress : 100} className="h-1.5" />
              <p className="text-[11px] text-slate-400">{phaseLabel}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={upload.loading}>Cancel</Button>
          <Button onClick={upload.execute} disabled={!canUpload || upload.loading}>
            {upload.loading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> {phaseLabel || 'Working…'}</> : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
