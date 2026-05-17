import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Copy, FileText, Archive, FolderInput, Eye, EyeOff, GripVertical, Braces } from 'lucide-react'
import { FreeBadge, FormatBadge, PublishBadge } from '../../ui/StatusBadge'
import { DocumentFormDialog } from '../../forms/DocumentFormDialog'
import { MoveDocumentDialog } from '../../dialogs/MoveDocumentDialog'
import { PublishDialog } from '../../dialogs/PublishDialog'
import { ArchiveWithImpactDialog } from '../../dialogs/ArchiveWithImpactDialog'
import { RawJsonDrawer } from '../popovers/RawJsonDrawer'
import { useExplorerMutation } from '../../hooks/useExplorerMutation'
import { copyText } from '../../copyShareLink'
import { documentsService } from '@/services/documents.service'

/** Minimal shape accepted by DocumentRow — satisfied by both PackageDetailDocument and Document. */
export interface DocRowData {
  _id: string
  title: string
  description: string
  file_url: string
  file_format: 'pdf' | 'epub' | 'doc' | 'docx' | 'ppt' | 'pptx'
  file_size_mb: number
  page_count: number | null
  is_free: boolean
  display_order: number
  download_count: number
  publish_status?: 'draft' | 'published'
}

interface DocumentRowProps {
  document: DocRowData
  onRefresh?: () => void
  selected?: boolean
  onSelect?: (id: string) => void
  dragHandleProps?: React.HTMLAttributes<HTMLElement>
  isDragging?: boolean
}

export function DocumentRow({ document: doc, onRefresh, selected, onSelect, dragHandleProps, isDragging }: DocumentRowProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [rawJsonOpen, setRawJsonOpen] = useState(false)

  const isPublished = doc.publish_status === 'published'

  const sizeLabel =
    doc.file_size_mb < 1
      ? `${Math.round(doc.file_size_mb * 1024)} KB`
      : `${doc.file_size_mb.toFixed(1)} MB`

  const archiveMutation = useExplorerMutation({
    name: 'Archive document',
    fn: () => documentsService.archive(doc._id),
    onSuccess: () => { setArchiveOpen(false); onRefresh?.() },
    successMessage: `"${doc.title}" archived`,
  })

  return (
    <>
      <div className={`flex items-center gap-3 px-3 py-2.5 mx-2 my-0.5 rounded-xl hover:bg-slate-50 transition-colors group ${selected ? 'bg-blue-50' : ''} ${isDragging ? 'opacity-40' : ''}`}>
        {dragHandleProps && (
          <span
            {...dragHandleProps}
            className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4" />
          </span>
        )}
        {onSelect && (
          <input
            type="checkbox"
            checked={selected ?? false}
            onChange={() => onSelect(doc._id)}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 w-4 h-4 accent-primary cursor-pointer"
          />
        )}
        <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-orange-500" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{doc.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-400">{sizeLabel}</span>
            {doc.page_count != null && (
              <span className="text-xs text-slate-400">{doc.page_count} pages</span>
            )}
            <span className="text-xs text-slate-400">{doc.download_count} dl</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <FormatBadge format={doc.file_format} />
          {doc.is_free && <FreeBadge />}
          {doc.publish_status && <PublishBadge status={doc.publish_status} />}
        </div>

        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              {doc.publish_status !== undefined && (
                <DropdownMenuItem onClick={() => setPublishOpen(true)}>
                  {isPublished
                    ? <><EyeOff className="w-3.5 h-3.5 mr-2" /> Unpublish</>
                    : <><Eye className="w-3.5 h-3.5 mr-2" /> Publish</>}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setMoveOpen(true)}>
                <FolderInput className="w-3.5 h-3.5 mr-2" /> Move
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyText(doc._id, 'Document ID')}>
                <Copy className="w-3.5 h-3.5 mr-2" /> Copy ID
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRawJsonOpen(true)}>
                <Braces className="w-3.5 h-3.5 mr-2" /> View raw JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-amber-600 focus:text-amber-600"
                onClick={() => setArchiveOpen(true)}
              >
                <Archive className="w-3.5 h-3.5 mr-2" /> Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <DocumentFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => { setEditOpen(false); onRefresh?.() }}
        document={doc}
      />

      <MoveDocumentDialog
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        onSuccess={() => { setMoveOpen(false); onRefresh?.() }}
        documentId={doc._id}
        documentTitle={doc.title}
      />

      <ArchiveWithImpactDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={archiveMutation.execute}
        fetchImpact={() => documentsService.getDeleteImpact(doc._id)}
        entityName={doc.title}
        entityType="document"
        loading={archiveMutation.loading}
      />

      {doc.publish_status !== undefined && (
        <PublishDialog
          open={publishOpen}
          onClose={() => setPublishOpen(false)}
          onSuccess={() => { setPublishOpen(false); onRefresh?.() }}
          entityType="document"
          entityId={doc._id}
          entityName={doc.title}
          currentStatus={isPublished ? 'published' : 'draft'}
        />
      )}

      <RawJsonDrawer
        open={rawJsonOpen}
        onClose={() => setRawJsonOpen(false)}
        label={doc.title}
        data={doc}
      />
    </>
  )
}
