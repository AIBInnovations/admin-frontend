import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Loader2, Scissors, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { FactGrid, StatusPill } from '@/components/common/detail'
import { formatCount, formatDayTime } from '@/lib/format'
import { booksService, type Book, type BookSample, type SampleResult } from '@/services/books.service'
import { errorText, formatBytes, hasEbookFile, plural } from './bookDisplay'
import { FilePicker } from './FilePicker'

const MAX_SAMPLE = 60 * 1024 * 1024
export const DEFAULT_SAMPLE_PAGES = 12

type Busy = 'make' | 'upload' | 'toggle' | 'remove' | 'open' | null

interface SamplePanelProps {
  book: Book
  canEdit: boolean
  onChanged: (sample: BookSample | null) => void
  onBusy?: (busy: boolean) => void
}

/** The free sample students read before buying: make it, upload it, show or hide it. */
export function SamplePanel({ book, canEdit, onChanged, onBusy }: SamplePanelProps) {
  const sample = book.sample ?? null
  const [pages, setPages] = useState(String(sample?.target_pages || DEFAULT_SAMPLE_PAGES))
  const [busy, setBusy] = useState<Busy>(null)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; abort.current?.abort() }
  }, [])
  useEffect(() => { onBusy?.(progress !== null) }, [progress, onBusy])

  const run = async (kind: Exclude<Busy, null>, work: () => Promise<{ data?: SampleResult }>, done: string) => {
    setBusy(kind)
    setProblem(null)
    try {
      const res = await work()
      if (!mounted.current) return false
      if (res.data) {
        onChanged(res.data.sample)
        res.data.warnings?.forEach((w) => toast.warning(w.message, { duration: 10000 }))
      }
      toast.success(done)
      return true
    } catch (err) {
      if (mounted.current && !abort.current?.signal.aborted) setProblem(errorText(err, 'That did not work. Try again.'))
      return false
    } finally {
      if (mounted.current) setBusy(null)
    }
  }

  const n = Number(pages)
  const pagesOk = Number.isInteger(n) && n >= 1 && n <= 30
  const cannotMake = !book.ebook || !hasEbookFile(book) ? 'Upload the e-book first, then make a sample from it.'
    : book.ebook_file_format !== 'epub' ? 'This e-book is an older PDF. Upload an EPUB to make a sample from it, or upload a sample file.'
      : null

  const uploadSample = async () => {
    if (!file || progress !== null) return
    const controller = new AbortController()
    abort.current = controller
    setProgress(0)
    const ok = await run('upload', () => booksService.uploadSample(book._id, file, (p) => { if (mounted.current) setProgress(p) }, controller.signal), 'Sample uploaded')
    if (!mounted.current) return
    setProgress(null)
    if (ok) setFile(null)
    else if (controller.signal.aborted) toast('Upload cancelled')
    abort.current = null
  }

  const openFile = async () => {
    setBusy('open')
    try {
      const res = await booksService.getFileUrl(book._id, 'sample')
      if (res.data?.url) window.open(res.data.url, '_blank', 'noopener')
    } catch (err) {
      toast.error(errorText(err, 'The sample could not be opened.'))
    } finally {
      if (mounted.current) setBusy(null)
    }
  }

  const locked = busy !== null || progress !== null

  return (
    <div className="space-y-5">
      {sample ? (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Switch id="sample-enabled" checked={sample.enabled} disabled={!canEdit || locked}
                onCheckedChange={(on) => run('toggle', () => booksService.setSampleEnabled(book._id, on), on ? 'Sample shown to students' : 'Sample hidden from students')} />
              <Label htmlFor="sample-enabled" className="text-sm">Show the free sample to students</Label>
            </div>
            <StatusPill tone={sample.visible ? 'success' : 'neutral'}>{sample.visible ? 'Live' : 'Hidden'}</StatusPill>
          </div>
          {sample.stale && <p className="rounded-md bg-warning-soft px-3 py-2 text-sm">The e-book file has been replaced since this sample was {sample.source === 'auto' ? 'made' : 'uploaded'}. Make or upload it again so both match.</p>}
          {sample.enabled && !sample.visible && <p className="rounded-md bg-warning-soft px-3 py-2 text-sm">Students cannot see it yet, because this book is not offered as an e-book.</p>}
          <FactGrid facts={[
            { label: 'Where it comes from', value: sample.source === 'auto' ? 'Cut from the e-book' : 'Uploaded file' },
            sample.file_name ? { label: 'File', value: sample.file_name } : null,
            { label: 'Format', value: sample.format?.toUpperCase() },
            { label: 'Length', value: sample.pages ? `About ${plural(sample.pages, 'page')}` : 'Not measured' },
            sample.share_of_book !== null ? { label: 'Share of the book', value: `${(sample.share_of_book * 100).toFixed(1)}%` } : null,
            { label: 'Size', value: formatBytes(sample.size_bytes) },
            { label: 'Times opened', value: formatCount(sample.opens) },
            { label: 'On the web store', value: sample.has_preview ? 'Opens on the page' : 'Opens as a file' },
            { label: 'Updated', value: formatDayTime(sample.updated_at) },
          ]} />
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={openFile} disabled={locked}>
                {busy === 'open' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}Open sample
              </Button>
              <Button type="button" variant="outline" size="sm" className="text-danger" onClick={() => setConfirmRemove(true)} disabled={locked}><Trash2 className="h-3.5 w-3.5" />Remove sample</Button>
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">There is no free sample yet. Students see the book page only.</p>
      )}

      {canEdit && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Make it from the e-book</h3>
            <p className="text-[13px] text-muted-foreground">Takes the first pages of the EPUB, never more than 15% of the book.</p>
            {cannotMake ? <p className="text-sm text-muted-foreground">{cannotMake}</p> : (
              <div className="space-y-1.5">
                <Label htmlFor="sample-pages">Length in pages</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input id="sample-pages" type="number" inputMode="numeric" min={1} max={30} className="w-24" value={pages} onChange={(e) => setPages(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (pagesOk && !locked) void run('make', () => booksService.generateSample(book._id, n), 'Sample made from the e-book') } }}
                    disabled={locked} aria-invalid={!pagesOk} aria-describedby="sample-pages-hint" />
                  <Button type="button" variant="outline" disabled={locked || !pagesOk} onClick={() => run('make', () => booksService.generateSample(book._id, n), 'Sample made from the e-book')}>
                    {busy === 'make' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />}{busy === 'make' ? 'Making…' : sample ? 'Make again' : 'Make sample'}
                  </Button>
                </div>
                <p id="sample-pages-hint" className={pagesOk ? 'text-xs text-muted-foreground' : 'text-xs text-danger'}>{pagesOk ? 'A page is about 300 words.' : 'Enter a whole number from 1 to 30.'}</p>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Or upload a sample file</h3>
            <FilePicker
              accept=".epub,.pdf,application/epub+zip,application/pdf"
              title={sample ? 'Choose another sample file' : 'Choose a sample file'}
              hint={`EPUB or PDF with the pages you want to give away. Up to ${formatBytes(MAX_SAMPLE)}.`}
              maxBytes={MAX_SAMPLE}
              file={file}
              onPick={(f) => { setFile(f); setProblem(null) }}
              onError={setProblem}
              disabled={locked && progress === null}
              progress={progress}
              onCancel={() => abort.current?.abort()}
            />
            {file && progress === null && <Button type="button" size="sm" onClick={uploadSample} disabled={locked}><Upload className="h-3.5 w-3.5" />{sample ? 'Upload and replace sample' : 'Upload sample'}</Button>}
          </div>
        </div>
      )}
      {problem && <p role="alert" className="text-sm text-danger">{problem}</p>}

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove the free sample?</AlertDialogTitle>
            <AlertDialogDescription>Students will no longer be able to read it before buying. The e-book itself is not affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep sample</AlertDialogCancel>
            <AlertDialogAction onClick={() => run('remove', () => booksService.removeSample(book._id), 'Sample removed')}>Remove sample</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
