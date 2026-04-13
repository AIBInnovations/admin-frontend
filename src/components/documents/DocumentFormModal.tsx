import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import axios from 'axios'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Loader2, Upload, Check, ChevronsUpDown, FileText, X, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Document, DocumentFormData, documentsService } from '@/services/documents.service'
import { Series, seriesService } from '@/services/series.service'
import { Subject, subjectsService } from '@/services/subjects.service'
import { Book, booksService } from '@/services/books.service'
import { ImageUploadWithCrop } from '@/components/common/ImageUploadWithCrop'

const documentSchema = z.object({
  // Title is optional at the schema level because linked-mode docs mirror the
  // title from the Book. The submit handler validates presence for standalone
  // mode and surfaces a clear error.
  title: z.string().max(300).optional().or(z.literal('')),
  description: z.string().max(2000).optional().or(z.literal('')),
  series_id: z.string().optional().or(z.literal('')),
  subject_id: z.string().optional().or(z.literal('')),
  is_free: z.boolean(),
  publish_status: z.enum(['draft', 'published']),
  display_order: z.number().int().min(0).optional().or(z.nan()),
})

type DocumentFormValues = z.infer<typeof documentSchema>

interface DocumentFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (
    data: DocumentFormData,
    file?: File,
    onProgress?: (percent: number) => void,
    linkedBookId?: string,
  ) => Promise<void>
  document?: Document | null
  mode: 'create' | 'edit'
  defaultSeriesId?: string
}

