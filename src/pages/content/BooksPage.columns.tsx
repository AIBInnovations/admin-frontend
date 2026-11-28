import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { StatusPill } from '@/components/common/detail'
import { bookFormat } from '@/components/books/bookDisplay'
import { formatCount, formatINR } from '@/lib/format'
import { Book } from '@/services/books.service'
import type { PopulatedRef } from '@/types/api.types'
import { MoreVertical, Pencil, BookOpen, Package, Globe, GlobeLock, Eye } from 'lucide-react'
import { ProductCodeText } from '@/components/common/ProductCode'

interface BooksColumnsProps {
  canEdit: boolean
  onOpen: (book: Book) => void
  onEdit: (book: Book) => void
  onPublishAction: (entityId: string, action: 'publish' | 'unpublish') => void
}

const muted = (text: string) => <span className="text-sm text-muted-foreground">{text}</span>

export function useBooksColumns({
  canEdit,
  onOpen,
  onEdit,
  onPublishAction,
}: BooksColumnsProps): ColumnDef<Book>[] {
  return [
    {
      id: 'book',
      header: 'Book',
      cell: (book) => {
        const format = bookFormat(book)
        return (
          <div className="flex min-w-[220px] max-w-[320px] items-center gap-3">
            <div className="flex h-10 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
              {book.thumbnail_url ? (
                <img src={book.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <BookOpen aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Link to={`/content/books/${book._id}`} title={book.title} className="truncate text-sm font-medium text-foreground underline-offset-2 hover:text-primary hover:underline">{book.title}</Link>
                {book.ebook && <StatusPill tone="info" className="h-5 shrink-0 px-2 text-[11px]">E-Book</StatusPill>}
                {book.ebook && format.label !== 'EPUB' && <StatusPill tone={format.tone} className="h-5 shrink-0 px-2 text-[11px]">{format.label}</StatusPill>}
              </div>
              <p className="truncate text-xs text-muted-foreground">{book.author}</p>
              <ProductCodeText code={book.product_code} className="block" />
            </div>
          </div>
        )
      },
    },
    {
      id: 'price',
      header: 'Price',
      width: 'w-28',
      cell: (book) => (
        <div className="whitespace-nowrap tabular-nums">
          {book.is_on_sale && book.sale_price ? (
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-success">{formatINR(book.sale_price)}</span>
              <span className="text-xs text-muted-foreground line-through">{formatINR(book.price)}</span>
            </div>
          ) : (
            <span className="text-sm font-medium">{formatINR(book.price)}</span>
          )}
        </div>
      ),
    },
    {
      id: 'stock',
      header: 'Stock',
      width: 'w-20',
      cell: (book) => (
        <div className="flex items-center gap-1">
          <Package aria-hidden="true" className="h-3 w-3 text-muted-foreground" />
          <span className={`text-sm tabular-nums ${book.stock_quantity <= 5 ? 'font-medium text-danger' : ''}`}>
            {formatCount(book.stock_quantity)}
          </span>
        </div>
      ),
    },
    {
      id: 'sold',
      header: 'Sold',
      width: 'w-24',
      cell: (book) => (
        <div className="whitespace-nowrap">
          <span className="text-sm font-medium tabular-nums">{formatCount(book.sold ?? 0)}</span>
          {!!book.ebook_sold && !!book.paperback_sold && (
            <p className="text-xs text-muted-foreground tabular-nums">{formatCount(book.ebook_sold)} e-book, {formatCount(book.paperback_sold)} paper</p>
          )}
        </div>
      ),
    },
    {
      id: 'revenue',
      header: 'Revenue',
      width: 'w-28',
      cell: (book) => (book.revenue == null ? muted('Hidden') : <span className="whitespace-nowrap text-sm tabular-nums">{formatINR(book.revenue)}</span>),
    },
    {
      id: 'subject',
      header: 'Subject',
      width: 'w-28',
      cell: (book) => {
        const subject = book.subject_id as PopulatedRef | null
        return (
          <span className="block max-w-[160px] truncate text-xs text-muted-foreground">
            {subject && typeof subject === 'object' ? subject.name : '—'}
          </span>
        )
      },
    },
    {
      id: 'category',
      header: 'Category',
      width: 'w-28',
      cell: (book) => <StatusPill className="max-w-[140px] truncate">{book.category || '—'}</StatusPill>,
    },
    {
      id: 'sample',
      header: 'Sample',
      width: 'w-24',
      cell: (book) => (!book.ebook ? muted('—') : book.has_sample ? <StatusPill tone="success">Yes</StatusPill> : <StatusPill>No</StatusPill>),
    },
    {
      id: 'availability',
      header: 'Status',
      width: 'w-24',
      cell: (book) => (
        <StatusPill tone={book.is_available && book.stock_quantity > 0 ? 'success' : 'danger'}>
          {book.is_available && book.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
        </StatusPill>
      ),
    },
    {
      id: 'publish_status',
      header: 'Publish',
      width: 'w-24',
      cell: (book) => (
        <StatusPill tone={book.publish_status === 'published' ? 'success' : 'warning'}>
          {book.publish_status === 'published' ? 'Published' : 'Draft'}
        </StatusPill>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (book) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${book.title}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onOpen(book)}>
              <Eye className="mr-2 h-4 w-4" />View details
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem onClick={() => onEdit(book)}>
                <Pencil className="mr-2 h-4 w-4" />Edit
              </DropdownMenuItem>
            )}
            {canEdit && (book.publish_status === 'published' ? (
              <DropdownMenuItem onClick={() => onPublishAction(book._id, 'unpublish')}>
                <GlobeLock className="mr-2 h-4 w-4" />Unpublish
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onPublishAction(book._id, 'publish')}>
                <Globe className="mr-2 h-4 w-4" />Publish
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
