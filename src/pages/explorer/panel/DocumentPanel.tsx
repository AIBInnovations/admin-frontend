import { useState } from 'react'
import { Archive, FileText, FolderInput } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { PanelShell } from './PanelShell'
import { PanelField, PanelSectionTitle, PanelSwitchRow, PanelText, PanelTextarea } from './fields'
import { EntityHeaderActions } from './EntityHeaderActions'
import { FormatBadge, FreeBadge, LinkedBadge, PublishBadge } from '../ui/StatusBadge'
import { FileUploadField } from '../media/FileUploadField'
import { MoveDocumentDialog } from '../dialogs/MoveDocumentDialog'
import { ArchiveWithImpactDialog } from '../dialogs/ArchiveWithImpactDialog'
import { usePanelForm } from '../hooks/usePanelForm'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import { useMediaUpload } from '../hooks/useMediaUpload'
import { documentsService } from '@/services/documents.service'
import type { PublishStatus } from '@/types/api.types'

/** Structural shape covering Document, PackageDetailDocument and DocRowData. */
export interface DocPanelEntity {
  _id: string
  title: string
  description: string
  file_format: string
  file_size_mb: number
  page_count?: number | null
  is_free: boolean
  display_order: number
  download_count?: number
  publish_status?: PublishStatus
  source_book_id?: unknown
}

interface DocumentPanelProps {
  entity: DocPanelEntity
  onRefresh?: () => void
  onClose?: () => void
}

export function DocumentPanel({ entity, onRefresh, onClose }: DocumentPanelProps) {
  const isLinked = !!entity.source_book_id
  const media = useMediaUpload()
  const [moveOpen, setMoveOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

  const form = usePanelForm(
    () => ({
      title: entity.title ?? '',
      description: entity.description ?? '',
      is_free: entity.is_free ?? false,
      display_order: (entity.display_order ?? 1).toString(),
    }),
    entity._id,
  )
  const v = form.values

  const save = useExplorerMutation({
    name: 'Update document',
    fn: () =>
      documentsService.update(entity._id, {
        // Linked documents mirror title/description from their Book — never send those.
        ...(isLinked ? {} : { title: v.title.trim(), description: v.description.trim() }),
        is_free: v.is_free,
        display_order: Number(v.display_order) || 1,
      }),
    onSuccess: () => { form.commit(v); onRefresh?.() },
    successMessage: `"${v.title}" updated`,
  })

  const archive = useExplorerMutation({
    name: 'Archive document',
    fn: () => documentsService.archive(entity._id),
    onSuccess: () => { setArchiveOpen(false); onClose?.(); onRefresh?.() },
    successMessage: `"${entity.title}" archived`,
  })

  const sizeLabel = entity.file_size_mb < 1
    ? `${Math.round(entity.file_size_mb * 1024)} KB`
    : `${entity.file_size_mb.toFixed(1)} MB`

  return (
    <PanelShell
      icon={<div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center"><FileText className="w-4 h-4 text-orange-500" /></div>}
      title={v.title || 'Document'}
      subtitle={`${sizeLabel}${entity.page_count != null ? ` · ${entity.page_count} pages` : ''}${entity.download_count != null ? ` · ${entity.download_count} downloads` : ''}`}
      badges={<>
        <FormatBadge format={entity.file_format} />
        {entity.is_free && <FreeBadge />}
        {isLinked && <LinkedBadge />}
        {entity.publish_status && <PublishBadge status={entity.publish_status} />}
      </>}
      headerActions={
        <EntityHeaderActions
          entityType="document"
          entityId={entity._id}
          entityName={entity.title}
          publishStatus={entity.publish_status}
          rawData={entity}
          onRefresh={onRefresh}
          idLabel="Document ID"
          extraItems={<>
            <DropdownMenuItem onClick={() => setMoveOpen(true)}>
              <FolderInput className="w-3.5 h-3.5 mr-2" /> Move
            </DropdownMenuItem>
            <DropdownMenuItem className="text-amber-600 focus:text-amber-600" onClick={() => setArchiveOpen(true)}>
              <Archive className="w-3.5 h-3.5 mr-2" /> Archive
            </DropdownMenuItem>
          </>}
        />
      }
      onClose={onClose}
      dirty={form.dirty}
      saving={save.loading}
      canSave={isLinked || v.title.trim().length > 0}
      saveLabel="Save changes"
      onSave={save.execute}
      onCancel={form.reset}
    >
      {isLinked && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
          Linked to a Book's eBook. Title, description and file are managed on the source Book and sync automatically.
        </div>
      )}

      <PanelField label="Title" required={!isLinked} htmlFor="dp-title">
        <PanelText id="dp-title" value={v.title} onChange={(x) => form.set('title', x)} disabled={isLinked} />
      </PanelField>

      <PanelField label="Description" htmlFor="dp-desc">
        <PanelTextarea id="dp-desc" value={v.description} onChange={(x) => form.set('description', x)} disabled={isLinked} />
      </PanelField>

      <div className="grid grid-cols-2 gap-3 items-start">
        <PanelSwitchRow label="Free access" checked={v.is_free} onChange={(x) => form.set('is_free', x)} />
        <PanelField label="Display order" htmlFor="dp-order">
          <PanelText id="dp-order" type="number" value={v.display_order} onChange={(x) => form.set('display_order', x)} />
        </PanelField>
      </div>

      {!isLinked && (
        <div className="space-y-2 pt-1">
          <PanelSectionTitle>File</PanelSectionTitle>
          <FileUploadField
            label="Replace file"
            accept=".pdf,.epub,.doc,.docx,.ppt,.pptx"
            maxMb={100}
            buttonLabel="Replace document file"
            hint="PDF, EPUB, DOC(X), PPT(X) · max 100MB"
            uploading={media.uploading}
            uploadProgress={media.progress}
            onPick={async (file) => {
              await media.run('Replacing file', (onProgress) => documentsService.replaceFile(entity._id, file, onProgress))
              onRefresh?.()
            }}
          />
        </div>
      )}

      <MoveDocumentDialog
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        onSuccess={() => { setMoveOpen(false); onRefresh?.() }}
        documentId={entity._id}
        documentTitle={entity.title}
      />
      <ArchiveWithImpactDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={archive.execute}
        fetchImpact={() => documentsService.getDeleteImpact(entity._id)}
        entityName={entity.title}
        entityType="document"
        loading={archive.loading}
      />
    </PanelShell>
  )
}
