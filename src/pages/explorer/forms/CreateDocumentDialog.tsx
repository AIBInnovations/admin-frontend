import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { PanelField, PanelSelect, PanelSwitchRow, PanelText, PanelTextarea } from '../panel/fields'
import { FileUploadField } from '../media/FileUploadField'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import { documentsService } from '@/services/documents.service'
import { booksService, type Book } from '@/services/books.service'
import { seriesService } from '@/services/series.service'

interface RefLite {
  _id: string
  name: string
}

interface CreateDocumentDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  /** Subject in context — always sent as subject_id. */
  subjectId?: string
  /** Locked series (series-level context). */
  seriesId?: string
  seriesName?: string
  /** Pick a series (package-level context). */
  seriesOptions?: RefLite[]
  /** Pick a package → then a series (subject-level context). */
  packageOptions?: RefLite[]
}

type Mode = 'upload' | 'link'

/**
 * Create a document. A document always belongs to a SERIES (that's what the
 * student app shows + how the old CMS works), so the dialog resolves a
 * series_id one of three ways: locked, series-picker, or package→series-picker.
 * subject_id is auto-sent from the in-context subject.
 */
export function CreateDocumentDialog({
  open, onClose, onSuccess, subjectId, seriesId, seriesName, seriesOptions, packageOptions,
}: CreateDocumentDialogProps) {
  const [mode, setMode] = useState<Mode>('upload')

  // series resolution
  const [pickedPackageId, setPickedPackageId] = useState('')
  const [pickedSeriesId, setPickedSeriesId] = useState('')
  const [loadedSeries, setLoadedSeries] = useState<RefLite[]>([])
  const [loadingSeries, setLoadingSeries] = useState(false)

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
    setPickedPackageId(''); setPickedSeriesId(''); setLoadedSeries([])
    booksService.getAll({ limit: 500 }).then((res) => {
      if (res.success && res.data) setEbooks(res.data.entities.filter((b) => b.ebook && b.ebook_file_url))
    })
  }, [open])

  // Subject context: load series for the chosen package.
  useEffect(() => {
    if (!pickedPackageId) { setLoadedSeries([]); setPickedSeriesId(''); return }
    setLoadingSeries(true)
    setPickedSeriesId('')
    seriesService.getAll({ package_id: pickedPackageId, limit: 200 }).then((res) => {
      if (res.success && res.data) setLoadedSeries(res.data.entities.map((s) => ({ _id: s._id, name: s.name })))
    }).finally(() => setLoadingSeries(false))
  }, [pickedPackageId])

  const effectiveSeriesId = seriesId ?? pickedSeriesId
  const hasSeries = !!effectiveSeriesId

  const uploadMutation = useExplorerMutation({
    name: 'Upload document',
    fn: () =>
      documentsService.upload(
        { title: title.trim(), description: description.trim() || undefined, series_id: effectiveSeriesId, subject_id: subjectId, is_free: isFree },
        file as File,
        (p) => setProgress(p),
      ),
    onSuccess: () => { onClose(); onSuccess() },
    successMessage: 'Document uploaded',
  })

  const linkMutation = useExplorerMutation({
    name: 'Link eBook as document',
    fn: () => documentsService.createLinked({ source_book_id: bookId, series_id: effectiveSeriesId, subject_id: subjectId, is_free: isFree }),
    onSuccess: () => { onClose(); onSuccess() },
    successMessage: 'Document created from eBook',
  })

  const busy = uploadMutation.loading || linkMutation.loading
  const canUpload = hasSeries && title.trim().length >= 2 && !!file
  const canLink = hasSeries && !!bookId

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="sm:max-w-120">
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
          {/* Series target */}
          {seriesId ? (
            <PanelField label="Series">
              <div className="h-9 flex items-center px-3 rounded-md bg-slate-50 ring-1 ring-slate-200 text-sm text-slate-600">
                {seriesName ?? 'This series'}
              </div>
            </PanelField>
          ) : packageOptions ? (
            <>
              <PanelField label="Package" required>
                <PanelSelect value={pickedPackageId} onChange={setPickedPackageId}>
                  <option value="">Select a package…</option>
                  {packageOptions.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </PanelSelect>
              </PanelField>
              <PanelField label="Series" required>
                <PanelSelect value={pickedSeriesId} onChange={setPickedSeriesId} disabled={!pickedPackageId || loadingSeries}>
                  <option value="">{loadingSeries ? 'Loading…' : pickedPackageId ? 'Select a series…' : 'Pick a package first'}</option>
                  {loadedSeries.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </PanelSelect>
              </PanelField>
            </>
          ) : (
            <PanelField label="Series" required>
              <PanelSelect value={pickedSeriesId} onChange={setPickedSeriesId}>
                <option value="">Select a series…</option>
                {(seriesOptions ?? []).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </PanelSelect>
            </PanelField>
          )}

          {mode === 'upload' ? (
            <>
              <PanelField label="Title" required htmlFor="cd-title">
                <PanelText id="cd-title" value={title} onChange={setTitle} placeholder="Document title" />
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
