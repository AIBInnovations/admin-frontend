import { useEffect, useRef, useState } from 'react'
import { BookText, FileText, ImagePlus, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { booksService, type Book, type BookFormData } from '@/services/books.service'
import { documentsService } from '@/services/documents.service'
import { subjectsService, type Subject } from '@/services/subjects.service'
import { useUnsavedChanges } from '@/components/layouts/workspaceStore'
import { useExplorerAccess } from '../access'
import { usePanelSelection } from '../context/PanelSelectionContext'
import { useEntityForm } from '../hooks/useEntityForm'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import { useMediaUpload } from '../hooks/useMediaUpload'
import { FileUploadField } from '../media/FileUploadField'
import { ImageCropField } from '../media/ImageCropField'
import { EbookBadge, PublishBadge, SaleBadge, UnavailableBadge } from '../ui/StatusBadge'
import { Thumb } from '../ui/Thumb'
import { fileSize } from '../ui/text'
import { EntityHeaderActions } from './EntityHeaderActions'
import { PanelShell } from './PanelShell'
import { AreaField, PanelField, PanelSectionTitle, PanelSelect, PanelSwitchRow, SelectField, SwitchField, TextField } from './fields'
import { idOf, isWhole, ORDER_ERROR, payload, refId, toNumber } from './helpers'

interface Props { entity: Book | null; onRefresh: () => Promise<void> }

const wholeAtLeast = (v: string, min: number) => v.trim() === '' || (Number.isInteger(Number(v)) && Number(v) >= min)

export function BookPanel({ entity, onRefresh }: Props) {
  const { can } = useExplorerAccess()
  const { select } = usePanelSelection()
  const isEdit = !!entity
  const canEdit = can('book', isEdit ? 'update' : 'create')
  const cover = useMediaUpload()
  const ebookUpload = useMediaUpload()
  const gallery = useMediaUpload()
  const imageInput = useRef<HTMLInputElement>(null)

  const [subjects, setSubjects] = useState<Subject[]>([])
  useEffect(() => {
    let live = true
    subjectsService.getSubjects({ page: 1, limit: 200, sort_by: 'name', sort_order: 'asc' }).then((res) => { if (live && res.data) setSubjects(res.data.entities) }).catch(() => {})
    return () => { live = false }
  }, [])

  // eBook as a document inside a subject
  const [linkSubjectId, setLinkSubjectId] = useState('')
  const [linkFree, setLinkFree] = useState(false)

  // The upload goes on when another row is opened; closing the tab would stop it.
  useUnsavedChanges(ebookUpload.uploading)

  const form = useEntityForm({
    id: 'book',
    what: 'book',
    label: (v) => v.title || 'New book',
    readOnly: !canEdit,
    initial: () => ({
      title: entity?.title ?? '',
      author: entity?.author ?? '',
      description: entity?.description ?? '',
      isbn: entity?.isbn ?? '',
      category: entity?.category ?? '',
      subject_id: refId(entity?.subject_id),
      publisher: entity?.publisher ?? '',
      publication_year: entity?.publication_year?.toString() ?? '',
      pages: entity?.pages?.toString() ?? '',
      weight_grams: entity?.weight_grams?.toString() ?? '',
      display_order: entity?.display_order?.toString() ?? '',
      price: entity?.price?.toString() ?? '',
      original_price: entity?.original_price?.toString() ?? '',
      is_on_sale: entity?.is_on_sale ?? false,
      sale_price: entity?.sale_price?.toString() ?? '',
      stock_quantity: entity?.stock_quantity?.toString() ?? '0',
      is_available: entity?.is_available ?? true,
      ebook: entity?.ebook ?? false,
    }),
    validate: (v) => ({
      ...(v.title.trim().length < 2 ? { title: 'Use at least 2 characters.' } : v.title.length > 200 ? { title: 'Use at most 200 characters.' } : {}),
      ...(v.author.trim().length < 2 ? { author: 'Use at least 2 characters.' } : v.author.length > 100 ? { author: 'Use at most 100 characters.' } : {}),
      ...(v.description.length > 2000 ? { description: 'Use at most 2,000 characters.' } : {}),
      ...(v.publication_year.trim() && !(Number(v.publication_year) >= 1900 && Number(v.publication_year) <= new Date().getFullYear() + 1) ? { publication_year: 'Enter a year from 1900.' } : {}),
      ...(!wholeAtLeast(v.pages, 1) ? { pages: 'Use a whole number.' } : {}),
      ...(!wholeAtLeast(v.weight_grams, 0) ? { weight_grams: 'Use whole grams.' } : {}),
      ...(!isWhole(v.display_order) ? { display_order: ORDER_ERROR } : {}),
      ...(v.price.trim() === '' || !(Number(v.price) >= 0) ? { price: 'Enter a price, 0 or more.' } : {}),
      ...(v.original_price.trim() && !(Number(v.original_price) >= 0) ? { original_price: 'Enter a price, 0 or more.' } : {}),
      ...(v.is_on_sale && !(Number(v.sale_price) > 0) ? { sale_price: 'Enter the sale price.' } : v.is_on_sale && Number(v.sale_price) >= Number(v.price) ? { sale_price: 'It must be less than the price.' } : {}),
      ...(!wholeAtLeast(v.stock_quantity, 0) ? { stock_quantity: ORDER_ERROR } : {}),
    }),
    submit: (v, changed) => {
      // On an edit, emptying a field clears it; on a create it is left out.
      const empty = isEdit ? null : undefined
      const text = (x: string) => x.trim() || empty
      const num = (x: string) => toNumber(x) ?? empty
      const data = payload<typeof v>(isEdit ? changed : v, {
        title: (x) => x.trim(), author: (x) => x.trim(), description: text, isbn: text, category: text, publisher: text,
        subject_id: (x) => x || empty, publication_year: num, pages: num, weight_grams: num, original_price: num,
        display_order: toNumber, price: Number, stock_quantity: (x) => toNumber(x) ?? 0, sale_price: num,
      })
      if (!v.is_on_sale) delete data.sale_price
      return isEdit ? booksService.update(entity._id, data as Partial<BookFormData>) : booksService.create(data as unknown as BookFormData)
    },
    onSaved: async (result) => {
      await onRefresh()
      const id = idOf(result)
      if (!isEdit && id) select('book', id)
    },
    savedMessage: (v) => (isEdit ? `"${v.title}" saved` : `"${v.title}" created`),
  })
  const v = form.values

  const makeDocument = useExplorerMutation({
    name: 'Make eBook a document',
    what: 'creating documents',
    fn: () => documentsService.createLinked({ source_book_id: entity!._id, subject_id: linkSubjectId || undefined, is_free: linkFree }),
    onSuccess: () => onRefresh(),
    successMessage: 'eBook added as a document',
  })

  async function addGalleryImage(file: File) {
    if (!entity) return
    await gallery.run('Add image', async () => {
      const up = await booksService.uploadThumbnail(file)
      return booksService.addImages(entity._id, [up.thumbnailUrl])
    })
    await onRefresh()
  }
  async function removeGalleryImage(index: number) {
    if (!entity) return
    await gallery.run('Remove image', async () => booksService.removeImage(entity._id, index))
    await onRefresh()
  }

  const canMakeDoc = isEdit && entity.ebook && !!entity.ebook_file_url && can('document', 'create')

  return (
    <PanelShell
      icon={<Thumb src={entity?.thumbnail_url} fallback={<BookText className="h-4 w-4" />} className="h-12 w-9" />}
      title={isEdit ? v.title || 'Book' : 'New book'}
      subtitle={isEdit ? v.author : 'Cover, gallery and eBook can be added after it is created'}
      badges={isEdit ? (
        <>
          {entity.ebook && <EbookBadge />}
          {entity.is_on_sale && <SaleBadge />}
          {!entity.is_available && <UnavailableBadge />}
          <PublishBadge status={entity.publish_status} />
        </>
      ) : undefined}
      headerActions={isEdit && <EntityHeaderActions kind="book" entityType="book" id={entity._id} name={entity.title} publishStatus={entity.publish_status} data={entity} idLabel="Book ID" />}
      form={form}
      saveLabel={isEdit ? 'Save changes' : 'Create book'}
      savingLabel={isEdit ? 'Saving…' : 'Creating…'}
    >
      <TextField form={form} name="title" label="Title" required autoFocus={!isEdit} />
      <TextField form={form} name="author" label="Author" required />
      <AreaField form={form} name="description" label="Description" />
      <div className="grid grid-cols-2 gap-3">
        <TextField form={form} name="isbn" label="ISBN" />
        <TextField form={form} name="category" label="Category" />
      </div>
      <SelectField form={form} name="subject_id" label="Subject">
        <option value="">None</option>
        {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        {v.subject_id && !subjects.some((s) => s._id === v.subject_id) && <option value={v.subject_id}>{(entity?.subject_id as { name?: string } | null)?.name ?? 'Deleted subject'}</option>}
      </SelectField>
      <div className="grid grid-cols-2 gap-3">
        <TextField form={form} name="publisher" label="Publisher" />
        <TextField form={form} name="publication_year" label="Publication year" type="number" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <TextField form={form} name="pages" label="Pages" type="number" min={1} />
        <TextField form={form} name="weight_grams" label="Weight (g)" type="number" min={0} />
        <TextField form={form} name="display_order" label="Order" type="number" min={0} />
      </div>

      <PanelSectionTitle>Pricing</PanelSectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <TextField form={form} name="price" label="Price (₹)" required type="number" min={0} />
        <TextField form={form} name="original_price" label="Original price (₹)" type="number" min={0} />
      </div>
      <SwitchField form={form} name="is_on_sale" label="On sale" />
      {v.is_on_sale && <TextField form={form} name="sale_price" label="Sale price (₹)" required type="number" min={0} />}

      <PanelSectionTitle>Stock</PanelSectionTitle>
      <TextField form={form} name="stock_quantity" label="Stock quantity" type="number" min={0} className="w-40" />
      <SwitchField form={form} name="is_available" label="Available" hint="Visible to students" />

      {isEdit && (
        <>
          <PanelSectionTitle>Cover</PanelSectionTitle>
          <ImageCropField
            label="Cover image"
            aspect={16 / 9}
            hint="16:9. JPEG, PNG or WebP, up to 5 MB."
            value={entity.thumbnail_url}
            disabled={!canEdit}
            uploading={cover.uploading}
            uploadProgress={cover.progress}
            onUpload={async (file) => {
              await cover.run('Upload cover', async () => {
                const res = await booksService.uploadThumbnail(file)
                return booksService.update(entity._id, { thumbnail_url: res.thumbnailUrl, thumbnail_s3_key: res.s3Key })
              })
              await onRefresh()
            }}
          />
          <div className="space-y-1.5">
            <p className="text-[13px] font-medium text-foreground">Gallery images ({entity.images?.length ?? 0})</p>
            <div className="flex flex-wrap gap-2">
              {(entity.images ?? []).map((src, i) => (
                <div key={`${src}-${i}`} className="relative">
                  <Thumb src={src} fallback={<BookText className="h-4 w-4" />} className="h-14 w-14 border border-border" />
                  {canEdit && (
                    <button type="button" aria-label={`Remove image ${i + 1}`} onClick={() => void removeGalleryImage(i)} disabled={gallery.uploading} className="absolute -right-1.5 -top-1.5 rounded-full border border-border bg-card p-0.5 text-muted-foreground shadow-card transition-colors hover:text-danger disabled:opacity-50">
                      <X aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {canEdit && (
                <button type="button" aria-label="Add gallery image" onClick={() => imageInput.current?.click()} disabled={gallery.uploading} className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-input text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50">
                  {gallery.uploading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ImagePlus aria-hidden="true" className="h-4 w-4" />}
                </button>
              )}
              <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void addGalleryImage(f) }} />
            </div>
          </div>

          <PanelSectionTitle>eBook</PanelSectionTitle>
          <SwitchField form={form} name="ebook" label="This title has an eBook" />
          {v.ebook && entity.ebook_file_url && <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-[13px] text-foreground"><FileText aria-hidden="true" className="h-4 w-4 text-muted-foreground" />{entity.ebook_file_format?.toUpperCase() ?? 'File'}, {fileSize(entity.ebook_file_size_mb)}</p>}
          {v.ebook && canEdit && (
            <FileUploadField
              label={entity.ebook_file_url ? 'Replace eBook file' : 'Upload eBook file'}
              accept=".pdf,.epub"
              maxMb={500}
              buttonLabel={entity.ebook_file_url ? 'Replace eBook' : 'Upload eBook'}
              hint="PDF or EPUB, up to 500 MB."
              uploading={ebookUpload.uploading}
              uploadProgress={ebookUpload.progress}
              onPick={async (file) => { await ebookUpload.run('Upload eBook', (onProgress) => booksService.uploadEbook(entity._id, file, onProgress)); await onRefresh() }}
            />
          )}

          <PanelSectionTitle>Linked documents</PanelSectionTitle>
          {canMakeDoc ? (
            <div className="space-y-3">
              <p className="text-[13px] text-muted-foreground">Publish this eBook as a document so students can read it inside a subject. Title, file and cover stay in sync with this book.</p>
              <PanelField label="Attach to subject (optional)" htmlFor="book-link-subject">
                <PanelSelect id="book-link-subject" value={linkSubjectId} onChange={setLinkSubjectId}>
                  <option value="">No subject (library)</option>
                  {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </PanelSelect>
              </PanelField>
              <PanelSwitchRow id="book-link-free" label="Free document" checked={linkFree} onChange={setLinkFree} />
              <Button type="button" size="sm" onClick={() => void makeDocument.execute()} disabled={makeDocument.loading}>
                {makeDocument.loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating…</> : <><FileText className="h-3.5 w-3.5" /> Make eBook a document</>}
              </Button>
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">Turn on the eBook and upload a PDF or EPUB above to publish it as a document.</p>
          )}
        </>
      )}
    </PanelShell>
  )
}
