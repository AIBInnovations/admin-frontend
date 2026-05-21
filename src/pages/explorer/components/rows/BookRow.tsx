import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChevronRight, MoreHorizontal, Pencil, Copy, Braces, BookText } from 'lucide-react'
import { PublishBadge, SaleBadge, FreeBadge } from '../../ui/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { RawJsonDrawer } from '../popovers/RawJsonDrawer'
import { copyText } from '../../copyShareLink'
import { EXPLORER_BASE } from '../../parseExplorerPath'
import { usePanelSelection } from '../../context/PanelSelectionContext'
import { entityId } from '../../panel/panelTypes'
import { cn } from '@/lib/utils'
import type { Book } from '@/services/books.service'

interface BookRowProps {
  book: Book
  onRefresh?: () => void
}

function formatPrice(price: number): string {
  return price === 0 ? 'Free' : `₹${price.toLocaleString('en-IN')}`
}

export function BookRow({ book }: BookRowProps) {
  const navigate = useNavigate()
  const { select, target } = usePanelSelection()
  const [rawJsonOpen, setRawJsonOpen] = useState(false)

  const isOpen = entityId(target?.entity) === book._id
  const openInPanel = () => select({ kind: 'book', entity: book })
  const lowStock = book.stock_quantity <= 5

  return (
    <>
      <div
        className={`flex items-center gap-3 px-3 py-2.5 mx-2 my-0.5 rounded-xl transition-colors cursor-pointer group ${isOpen ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'}`}
        onClick={openInPanel}
      >
        <Avatar className="w-9 h-12 rounded-md shrink-0">
          {book.thumbnail_url && <AvatarImage src={book.thumbnail_url} alt={book.title} className="object-cover" />}
          <AvatarFallback className="rounded-md bg-amber-100 text-amber-700"><BookText className="w-4 h-4" /></AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{book.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-400 truncate max-w-32">{book.author}</span>
            <span className="text-xs font-semibold text-slate-700">
              {book.is_on_sale && book.sale_price != null ? formatPrice(book.sale_price) : formatPrice(book.price)}
            </span>
            <span className={cn('text-xs', lowStock ? 'text-red-500' : 'text-slate-400')}>
              {book.stock_quantity} in stock
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {book.ebook && <FreeBadge className="bg-indigo-100 text-indigo-700" />}
          {book.is_on_sale && <SaleBadge />}
          {!book.is_available && <Badge className="text-xs font-medium border-0 bg-gray-100 text-gray-500">Unavailable</Badge>}
          <PublishBadge status={book.publish_status} />
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={openInPanel}>
                <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyText(book._id, 'Book ID')}>
                <Copy className="w-3.5 h-3.5 mr-2" /> Copy ID
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRawJsonOpen(true)}>
                <Braces className="w-3.5 h-3.5 mr-2" /> View raw JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-300 hover:text-slate-600 hover:bg-slate-100"
            title="Open"
            onClick={() => navigate(`${EXPLORER_BASE}/books/${book._id}`)}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <RawJsonDrawer open={rawJsonOpen} onClose={() => setRawJsonOpen(false)} label={book.title} data={book} />
    </>
  )
}
