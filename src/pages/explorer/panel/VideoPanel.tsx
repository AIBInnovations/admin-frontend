import { useCallback, useEffect, useState } from 'react'
import { Archive, CopyPlus, Download, FolderInput, RefreshCw, Upload, Video as VideoIcon } from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { formatDay } from '@/lib/format'
import { videosService, type VideoDownloadInfo, type VideoFormData } from '@/services/videos.service'
import type { PackageDetailVideo } from '@/services/packages.service'
import { VideoLocationCard } from '@/components/videos/VideoLocationCard'
import { useActions } from '../actions/ActionsContext'
import { useUnsavedChanges } from '@/components/layouts/workspaceStore'
import { useExplorerAccess } from '../access'
import { useEntityForm } from '../hooks/useEntityForm'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import { useMediaUpload } from '../hooks/useMediaUpload'
import { FileUploadField } from '../media/FileUploadField'
import { ImageCropField } from '../media/ImageCropField'
import { FreeBadge, ProcessingBadge, PublishBadge } from '../ui/StatusBadge'
import { Thumb } from '../ui/Thumb'
import { clock, plural } from '../ui/text'
import { EntityHeaderActions } from './EntityHeaderActions'
import { PanelShell } from './PanelShell'
import { AreaField, PanelSectionTitle, SelectField, SwitchField, TextField } from './fields'
import { isUrl, isWhole, ORDER_ERROR, payload } from './helpers'
import { isoToLocalInput, localInputToIso } from './localTime'
import { useFaculty } from './useFaculty'

const ACCEPT = 'video/mp4,video/mpeg,video/quicktime,video/x-msvideo,video/webm'
const MAX_MB = 10_240

interface Props { entity: PackageDetailVideo; onRefresh: () => Promise<void> }

