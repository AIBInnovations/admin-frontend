import { useCallback, useEffect, useState } from 'react'
import { Archive, RefreshCw, Video as VideoIcon, Download, Upload } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PanelShell } from './PanelShell'
import { PanelField, PanelSectionTitle, PanelSelect, PanelSwitchRow, PanelText, PanelTextarea } from './fields'
import { EntityHeaderActions } from './EntityHeaderActions'
import { ProcessingBadge, PublishBadge, FreeBadge } from '../ui/StatusBadge'
import { ArchiveWithImpactDialog } from '../dialogs/ArchiveWithImpactDialog'
import { ImageCropField } from '../media/ImageCropField'
import { FileUploadField } from '../media/FileUploadField'
import { usePanelForm } from '../hooks/usePanelForm'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import { useMediaUpload } from '../hooks/useMediaUpload'
import { videosService, type VideoDownloadInfo } from '@/services/videos.service'
import { facultyService, type Faculty } from '@/services/faculty.service'
import type { PackageDetailVideo } from '@/services/packages.service'

interface VideoPanelProps {
  entity: PackageDetailVideo
  onRefresh?: () => void
  onClose?: () => void
}

function isoToLocalInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function localInputToIso(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function VideoPanel({ entity, onRefresh, onClose }: VideoPanelProps) {
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [releaseMode, setReleaseMode] = useState<'immediate' | 'scheduled'>('immediate')
  const media = useMediaUpload()
  const fileUpload = useMediaUpload()
  const replaceUpload = useMediaUpload()
  const isUpcoming = entity.processing_status === 'upcoming'

  const [downloadInfo, setDownloadInfo] = useState<VideoDownloadInfo | null>(null)
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false)
  const [replaceArmed, setReplaceArmed] = useState(false)

  useEffect(() => {
    if (faculty.length > 0) return
    facultyService.getAll({ limit: 200, sort_by: 'name', sort_order: 'asc' }).then((res) => {
      if (res.success && res.data) setFaculty(res.data.entities)
    })
  }, [faculty.length])

  // Download URLs (current + previously replaced files) + replacement status.
  const loadDownloadInfo = useCallback(() => {
    if (entity.processing_status === 'upcoming') return
    videosService
      .getDownloadInfo(entity._id)
      .then((res) => { if (res.success && res.data) setDownloadInfo(res.data) })
      .catch(() => {})
  }, [entity._id, entity.processing_status])

  useEffect(() => { loadDownloadInfo() }, [loadDownloadInfo])

  const form = usePanelForm(
    () => ({
      title: entity.title ?? '',
      description: entity.description ?? '',
      faculty_id: entity.faculty_id?._id ?? '',
      is_free: entity.is_free ?? false,
      display_order: (entity.display_order ?? 0).toString(),
      subtitle_url: entity.subtitle_url ?? '',
      transcript_url: entity.transcript_url ?? '',
      scheduled_release_at: isoToLocalInput(entity.scheduled_release_at),
    }),
    entity._id,
  )
  const v = form.values

  const save = useExplorerMutation({
    name: 'Update video',
    fn: () =>
      videosService.update(entity._id, {
        title: v.title.trim(),
        description: v.description.trim(),
        faculty_id: v.faculty_id || undefined,
        is_free: v.is_free,
        display_order: v.display_order ? Number(v.display_order) : 0,
        subtitle_url: v.subtitle_url.trim() || undefined,
        transcript_url: v.transcript_url.trim() || undefined,
        scheduled_release_at: localInputToIso(v.scheduled_release_at),
      }),
    onSuccess: () => { form.commit(v); onRefresh?.() },
    successMessage: `"${v.title}" updated`,
  })

  const archive = useExplorerMutation({
    name: 'Archive video',
    fn: () => videosService.archive(entity._id),
    onSuccess: () => { setArchiveOpen(false); onClose?.(); onRefresh?.() },
    successMessage: `"${entity.title}" archived`,
  })

  const retry = useExplorerMutation({
    name: 'Retry transcoding',
    fn: () => videosService.retryTranscoding(entity._id),
    onSuccess: () => onRefresh?.(),
    successMessage: 'Transcoding restarted',
  })

  const isFailed = entity.processing_status === 'failed'

  return (
    <PanelShell
      icon={<div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center"><VideoIcon className="w-4 h-4 text-rose-500" /></div>}
      title={v.title || 'Video'}
      subtitle={`${formatDuration(entity.duration_seconds)} · ${entity.view_count ?? 0} views`}
      badges={<>
        <ProcessingBadge status={entity.processing_status} />
        {entity.publish_status && <PublishBadge status={entity.publish_status} />}
        {entity.is_free && <FreeBadge />}
      </>}
      headerActions={
        <EntityHeaderActions
          entityType="video"
          entityId={entity._id}
          entityName={entity.title}
          publishStatus={entity.publish_status}
          rawData={entity}
          onRefresh={onRefresh}
          idLabel="Video ID"
          extraItems={<>
            {isFailed && (
              <DropdownMenuItem onClick={retry.execute} disabled={retry.loading}>
                <RefreshCw className="w-3.5 h-3.5 mr-2" /> Retry transcoding
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-amber-600 focus:text-amber-600" onClick={() => setArchiveOpen(true)}>
              <Archive className="w-3.5 h-3.5 mr-2" /> Archive
            </DropdownMenuItem>
          </>}
        />
      }
      onClose={onClose}
      dirty={form.dirty}
      saving={save.loading}
      canSave={v.title.trim().length >= 2}
      saveLabel="Save changes"
      onSave={save.execute}
      onCancel={form.reset}
    >
      {entity.processing_status === 'failed' && entity.processing_error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Processing failed: {entity.processing_error}
        </div>
      )}

      <PanelField label="Title" required htmlFor="vp-title">
        <PanelText id="vp-title" value={v.title} onChange={(x) => form.set('title', x)} />
      </PanelField>

      <PanelField label="Description" htmlFor="vp-desc">
        <PanelTextarea id="vp-desc" rows={4} value={v.description} onChange={(x) => form.set('description', x)} />
      </PanelField>

      <PanelField label="Faculty" htmlFor="vp-faculty">
        <PanelSelect id="vp-faculty" value={v.faculty_id} onChange={(x) => form.set('faculty_id', x)}>
          <option value="">None</option>
          {faculty.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
        </PanelSelect>
      </PanelField>

      <div className="grid grid-cols-2 gap-3 items-start">
        <PanelSwitchRow label="Free" hint="No purchase needed" checked={v.is_free} onChange={(x) => form.set('is_free', x)} />
        <PanelField label="Display order" htmlFor="vp-order">
          <PanelText id="vp-order" type="number" value={v.display_order} onChange={(x) => form.set('display_order', x)} />
        </PanelField>
      </div>

      <PanelField label="Scheduled release" hint="Users see an 'Upcoming' placeholder until this date. Leave empty for immediate." htmlFor="vp-sched">
        <PanelText id="vp-sched" type="datetime-local" value={v.scheduled_release_at} onChange={(x) => form.set('scheduled_release_at', x)} />
      </PanelField>

      {isUpcoming && (
        <div className="space-y-2 pt-1">
          <PanelSectionTitle>Upload video file</PanelSectionTitle>
          <p className="text-[11px] text-slate-400">This is an upcoming placeholder. Upload the file to start processing.</p>
          <div className="flex gap-1">
            {(['immediate', 'scheduled'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setReleaseMode(m)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${releaseMode === m ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'}`}
              >
                {m === 'immediate' ? 'Release when ready' : 'Keep scheduled'}
              </button>
            ))}
          </div>
          <FileUploadField
            label="Video file"
            accept="video/mp4,video/mpeg,video/quicktime,video/x-msvideo,video/webm"
            maxMb={10240}
            buttonLabel="Upload video file"
            hint="MP4/MOV/WebM"
            uploading={fileUpload.uploading}
            uploadProgress={fileUpload.progress}
            onPick={async (file) => {
              await fileUpload.run('Uploading video', (onProgress) =>
                videosService.uploadFileForExisting(entity._id, file, {
                  onProgress,
                  release_mode: releaseMode,
                  scheduled_release_at: releaseMode === 'scheduled' ? localInputToIso(v.scheduled_release_at) : null,
                }),
              )
              onRefresh?.()
            }}
          />
        </div>
      )}

      {!isUpcoming && (
        <div className="space-y-3 pt-1">
          <PanelSectionTitle>Video file</PanelSectionTitle>

          {downloadInfo?.current && (
            <a
              href={downloadInfo.current.download_url}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5" />
              Download current{downloadInfo.current.file_size_mb ? ` (${downloadInfo.current.file_size_mb} MB)` : ''}
            </a>
          )}

          {downloadInfo?.replacement_in_progress ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              A replacement is processing. The current video stays live until the new one is ready.
            </p>
          ) : (
            <>
              {downloadInfo?.last_replace_error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  Last replacement failed: {downloadInfo.last_replace_error}
                </p>
              )}
              {!replaceArmed ? (
                <div>
                  <button
                    onClick={() => setReplaceConfirmOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Upload className="w-3.5 h-3.5" /> Replace video
                  </button>
                </div>
              ) : (
                <FileUploadField
                  label="New video file"
                  accept="video/mp4,video/mpeg,video/quicktime,video/x-msvideo,video/webm"
                  maxMb={10240}
                  buttonLabel="Choose replacement file"
                  hint="Current video keeps playing until the new one finishes processing."
                  uploading={replaceUpload.uploading}
                  uploadProgress={replaceUpload.progress}
                  onPick={async (file) => {
                    await replaceUpload.run('Uploading replacement', (onProgress) =>
                      videosService.replaceFile(entity._id, file, { onProgress }),
                    )
                    setReplaceArmed(false)
                    loadDownloadInfo()
                    onRefresh?.()
                  }}
                />
              )}
            </>
          )}

          {downloadInfo && downloadInfo.previous_versions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-slate-400">Previous (replaced) files</p>
              {downloadInfo.previous_versions.map((pv) => (
                <a
                  key={pv.index}
                  href={pv.download_url}
                  className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  <Download className="w-3 h-3" />
                  Version {pv.index + 1}
                  {pv.replaced_at ? ` · replaced ${new Date(pv.replaced_at).toLocaleDateString()}` : ''}
                  {pv.file_size_mb ? ` · ${pv.file_size_mb} MB` : ''}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3 pt-1">
        <PanelSectionTitle>Resources</PanelSectionTitle>
        <PanelField label="Subtitle URL" htmlFor="vp-sub">
          <PanelText id="vp-sub" type="url" value={v.subtitle_url} onChange={(x) => form.set('subtitle_url', x)} placeholder="https://…" />
        </PanelField>
        <PanelField label="Transcript URL" htmlFor="vp-trans">
          <PanelText id="vp-trans" type="url" value={v.transcript_url} onChange={(x) => form.set('transcript_url', x)} placeholder="https://…" />
        </PanelField>
      </div>

      <div className="space-y-2 pt-1">
        <PanelSectionTitle>Thumbnail</PanelSectionTitle>
        <ImageCropField
          label="Thumbnail"
          aspect={16 / 9}
          hint="16:9 · JPEG/PNG/WebP · max 5MB. Overrides the auto-generated frame."
          value={entity.thumbnail_url}
          uploading={media.uploading}
          uploadProgress={media.progress}
          onUpload={async (file) => {
            await media.run('Uploading thumbnail', async () => { await videosService.uploadThumbnail(entity._id, file) })
            onRefresh?.()
          }}
        />
      </div>

      <AlertDialog open={replaceConfirmOpen} onOpenChange={setReplaceConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace this video?</AlertDialogTitle>
            <AlertDialogDescription>
              The new file will be uploaded and re-transcoded. The current video keeps
              playing until the new one is ready, then it is swapped in automatically.
              Views, reviews and watch progress are preserved, and the replaced file
              stays available to download.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pb-6">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setReplaceConfirmOpen(false); setReplaceArmed(true) }}>
              Yes, choose file
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ArchiveWithImpactDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={archive.execute}
        fetchImpact={() => videosService.getDeleteImpact(entity._id)}
        entityName={entity.title}
        entityType="video"
        loading={archive.loading}
      />
    </PanelShell>
  )
}
