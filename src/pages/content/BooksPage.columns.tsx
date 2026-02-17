import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { Book } from '@/services/books.service'
import { MoreVertical, Pencil, Trash2, BookOpen, Package } from 'lucide-react'

interface BooksColumnsProps {
  onEdit: (book: Book) => void
  onDelete: (book: Book) => void
}

export function useBooksColumns({
  onEdit,
  onDelete,
}: BooksColumnsProps): ColumnDef<Book>[] {
  return [
    {
      id: 'book',
      header: 'Book',
      cell: (book) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-8 items-center justify-center rounded bg-muted overflow-hidden shrink-0">
            {book.thumbnail_url ? (
              <img src={book.thumbnail_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium truncate">{book.title}</p>
              {book.ebook && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0 bg-blue-500/10 text-blue-600 border-blue-200">
                  E-Book
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{book.author}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'price',
      header: 'Price',
      width: 'w-28',
      cell: (book) => (
        <div>
          {book.is_on_sale && book.sale_price ? (
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-emerald-600">₹{book.sale_price.toLocaleString('en-IN')}</span>
              <span className="text-xs text-muted-foreground line-through">₹{book.price.toLocaleString('en-IN')}</span>
            </div>
          ) : (
            <span className="text-sm font-medium">₹{book.price.toLocaleString('en-IN')}</span>
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
          <Package className="h-3 w-3 text-muted-foreground" />
          <span className={`text-sm ${book.stock_quantity <= 5 ? 'text-red-600 font-medium' : ''}`}>
            {book.stock_quantity}
          </span>
        </div>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      width: 'w-28',
      cell: (book) => (
        <Badge variant="secondary" className="text-[10px]">
          {book.category || '—'}
        </Badge>
      ),
    },
    {
      id: 'availability',
      header: 'Status',
      width: 'w-24',
      cell: (book) => (
        <Badge className={`text-[10px] ${
          book.is_available && book.stock_quantity > 0
            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
            : 'bg-red-500/10 text-red-600 border-red-200'
        }`}>
          {book.is_available && book.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (book) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(book)}>
              <Pencil className="mr-2 h-4 w-4" />Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(book)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
