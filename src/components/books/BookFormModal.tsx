import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Loader2, Upload, FileText, X } from 'lucide-react'
import { Book, BookFormData } from '@/services/books.service'

const bookSchema = z.object({
  title: z.string().min(2, 'Title is required').max(200),
  author: z.string().min(2, 'Author is required').max(100),
  description: z.string().max(2000).optional().or(z.literal('')),
  isbn: z.string().max(20).optional().or(z.literal('')),
  price: z.number({ error: 'Price is required' }).min(0),
  original_price: z.number().min(0).optional().nullable(),
  is_on_sale: z.boolean(),
  sale_price: z.number().min(0).optional().nullable(),
  ebook: z.boolean(),
  category: z.string().max(100).optional().or(z.literal('')),
  stock_quantity: z.number().int().min(0).optional().or(z.nan()),
  is_available: z.boolean(),
  publisher: z.string().max(100).optional().or(z.literal('')),
  publication_year: z.number().int().min(1900).max(2100).optional().or(z.nan()),
  pages: z.number().int().min(1).optional().or(z.nan()),
  weight_grams: z.number().min(0).optional().or(z.nan()),
}).refine(
  (data) => !data.is_on_sale || (data.sale_price && data.sale_price > 0),
  { message: 'Sale price is required when on sale', path: ['sale_price'] },
)

type BookFormValues = z.infer<typeof bookSchema>

interface BookFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: BookFormData, ebookFile?: File, onProgress?: (pct: number) => void) => Promise<void>
  book?: Book | null
  mode: 'create' | 'edit'
}

