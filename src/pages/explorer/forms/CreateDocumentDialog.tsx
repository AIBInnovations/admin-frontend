import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { PanelField, PanelSelect, PanelSwitchRow, PanelText, PanelTextarea } from '../panel/fields'
import { FileUploadField } from '../media/FileUploadField'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import { documentsService } from '@/services/documents.service'
import { booksService, type Book } from '@/services/books.service'

interface CreateDocumentDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  /** Where the document attaches. */
  subjectId?: string
  seriesId?: string
}

type Mode = 'upload' | 'link'

export function CreateDocumentDialog({ open, onClose, onSuccess, subjectId, seriesId }: CreateDocumentDialogProps) {
  const [mode, setMode] = useState<Mode>('upload')

  // upload mode
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isFree, setIsFree] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)

  // link mode
  const [ebooks, setEbooks] = useState<Book[]>([])
  const [bookId, setBookId] = useState('')

  useEffect(() => {
    if (!open) return
    setMode('upload'); setTitle(''); setDescription(''); setIsFree(false); setFile(null); setProgress(0); setBookId('')
    booksService.getAll({ limit: 500 }).then((res) => {
      if (res.success && res.data) {
        setEbooks(res.data.entities.filter((b) => b.ebook && b.ebook_file_url))
      }
    })
  }, [open])

  const uploadMutation = useExplorerMutation({
    name: 'Upload document',
    fn: () =>
      documentsService.upload(
        { title: title.trim(), description: description.trim() || undefined, subject_id: subjectId, series_id: seriesId, is_free: isFree },
        file as File,
        (p) => setProgress(p),
      ),
    onSuccess: () => { onClose(); onSuccess() },
    successMessage: 'Document uploaded',
  })

  const linkMutation = useExplorerMutation({
    name: 'Link eBook as document',
    fn: () => documentsService.createLinked({ source_book_id: bookId, subject_id: subjectId, series_id: seriesId, is_free: isFree }),
    onSuccess: () => { onClose(); onSuccess() },
    successMessage: 'Document created from eBook',
  })

  const busy = uploadMutation.loading || linkMutation.loading
  const canUpload = title.trim().length >= 2 && !!file
  const canLink = !!bookId

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New document</DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {(['upload', 'link'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 h-8 rounded-md text-sm font-medium transition-colors ${mode === m ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {m === 'upload' ? 'Upload file' : 'Link an eBook'}
            </button>
          ))}
        </div>

        <div className="space-y-4 py-1">
          {mode === 'upload' ? (
            <>
              <PanelField label="Title" required htmlFor="cd-title">
                <PanelText id="cd-title" value={title} onChange={setTitle} placeholder="Document title" autoFocus />
              </PanelField>
              <PanelField label="Description" htmlFor="cd-desc">
                <PanelTextarea id="cd-desc" value={description} onChange={setDescription} />
              </PanelField>
              <FileUploadField
                label="File"
                accept=".pdf,.epub,.doc,.docx,.ppt,.pptx"
                maxMb={100}
                buttonLabel={file ? `Selected: ${file.name}` : 'Choose document file'}
                hint="PDF, EPUB, DOC(X), PPT(X) · max 100MB"
                uploading={uploadMutation.loading}
                uploadProgress={progress}
                onPick={(f) => setFile(f)}
              />
              <PanelSwitchRow label="Free access" checked={isFree} onChange={setIsFree} />
            </>
          ) : (
            <>
              <PanelField label="eBook" required htmlFor="cd-book">
                <PanelSelect id="cd-book" value={bookId} onChange={setBookId}>
                  <option value="">Select a book with an eBook…</option>
                  {ebooks.map((b) => <option key={b._id} value={b._id}>{b.title} — {b.author}</option>)}
                </PanelSelect>
              </PanelField>
              {ebooks.length === 0 && (
                <p className="text-xs text-slate-400">No books have an uploaded eBook yet. Upload one from the Books catalog first.</p>
              )}
              <PanelSwitchRow label="Free access" checked={isFree} onChange={setIsFree} />
              <p className="text-[11px] text-slate-400">Title, file and cover stay in sync with the source book.</p>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          {mode === 'upload' ? (
            <Button onClick={uploadMutation.execute} disabled={!canUpload || busy}>
              {uploadMutation.loading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> {progress}%</> : 'Upload'}
            </Button>
          ) : (
            <Button onClick={linkMutation.execute} disabled={!canLink || busy}>
              {linkMutation.loading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Linking…</> : 'Create document'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
