import { useEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { FileUpload } from '@/components/common/FileUpload'
import { ImageCropper } from '@/components/common/ImageCropper'
import { Section } from '@/components/common/detail'
import { useUnsavedChanges } from '@/components/layouts/workspaceStore'
import { booksService, type Book, type BookFormData, type BookSample } from '@/services/books.service'
import { subjectsService, type Subject } from '@/services/subjects.service'
import { EbookFilePanel } from './EbookFilePanel'
import { FilePicker } from './FilePicker'
import { DEFAULT_SAMPLE_PAGES, SamplePanel } from './SamplePanel'

/** Book thumbnail aspect ratio: 16:9 standard landscape */
const BOOK_THUMBNAIL_ASPECT_RATIO = 16 / 9
const MAX_EBOOK = 500 * 1024 * 1024

const optionalNumber = (message: string, rule: (n: z.ZodNumber) => z.ZodNumber) => rule(z.number({ error: message })).nullable()
const toNumber = (v: unknown) => (v === '' || v === null || v === undefined || Number.isNaN(v) ? null : Number(v))

const bookSchema = z.object({
  title: z.string().trim().min(2, 'Title is required').max(200, 'Keep the title under 200 characters'),
  author: z.string().trim().min(2, 'Author is required').max(100, 'Keep the author under 100 characters'),
  description: z.string().max(2000, 'Keep the description under 2000 characters'),
  isbn: z.string().max(20, 'An ISBN has 20 characters at most'),
  price: z.number({ error: 'Price is required' }).min(0, 'The price cannot be negative'),
  original_price: optionalNumber('Enter a number', (n) => n.min(0, 'The price cannot be negative')),
  is_on_sale: z.boolean(),
  sale_price: optionalNumber('Enter a number', (n) => n.min(0, 'The price cannot be negative')),
  ebook: z.boolean(),
  category: z.string().max(100, 'Keep the category under 100 characters'),
  subject_id: z.string(),
  stock_quantity: optionalNumber('Enter a number', (n) => n.int('Enter a whole number').min(0, 'Stock cannot be negative')),
  is_available: z.boolean(),
  publish_status: z.enum(['draft', 'published']),
  publisher: z.string().max(100, 'Keep the publisher under 100 characters'),
  publication_year: optionalNumber('Enter a year', (n) => n.int('Enter a whole year').min(1900, 'Enter a year from 1900').max(new Date().getFullYear() + 1, 'That year is too far ahead')),
  pages: optionalNumber('Enter a number', (n) => n.int('Enter a whole number').min(1, 'Pages must be at least 1')),
  weight_grams: optionalNumber('Enter a number', (n) => n.min(0, 'Weight cannot be negative')),
}).refine((d) => !d.is_on_sale || (d.sale_price !== null && d.sale_price > 0), { message: 'Sale price is required when on sale', path: ['sale_price'] })

type Values = z.infer<typeof bookSchema>

const subjectRef = (book: Book | null) => {
  const s = book?.subject_id
  return s && typeof s === 'object' ? { id: s._id, name: s.name } : { id: (s as string | null) || '', name: '' }
}

const EMPTY: Values = {
  title: '', author: '', description: '', isbn: '', price: 0, original_price: null, is_on_sale: false, sale_price: null, ebook: false, category: '',
  subject_id: '', stock_quantity: 0, is_available: true, publish_status: 'draft', publisher: '', publication_year: null, pages: null, weight_grams: 500,
}
const valuesOf = (book: Book): Values => ({
  title: book.title, author: book.author, description: book.description || '', isbn: book.isbn || '', price: book.price, original_price: book.original_price ?? null,
  is_on_sale: book.is_on_sale ?? false, sale_price: book.sale_price ?? null, ebook: book.ebook ?? false, category: book.category || '', subject_id: subjectRef(book).id,
  stock_quantity: book.stock_quantity ?? 0, is_available: book.is_available ?? true, publish_status: book.publish_status || 'draft', publisher: book.publisher || '',
  publication_year: book.publication_year ?? null, pages: book.pages ?? null, weight_grams: book.weight_grams ?? null,
})

function Field({ label, htmlFor, required, error, hint, className, children }: { label: string; htmlFor: string; required?: boolean; error?: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}{required && <span aria-hidden="true" className="text-danger"> *</span>}</Label>
      {children}
      {error ? <p id={`${htmlFor}-error`} role="alert" className="text-sm text-danger">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function Toggle({ id, label, hint, checked, onChange, disabled }: { id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
      <div className="min-w-0">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  )
}

interface BookFormProps {
  mode: 'create' | 'edit'
  book: Book | null
  onReload: () => void
}

/** Every field of a book, as a page. Files upload on their own in edit mode, and after saving when the book is new. */
export function BookForm({ mode, book, onReload }: BookFormProps) {
  const navigate = useNavigate()
  const {
    register, handleSubmit, formState: { errors, isSubmitting, isDirty }, setValue, watch, setFocus, setError,
  } = useForm<Values>({ resolver: zodResolver(bookSchema), defaultValues: book ? valuesOf(book) : EMPTY })
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectOpen, setSubjectOpen] = useState(false)
  const [left, setLeft] = useState(false)

  // Cover
  const [cover, setCover] = useState<File | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [existingCover, setExistingCover] = useState<{ url: string; key: string | null } | null>(book?.thumbnail_url ? { url: book.thumbnail_url, key: book.thumbnail_s3_key } : null)
  const [cropping, setCropping] = useState<File | null>(null)
  const [coverProgress, setCoverProgress] = useState<number | null>(null)
  const coverTouched = !!cover || (!!book?.thumbnail_url && !existingCover)

  // New book: the file waits here until the book exists
  const [ebookFile, setEbookFile] = useState<File | null>(null)
  const [ebookProgress, setEbookProgress] = useState<number | null>(null)
  const [fileProblem, setFileProblem] = useState<string | null>(null)
  const [makeSample, setMakeSample] = useState(true)
  const abort = useRef<AbortController | null>(null)

  // Edit: files are handled by the panels
  const [sample, setSample] = useState<BookSample | null>(book?.sample ?? null)
  const [filesBusy, setFilesBusy] = useState(false)
  const [sampleBusy, setSampleBusy] = useState(false)
  useEffect(() => { setSample(book?.sample ?? null) }, [book])

  useUnsavedChanges(!left && (isDirty || coverTouched || !!ebookFile || filesBusy || sampleBusy))

  useEffect(() => {
    if (!cover) { setCoverUrl(null); return }
    const url = URL.createObjectURL(cover)
    setCoverUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [cover])

  useEffect(() => {
    let live = true
    subjectsService.getSubjects({ limit: 100, is_active: true, sort_by: 'display_order', sort_order: 'asc' })
      .then((res) => { if (live && res.success && res.data) setSubjects(res.data.entities) })
      .catch(() => {})
    return () => { live = false }
  }, [])

  const v = watch()
  const busy = isSubmitting
  const backHref = book ? `/content/books/${book._id}` : '/content/books'
  const subject = subjectRef(book)
  const subjectName = v.subject_id ? subjects.find((s) => s._id === v.subject_id)?.name ?? (v.subject_id === subject.id && subject.name ? subject.name : 'Deleted subject') : null

  const goTo = (href: string) => {
    flushSync(() => setLeft(true)) // saved: nothing left to guard
    navigate(href, { replace: true }) // Back must not reopen the form
  }

  const onSubmit = async (d: Values) => {
    let thumbnail: { thumbnail_url?: string | null; thumbnail_s3_key?: string | null } = {}
    if (cover) {
      setCoverProgress(0)
      try {
        const up = await booksService.uploadThumbnail(cover, setCoverProgress)
        thumbnail = { thumbnail_url: up.thumbnailUrl, thumbnail_s3_key: up.s3Key }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to upload thumbnail')
        return
      } finally {
        setCoverProgress(null)
      }
    } else if (book?.thumbnail_url && !existingCover) {
      thumbnail = { thumbnail_url: null, thumbnail_s3_key: null }
    }

    const full: BookFormData = {
      title: d.title, author: d.author, description: d.description.trim(), isbn: d.isbn.trim() || null, price: d.price, original_price: d.original_price, is_on_sale: d.is_on_sale,
      sale_price: d.is_on_sale ? d.sale_price : null, ...thumbnail, ebook: d.ebook, category: d.category.trim() || null, subject_id: d.subject_id || null,
      stock_quantity: d.stock_quantity ?? 0, is_available: d.is_available, publish_status: d.publish_status, publisher: d.publisher.trim() || null,
      publication_year: d.publication_year, pages: d.pages, weight_grams: d.weight_grams,
    }
    let saved: Book
    try {
      const payload = mode === 'create'
        ? (Object.fromEntries(Object.entries(full).filter(([, value]) => value !== null && value !== '')) as unknown as BookFormData)
        : full
      const res = mode === 'create' ? await booksService.create(payload) : await booksService.update(book!._id, payload)
      if (!res.success || !res.data) throw new Error(res.message || 'The book could not be saved')
      saved = res.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The book could not be saved'
      if (/isbn/i.test(message)) { setError('isbn', { message: 'Another book already has this ISBN' }); setFocus('isbn') }
      toast.error(message)
      return
    }
    if (mode === 'edit') {
      toast.success('Book updated successfully')
      goTo(`/content/books/${saved._id}`)
      return
    }
    toast.success('Book created successfully')

    // The book exists now; a failed file must not create it twice.
    if (v.ebook && ebookFile) {
      const controller = new AbortController()
      abort.current = controller
      setEbookProgress(0)
      try {
        const res = await booksService.uploadEbook(saved._id, ebookFile, setEbookProgress, controller.signal)
        if (res.data?.pending) toast.success('E-book uploaded. It is being checked.')
        else {
          toast.success('E-book file uploaded successfully')
          if (makeSample) {
            await booksService.generateSample(saved._id, DEFAULT_SAMPLE_PAGES)
              .then(() => toast.success('Free sample made from the e-book'))
              .catch((err: Error) => toast.warning(`The book is ready, but the sample was not made. ${err.message}`, { duration: 10000 }))
          }
        }
      } catch (err) {
        const reason = controller.signal.aborted ? 'the upload was cancelled' : err instanceof Error ? err.message : 'the upload failed'
        toast.error(`The book was created, but the e-book file was not added: ${reason}`, { duration: 12000 })
        goTo(`/content/books/${saved._id}?tab=file`)
        return
      }
      goTo(`/content/books/${saved._id}?tab=file`)
      return
    }
    goTo(`/content/books/${saved._id}`)
  }

  const onInvalid = (errs: Record<string, unknown>) => {
    const first = (Object.keys(EMPTY) as (keyof Values)[]).find((k) => errs[k])
    if (first) setFocus(first)
  }

  const number = (name: keyof Values) => register(name, { setValueAs: toNumber })
  const bad = (name: keyof Values) => ({ 'aria-invalid': !!errors[name], 'aria-describedby': errors[name] ? `${name}-error` : undefined })

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="space-y-6">
        <Section title="Book">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="title" required error={errors.title?.message}>
              <Input id="title" placeholder="Book title" disabled={busy} {...bad('title')} {...register('title')} />
            </Field>
            <Field label="Author" htmlFor="author" required error={errors.author?.message}>
              <Input id="author" placeholder="Author name" disabled={busy} {...bad('author')} {...register('author')} />
            </Field>
            <Field label="Description" htmlFor="description" error={errors.description?.message} hint={`${(v.description || '').length} of 2000 characters`} className="sm:col-span-2">
              <Textarea id="description" rows={4} disabled={busy} {...bad('description')} {...register('description')} />
            </Field>
            <div className="space-y-1.5">
              <Label id="subject-label" htmlFor="subject">Subject</Label>
              <Popover open={subjectOpen} onOpenChange={setSubjectOpen}>
                <PopoverTrigger asChild>
                  <Button id="subject" type="button" variant="outline" role="combobox" aria-expanded={subjectOpen} aria-labelledby="subject-label" className="w-full justify-between bg-card font-normal" disabled={busy}>
                    <span className="truncate">{subjectName ?? 'Select subject...'}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search subjects..." />
                    <CommandList>
                      <CommandEmpty>No subjects found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="__none__" onSelect={() => { setValue('subject_id', '', { shouldDirty: true }); setSubjectOpen(false) }}>
                          <Check className={cn('mr-2 h-4 w-4', !v.subject_id ? 'opacity-100' : 'opacity-0')} />
                          <span className="text-muted-foreground">None</span>
                        </CommandItem>
                        {subjects.map((s) => (
                          <CommandItem key={s._id} value={`${s.name} ${s._id}`} onSelect={() => { setValue('subject_id', s._id, { shouldDirty: true }); setSubjectOpen(false) }}>
                            <Check className={cn('mr-2 h-4 w-4', v.subject_id === s._id ? 'opacity-100' : 'opacity-0')} />
                            {s.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <Field label="Category" htmlFor="category" error={errors.category?.message}>
              <Input id="category" disabled={busy} {...bad('category')} {...register('category')} />
            </Field>
          </div>
        </Section>

        <Section title="Book Thumbnail">
          {cover && coverUrl ? (
            <div className="flex items-center gap-4">
              <img src={coverUrl} alt="New thumbnail" className="h-24 w-auto max-w-[180px] rounded-md border border-border object-cover" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Cropped thumbnail ready.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => setCover(null)} disabled={busy}><X className="h-3.5 w-3.5" />Choose a different one</Button>
              </div>
            </div>
          ) : existingCover ? (
            <div className="flex items-center gap-4">
              <img src={existingCover.url} alt="Book thumbnail" className="h-24 w-auto max-w-[180px] rounded-md border border-border object-cover" />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Remove it to upload a new thumbnail.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => setExistingCover(null)} disabled={busy}><X className="h-3.5 w-3.5" />Remove thumbnail</Button>
              </div>
            </div>
          ) : (
            <FileUpload
              accept={{ 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] }}
              maxSize={5 * 1024 * 1024}
              maxFiles={1}
              value={[]}
              onChange={(files) => { if (files[0]) setCropping(files[0]) }}
              disabled={busy}
              label="Upload book thumbnail"
              description="JPEG, PNG, or WebP. Max 5MB. Will be cropped to 16:9 ratio."
            />
          )}
          {coverProgress !== null && (
            <div className="mt-3 space-y-1" aria-live="polite">
              <Progress value={coverProgress} className="h-2" aria-label="Thumbnail upload progress" />
              <p className="text-xs text-muted-foreground">Uploading thumbnail... {coverProgress}%</p>
            </div>
          )}
        </Section>

        <Section title="Price and stock">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Price (INR)" htmlFor="price" required error={errors.price?.message}>
              <Input id="price" type="number" inputMode="decimal" step="any" min={0} disabled={busy} {...bad('price')} {...register('price', { valueAsNumber: true })} />
            </Field>
            <Field label="Original Price" htmlFor="original_price" error={errors.original_price?.message} hint="Shown struck through. Leave empty for none.">
              <Input id="original_price" type="number" inputMode="decimal" step="any" min={0} disabled={busy} {...bad('original_price')} {...number('original_price')} />
            </Field>
            <Field label="Stock" htmlFor="stock_quantity" error={errors.stock_quantity?.message} hint="Printed copies.">
              <Input id="stock_quantity" type="number" inputMode="numeric" min={0} disabled={busy} {...bad('stock_quantity')} {...number('stock_quantity')} />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Toggle id="is_on_sale" label="On Sale" hint={v.is_on_sale ? 'Sale pricing active' : 'No sale'} checked={v.is_on_sale} disabled={busy}
              onChange={(on) => { setValue('is_on_sale', on, { shouldDirty: true }); if (!on) setValue('sale_price', null, { shouldDirty: true, shouldValidate: !!errors.sale_price }) }} />
            {v.is_on_sale && (
              <Field label="Sale Price (INR)" htmlFor="sale_price" required error={errors.sale_price?.message}>
                <Input id="sale_price" type="number" inputMode="decimal" step="any" min={0} disabled={busy} {...bad('sale_price')} {...number('sale_price')} />
              </Field>
            )}
          </div>
        </Section>

        <Section id="ebook" title="E-Book">
          <Toggle id="ebook-switch" label="E-Book Available" hint={v.ebook ? 'Available in physical & digital format' : 'Physical copy only'} checked={v.ebook} disabled={busy}
            onChange={(on) => { setValue('ebook', on, { shouldDirty: true }); if (!on) setEbookFile(null) }} />
          {v.ebook && (
            <div className="mt-5 space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-semibold">E-Book File</h3>
                {book ? <EbookFilePanel bookId={book._id} canEdit onChanged={onReload} onBusy={setFilesBusy} /> : (
                  <div className="space-y-3">
                    <FilePicker
                      accept=".epub,.pdf,application/epub+zip,application/pdf"
                      title="Click to select e-book file"
                      hint="EPUB, up to 500 MB. A PDF is converted to EPUB when the server is set up for it."
                      maxBytes={MAX_EBOOK}
                      file={ebookFile}
                      onPick={(f) => { setEbookFile(f); setFileProblem(null) }}
                      onError={setFileProblem}
                      disabled={busy}
                      progress={ebookProgress}
                      onCancel={() => abort.current?.abort()}
                    />
                    {fileProblem && <p role="alert" className="text-sm text-danger">{fileProblem}</p>}
                    {ebookFile && (
                      <label className="flex items-start gap-2.5 text-sm">
                        <Checkbox checked={makeSample} onCheckedChange={(c) => setMakeSample(c === true)} disabled={busy} className="mt-0.5" />
                        <span>Make a free sample from it (about {DEFAULT_SAMPLE_PAGES} pages, never more than 15% of the book)</span>
                      </label>
                    )}
                  </div>
                )}
              </div>
              {book && (
                <div className="border-t border-border pt-5">
                  <h3 className="mb-3 text-sm font-semibold">Free sample</h3>
                  <SamplePanel book={{ ...book, sample }} canEdit onChanged={setSample} onBusy={setSampleBusy} />
                </div>
              )}
            </div>
          )}
        </Section>

        <Section title="Publication details">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="ISBN" htmlFor="isbn" error={errors.isbn?.message}>
              <Input id="isbn" className="font-mono" disabled={busy} {...bad('isbn')} {...register('isbn')} />
            </Field>
            <Field label="Publisher" htmlFor="publisher" error={errors.publisher?.message}>
              <Input id="publisher" disabled={busy} {...bad('publisher')} {...register('publisher')} />
            </Field>
            <Field label="Pages" htmlFor="pages" error={errors.pages?.message}>
              <Input id="pages" type="number" inputMode="numeric" min={1} disabled={busy} {...bad('pages')} {...number('pages')} />
            </Field>
            <Field label="Year" htmlFor="publication_year" error={errors.publication_year?.message}>
              <Input id="publication_year" type="number" inputMode="numeric" disabled={busy} {...bad('publication_year')} {...number('publication_year')} />
            </Field>
            <Field label="Weight (g)" htmlFor="weight_grams" error={errors.weight_grams?.message}>
              <Input id="weight_grams" type="number" inputMode="numeric" min={0} disabled={busy} {...bad('weight_grams')} {...number('weight_grams')} />
            </Field>
          </div>
        </Section>

        <Section title="Visibility">
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <Toggle id="is_available" label="Available" hint={v.is_available ? 'Book is listed' : 'Book is hidden'} checked={v.is_available} disabled={busy} onChange={(on) => setValue('is_available', on, { shouldDirty: true })} />
            <Field label="Publish Status" htmlFor="publish_status" hint="Draft content is only visible to admins. Publish when ready for users.">
              <Select value={v.publish_status} onValueChange={(x) => setValue('publish_status', x as Values['publish_status'], { shouldDirty: true })} disabled={busy}>
                <SelectTrigger id="publish_status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </Section>

        <div className="sticky -bottom-4 z-10 -mx-4 flex gap-2 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:bottom-0 sm:mx-0 sm:justify-end sm:rounded-xl sm:border">
          <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => navigate(backHref)} disabled={busy}>Cancel</Button>
          <Button type="submit" className="flex-1 sm:flex-none" disabled={busy || filesBusy || sampleBusy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? (coverProgress !== null || ebookProgress !== null ? 'Uploading…' : mode === 'create' ? 'Adding…' : 'Saving…') : mode === 'create' ? 'Add Book' : 'Update Book'}
          </Button>
        </div>
      </form>

      <ImageCropper
        file={cropping}
        open={!!cropping}
        onClose={() => setCropping(null)}
        onCropComplete={(f) => { setCover(f); setExistingCover(null); setCropping(null) }}
        aspectRatio={BOOK_THUMBNAIL_ASPECT_RATIO}
        title="Crop Book Thumbnail"
        description="Adjust the crop area for the book cover (16:9 ratio)."
      />
    </>
  )
}
