import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { BookOpen, Globe, GlobeLock, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DetailHeader, DetailSkeleton, ErrorState, FactGrid, Section, Stat, StatusPill } from '@/components/common/detail'
import { PublishConfirmModal } from '@/components/common/PublishConfirmModal'
import { BookBuyers } from '@/components/books/BookBuyers'
import { BookSalesPanel } from '@/components/books/BookSalesPanel'
import { EbookFilePanel } from '@/components/books/EbookFilePanel'
import { SamplePanel } from '@/components/books/SamplePanel'
import { SALES_PEOPLE_PERMISSIONS, bookFormat, formatBytes, hasEbookFile, plural } from '@/components/books/bookDisplay'
import { useBook } from '@/components/books/useBook'
import { useBookSales } from '@/components/books/useBookSales'
import { useAuth } from '@/contexts/AuthContext'
import { formatCount, formatDay, formatDayTime, formatINR } from '@/lib/format'
import { ProductCode } from '@/components/common/ProductCode'

const TABS = ['overview', 'sales', 'buyers', 'file', 'sample'] as const
type Tab = (typeof TABS)[number]

export function BookDetailPage() {
  const { bookId } = useParams<{ bookId: string }>()
  const [params, setParams] = useSearchParams()
  const { hasPermission, hasAnyPermission } = useAuth()
  const canEdit = hasPermission('books.update')
  const canSeeBuyers = hasAnyPermission(SALES_PEOPLE_PERMISSIONS)
  const { book, setBook, loading, error, reload } = useBook(bookId)
  const summary = useBookSales(bookId)
  const [publishAction, setPublishAction] = useState<'publish' | 'unpublish' | null>(null)

  const asked = params.get('tab') as Tab | null
  const tab: Tab = asked && TABS.includes(asked) && (asked !== 'buyers' || canSeeBuyers) ? asked : 'overview'
  // On a phone the tabs scroll sideways; keep the open one in view.
  const tabBar = useRef<HTMLDivElement>(null)
  const loaded = !!book
  useEffect(() => {
    tabBar.current?.querySelector('[data-state=active]')?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [tab, loaded])
  const openTab = (next: string) => setParams((prev) => {
    const p = new URLSearchParams(next === tab ? prev : undefined)
    if (next === 'overview') p.delete('tab')
    else p.set('tab', next)
    return p
  }, { replace: true })

  if (!book) {
    if (loading && !error) return <DetailSkeleton />
    return (
      <ErrorState
        title={error?.notFound ? 'Book not found' : error?.forbidden ? 'You cannot open this book' : 'This book could not be loaded'}
        message={error?.notFound ? 'It may have been removed, or the link is wrong.' : error?.message}
        onRetry={error?.notFound || error?.forbidden ? undefined : reload}
        back={{ label: 'Back to Books', href: '/content/books' }}
      />
    )
  }

  const subject = book.subject_id && typeof book.subject_id === 'object' ? book.subject_id : null
  const format = bookFormat(book)
  const published = book.publish_status === 'published'
  const sales = summary.sales
  const price = book.is_on_sale && book.sale_price ? book.sale_price : book.price

  return (
    <div className="space-y-6">
      <DetailHeader
        back={{ label: 'Books', href: '/content/books' }}
        title={book.title}
        subtitle={<>By {book.author}{subject ? <> in {subject.name}</> : null}</>}
        status={<>
          <StatusPill tone={published ? 'success' : 'warning'}>{published ? 'Published' : 'Draft'}</StatusPill>
          <StatusPill tone={format.tone}>{format.label}</StatusPill>
          <ProductCode code={book.product_code} />
        </>}
        actions={canEdit && <>
          <Button variant="outline" onClick={() => setPublishAction(published ? 'unpublish' : 'publish')}>
            {published ? <GlobeLock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}{published ? 'Unpublish' : 'Publish'}
          </Button>
          <Button asChild><Link to={`/content/books/${book._id}/edit`}><Pencil className="h-4 w-4" />Edit book</Link></Button>
        </>}
      />

      {error && <p role="alert" className="rounded-lg bg-warning-soft px-4 py-2.5 text-sm">This page could not be refreshed. {error.message} <button type="button" className="font-medium text-primary underline-offset-2 hover:underline" onClick={reload}>Try again</button></p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Copies sold" loading={summary.loading && !sales} value={sales ? formatCount(sales.total.sold) : 'Not available'}
          hint={sales ? `${plural(sales.ebook.sold, 'e-book')}, ${plural(sales.paperback.sold, 'paperback')}` : summary.error ?? undefined} />
        {(!sales || sales.money_visible) && <Stat label="Collected" loading={summary.loading && !sales} value={sales ? formatINR(sales.total.collected) : 'Not available'} hint={sales ? `${formatINR(sales.total.net)} without GST` : undefined} />}
        <Stat label="Stock" value={formatCount(book.stock_quantity)} hint={book.stock_quantity === 0 ? 'No printed copies left' : book.stock_quantity <= 5 ? 'Running low' : 'Printed copies'} />
        <Stat label="Free sample" value={book.sample?.visible ? `${formatCount(sales?.sample_opens ?? book.sample.opens)} ${(sales?.sample_opens ?? book.sample.opens) === 1 ? 'open' : 'opens'}` : book.sample ? 'Hidden' : 'None'} hint={book.sample?.pages ? `About ${plural(book.sample.pages, 'page')}` : undefined} />
      </div>

      <Tabs value={tab} onValueChange={openTab}>
        <div ref={tabBar} className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            {canSeeBuyers && <TabsTrigger value="buyers">Buyers</TabsTrigger>}
            <TabsTrigger value="file">E-book file</TabsTrigger>
            <TabsTrigger value="sample">Free sample</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4 space-y-6">
          <Section title="Details">
            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="shrink-0">
                {book.thumbnail_url
                  ? <img src={book.thumbnail_url} alt={`Cover of ${book.title}`} className="aspect-video w-full max-w-[260px] rounded-lg border border-border object-cover" />
                  : <div className="flex aspect-video w-full max-w-[260px] items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground lg:w-[260px]"><BookOpen aria-label="No cover" className="h-8 w-8" /></div>}
              </div>
              <FactGrid className="min-w-0 flex-1" facts={[
                { label: 'Price', value: book.is_on_sale && book.sale_price ? <>{formatINR(price)} <span className="font-normal text-muted-foreground line-through">{formatINR(book.price)}</span></> : formatINR(book.price) },
                { label: 'Original price', value: book.original_price ? formatINR(book.original_price) : null },
                { label: 'Available', value: book.is_available ? 'Listed' : 'Hidden from students' },
                { label: 'Subject', value: subject ? <Link className="text-primary underline-offset-2 hover:underline" to={`/content/subjects/${subject._id}`}>{subject.name}</Link> : book.subject_id ? 'Deleted subject' : null },
                { label: 'Category', value: book.category },
                { label: 'ISBN', value: book.isbn, mono: true, copy: book.isbn },
                { label: 'Publisher', value: book.publisher },
                { label: 'Year', value: book.publication_year ? String(book.publication_year) : null },
                { label: 'Pages', value: book.pages ? formatCount(book.pages) : null },
                { label: 'Weight', value: book.weight_grams != null ? `${formatCount(book.weight_grams)} g` : null },
                { label: 'Added', value: formatDay(book.createdAt) },
                { label: 'Last changed', value: formatDayTime(book.updatedAt) },
              ]} />
            </div>
            <div className="mt-6 border-t border-border pt-4">
              <h3 className="text-[13px] text-muted-foreground">Description</h3>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm">{book.description || <span className="text-muted-foreground">No description</span>}</p>
            </div>
          </Section>
          {book.images?.length > 0 && (
            <Section title="Gallery">
              <ul className="flex flex-wrap gap-3">
                {book.images.map((url, i) => <li key={url}><a href={url} target="_blank" rel="noreferrer"><img src={url} alt={`${book.title}, picture ${i + 1}`} loading="lazy" className="h-24 w-auto rounded-md border border-border object-cover" /></a></li>)}
              </ul>
            </Section>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="E-book file" action={<Button variant="ghost" size="sm" onClick={() => openTab('file')}>Open</Button>}>
              <p className="text-sm">{!book.ebook ? 'Sold as a paperback only.' : !hasEbookFile(book) ? 'Marked as an e-book, but there is no file yet.' : book.ebook_file_format === 'pdf' ? 'An older PDF. Students who own it keep reading it; upload an EPUB to replace it.' : `EPUB${book.ebook_file_size_mb ? `, ${formatBytes(book.ebook_file_size_mb * 1048576)}` : ''}.`}</p>
              {book.ebook_validation && <p className="mt-1 text-sm text-muted-foreground">{book.ebook_validation.status === 'passed' ? 'All checks passed.' : book.ebook_validation.status === 'warnings' ? `Accepted, with ${plural(book.ebook_validation.warnings.length, 'thing')} to know.` : 'The last check found problems.'}</p>}
            </Section>
            <Section title="Free sample" action={<Button variant="ghost" size="sm" onClick={() => openTab('sample')}>Open</Button>}>
              <p className="text-sm">{book.sample ? (book.sample.visible ? `Students can read about ${book.sample.pages ? plural(book.sample.pages, 'page') : 'a few pages'} before buying.` : 'There is a sample, but students cannot see it.') : 'There is no free sample yet.'}</p>
              {book.sample?.stale && <p className="mt-1 text-sm text-warning">Made from an earlier e-book file.</p>}
            </Section>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="mt-4"><BookSalesPanel bookId={book._id} /></TabsContent>
        {canSeeBuyers && <TabsContent value="buyers" className="mt-4"><BookBuyers bookId={book._id} /></TabsContent>}
        <TabsContent value="file" className="mt-4">
          <Section title="E-book file" description={book.ebook ? undefined : 'This book is sold as a paperback only. Upload an EPUB to sell it as an e-book too.'}>
            <EbookFilePanel bookId={book._id} canEdit={canEdit} onChanged={reload} />
          </Section>
        </TabsContent>
        <TabsContent value="sample" className="mt-4">
          <Section title="Free sample" description="The pages a student can read before buying.">
            <SamplePanel book={book} canEdit={canEdit} onChanged={(sample) => { setBook((b) => (b ? { ...b, sample } : b)); void summary.reload() }} />
          </Section>
        </TabsContent>
      </Tabs>

      {publishAction && (
        <PublishConfirmModal open onOpenChange={(open) => { if (!open) setPublishAction(null) }} entityType="book" entityId={book._id} action={publishAction} onSuccess={reload} />
      )}
    </div>
  )
}
