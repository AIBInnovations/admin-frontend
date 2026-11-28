import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FileVideo, Trash2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { FactGrid, apiErrorMessage } from '@/components/common/detail'
import { useAuth } from '@/contexts/AuthContext'
import { recordingsService, type Recording, type RecordingFormData } from '@/services/recordings.service'
import { DeleteRecordingDock } from '@/components/recordings/DeleteRecordingDock'
import { RecordingStatus } from '@/components/recordings/RecordingStatus'
import { loadLiveSessions, loadWorkshopDays } from '@/components/recordings/sessions'
import {
  EditorPage, EditorSection, EditorSkeleton, RecordError, focusFirstInvalid, useEditorExit, useRecord, useStaleCheck,
} from '@/components/forms/editor/EditorPage'
import { Field, Note, TextInput } from '@/components/forms/editor/fields'
import { RefPicker, useOptions } from '@/components/forms/editor/pickers'
import { fileSize } from '@/components/forms/editor/list'
import { istDateTime } from '@/components/forms/editor/ist'

interface RecordingFormValues { title: string; description: string; session_id: string }
type Phase = 'uploading' | 'completing' | 'confirming'
const PHASE: Record<Phase, string> = { uploading: 'Uploading to cloud...', completing: 'Assembling file on server...', confirming: 'Saving record and starting processing...' }
const MAX_GB = 10

const schema = z.custom<RecordingFormValues>().superRefine((d, ctx) => {
  const fail = (path: keyof RecordingFormValues, message: string) => ctx.addIssue({ code: 'custom', message, path: [path] })
  if (d.title.trim().length < 2) fail('title', 'Title must be at least 2 characters')
  if (d.title.trim().length > 200) fail('title', 'Keep the title under 200 characters')
  if (d.description.trim().length > 1000) fail('description', 'Keep the description under 1000 characters')
})

const toValues = (r: Recording): RecordingFormValues => ({ title: r.title, description: r.description || '', session_id: r.session_id && typeof r.session_id === 'object' ? r.session_id._id : '' })
const fingerprint = (r: Recording) => JSON.stringify(toValues(r))

export function RecordingEditorPage() {
  const { recordingId } = useParams<{ recordingId: string }>()
  const mode = recordingId ? 'edit' : 'create'
  const { record: recording, loading, error, reload, setRecord } = useRecord(recordingId, (id) => recordingsService.getById(id))

  if (mode === 'edit' && loading && !recording) return <EditorSkeleton />
  if (mode === 'edit' && !recording) {
    return <RecordError status={error?.status ?? null} message={error?.message ?? ''} noun="recording" back={{ label: 'Back to recordings', href: '/content/recordings' }} onRetry={reload} />
  }
  return <RecordingForm key={recordingId ?? 'new'} mode={mode} recording={recording} onReplace={setRecord} />
}

