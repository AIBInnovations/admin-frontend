import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useUnsavedChanges } from '@/components/layouts/workspaceStore'
import { booksService, type Book } from '@/services/books.service'
import { documentsService } from '@/services/documents.service'
import { seriesService } from '@/services/series.service'
import type { DocumentPlace } from '../actions/ActionsContext'
import { explain, useExplorerAccess } from '../access'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import { FileUploadField } from '../media/FileUploadField'
import { PanelField, PanelSelect, PanelSwitchRow, PanelText, PanelTextarea } from '../panel/fields'
import { cn } from '@/lib/utils'
import { fileSize } from '../ui/text'

type Mode = 'upload' | 'link'
interface Ref { _id: string; name: string }
interface Props extends DocumentPlace { onClose: () => void; onSuccess: () => Promise<void> | void }

/**
 * Add a document: upload a file, or use a book's eBook. A document belongs to
 * a series (that is where students find it); inside a subject the admin picks
 * the package and series here.
 */
export function CreateDocumentDialog({ subjectId, seriesId, seriesName, packageOptions, onClose, onSuccess }: Props) {
  const { can } = useExplorerAccess()
  const [mode, setMode] = useState<Mode>('upload')
  const [tried, setTried] = useState(false)

  const [packageId, setPackageId] = useState('')
  const [pickedSeries, setPickedSeries] = useState('')
  const [series, setSeries] = useState<{ list: Ref[]; loading: boolean; error: string }>({ list: [], loading: false, error: '' })
  useEffect(() => {
    setPickedSeries('')
    if (!packageId) { setSeries({ list: [], loading: false, error: '' }); return }
    let live = true
    setSeries({ list: [], loading: true, error: '' })
    seriesService.getAll({ package_id: packageId, page: 1, limit: 200 })
      .then((res) => { if (live) setSeries({ list: (res.data?.entities ?? []).map((s) => ({ _id: s._id, name: s.name })), loading: false, error: '' }) })
      .catch((err) => { if (live) setSeries({ list: [], loading: false, error: explain(err, 'series') }) })
    return () => { live = false }
  }, [packageId])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isFree, setIsFree] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)

  const canBooks = can('book', 'read')
  const [ebooks, setEbooks] = useState<Book[]>([])
  const [bookId, setBookId] = useState('')
  useEffect(() => {
    if (!canBooks) return
    let live = true
    booksService.getAll({ page: 1, limit: 500 }).then((res) => { if (live && res.data) setEbooks(res.data.entities.filter((b) => b.ebook && b.ebook_file_url)) }).catch(() => {})
    return () => { live = false }
  }, [canBooks])

  const target = seriesId ?? pickedSeries
  const upload = useExplorerMutation({
    name: 'Upload document',
    what: 'adding documents',
    fn: () => documentsService.upload(
      { title: title.trim(), description: description.trim() || undefined, series_id: target, subject_id: subjectId, is_free: isFree },
      file as File,
      setProgress,
    ),
    onSuccess: () => onSuccess(),
    successMessage: 'Document uploaded',
  })
  const link = useExplorerMutation({
    name: 'Link eBook as document',
    what: 'adding documents',
    fn: () => documentsService.createLinked({ source_book_id: bookId, series_id: target, subject_id: subjectId, is_free: isFree }),
    onSuccess: () => onSuccess(),
    successMessage: 'Document created from the eBook',
  })
  const busy = upload.loading || link.loading
  useUnsavedChanges(busy)

  const errors = {
    package: !seriesId && !packageId ? 'Choose a package.' : '',
    series: target ? '' : packageId && !series.loading && series.list.length === 0 ? 'This package has no series yet. Add one first.' : 'Choose a series.',
    title: title.trim().length < 2 ? 'Use at least 2 characters.' : title.trim().length > 300 ? 'Use at most 300 characters.' : '',
    file: file ? '' : 'Choose a file.',
    book: bookId ? '' : 'Choose a book.',
  }
  const show = (e: string) => (tried ? e : '')
  const submit = () => {
    setTried(true)
    const first = errors.package ? 'cd-package' : errors.series ? 'cd-series' : mode === 'upload' ? (errors.title ? 'cd-title' : null) : errors.book ? 'cd-book' : null
    if (first) { document.getElementById(first)?.focus(); return }
    if (mode === 'upload') { if (!errors.file) void upload.execute() } else void link.execute()
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v && !busy) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New document</DialogTitle>
          <DialogDescription>{seriesName ? `It is added to the series "${seriesName}".` : 'Choose the series it belongs to.'}</DialogDescription>
        </DialogHeader>

        <div role="tablist" aria-label="Where the file comes from" className="flex w-full gap-1 rounded-lg bg-muted p-1 sm:w-80">
          {(['upload', 'link'] as Mode[]).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} disabled={busy} onClick={() => setMode(m)} className={cn('h-8 flex-1 rounded-md text-sm font-medium transition-colors', mode === m ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground')}>
              {m === 'upload' ? 'Upload file' : 'Link an eBook'}
            </button>
          ))}
        </div>

        <fieldset disabled={busy} className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-card">
          {!seriesId && (
            <div className="grid gap-5 sm:grid-cols-2">
              <PanelField label="Package" required htmlFor="cd-package" error={show(errors.package)}>
                <PanelSelect id="cd-package" value={packageId} onChange={setPackageId} invalid={tried && !!errors.package}>
                  <option value="">Choose a package</option>
                  {(packageOptions ?? []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </PanelSelect>
              </PanelField>
              <PanelField label="Series" required htmlFor="cd-series" error={series.error || show(errors.series)}>
                <PanelSelect id="cd-series" value={pickedSeries} onChange={setPickedSeries} disabled={!packageId || series.loading} invalid={tried && !!errors.series}>
                  <option value="">{series.loading ? 'Loading…' : packageId ? 'Choose a series' : 'Choose a package first'}</option>
                  {series.list.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </PanelSelect>
              </PanelField>
            </div>
          )}

          {mode === 'upload' ? (
            <>
              <PanelField label="Title" required htmlFor="cd-title" error={show(errors.title)}>
                <PanelText id="cd-title" value={title} onChange={setTitle} placeholder="Document title" invalid={tried && !!errors.title} required />
              </PanelField>
              <PanelField label="Description" htmlFor="cd-desc"><PanelTextarea id="cd-desc" value={description} onChange={setDescription} /></PanelField>
              <FileUploadField
                label="File"
                accept=".pdf,.epub,.doc,.docx,.ppt,.pptx"
                maxMb={100}
                buttonLabel={file ? file.name : 'Choose document file'}
                hint={file ? `${fileSize(file.size / 1024 / 1024)} selected. Choose again to change it.` : 'PDF, EPUB, DOC(X) or PPT(X), up to 100 MB.'}
                error={show(errors.file)}
                uploading={upload.loading}
                uploadProgress={progress}
                onPick={setFile}
              />
            </>
          ) : (
            <PanelField label="eBook" required htmlFor="cd-book" error={show(errors.book)} hint={!canBooks ? 'You do not have access to books.' : ebooks.length === 0 ? 'No book has an eBook file yet. Upload one under Books first.' : 'Title, file and cover stay in sync with the book.'}>
              <PanelSelect id="cd-book" value={bookId} onChange={setBookId} invalid={tried && !!errors.book}>
                <option value="">Choose a book with an eBook</option>
                {ebooks.map((b) => <option key={b._id} value={b._id}>{b.title} ({b.author})</option>)}
              </PanelSelect>
            </PanelField>
          )}
          <PanelSwitchRow id="cd-free" label="Free access" hint="No purchase needed" checked={isFree} onChange={setIsFree} />
        </fieldset>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> {upload.loading ? `Uploading ${progress}%` : 'Creating…'}</> : mode === 'upload' ? 'Upload document' : 'Create document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
