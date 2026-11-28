import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { videosService } from '@/services/videos.service'
import { useUnsavedChanges } from '@/components/layouts/workspaceStore'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import { FileUploadField } from '../media/FileUploadField'
import { PanelField, PanelSelect, PanelSwitchRow, PanelText, PanelTextarea } from '../panel/fields'
import { useFaculty } from '../panel/useFaculty'
import { fileSize } from '../ui/text'

interface Props { moduleId: string; onClose: () => void; onSuccess: () => Promise<void> | void }

type Phase = 'idle' | 'uploading' | 'completing' | 'confirming'

/** Upload a video: a full page, because an upload takes a while and needs room. */
export function CreateVideoDialog({ moduleId, onClose, onSuccess }: Props) {
  const faculty = useFaculty()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [facultyId, setFacultyId] = useState('')
  const [isFree, setIsFree] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [tried, setTried] = useState(false)

  const upload = useExplorerMutation({
    name: 'Upload video',
    what: 'uploading videos',
    fn: () => videosService.upload(
      { title: title.trim(), description: description.trim(), module_id: moduleId, faculty_id: facultyId || undefined, is_free: isFree },
      file as File,
      setProgress,
      setPhase,
    ),
    onSuccess: () => { setPhase('idle'); return onSuccess() },
    onError: () => setPhase('idle'),
    successMessage: 'Video uploaded. Processing has started.',
  })
  // Leaving the page mid-upload would lose it
  useUnsavedChanges(upload.loading)

  const errors = {
    title: title.trim().length < 5 ? 'Use at least 5 characters.' : title.trim().length > 200 ? 'Use at most 200 characters.' : '',
    description: description.trim().length < 10 ? 'Use at least 10 characters.' : description.length > 2000 ? 'Use at most 2,000 characters.' : '',
    file: file ? '' : 'Choose a video file.',
  }
  const submit = () => {
    setTried(true)
    const first = errors.title ? 'cv-title' : errors.description ? 'cv-desc' : null
    if (first) { document.getElementById(first)?.focus(); return }
    if (errors.file) return
    void upload.execute()
  }
  const phaseLabel = phase === 'uploading' ? `Uploading ${progress}%` : phase === 'completing' ? 'Putting the parts together…' : phase === 'confirming' ? 'Finishing…' : 'Starting…'

  return (
    <Dialog open onOpenChange={(v) => { if (!v && !upload.loading) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload video</DialogTitle>
          <DialogDescription>It is added to this module and processed before students can watch it.</DialogDescription>
        </DialogHeader>
        <fieldset disabled={upload.loading} className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-card">
          <PanelField label="Title" required htmlFor="cv-title" error={tried ? errors.title : ''}>
            <PanelText id="cv-title" value={title} onChange={setTitle} placeholder="Lecture title" autoFocus invalid={tried && !!errors.title} required describedBy={tried && errors.title ? 'cv-title-error' : undefined} />
          </PanelField>
          <PanelField label="Description" required hint="At least 10 characters." htmlFor="cv-desc" error={tried ? errors.description : ''}>
            <PanelTextarea id="cv-desc" value={description} onChange={setDescription} rows={4} invalid={tried && !!errors.description} required describedBy={tried && errors.description ? 'cv-desc-error' : 'cv-desc-hint'} />
          </PanelField>
          <div className="grid gap-5 sm:grid-cols-2 sm:items-end">
            <PanelField label="Faculty" htmlFor="cv-fac">
              <PanelSelect id="cv-fac" value={facultyId} onChange={setFacultyId}>
                <option value="">None</option>
                {faculty.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
              </PanelSelect>
            </PanelField>
            <PanelSwitchRow id="cv-free" label="Free preview" hint="No purchase needed" checked={isFree} onChange={setIsFree} />
          </div>
          <FileUploadField
            label="Video file"
            accept="video/mp4,video/mpeg,video/quicktime,video/x-msvideo,video/webm"
            maxMb={10_240}
            buttonLabel={file ? file.name : 'Choose video file'}
            hint={file ? `${fileSize(file.size / 1024 / 1024)} selected. Choose again to change it.` : 'MP4, MOV or WebM, up to 10 GB. Large files upload in parts.'}
            error={tried ? errors.file : ''}
            onPick={setFile}
          />
        </fieldset>
        {upload.loading && (
          <div role="status" className="space-y-1.5">
            <Progress value={phase === 'uploading' ? progress : 100} aria-label="Upload progress" className="h-2" />
            <p className="text-[13px] text-muted-foreground">{phaseLabel} Keep this tab open.</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={upload.loading}>Cancel</Button>
          <Button onClick={submit} disabled={upload.loading}>
            {upload.loading ? <><Loader2 className="h-4 w-4 animate-spin" /> {phaseLabel}</> : 'Upload video'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