export function VideoPanel({ entity, onRefresh }: Props) {
  const { can } = useExplorerAccess()
  const { open } = useActions()
  const faculty = useFaculty()
  const canEdit = can('video', 'update')
  const [releaseMode, setReleaseMode] = useState<'immediate' | 'scheduled'>('immediate')
  const [downloads, setDownloads] = useState<VideoDownloadInfo | null>(null)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [replaceArmed, setReplaceArmed] = useState(false)
  const media = useMediaUpload()
  const fileUpload = useMediaUpload()
  const replaceUpload = useMediaUpload()
  const isUpcoming = entity.processing_status === 'upcoming'
  const isFailed = entity.processing_status === 'failed'

  // Links to the current file and the ones it replaced
  const loadDownloads = useCallback(() => {
    if (isUpcoming) return
    let live = true
    videosService.getDownloadInfo(entity._id).then((res) => { if (live && res.data) setDownloads(res.data) }).catch(() => {})
    return () => { live = false }
  }, [entity._id, isUpcoming])
  useEffect(() => loadDownloads(), [loadDownloads])

  // The upload goes on when another row is opened; closing the tab would stop it.
  useUnsavedChanges(fileUpload.uploading || replaceUpload.uploading)

  const form = useEntityForm({
    id: 'video',
    what: 'video',
    label: (v) => v.title || 'Video',
    readOnly: !canEdit,
    initial: () => ({
      title: entity.title ?? '',
      description: entity.description ?? '',
      faculty_id: entity.faculty_id?._id ?? '',
      is_free: entity.is_free ?? false,
      display_order: (entity.display_order ?? 0).toString(),
      subtitle_url: entity.subtitle_url ?? '',
      transcript_url: entity.transcript_url ?? '',
      scheduled_release_at: isoToLocalInput(entity.scheduled_release_at),
    }),
    validate: (v) => ({
      ...(v.title.trim() !== entity.title && v.title.trim().length < 5 ? { title: 'Use at least 5 characters.' } : v.title.trim().length > 200 ? { title: 'Use at most 200 characters.' } : {}),
      ...(v.description.length > 2000 ? { description: 'Use at most 2,000 characters.' } : {}),
      ...(!isWhole(v.display_order) ? { display_order: ORDER_ERROR } : {}),
      ...(v.subtitle_url.trim() && !isUrl(v.subtitle_url.trim()) ? { subtitle_url: 'Use a full link starting with https://' } : {}),
      ...(v.transcript_url.trim() && !isUrl(v.transcript_url.trim()) ? { transcript_url: 'Use a full link starting with https://' } : {}),
    }),
    submit: (v, changed) => {
      const data = payload<typeof v>(changed, {
        title: (x) => x.trim(),
        description: (x) => x.trim(),
        faculty_id: (x) => x || undefined,
        display_order: (x) => Number(x) || 0,
        subtitle_url: (x) => x.trim(),
        transcript_url: (x) => x.trim(),
        scheduled_release_at: localInputToIso,
      })
      return videosService.update(entity._id, data as Partial<VideoFormData>)
    },
    onSaved: () => onRefresh(),
    savedMessage: (v) => `"${v.title}" saved`,
  })
  const v = form.values

  const retry = useExplorerMutation({
    name: 'Retry transcoding',
    what: 'processing videos',
    fn: () => videosService.retryTranscoding(entity._id),
    onSuccess: () => onRefresh(),
    successMessage: 'Transcoding restarted',
  })
  const pick = (kind: 'video-move' | 'video-copy') => open({ type: 'moveContent', kind, items: [{ id: entity._id, name: entity.title, parentId: entity.module_id }] })

  return (
    <PanelShell
      icon={<Thumb src={entity.thumbnail_url} fallback={<VideoIcon className="h-4 w-4" />} className="h-9 w-14" />}
      title={v.title || 'Video'}
      subtitle={`${entity.duration_seconds > 0 ? `${clock(entity.duration_seconds)} · ` : ''}${plural(entity.view_count ?? 0, 'view')}`}
      badges={(
        <>
          <ProcessingBadge status={entity.processing_status} />
          {entity.publish_status && <PublishBadge status={entity.publish_status} />}
          {entity.is_free && <FreeBadge />}
        </>
      )}
      headerActions={(
        <EntityHeaderActions
          kind="video"
          entityType="video"
          id={entity._id}
          name={entity.title}
          publishStatus={entity.publish_status}
          data={entity}
          idLabel="Video ID"
          extra={canEdit || can('video', 'delete') ? (
            <>
              {canEdit && <DropdownMenuItem onSelect={() => pick('video-move')}><FolderInput className="mr-2 h-3.5 w-3.5" /> Move to…</DropdownMenuItem>}
              {canEdit && <DropdownMenuItem onSelect={() => pick('video-copy')}><CopyPlus className="mr-2 h-3.5 w-3.5" /> Copy to…</DropdownMenuItem>}
              {isFailed && canEdit && <DropdownMenuItem onSelect={() => void retry.execute()} disabled={retry.loading}><RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry transcoding</DropdownMenuItem>}
              {can('video', 'delete') && <DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => open({ type: 'archive', kind: 'video', id: entity._id, name: entity.title })}><Archive className="mr-2 h-3.5 w-3.5" /> Archive</DropdownMenuItem>}
            </>
          ) : undefined}
        />
      )}
      form={form}
    >
      <VideoLocationCard key={`${entity._id}:${entity.module_id}`} videoId={entity._id} onMove={canEdit ? () => pick('video-move') : undefined} />

      {isFailed && (
        <div role="alert" className="space-y-2 rounded-lg bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
          <p className="break-words">Processing failed{entity.processing_error ? `: ${entity.processing_error}` : '.'}</p>
          {canEdit && <Button type="button" size="sm" variant="outline" className="bg-card text-foreground" onClick={() => void retry.execute()} disabled={retry.loading}><RefreshCw className={retry.loading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} /> {retry.loading ? 'Restarting…' : 'Retry transcoding'}</Button>}
        </div>
      )}

      <TextField form={form} name="title" label="Title" required />
      <AreaField form={form} name="description" label="Description" rows={4} />
      <SelectField form={form} name="faculty_id" label="Faculty">
        <option value="">None</option>
        {faculty.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
        {v.faculty_id && !faculty.some((f) => f._id === v.faculty_id) && <option value={v.faculty_id}>{entity.faculty_id?.name ?? 'Deleted faculty'}</option>}
      </SelectField>
      <TextField form={form} name="display_order" label="Display order" type="number" min={0} className="w-32" />
      <SwitchField form={form} name="is_free" label="Free" hint="No purchase needed" />
      <TextField form={form} name="scheduled_release_at" label="Scheduled release (IST)" type="datetime-local" hint="Students see an Upcoming placeholder until then. Leave empty to release it now." />

      {isUpcoming && canEdit && (
        <>
          <PanelSectionTitle>Upload video file</PanelSectionTitle>
          <p className="text-[13px] text-muted-foreground">This is an upcoming placeholder. Upload the file to start processing.</p>
          <div role="radiogroup" aria-label="When to release" className="flex flex-wrap gap-2">
            {(['immediate', 'scheduled'] as const).map((m) => (
              <Button key={m} type="button" size="sm" role="radio" aria-checked={releaseMode === m} variant={releaseMode === m ? 'default' : 'outline'} onClick={() => setReleaseMode(m)}>
                {m === 'immediate' ? 'Release when ready' : 'Keep scheduled'}
              </Button>
            ))}
          </div>
          <FileUploadField
            label="Video file"
            accept={ACCEPT}
            maxMb={MAX_MB}
            buttonLabel="Upload video file"
            hint="MP4, MOV or WebM."
            uploading={fileUpload.uploading}
            uploadProgress={fileUpload.progress}
            onPick={async (file) => {
              await fileUpload.run('Upload video', (onProgress) => videosService.uploadFileForExisting(entity._id, file, {
                onProgress,
                release_mode: releaseMode,
                scheduled_release_at: releaseMode === 'scheduled' ? localInputToIso(v.scheduled_release_at) : null,
              }))
              await onRefresh()
            }}
          />
        </>
      )}

      {!isUpcoming && (
        <>
          <PanelSectionTitle>Video file</PanelSectionTitle>
          {downloads?.current && (
            <Button asChild size="sm" variant="outline">
              <a href={downloads.current.download_url}><Download className="h-3.5 w-3.5" /> Download current{downloads.current.file_size_mb ? ` (${downloads.current.file_size_mb} MB)` : ''}</a>
            </Button>
          )}
          {downloads?.replacement_in_progress && <p className="rounded-lg bg-warning-soft px-3 py-2 text-[13px] text-warning">A replacement is processing. The current video stays live until the new one is ready.</p>}
          {downloads?.last_replace_error && !downloads.replacement_in_progress && <p className="break-words rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger">Last replacement failed: {downloads.last_replace_error}</p>}
          {canEdit && !downloads?.replacement_in_progress && (replaceArmed ? (
            <FileUploadField
              label="New video file"
              accept={ACCEPT}
              maxMb={MAX_MB}
              buttonLabel="Choose replacement file"
              hint="The current video keeps playing until the new one finishes processing."
              uploading={replaceUpload.uploading}
              uploadProgress={replaceUpload.progress}
              onPick={async (file) => {
                await replaceUpload.run('Upload replacement', (onProgress) => videosService.replaceFile(entity._id, file, { onProgress }))
                setReplaceArmed(false)
                loadDownloads()
                await onRefresh()
              }}
            />
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={() => setConfirmReplace(true)}><Upload className="h-3.5 w-3.5" /> Replace video</Button>
          ))}
          {downloads && downloads.previous_versions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[13px] font-medium text-muted-foreground">Previous (replaced) files</p>
              <ul className="space-y-1">
                {downloads.previous_versions.map((pv) => (
                  <li key={pv.index}>
                    <a href={pv.download_url} className="inline-flex items-center gap-1.5 text-[13px] text-primary underline-offset-2 hover:underline">
                      <Download aria-hidden="true" className="h-3.5 w-3.5" />
                      Version {pv.index + 1}{pv.replaced_at ? `, replaced ${formatDay(pv.replaced_at)}` : ''}{pv.file_size_mb ? `, ${pv.file_size_mb} MB` : ''}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <PanelSectionTitle>Resources</PanelSectionTitle>
      <TextField form={form} name="subtitle_url" label="Subtitle URL" type="url" placeholder="https://" />
      <TextField form={form} name="transcript_url" label="Transcript URL" type="url" placeholder="https://" />

      <PanelSectionTitle>Thumbnail</PanelSectionTitle>
      <ImageCropField
        label="Thumbnail"
        aspect={16 / 9}
        hint="16:9. JPEG, PNG or WebP, up to 5 MB. Replaces the automatic frame."
        value={entity.thumbnail_url}
        disabled={!canEdit}
        uploading={media.uploading}
        uploadProgress={media.progress}
        onUpload={async (file) => { await media.run('Upload thumbnail', async () => videosService.uploadThumbnail(entity._id, file)); await onRefresh() }}
      />

      <AlertDialog open={confirmReplace} onOpenChange={setConfirmReplace}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace this video?</AlertDialogTitle>
            <AlertDialogDescription>
              The new file is uploaded and converted. The current video keeps playing until the new one is ready, then it is swapped in.
              Views, reviews and watch progress are kept, and the replaced file stays available to download.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmReplace(false); setReplaceArmed(true) }}>Choose file</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PanelShell>
  )
}