function RecordingForm({ mode, recording, onReplace }: { mode: 'create' | 'edit'; recording: Recording | null; onReplace: (r: Recording) => void }) {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const readOnly = !hasPermission(mode === 'create' ? 'live_sessions.create' : 'live_sessions.update')
  const opened = useRef(recording)
  const formRef = useRef<HTMLDivElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [phase, setPhase] = useState<Phase | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [defaults] = useState<RecordingFormValues>(() => (recording ? toValues(recording) : { title: '', description: '', session_id: '' }))

  const { register, handleSubmit, control, watch, reset, formState: { errors, isSubmitting, isDirty } } = useForm<RecordingFormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: defaults,
    shouldFocusError: false,
  })
  const v = watch()
  const busy = isSubmitting
  const dirty = isDirty || !!file
  const leave = useEditorExit(dirty && !readOnly)
  const stale = useStaleCheck<Recording>(fingerprint)
  const [picked, setPicked] = useState(false)
  const live = useOptions(loadLiveSessions)
  const days = useOptions(loadWorkshopDays, picked)
  const sessions = { ...live, options: [...live.options, ...days.options] }
  // The API populates the session's title; ref types elsewhere call it name
  const ownSession = recording?.session_id && typeof recording.session_id === 'object' ? (recording.session_id as unknown as { _id: string; title?: string }) : null

  const takeFile = (f: File | null) => {
    if (f && !f.type.startsWith('video/')) { setFileError('Choose a video file.'); return }
    if (f && f.size > MAX_GB * 1024 ** 3) { setFileError(`This file is ${(f.size / 1024 ** 3).toFixed(1)} GB. The limit is ${MAX_GB} GB.`); return }
    setFileError(null)
    setFile(f)
  }

  const onInvalid = () => {
    setFailure(null)
    if (mode === 'create' && !file) setFileError('Choose a video file')
    focusFirstInvalid(formRef.current)
  }

  const save = async (data: RecordingFormValues) => {
    setFailure(null)
    if (mode === 'create' && !file) { setFileError('Choose a video file'); focusFirstInvalid(formRef.current); return }
    const payload: RecordingFormData = {
      title: data.title.trim(),
      description: data.description.trim(),
      // An empty string takes the recording off its session
      session_id: data.session_id || (mode === 'edit' ? '' : undefined),
    }
    if (mode === 'edit' && recording) {
      const { answer, latest } = await stale.check(opened.current, () => recordingsService.getById(recording._id))
      if (answer === 'keep') return
      if (answer === 'reload' && latest) {
        opened.current = latest
        onReplace(latest)
        reset(toValues(latest))
        return
      }
      try {
        const res = await recordingsService.update(recording._id, payload)
        if (!res.success) throw new Error(res.message || 'Failed to update recording')
        toast.success('Recording updated successfully')
        leave('/content/recordings')
      } catch (err) {
        setFailure(apiErrorMessage(err, 'The recording could not be updated. Please try again.'))
      }
      return
    }
    try {
      setProgress(0)
      const res = await recordingsService.upload(payload, file!, setProgress, setPhase)
      if (!res.success) throw new Error(res.message || 'Failed to upload recording')
      toast.success('Recording uploaded successfully. Processing will begin shortly.')
      leave('/content/recordings')
    } catch (err) {
      setFailure(apiErrorMessage(err, 'Upload failed. Please try again.'))
    } finally {
      setProgress(null)
      setPhase(null)
    }
  }

  return (
    <>
      <EditorPage
        title={mode === 'create' ? 'Upload Recording' : 'Edit Recording'}
        description={mode === 'create' ? 'Upload a new session recording.' : 'Update the recording details below.'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Content' },
          { label: 'Session Recordings', href: '/content/recordings' },
          { label: mode === 'create' ? 'Upload Recording' : recording?.title || 'Edit' },
        ]}
        cancelHref="/content/recordings"
        saveLabel={mode === 'create' ? 'Upload Recording' : 'Update Recording'}
        savingLabel={mode === 'create' ? 'Uploading...' : 'Updating...'}
        saving={busy}
        dirty={dirty}
        problems={Object.keys(errors).length + (fileError ? 1 : 0)}
        failure={failure}
        readOnly={readOnly}
        onSubmit={handleSubmit(save, onInvalid)}
        extra={recording && hasPermission('live_sessions.delete')
          ? <Button type="button" variant="ghost" className="text-danger hover:text-danger" disabled={busy} onClick={() => setDeleting(true)}><Trash2 aria-hidden="true" />Delete</Button>
          : undefined}
      >
        <div ref={formRef} className="space-y-6">
          {recording?.processing_status === 'failed' && <Note tone="danger">Processing failed{recording.processing_error ? `: ${recording.processing_error}` : '.'} Upload the video again to replace it.</Note>}

          {mode === 'create' && (
            <EditorSection id="file" title="Video File">
              <div className="space-y-1.5">
                <Label htmlFor="video-file" className="block text-[13px] font-medium">Video File<span className="text-danger" aria-hidden="true"> *</span></Label>
                {file ? (
                  <div className="flex items-center gap-3 rounded-md border border-border bg-card px-3.5 py-3">
                    <FileVideo aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{fileSize(file.size / 1048576)}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Remove video" onClick={() => takeFile(null)} disabled={busy}><X /></Button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed border-input px-4 py-8 text-center transition-colors hover:border-primary/40 hover:bg-muted/50 has-[:focus-visible]:border-primary">
                    <Upload aria-hidden="true" className="h-7 w-7 text-muted-foreground" />
                    <span className="text-sm font-medium">Click to choose video file</span>
                    <span className="text-xs text-muted-foreground">MP4, MOV, AVI, MKV, WebM (up to 10 GB)</span>
                    <input id="video-file" type="file" accept="video/*" className="sr-only" aria-invalid={fileError ? true : undefined} onChange={(e) => { takeFile(e.target.files?.[0] ?? null); e.target.value = '' }} disabled={busy} />
                  </label>
                )}
                {fileError && <p className="text-[13px] text-danger">{fileError}</p>}
              </div>
              {(progress !== null || phase !== null) && (
                <div className="space-y-1.5" role="status">
                  <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                    <span>{PHASE[phase ?? 'uploading']}</span>
                    {(phase ?? 'uploading') === 'uploading' && <span className="tabular-nums">{progress ?? 0}%</span>}
                  </div>
                  <Progress value={phase === 'completing' || phase === 'confirming' ? 100 : progress ?? 0} className={phase === 'completing' || phase === 'confirming' ? 'h-2 animate-pulse' : 'h-2'} />
                  <p className="text-xs text-muted-foreground">Keep this page open until the upload finishes.</p>
                </div>
              )}
            </EditorSection>
          )}

          <EditorSection id="details" title="Details">
            <Field id="title" label="Title" required error={errors.title?.message} counter={{ value: v.title.length, max: 200 }}>
              {(c) => <TextInput {...c} placeholder="e.g., Surgery Masterclass - Session 1" disabled={busy} {...register('title')} />}
            </Field>
            <Field id="description" label="Description" error={errors.description?.message} counter={{ value: v.description.length, max: 1000 }}>
              {(c) => <Textarea {...c} rows={3} placeholder="Brief description of the recording..." disabled={busy} className="bg-card aria-invalid:border-danger" {...register('description')} />}
            </Field>
            <Field id="session_id" label="Session (Optional)" hint="You can assign this recording to a session now or later">
              {(c) => (
                <Controller name="session_id" control={control} render={({ field }) => (
                  <RefPicker
                    control={c}
                    value={field.value}
                    onChange={field.onChange}
                    list={sessions}
                    noneLabel="No session"
                    emptyText={days.loading ? 'Loading workshop days...' : 'No sessions found.'}
                    onOpen={() => setPicked(true)}
                    missingLabel={ownSession && ownSession._id === field.value ? ownSession.title || 'Deleted session' : 'Deleted session'}
                    disabled={busy}
                  />
                )} />
              )}
            </Field>
          </EditorSection>

          {recording && (
            <EditorSection id="info" title="File">
              <FactGrid
                facts={[
                  recording.duration_seconds > 0 ? { label: 'Duration', value: `${Math.floor(recording.duration_seconds / 60)}m ${Math.round(recording.duration_seconds % 60)}s` } : null,
                  recording.file_size_mb > 0 ? { label: 'Size', value: fileSize(recording.file_size_mb) } : null,
                  { label: 'Status', value: <RecordingStatus status={recording.processing_status} /> },
                  { label: 'Created', value: istDateTime(recording.createdAt) },
                ]}
              />
            </EditorSection>
          )}
        </div>
      </EditorPage>
      {stale.dock}
      <DeleteRecordingDock recording={deleting ? recording : null} onClose={() => setDeleting(false)} onDone={() => { if (dirty) leave('/content/recordings'); else navigate('/content/recordings') }} />
    </>
  )
}
