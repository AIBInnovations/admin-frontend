import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import type { GrantEbookData } from '@/services/users.service'
import { type Book, booksService } from '@/services/books.service'

const grantEbookSchema = z.object({
  book_id: z.string().min(1, 'Book is required'),
  create_invoice: z.boolean().optional(),
  invoice_amount: z.number().min(0).optional(),
  is_inclusive_tax: z.boolean().optional(),
  reason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
})

const GST_RATE = 0.18

type GrantEbookFormValues = z.infer<typeof grantEbookSchema>

interface GrantEbookModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: GrantEbookData) => Promise<void>
  userName: string
}

export function GrantEbookModal({ open, onClose, onSubmit, userName }: GrantEbookModalProps) {
  const [books, setBooks] = useState<Book[]>([])
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [loadingBooks, setLoadingBooks] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<GrantEbookFormValues>({
    resolver: zodResolver(grantEbookSchema),
    defaultValues: {
      book_id: '',
      create_invoice: false,
      invoice_amount: 0,
      reason: '',
      notes: '',
    },
  })

  const watchBookId = watch('book_id')
  const watchCreateInvoice = watch('create_invoice')
  const watchInvoiceAmount = watch('invoice_amount')
  const watchInclusiveTax = watch('is_inclusive_tax')

  // Fetch ebook-type books
  useEffect(() => {
    if (open) {
      setLoadingBooks(true)
      booksService
        .getAll({ is_available: true, limit: 100 })
        .then((res) => {
          if (res.success && res.data) {
            // Filter to only show books with ebook version
            setBooks((res.data.entities || []).filter((b) => b.ebook))
          }
        })
        .catch(() => toast.error('Failed to load ebooks'))
        .finally(() => setLoadingBooks(false))
    }
  }, [open])

  // Update selected book when book_id changes
  useEffect(() => {
    if (watchBookId) {
      const book = books.find((b) => b._id === watchBookId)
      setSelectedBook(book || null)
      if (book) {
        const effectivePrice = book.is_on_sale && book.sale_price ? book.sale_price : (book.price ?? 0)
        setValue('invoice_amount', effectivePrice)
      }
    } else {
      setSelectedBook(null)
    }
  }, [watchBookId, books, setValue])

  // Reset form
  useEffect(() => {
    if (open) {
      reset({
        book_id: '',
        create_invoice: false,
        invoice_amount: 0,
        reason: '',
        notes: '',
      })
      setSelectedBook(null)
    }
  }, [open, reset])

  const handleFormSubmit = async (data: GrantEbookFormValues) => {
    const submitData: GrantEbookData = {
      book_id: data.book_id,
      reason: data.reason,
      notes: data.notes,
    }
    if (data.create_invoice && data.invoice_amount && data.invoice_amount > 0) {
      submitData.create_invoice = true
      submitData.invoice_amount = data.invoice_amount
      submitData.is_inclusive_tax = data.is_inclusive_tax ?? false
    }
    await onSubmit(submitData)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>Grant Ebook Access</DialogTitle>
          <DialogDescription>
            Grant complimentary ebook access to <strong>{userName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Book Selection */}
          <div className="space-y-2">
            <Label>
              Ebook <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="book_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isSubmitting || loadingBooks}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={loadingBooks ? 'Loading...' : 'Select ebook'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {books.length === 0 && !loadingBooks ? (
                      <div className="px-2 py-4 text-sm text-muted-foreground text-center">No ebooks available</div>
                    ) : (
                      books.map((book) => (
                        <SelectItem key={book._id} value={book._id}>
                          {book.title} {book.author ? `— ${book.author}` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.book_id && (
              <p className="text-sm text-red-500">{errors.book_id.message}</p>
            )}
          </div>

          {/* Invoice Toggle */}
          <div className="flex items-center space-x-2">
            <Controller
              name="create_invoice"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="create_invoice"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                />
              )}
            />
            <Label htmlFor="create_invoice" className="text-sm font-normal cursor-pointer">
              Create Zoho Invoice (payment collected externally)
            </Label>
          </div>

          {/* Invoice Amount + Tax Mode (shown only when invoice toggle is ON) */}
          {watchCreateInvoice && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="invoice_amount">
                  Amount (INR) <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="invoice_amount"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="invoice_amount"
                      type="number"
                      min={0}
                      step={0.01}
                      disabled={isSubmitting}
                      {...field}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value)
                        field.onChange(Number.isNaN(v) ? 0 : v)
                      }}
                    />
                  )}
                />
                {errors.invoice_amount && (
                  <p className="text-sm text-red-500">{errors.invoice_amount.message}</p>
                )}
              </div>

              {/* Tax Mode */}
              <div className="flex items-center space-x-2">
                <Controller
                  name="is_inclusive_tax"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="is_inclusive_tax"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  )}
                />
                <Label htmlFor="is_inclusive_tax" className="text-sm font-normal cursor-pointer">
                  Amount is inclusive of GST (18%)
                </Label>
              </div>

              {/* Price Breakdown Preview */}
              {watchInvoiceAmount && watchInvoiceAmount > 0 && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                  {watchInclusiveTax ? (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Base amount</span>
                        <span>₹{(watchInvoiceAmount / (1 + GST_RATE)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>GST (18%)</span>
                        <span>₹{(watchInvoiceAmount - watchInvoiceAmount / (1 + GST_RATE)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-1">
                        <span>Invoice Total</span>
                        <span>₹{watchInvoiceAmount.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Base amount</span>
                        <span>₹{watchInvoiceAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>GST (18%)</span>
                        <span>₹{(watchInvoiceAmount * GST_RATE).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-1">
                        <span>Invoice Total</span>
                        <span>₹{(watchInvoiceAmount * (1 + GST_RATE)).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <p className="text-xs text-muted-foreground pt-1">
                    Final amount calculated by Zoho based on customer's state (CGST+SGST or IGST).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              placeholder="e.g., Promotional offer, Scholarship, etc."
              disabled={isSubmitting}
              {...register('reason')}
            />
            {errors.reason && <p className="text-sm text-red-500">{errors.reason.message}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes (internal only)"
              rows={3}
              disabled={isSubmitting}
              {...register('notes')}
            />
            {errors.notes && <p className="text-sm text-red-500">{errors.notes.message}</p>}
          </div>

          {/* Summary */}
          {selectedBook && (
            <div className="rounded-lg border bg-muted/50 p-3 space-y-1 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <BookOpen className="h-4 w-4" />
                Access Summary
              </div>
              <p className="text-muted-foreground">
                User will get perpetual access to <strong>{selectedBook.title}</strong>
                {watchCreateInvoice && watchInvoiceAmount && watchInvoiceAmount > 0
                  ? <> — invoice of <strong>₹{watchInclusiveTax ? watchInvoiceAmount.toFixed(2) : (watchInvoiceAmount * (1 + GST_RATE)).toFixed(2)}</strong>{' '}
                      ({watchInclusiveTax ? 'tax inclusive' : 'tax exclusive'}) will be created.</>
                  : <> at no cost.</>
                }
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedBook}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Granting...
                </>
              ) : (
                'Grant Access'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