export function DocumentFormModal({ open, onClose, onSubmit, document: doc, mode, defaultSeriesId }: DocumentFormModalProps) {
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [seriesPopoverOpen, setSeriesPopoverOpen] = useState(false)
  const [subjectPopoverOpen, setSubjectPopoverOpen] = useState(false)
  const [docFile, setDocFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  // Link-to-Book state
  const [linkMode, setLinkMode] = useState(false)
  const [books, setBooks] = useState<Book[]>([])
  const [booksLoading, setBooksLoading] = useState(false)
  const [booksError, setBooksError] = useState<string | null>(null)
  const [booksTruncated, setBooksTruncated] = useState(false)
  const [selectedBookId, setSelectedBookId] = useState<string>('')
  const [bookPopoverOpen, setBookPopoverOpen] = useState(false)
  const [linkSubmitError, setLinkSubmitError] = useState<string | null>(null)

  // True if editing an existing document that was created as linked-to-book.
  // In this case linkMode is forced on and cannot be toggled off.
  const existingLinkedBook =
    mode === 'edit' && doc?.source_book_id && typeof doc.source_book_id === 'object'
      ? doc.source_book_id
      : null
  const isLinked = linkMode || !!existingLinkedBook

  const {
    register, handleSubmit, control,
    formState: { errors, isSubmitting },
    reset, setValue, watch,
  } = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: '', description: '', series_id: '', subject_id: '', is_free: false,
      publish_status: 'draft' as const, display_order: 0,
    },
  })

  const isFree = watch('is_free')
  const selectedSubjectId = watch('subject_id')

  // Fetch dropdown data
  useEffect(() => {
    if (open) {
      seriesService.getAll({ limit: 100, sort_by: 'name', sort_order: 'asc' }).then((res) => {
        if (res.success && res.data) setSeriesList(res.data.entities)
      })
      subjectsService.getSubjects({ limit: 100, is_active: true, sort_by: 'display_order', sort_order: 'asc' }).then((res) => {
        if (res.success && res.data) setSubjects(res.data.entities)
      })
    }
  }, [open])

  // Fetch books when link-mode is engaged (or when editing a linked doc, for context).
  // The admin books endpoint accepts limit up to 5000, which covers any realistic
  // catalog. We pull in one shot and warn if even more exist.
  useEffect(() => {
    if (!open || (!linkMode && !existingLinkedBook)) return
    const PICKER_LIMIT = 5000
    setBooksLoading(true)
    setBooksError(null)
    setBooksTruncated(false)
    booksService
      .getAll({ limit: PICKER_LIMIT })
      .then((res) => {
        if (res.success && res.data) {
          const total = res.data.pagination?.total ?? res.data.entities.length
          setBooksTruncated(total > PICKER_LIMIT)
          // Only books that are flagged as eBooks AND have an actual file uploaded.
          const eligible = res.data.entities.filter(
            (b) => b.ebook && b.ebook_file_url && b.ebook_s3_key,
          )
          setBooks(eligible)
        } else {
          setBooksError(res.message || 'Failed to load books')
        }
      })
      .catch((err) => setBooksError(err?.message || 'Failed to load books'))
      .finally(() => setBooksLoading(false))
  }, [open, linkMode, existingLinkedBook])

  // Reset form
  useEffect(() => {
    if (open) {
      setDocFile(null)
      setThumbnailFile(null)
      setLinkSubmitError(null)
      // Reset link-mode state — auto-engaged when editing an already-linked doc
      if (mode === 'edit' && doc?.source_book_id) {
        setLinkMode(false) // not toggleable in edit mode; existingLinkedBook drives isLinked
        const id = typeof doc.source_book_id === 'object' ? doc.source_book_id._id : doc.source_book_id
        setSelectedBookId(id || '')
      } else {
        setLinkMode(false)
        setSelectedBookId('')
      }
      if (mode === 'edit' && doc) {
        const seriesId = doc.series_id && typeof doc.series_id === 'object' ? doc.series_id._id : (doc.series_id as string) || ''
        const subjectId = doc.subject_id && typeof doc.subject_id === 'object' ? (doc.subject_id as any)._id : (doc.subject_id as string) || ''
        reset({
          title: doc.title,
          description: doc.description || '',
          series_id: seriesId,
          subject_id: subjectId,
          is_free: doc.is_free,
          publish_status: doc.publish_status || 'draft',
          display_order: doc.display_order,
        })
      } else {
        reset({
          title: '', description: '', series_id: defaultSeriesId || '', subject_id: '', is_free: false,
          publish_status: 'draft' as const, display_order: 0,
        })
      }
    }
  }, [open, mode, doc, reset, defaultSeriesId])

  /**
   * Upload thumbnail to S3 via presigned URL (3-step flow)
   */
  const uploadThumbnail = async (file: File): Promise<{ thumbnail_url: string; thumbnail_s3_key: string } | null> => {
    const mimeType = file.type || 'image/jpeg'

    const urlRes = await documentsService.getThumbnailUploadUrl(mimeType)
    if (!urlRes.success || !urlRes.data) {
      throw new Error(urlRes.message || 'Failed to get thumbnail upload URL')
    }
    const { uploadUrl, s3Key, thumbnailUrl } = urlRes.data

    await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': mimeType },
    })

    return { thumbnail_url: thumbnailUrl, thumbnail_s3_key: s3Key }
  }

  const handleFormSubmit = async (data: DocumentFormValues) => {
    setLinkSubmitError(null)

    // ── Linked-mode validation (create only — link is immutable post-create) ──
    if (linkMode && mode === 'create') {
      if (!selectedBookId) {
        setLinkSubmitError('Please select an eBook to link this document to.')
        return
      }
    }

    // ── Standalone-mode validation ──
    if (!isLinked) {
      if (!data.title || data.title.trim().length < 2) {
        setLinkSubmitError('Title must be at least 2 characters.')
        return
      }
      if (mode === 'create' && !docFile) {
        setLinkSubmitError('Please choose a document file to upload.')
        return
      }
    }

    setUploadProgress(null)

    try {
      let thumbnailData: { thumbnail_url: string; thumbnail_s3_key: string } | null = null
      // Skip thumbnail upload entirely for linked docs (mirrored from Book)
      if (!isLinked && thumbnailFile) {
        thumbnailData = await uploadThumbnail(thumbnailFile)
      }

      const formData: DocumentFormData = {
        title: data.title || '',
        description: data.description || '',
        series_id: data.series_id || undefined,
        subject_id: data.subject_id || undefined,
        is_free: data.is_free,
        publish_status: data.publish_status,
        display_order: data.display_order || undefined,
        ...(thumbnailData && {
          thumbnail_url: thumbnailData.thumbnail_url,
          thumbnail_s3_key: thumbnailData.thumbnail_s3_key,
        }),
      }

      // For linked-mode CREATE: pass linkedBookId, no file. Parent calls createLinked.
      // For linked-mode EDIT: pass linkedBookId so the parent knows not to send mirrored
      //   fields (parent should also strip them defensively).
      // For standalone: pass docFile (may be undefined in edit if not replacing).
      const linkedBookId = isLinked ? (existingLinkedBook?._id || selectedBookId) : undefined
      const fileForParent = isLinked ? undefined : (docFile || undefined)

      await onSubmit(formData, fileForParent, (pct) => setUploadProgress(pct), linkedBookId)
      onClose()
    } catch (error: any) {
      // Surface the failure inline AND let the parent show its modal.
      // The thrown error already triggers the parent's catch.
      console.error('Form submission error:', error)
      setLinkSubmitError(error?.message || 'Submission failed')
    } finally {
      setUploadProgress(null)
    }
  }

  const handleClose = () => { if (!isSubmitting) onClose() }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Upload Document' : 'Edit Document'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Upload a new study document.' : 'Update the document details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* ──────────────────────────────────────────────────────────
              LINKED-DOC HEADER
              - Edit mode + already linked: read-only badge with book info
              - Create mode: toggle to engage link mode + book picker
             ────────────────────────────────────────────────────────── */}
          {existingLinkedBook ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-950/30">
              <div className="flex items-start gap-2">
                <Link2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Linked to eBook: {existingLinkedBook.title}
                  </p>
                  {existingLinkedBook.author && (
                    <p className="text-xs text-blue-700 dark:text-blue-300 truncate">by {existingLinkedBook.author}</p>
                  )}
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Title, description, cover image, and the file are managed on the source Book and update automatically.
                    Edit those on the Book page.
                  </p>
                </div>
              </div>
            </div>
          ) : mode === 'create' ? (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5 pr-4">
                <Label htmlFor="link_mode" className="text-sm flex items-center gap-2">
                  <Link2 className="h-4 w-4" /> Link to existing eBook
                </Label>
                <p className="text-xs text-muted-foreground">
                  Mirror an eBook's file and details into a Document. Changes to the Book auto-propagate.
                </p>
              </div>
              <Switch
                id="link_mode"
                checked={linkMode}
                onCheckedChange={(c) => {
                  setLinkMode(c)
                  setLinkSubmitError(null)
                  if (!c) setSelectedBookId('')
                }}
                disabled={isSubmitting}
              />
            </div>
          ) : null}

          {/* Book picker (create + linkMode only) */}
          {linkMode && mode === 'create' && (
            <div className="space-y-2">
              <Label>Source eBook <span className="text-red-500">*</span></Label>
              <Popover open={bookPopoverOpen} onOpenChange={setBookPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                    disabled={isSubmitting || booksLoading}
                  >
                    {booksLoading
                      ? 'Loading books...'
                      : selectedBookId
                        ? books.find((b) => b._id === selectedBookId)?.title ?? 'Select an eBook...'
                        : 'Select an eBook...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search eBooks..." />
                    <CommandList>
                      <CommandEmpty>
                        {booksError
                          ? `Failed to load: ${booksError}`
                          : 'No eligible eBooks found. A book must have ebook=true and an uploaded file.'}
                      </CommandEmpty>
                      <CommandGroup>
                        {books.map((b) => (
                          <CommandItem
                            key={b._id}
                            // Append the id to keep each row's cmdk value unique even
                            // when two books share the same title+author. Default
                            // case-insensitive substring filter still matches search
                            // input against title/author.
                            value={`${b.title} ${b.author} ${b._id}`}
                            onSelect={() => {
                              setSelectedBookId(b._id)
                              setBookPopoverOpen(false)
                            }}
                          >
                            <Check className={cn('mr-2 h-4 w-4 shrink-0', selectedBookId === b._id ? 'opacity-100' : 'opacity-0')} />
                            <span className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="truncate">{b.title}</span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {b.ebook_file_format?.toUpperCase()} · {b.author}
                              </span>
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedBookId && (() => {
                const b = books.find((x) => x._id === selectedBookId)
                if (!b) return null
                return (
                  <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
                    <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="font-medium truncate">{b.title}</p>
                      <p className="text-muted-foreground truncate">
                        {b.ebook_file_format?.toUpperCase()} · {b.ebook_file_size_mb?.toFixed(1)} MB · by {b.author}
                      </p>
                    </div>
                  </div>
                )
              })()}
              <p className="text-xs text-muted-foreground">
                The document's title, description, cover, and file will mirror this eBook.
              </p>
              {booksTruncated && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1 dark:bg-amber-950/30 dark:border-amber-900/50">
                  Showing the first 5000 books. If you can't find the eBook you want, contact support.
                </p>
              )}
            </div>
          )}

          {/* Title — hidden when linked (mirrored from book) */}
          {!isLinked && (
            <div className="space-y-2">
              <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
              <Input id="title" placeholder="e.g., Anatomy Notes Chapter 1" disabled={isSubmitting} {...register('title')} />
              {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
            </div>
          )}

          {/* Description — hidden when linked */}
          {!isLinked && (
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Document description..." rows={2} disabled={isSubmitting} {...register('description')} />
              {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
            </div>
          )}

          {/* Cover Image — hidden when linked */}
          {!isLinked && (
            <div className="space-y-2">
              <Label>Cover Image</Label>
              <ImageUploadWithCrop
                value={thumbnailFile}
                onChange={setThumbnailFile}
                aspectRatio={16 / 9}
                maxSize={5 * 1024 * 1024}
                label="Upload cover image"
                description="Recommended ratio: 16:9. Max 5MB. JPEG, PNG, or WebP."
                disabled={isSubmitting}
                currentImageUrl={mode === 'edit' ? doc?.thumbnail_url : undefined}
              />
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <Label>Subject</Label>
            <Popover open={subjectPopoverOpen} onOpenChange={setSubjectPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={subjectPopoverOpen}
                  className="w-full justify-between font-normal"
                  disabled={isSubmitting}
                >
                  {selectedSubjectId
                    ? subjects.find((s) => s._id === selectedSubjectId)?.name ?? 'Select subject...'
                    : 'Select subject...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search subjects..." />
                  <CommandList>
                    <CommandEmpty>No subjects found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="__none__"
                        onSelect={() => { setValue('subject_id', ''); setSubjectPopoverOpen(false) }}
                      >
                        <Check className={cn('mr-2 h-4 w-4', !selectedSubjectId ? 'opacity-100' : 'opacity-0')} />
                        <span className="text-muted-foreground">None</span>
                      </CommandItem>
                      {subjects.map((subject) => (
                        <CommandItem
                          key={subject._id}
                          value={subject.name}
                          onSelect={() => { setValue('subject_id', subject._id); setSubjectPopoverOpen(false) }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', selectedSubjectId === subject._id ? 'opacity-100' : 'opacity-0')} />
                          {subject.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Series */}
          <div className="space-y-2">
            <Label>Series</Label>
            <Controller
              name="series_id" control={control}
              render={({ field }) => {
                const selectedSeries = seriesList.find((s) => s._id === field.value)
                return (
                  <Popover open={seriesPopoverOpen} onOpenChange={setSeriesPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={seriesPopoverOpen}
                        className="w-full justify-between font-normal"
                        disabled={isSubmitting || (mode === 'create' && !!defaultSeriesId)}
                      >
                        {selectedSeries
                          ? `${selectedSeries.name}${typeof selectedSeries.package_id === 'object' ? ` (${selectedSeries.package_id.name})` : ''}`
                          : 'Select series...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search series..." />
                        <CommandList>
                          <CommandEmpty>No series found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="__no_series__"
                              onSelect={() => {
                                field.onChange('')
                                setSeriesPopoverOpen(false)
                              }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', !field.value ? 'opacity-100' : 'opacity-0')} />
                              <span className="text-muted-foreground">None</span>
                            </CommandItem>
                            {seriesList.map((s) => (
                              <CommandItem
                                key={s._id}
                                value={`${s.name}${typeof s.package_id === 'object' ? ` (${s.package_id.name})` : ''}`}
                                onSelect={() => {
                                  field.onChange(s._id)
                                  setSeriesPopoverOpen(false)
                                }}
                              >
                                <Check className={cn('mr-2 h-4 w-4 shrink-0', field.value === s._id ? 'opacity-100' : 'opacity-0')} />
                                <span className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="truncate">{s.name}{typeof s.package_id === 'object' ? ` (${s.package_id.name})` : ''}</span>
                                  {s.publish_status === 'draft' && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Draft</span>
                                  )}
                                  {s.is_active === false && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">Inactive</span>
                                  )}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )
              }}
            />
            <p className="text-xs text-muted-foreground">
              All items shown including drafts and inactive
            </p>
            {errors.series_id && <p className="text-sm text-red-500">{errors.series_id.message}</p>}
          </div>

          {/* Document File — hidden for linked docs (file is mirrored from Book) */}
          {!isLinked && (
          <div className="space-y-2">
            <Label>
              Document File {mode === 'create' && <span className="text-red-500">*</span>}
            </Label>

            {/* Existing file info card (edit mode, no new file picked yet) */}
            {mode === 'edit' && doc && !docFile && (
              <div className="flex items-center gap-2 rounded-md border bg-background p-3">
                <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    Current: {doc.file_format?.toUpperCase()} file
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {doc.file_size_mb ? `${doc.file_size_mb.toFixed(1)} MB` : 'Unknown size'}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">Select a new file to replace</span>
              </div>
            )}

            {docFile ? (
              <div className="flex items-center gap-2 rounded-md border bg-background p-3">
                <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{docFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(docFile.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => setDocFile(null)}
                  disabled={isSubmitting}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm hover:bg-muted/50 transition-colors flex-1">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {mode === 'edit' ? 'Choose new document file...' : 'Choose document file...'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.epub,.doc,.docx,.ppt,.pptx"
                    className="hidden"
                    onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                    disabled={isSubmitting}
                  />
                </label>
              </div>
            )}

            {!docFile && mode === 'create' && (
              <p className="text-xs text-muted-foreground">Supported: PDF, EPUB, DOC, DOCX, PPT, PPTX (max 100 MB)</p>
            )}
          </div>
          )}

          {/* Display Order + Free Toggle */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input id="display_order" type="number" min={0} disabled={isSubmitting} {...register('display_order', { valueAsNumber: true })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="is_free" className="text-sm">Free</Label>
                <p className="text-xs text-muted-foreground">
                  {isFree ? 'Free access' : 'Paid only'}
                </p>
              </div>
              <Switch
                id="is_free" checked={isFree}
                onCheckedChange={(checked) => setValue('is_free', checked)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Publish Status */}
          <div className="space-y-2">
            <Label>Publish Status</Label>
            <Select
              value={watch('publish_status')}
              onValueChange={(value) => setValue('publish_status', value as 'draft' | 'published')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Draft content is only visible to admins. Publish when ready for users.
            </p>
          </div>

          {/* Upload progress bar */}
          {uploadProgress !== null && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{uploadProgress < 100 ? 'Uploading to cloud...' : 'Finalizing...'}</span>
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

          {/* Inline submit error (the parent ALSO shows an error modal for thrown errors) */}
          {linkSubmitError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 dark:bg-red-950/30 dark:border-red-900/50">
              {linkSubmitError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                (mode === 'create' && !isLinked && !docFile) ||
                (mode === 'create' && linkMode && !selectedBookId)
              }
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === 'create' ? (isLinked ? 'Linking...' : 'Uploading...') : 'Updating...'}</>
              ) : (
                <>{mode === 'create' ? (isLinked ? 'Link eBook as Document' : 'Upload Document') : 'Update Document'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
