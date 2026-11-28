import { EBOOK_JOB_ACTIVE, type Book, type EbookJob, type EbookStatus } from '@/services/books.service'
import type { Tone } from '@/components/common/detail'

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return 'Unknown size'
  if (bytes >= 1048576) return `${Number((bytes / 1048576).toFixed(1))} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`

export const hasEbookFile = (book: Pick<Book, 'ebook_file_url' | 'ebook_s3_key'>) => !!(book.ebook_s3_key || book.ebook_file_url)

/** What to show when a request fails. The shared client has no words for a busy server. */
export function errorText(err: unknown, fallback: string): string {
  if ((err as { status?: number })?.status === 429) return 'Too many requests at once. Wait a minute and try again.'
  return err instanceof Error && err.message ? err.message : fallback
}

/** How a book is sold and in which file format. */
export function bookFormat(book: Pick<Book, 'ebook' | 'ebook_file_format' | 'ebook_file_url' | 'ebook_s3_key'>): { label: string; tone: Tone } {
  if (!book.ebook) return { label: 'Paperback', tone: 'neutral' }
  if (!hasEbookFile(book)) return { label: 'No file', tone: 'warning' }
  if (book.ebook_file_format === 'pdf') return { label: 'PDF (old)', tone: 'warning' }
  return { label: 'EPUB', tone: 'info' }
}

export const isJobActive = (job: EbookStatus['job'] | Book['ebook_job'] | null | undefined) => !!job && EBOOK_JOB_ACTIVE.includes(job.status)

export function jobLabel(job: EbookJob): string {
  switch (job.status) {
    case 'queued': return 'Waiting to be converted'
    case 'converting': return 'Converting the PDF to EPUB'
    case 'validating': return 'Checking the file'
    case 'ready': return 'Live'
    default: return job.error_code === 'CANCELLED' ? 'Cancelled' : 'Not accepted'
  }
}

export const SALES_PEOPLE_PERMISSIONS = ['payments.read', 'users.read', 'book_orders.read']

export const isNotFound = (err: unknown) => [400, 404].includes((err as { status?: number })?.status ?? 0)
