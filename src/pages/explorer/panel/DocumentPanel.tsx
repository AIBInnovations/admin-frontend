import { Archive, FileText, FolderInput } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { documentsService, type DocumentFormData } from '@/services/documents.service'
import type { PublishStatus } from '@/types/api.types'
import { useActions } from '../actions/ActionsContext'
import { useUnsavedChanges } from '@/components/layouts/workspaceStore'
import { useExplorerAccess } from '../access'
import { useEntityForm } from '../hooks/useEntityForm'
import { useMediaUpload } from '../hooks/useMediaUpload'
import { FileUploadField } from '../media/FileUploadField'
import { FormatBadge, FreeBadge, LinkedBadge, PublishBadge } from '../ui/StatusBadge'
import { Thumb } from '../ui/Thumb'
import { fileSize, plural } from '../ui/text'
import { EntityHeaderActions } from './EntityHeaderActions'
import { PanelShell } from './PanelShell'
import { AreaField, PanelSectionTitle, SwitchField, TextField } from './fields'
import { isWhole, ORDER_ERROR, payload } from './helpers'

/** Shape shared by a subject's documents and the ones in a package tree. */
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
  thumbnail_url?: string | null
}

interface Props { entity: DocPanelEntity; onRefresh: () => Promise<void> }

export function DocumentPanel({ entity, onRefresh }: Props) {
  const { can } = useExplorerAccess()
  const { open } = useActions()
  const media = useMediaUpload()
  const canEdit = can('document', 'update')
  // Title, description and file of a linked document live on the book
  const isLinked = !!entity.source_book_id

  // The upload goes on when another row is opened; closing the tab would stop it.
  useUnsavedChanges(media.uploading)

  const form = useEntityForm({
    id: 'document',
    what: 'document',
    label: (v) => v.title || 'Document',
    readOnly: !canEdit,
    initial: () => ({
      title: entity.title ?? '',
      description: entity.description ?? '',
      is_free: entity.is_free ?? false,
      display_order: (entity.display_order ?? 1).toString(),
    }),
    validate: (v) => ({
      ...(!isLinked && v.title.trim().length < 2 ? { title: 'Use at least 2 characters.' } : v.title.trim().length > 300 ? { title: 'Use at most 300 characters.' } : {}),
      ...(v.description.length > 2000 ? { description: 'Use at most 2,000 characters.' } : {}),
      ...(!isWhole(v.display_order) ? { display_order: ORDER_ERROR } : {}),
    }),
    submit: (v, changed) => {
      const data = payload<typeof v>(changed, { title: (x) => x.trim(), description: (x) => x.trim(), display_order: (x) => Number(x) || 1 })
      if (isLinked) { delete data.title; delete data.description }
      return documentsService.update(entity._id, data as unknown as DocumentFormData)
    },
    onSaved: () => onRefresh(),
    savedMessage: (v) => `"${v.title}" saved`,
  })
  const v = form.values

  return (
    <PanelShell
      icon={<Thumb src={entity.thumbnail_url} fallback={<FileText className="h-4 w-4" />} />}
      title={v.title || 'Document'}
      subtitle={[fileSize(entity.file_size_mb), entity.page_count != null ? plural(entity.page_count, 'page') : null, entity.download_count != null ? plural(entity.download_count, 'download') : null].filter(Boolean).join(' · ')}
      badges={(
        <>
          <FormatBadge format={entity.file_format} />
          {entity.is_free && <FreeBadge />}
          {isLinked && <LinkedBadge />}
          {entity.publish_status && <PublishBadge status={entity.publish_status} />}
        </>
      )}
      headerActions={(
        <EntityHeaderActions
          kind="document"
          entityType="document"
          id={entity._id}
          name={entity.title}
          publishStatus={entity.publish_status}
          data={entity}
          idLabel="Document ID"
          extra={canEdit || can('document', 'delete') ? (
            <>
              {canEdit && <DropdownMenuItem onSelect={() => open({ type: 'move', id: entity._id, name: entity.title })}><FolderInput className="mr-2 h-3.5 w-3.5" /> Move</DropdownMenuItem>}
              {can('document', 'delete') && <DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => open({ type: 'archive', kind: 'document', id: entity._id, name: entity.title })}><Archive className="mr-2 h-3.5 w-3.5" /> Archive</DropdownMenuItem>}
            </>
          ) : undefined}
        />
      )}
      form={form}
    >
      {isLinked && <p className="rounded-lg bg-accent px-3 py-2 text-[13px] text-accent-foreground">Linked to a book&apos;s eBook. Title, description and file are managed on the book and stay in sync.</p>}
      <TextField form={form} name="title" label="Title" required={!isLinked} disabled={isLinked} />
      <AreaField form={form} name="description" label="Description" disabled={isLinked} />
      <TextField form={form} name="display_order" label="Display order" type="number" min={0} className="w-32" />
      <SwitchField form={form} name="is_free" label="Free access" hint="No purchase needed" />

      {!isLinked && canEdit && (
        <>
          <PanelSectionTitle>File</PanelSectionTitle>
          <FileUploadField
            label="Replace file"
            accept=".pdf,.epub,.doc,.docx,.ppt,.pptx"
            maxMb={100}
            buttonLabel="Replace document file"
            hint="PDF, EPUB, DOC(X) or PPT(X), up to 100 MB."
            uploading={media.uploading}
            uploadProgress={media.progress}
            onPick={async (file) => { await media.run('Replace file', (onProgress) => documentsService.replaceFile(entity._id, file, onProgress)); await onRefresh() }}
          />
        </>
      )}
    </PanelShell>
  )
}
