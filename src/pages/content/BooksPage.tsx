import { useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus, Search, MoreVertical, Pencil, Trash2, BookOpen,
  PackageCheck, PackageX, ToggleLeft,
} from 'lucide-react'
import { mockBooks } from '@/lib/mock-data'

export function BooksPage() {
  const [search, setSearch] = useState('')

  const filtered = mockBooks.filter((b) => {
    return !search || b.title.toLowerCase().includes(search.toLowerCase()) || b.author.toLowerCase().includes(search.toLowerCase()) || b.isbn.includes(search)
  })

  const totalBooks = mockBooks.length
  const inStock = mockBooks.filter((b) => b.stock_quantity > 0).length
  const outOfStock = mockBooks.filter((b) => b.stock_quantity === 0).length

  return (
    <div>
      <PageHeader
        title="Books"
        description="Manage book catalog, pricing, and stock"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Books' }]}
        action={<Button><Plus className="mr-2 h-4 w-4" />Add Book</Button>}
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><BookOpen className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{totalBooks}</p><p className="text-xs text-muted-foreground">Total Books</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10"><PackageCheck className="h-5 w-5 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold">{inStock}</p><p className="text-xs text-muted-foreground">In Stock</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10"><PackageX className="h-5 w-5 text-red-500" /></div>
          <div><p className="text-2xl font-bold">{outOfStock}</p><p className="text-xs text-muted-foreground">Out of Stock</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search title, author, ISBN..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Book</TableHead>
              <TableHead>ISBN</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Publisher</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Pages</TableHead>
              <TableHead>Available</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((book) => (
              <TableRow key={book._id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                      {book.title.charAt(0)}
                    </div>
                    <div>
                      <p className="max-w-[200px] truncate text-sm font-medium">{book.title}</p>
                      <p className="text-xs text-muted-foreground">{book.author}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{book.isbn}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-[10px]">{book.category}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    {book.is_on_sale ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-emerald-600">{'\u20B9'}{book.sale_price?.toLocaleString('en-IN')}</span>
                          <Badge className="bg-emerald-500/10 text-[10px] text-emerald-700 hover:bg-emerald-500/10">SALE</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground line-through">{'\u20B9'}{(book.original_price ?? book.price).toLocaleString('en-IN')}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-semibold">{'\u20B9'}{book.price.toLocaleString('en-IN')}</span>
                        {book.original_price && (
                          <span className="text-xs text-muted-foreground line-through">{'\u20B9'}{book.original_price.toLocaleString('en-IN')}</span>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`text-sm font-semibold ${book.stock_quantity === 0 ? 'text-red-600' : book.stock_quantity < 5 ? 'text-amber-600' : ''}`}>
                    {book.stock_quantity}
                  </span>
                </TableCell>
                <TableCell className="text-sm">{book.publisher}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{book.publication_year}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{book.pages}</TableCell>
                <TableCell>
                  <Badge variant={book.is_available ? 'default' : 'outline'} className="text-[10px]">
                    {book.is_available ? 'Available' : 'Unavailable'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                      <DropdownMenuItem><PackageCheck className="mr-2 h-4 w-4" />Update Stock</DropdownMenuItem>
                      <DropdownMenuItem><ToggleLeft className="mr-2 h-4 w-4" />Toggle Availability</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Showing {filtered.length} of {totalBooks} books</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>
    </div>
  )
}
