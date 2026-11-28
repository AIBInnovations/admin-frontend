import { useEffect, useRef, useState } from 'react'
import { ExternalLink, FileText, Loader2, RefreshCw, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState, StatusPill } from '@/components/common/detail'
import { formatDayTime } from '@/lib/format'
import { booksService, type EbookStatus } from '@/services/books.service'
import { errorText, formatBytes, isJobActive, jobLabel } from './bookDisplay'
import { FilePicker } from './FilePicker'
import { useEbookStatus } from './useEbookStatus'
import { ValidationReport } from './ValidationReport'

const DEFAULT_MAX = 500 * 1024 * 1024

interface EbookFilePanelProps {
  bookId: string
  canEdit: boolean
  /** The live file changed, so the book should be read again. */
  onChanged?: () => void
  /** True while a file is on its way, so a page can warn before leaving. */
  onBusy?: (busy: boolean) => void
}

/** The live e-book file, its checks, and uploading a new one. */
export function EbookFilePanel({ bookId, canEdit, onChanged, onBusy }: EbookFilePanelProps) {
  const { status, error, reload, accept, active } = useEbookStatus(bookId, (next) => {
    if (next.job?.status === 'ready') { toast.success('E-book file is live'); onChanged?.() }
    else if (next.job?.status === 'failed' && next.job.error_code !== 'CANCELLED') toast.error(next.job.error || 'The file was not accepted')
  })
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [working, setWorking] = useState<'check' | 'open' | 'clear' | null>(null)
  const abort = useRef<AbortController | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; abort.current?.abort() }
  }, [])
  const uploading = progress !== null
  useEffect(() => { onBusy?.(uploading) }, [uploading, onBusy])

  const upload = async () => {
    if (!file || uploading) return
    const controller = new AbortController()
    abort.current = controller
    setProblem(null)
    setProgress(0)
    try {
      const res = await booksService.uploadEbook(bookId, file, (p) => { if (mounted.current) setProgress(p) }, controller.signal)
      if (!mounted.current) return
      setFile(null)
      if (res.data) accept(res.data)
      if (res.data?.pending) toast.success(res.data.job?.source_format === 'pdf' ? 'PDF uploaded. It is being converted to EPUB.' : 'E-book uploaded. It is being checked.')
      else { toast.success('E-book uploaded'); onChanged?.() }
    } catch (err) {
      if (!mounted.current) return
      if (controller.signal.aborted) { toast('Upload cancelled') } else {
        setProblem(errorText(err, 'The e-book could not be uploaded.'))
      }
      void reload()
    } finally {
      if (mounted.current) setProgress(null)
    }
  }

  const run = async (kind: 'check' | 'clear', work: () => Promise<{ data?: EbookStatus }>, done: string) => {
    setWorking(kind)
    try {
      const res = await work()
      if (!mounted.current) return
      if (res.data) accept(res.data)
      toast.success(done)
    } catch (err) {
      if (mounted.current) toast.error(errorText(err, 'That did not work. Try again.'))
    } finally {
      if (mounted.current) setWorking(null)
    }
  }

  const openFile = async () => {
    setWorking('open')
    try {
      const res = await booksService.getFileUrl(bookId, 'ebook')
      if (res.data?.url) window.open(res.data.url, '_blank', 'noopener')
    } catch (err) {
      toast.error(errorText(err, 'The file could not be opened.'))
    } finally {
      if (mounted.current) setWorking(null)
    }
  }

  if (!status) {
    if (error) return <ErrorState title="The file details could not be loaded" message={error} onRetry={reload} />
    return <div role="status" aria-label="Loading" className="space-y-3"><Skeleton className="h-16 rounded-lg" /><Skeleton className="h-28 rounded-lg" /></div>
  }

  const { job } = status
  const hasFile = status.has_file ?? !!status.ebook_file_url
  const isOldPdf = status.ebook_file_format === 'pdf'
  const maxBytes = status.max_file_bytes || DEFAULT_MAX
  const pdfOk = !!status.conversion_available

  return (
    <div className="space-y-5">
      {/* Live file */}
      {hasFile ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center">
          <FileText aria-hidden="true" className="hidden h-5 w-5 shrink-0 text-primary sm:block" />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
              <span className="min-w-0 [overflow-wrap:anywhere]">{status.ebook_file_name || 'E-book file'}</span>
              <StatusPill tone={isOldPdf ? 'warning' : 'info'}>{isOldPdf ? 'PDF (old)' : (status.ebook_file_format || 'File').toUpperCase()}</StatusPill>
            </p>
            <p className="text-xs text-muted-foreground">
              {status.ebook_file_size_mb ? formatBytes(status.ebook_file_size_mb * 1048576) : 'Unknown size'}
              {status.ebook_file_updated_at ? `, uploaded ${formatDayTime(status.ebook_file_updated_at)}` : ''}
            </p>
          </div>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={openFile} disabled={working !== null}>
                {working === 'open' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}Open file
              </Button>
              {!isOldPdf && (
                <Button type="button" variant="outline" size="sm" disabled={working !== null || active} onClick={() => run('check', () => booksService.revalidateEbook(bookId), 'E-book file checked')}>
                  {working === 'check' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}{working === 'check' ? 'Checking…' : 'Check this file'}
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">There is no e-book file yet.</p>
      )}
      {isOldPdf && (
        <p className="rounded-lg bg-warning-soft px-4 py-3 text-sm">This e-book is an older PDF. Students who own it keep reading it. Upload an EPUB to replace it.</p>
      )}

      {/* Upload in progress or its result */}
      <div aria-live="polite">
        {job && isJobActive(job) && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-accent px-4 py-3">
            <Loader2 aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{jobLabel(job)}</p>
              <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{job.file_name || 'New file'}{job.file_size ? `, ${formatBytes(job.file_size)}` : ''}. {hasFile ? 'The current file stays live until this one is ready.' : 'You can leave this page; it carries on.'}</p>
            </div>
            {canEdit && <Button type="button" variant="outline" size="sm" disabled={working !== null} onClick={() => run('clear', () => booksService.clearEbookJob(bookId), 'Upload cancelled')}>Cancel</Button>}
          </div>
        )}
        {job && job.status === 'failed' && (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{jobLabel(job)}{job.file_name ? <span className="font-normal text-muted-foreground">, {job.file_name}</span> : null}</p>
                {!job.report && job.error && <p className="mt-0.5 text-sm text-danger">{job.error}</p>}
                {hasFile && <p className="mt-0.5 text-xs text-muted-foreground">The current file was not changed.</p>}
              </div>
              {canEdit && <Button type="button" variant="ghost" size="sm" disabled={working !== null} onClick={() => run('clear', () => booksService.clearEbookJob(bookId), 'Result cleared')}>Clear result</Button>}
            </div>
            {job.report && <ValidationReport report={job.report} summary={false} />}
          </div>
        )}
      </div>

      {/* Upload a new file */}
      {canEdit && !active && (
        <div className="space-y-3">
          <FilePicker
            accept={pdfOk ? '.epub,.pdf,application/epub+zip,application/pdf' : '.epub,application/epub+zip'}
            title={hasFile ? 'Choose a new e-book file' : 'Click to select e-book file'}
            hint={pdfOk ? `EPUB, or PDF to convert to EPUB. Up to ${formatBytes(maxBytes)}.` : `EPUB, up to ${formatBytes(maxBytes)}. PDF conversion is not set up on the server.`}
            maxBytes={maxBytes}
            file={file}
            onPick={(f) => { setFile(f); setProblem(null) }}
            onError={setProblem}
            progress={progress}
            onCancel={() => abort.current?.abort()}
          />
          {problem && <p role="alert" className="text-sm text-danger">{problem}</p>}
          {file && !uploading && (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" size="sm" onClick={upload}><Upload className="h-3.5 w-3.5" />{hasFile ? 'Upload and replace' : 'Upload e-book'}</Button>
              {hasFile && <p className="min-w-0 flex-1 text-xs text-muted-foreground">The new file is checked first. Students who own this book then open the new file; saved positions, bookmarks and highlights may not match it.</p>}
            </div>
          )}
        </div>
      )}

      {/* Checks on the live file */}
      {hasFile && !isOldPdf && (
        <div className="border-t border-border pt-4">
          <h3 className="mb-3 text-sm font-semibold">Checks on the live file</h3>
          {status.validation
            ? <ValidationReport report={status.validation} />
            : <p className="text-sm text-muted-foreground">This file was uploaded before checks existed.{canEdit ? ' Choose "Check this file" to see the result.' : ''}</p>}
        </div>
      )}
    </div>
  )
}