export function BookFormModal({ open, onClose, onSubmit, book, mode }: BookFormModalProps) {
  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
    reset, setValue, watch,
  } = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      title: '', author: '', description: '', isbn: '',
      price: 0, original_price: null, is_on_sale: false, sale_price: null,
      ebook: false, category: '', stock_quantity: 0, is_available: true,
      publisher: '', publication_year: NaN, pages: NaN, weight_grams: 500,
    },
  })

  const isOnSale = watch('is_on_sale')
  const isAvailable = watch('is_available')
  const isEbook = watch('ebook')

  const [ebookFile, setEbookFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  useEffect(() => {
    if (open) {
      setEbookFile(null)
      setUploadProgress(null)
      if (mode === 'edit' && book) {
        reset({
          title: book.title, author: book.author,
          description: book.description || '', isbn: book.isbn || '',
          price: book.price, original_price: book.original_price,
          is_on_sale: book.is_on_sale, sale_price: book.sale_price,
          ebook: book.ebook ?? false, category: book.category || '', stock_quantity: book.stock_quantity,
          is_available: book.is_available, publisher: book.publisher || '',
          publication_year: book.publication_year ?? NaN,
          pages: book.pages ?? NaN, weight_grams: book.weight_grams,
        })
      } else {
        reset({
          title: '', author: '', description: '', isbn: '',
          price: 0, original_price: null, is_on_sale: false, sale_price: null,
          ebook: false, category: '', stock_quantity: 0, is_available: true,
          publisher: '', publication_year: NaN, pages: NaN, weight_grams: 500,
        })
      }
    }
  }, [open, mode, book, reset])

  const handleFormSubmit = async (data: BookFormValues) => {
    try {
      setUploadProgress(null)
      const formData: BookFormData = {
        title: data.title, author: data.author,
        description: data.description || undefined, isbn: data.isbn || undefined,
        price: data.price, original_price: data.original_price || undefined,
        is_on_sale: data.is_on_sale,
        sale_price: data.is_on_sale ? data.sale_price || undefined : undefined,
        ebook: data.ebook,
        category: data.category || undefined,
        stock_quantity: data.stock_quantity || 0,
        is_available: data.is_available,
        publisher: data.publisher || undefined,
        publication_year: data.publication_year && !isNaN(data.publication_year) ? data.publication_year : undefined,
        pages: data.pages && !isNaN(data.pages) ? data.pages : undefined,
        weight_grams: data.weight_grams && !isNaN(data.weight_grams) ? data.weight_grams : undefined,
      }
      await onSubmit(formData, ebookFile || undefined, (pct) => setUploadProgress(pct))
      onClose()
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setUploadProgress(null)
    }
  }

  const handleClose = () => { if (!isSubmitting) onClose() }

  const hasExistingEbook = mode === 'edit' && book?.ebook_file_url

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Book' : 'Edit Book'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Add a new book to the catalog.' : 'Update the book details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
              <Input id="title" placeholder="Book title" disabled={isSubmitting} {...register('title')} />
              {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="author">Author <span className="text-red-500">*</span></Label>
              <Input id="author" placeholder="Author name" disabled={isSubmitting} {...register('author')} />
              {errors.author && <p className="text-sm text-red-500">{errors.author.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={2} disabled={isSubmitting} {...register('description')} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (INR) <span className="text-red-500">*</span></Label>
              <Input id="price" type="number" min={0} disabled={isSubmitting} {...register('price', { valueAsNumber: true })} />
              {errors.price && <p className="text-sm text-red-500">{errors.price.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="original_price">Original Price</Label>
              <Input id="original_price" type="number" min={0} disabled={isSubmitting} {...register('original_price', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock_quantity">Stock</Label>
              <Input id="stock_quantity" type="number" min={0} disabled={isSubmitting} {...register('stock_quantity', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_on_sale" className="text-base">On Sale</Label>
              <p className="text-sm text-muted-foreground">{isOnSale ? 'Sale pricing active' : 'No sale'}</p>
            </div>
            <Switch id="is_on_sale" checked={isOnSale} onCheckedChange={(c) => { setValue('is_on_sale', c); if (!c) setValue('sale_price', null) }} disabled={isSubmitting} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="ebook" className="text-base">E-Book Available</Label>
              <p className="text-sm text-muted-foreground">{isEbook ? 'Available in physical & digital format' : 'Physical copy only'}</p>
            </div>
            <Switch id="ebook" checked={isEbook} onCheckedChange={(c) => { setValue('ebook', c); if (!c) setEbookFile(null) }} disabled={isSubmitting} />
          </div>

          {isEbook && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <Label className="text-sm font-medium">E-Book File (PDF or EPUB)</Label>

              {hasExistingEbook && !ebookFile && (
                <div className="flex items-center gap-2 rounded-md border bg-background p-3">
                  <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      Current: {book!.ebook_file_format?.toUpperCase()} file
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {book!.ebook_file_size_mb ? `${book!.ebook_file_size_mb.toFixed(1)} MB` : 'Unknown size'}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">Select a new file to replace</span>
                </div>
              )}

              {ebookFile ? (
                <div className="flex items-center gap-2 rounded-md border bg-background p-3">
                  <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{ebookFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(ebookFile.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => setEbookFile(null)}
                    disabled={isSubmitting}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <label
                  className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors hover:border-primary/50 hover:bg-muted/50 ${isSubmitting ? 'pointer-events-none opacity-50' : ''}`}
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Click to select e-book file</p>
                    <p className="text-xs text-muted-foreground">PDF or EPUB, max 500 MB</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.epub,application/pdf,application/epub+zip"
                    onChange={(e) => setEbookFile(e.target.files?.[0] || null)}
                    disabled={isSubmitting}
                  />
                </label>
              )}

              {uploadProgress !== null && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{uploadProgress < 100 ? 'Uploading e-book...' : 'Finalizing...'}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {isOnSale && (
            <div className="space-y-2">
              <Label htmlFor="sale_price">Sale Price (INR) <span className="text-red-500">*</span></Label>
              <Input id="sale_price" type="number" min={0} disabled={isSubmitting} {...register('sale_price', { valueAsNumber: true })} />
              {errors.sale_price && <p className="text-sm text-red-500">{errors.sale_price.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="isbn">ISBN</Label>
              <Input id="isbn" disabled={isSubmitting} {...register('isbn')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" disabled={isSubmitting} {...register('category')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="publisher">Publisher</Label>
              <Input id="publisher" disabled={isSubmitting} {...register('publisher')} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pages">Pages</Label>
              <Input id="pages" type="number" min={1} disabled={isSubmitting} {...register('pages', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="publication_year">Year</Label>
              <Input id="publication_year" type="number" disabled={isSubmitting} {...register('publication_year', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight_grams">Weight (g)</Label>
              <Input id="weight_grams" type="number" min={0} disabled={isSubmitting} {...register('weight_grams', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_available" className="text-sm">Available</Label>
              <p className="text-xs text-muted-foreground">{isAvailable ? 'Book is listed' : 'Book is hidden'}</p>
            </div>
            <Switch id="is_available" checked={isAvailable} onCheckedChange={(c) => setValue('is_available', c)} disabled={isSubmitting} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === 'create' ? 'Creating...' : 'Updating...'}</>
              ) : (
                <>{mode === 'create' ? 'Add Book' : 'Update Book'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
