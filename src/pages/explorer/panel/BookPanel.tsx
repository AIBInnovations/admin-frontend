import { useEffect, useRef, useState } from 'react'
import { BookText, FileText, ImagePlus, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PanelShell } from './PanelShell'
import { PanelField, PanelSectionTitle, PanelSelect, PanelSwitchRow, PanelText, PanelTextarea } from './fields'
import { EntityHeaderActions } from './EntityHeaderActions'
import { PublishBadge, SaleBadge } from '../ui/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { ImageCropField } from '../media/ImageCropField'
import { FileUploadField } from '../media/FileUploadField'
import { usePanelForm } from '../hooks/usePanelForm'
import { useExplorerMutation } from '../hooks/useExplorerMutation'
import { useMediaUpload } from '../hooks/useMediaUpload'
import { booksService, type Book } from '@/services/books.service'
import { documentsService } from '@/services/documents.service'
import { subjectsService, type Subject } from '@/services/subjects.service'

interface BookPanelProps {
  entity: Book | null
  onRefresh?: () => void
  onClose?: () => void
}

function subjectIdOf(book: Book | null): string {
  if (!book || !book.subject_id) return ''
  return typeof book.subject_id === 'object' ? book.subject_id._id : book.subject_id
}

export function BookPanel({ entity, onRefresh, onClose }: BookPanelProps) {
  const isEdit = !!entity
  const media = useMediaUpload()
  const ebookUpload = useMediaUpload()
  const imageUpload = useMediaUpload()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])

  // ebook → document controls
  const [linkSubjectId, setLinkSubjectId] = useState('')
  const [linkFree, setLinkFree] = useState(false)
  const [linking, setLinking] = useState(false)

  useEffect(() => {
    if (subjects.length > 0) return
    subjectsService.getSubjects({ limit: 200, sort_by: 'name', sort_order: 'asc' }).then((res) => {
      if (res.success && res.data) setSubjects(res.data.entities)
    })
  }, [subjects.length])

  const form = usePanelForm(
    () => ({
      title: entity?.title ?? '',
      author: entity?.author ?? '',
      description: entity?.description ?? '',
      isbn: entity?.isbn ?? '',
      category: entity?.category ?? '',
      subject_id: subjectIdOf(entity),
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
    entity?._id ?? 'new-book',
  )
  const v = form.values

  const save = useExplorerMutation({
    name: isEdit ? 'Update book' : 'Create book',
    fn: () => {
      const data = {
        title: v.title.trim(),
        author: v.author.trim(),
        description: v.description.trim() || undefined,
        isbn: v.isbn.trim() || undefined,
        category: v.category.trim() || undefined,
        subject_id: v.subject_id || undefined,
        publisher: v.publisher.trim() || undefined,
        publication_year: v.publication_year ? Number(v.publication_year) : undefined,
        pages: v.pages ? Number(v.pages) : undefined,
        weight_grams: v.weight_grams ? Number(v.weight_grams) : undefined,
        display_order: v.display_order ? Number(v.display_order) : undefined,
        price: Number(v.price),
        original_price: v.original_price ? Number(v.original_price) : undefined,
        is_on_sale: v.is_on_sale,
        sale_price: v.is_on_sale && v.sale_price ? Number(v.sale_price) : undefined,
        stock_quantity: v.stock_quantity ? Number(v.stock_quantity) : 0,
        is_available: v.is_available,
        ebook: v.ebook,
      }
      return isEdit ? booksService.update(entity!._id, data) : booksService.create(data)
    },
    onSuccess: () => { form.commit(v); onRefresh?.(); if (!isEdit) onClose?.() },
    successMessage: isEdit ? 'Book updated' : 'Book created',
  })

  const priceNum = v.price.trim() === '' ? NaN : Number(v.price)
  const saleOk = !v.is_on_sale || (v.sale_price.trim() !== '' && Number(v.sale_price) > 0)
  const valid =
    v.title.trim().length >= 2 &&
    v.author.trim().length >= 2 &&
    Number.isFinite(priceNum) && priceNum >= 0 &&
    saleOk

  async function makeDocument() {
    if (!entity) return
    setLinking(true)
    try {
      const res = await documentsService.createLinked({
        source_book_id: entity._id,
        subject_id: linkSubjectId || undefined,
        is_free: linkFree,
      })
      if (res.success) {
        const { toast } = await import('sonner')
        toast.success('eBook added as a Document')
        onRefresh?.()
      }
    } catch (e) {
      const { toast } = await import('sonner')
      toast.error('Failed to create document', { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setLinking(false)
    }
  }

  async function addGalleryImage(file: File) {
    if (!entity) return
    const up = await imageUpload.run('Uploading image', async () => booksService.uploadThumbnail(file))
    if (up) {
      await booksService.addImages(entity._id, [up.thumbnailUrl])
      onRefresh?.()
    }
  }
  async function removeGalleryImage(index: number) {
    if (!entity) return
    await imageUpload.run('Removing image', async () => { await booksService.removeImage(entity._id, index) })
    onRefresh?.()
  }

  const canMakeDoc = isEdit && entity!.ebook && !!entity!.ebook_file_url

  return (
    <PanelShell
      icon={
        <div className="w-9 h-12 rounded-md overflow-hidden bg-amber-100 flex items-center justify-center">
          {entity?.thumbnail_url
            ? <img src={entity.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />
            : <BookText className="w-4 h-4 text-amber-700" />}
        </div>
      }
      title={isEdit ? v.title || 'Book' : 'New book'}
      subtitle={isEdit ? v.author : 'Create a new book'}
      badges={isEdit ? <>
        {entity!.is_on_sale && <SaleBadge />}
        {!entity!.is_available && <Badge className="text-xs font-medium border-0 bg-gray-100 text-gray-500">Unavailable</Badge>}
        <PublishBadge status={entity!.publish_status} />
      </> : undefined}
      headerActions={isEdit ? (
        <EntityHeaderActions
          entityType="book"
          entityId={entity!._id}
          entityName={entity!.title}
          publishStatus={entity!.publish_status}
          rawData={entity}
          onRefresh={onRefresh}
          idLabel="Book ID"
        />
      ) : undefined}
      onClose={onClose}
      dirty={form.dirty}
      saving={save.loading}
      canSave={valid}
      saveLabel={isEdit ? 'Save changes' : 'Create book'}
      onSave={save.execute}
      onCancel={form.reset}
    >
      {/* Properties */}
      <PanelField label="Title" required htmlFor="bp-title">
        <PanelText id="bp-title" value={v.title} onChange={(x) => form.set('title', x)} autoFocus={!isEdit} />
      </PanelField>
      <PanelField label="Author" required htmlFor="bp-author">
        <PanelText id="bp-author" value={v.author} onChange={(x) => form.set('author', x)} />
      </PanelField>
      <PanelField label="Description" htmlFor="bp-desc">
        <PanelTextarea id="bp-desc" value={v.description} onChange={(x) => form.set('description', x)} />
      </PanelField>
      <div className="grid grid-cols-2 gap-3">
        <PanelField label="ISBN" htmlFor="bp-isbn">
          <PanelText id="bp-isbn" value={v.isbn} onChange={(x) => form.set('isbn', x)} />
        </PanelField>
        <PanelField label="Category" htmlFor="bp-cat">
          <PanelText id="bp-cat" value={v.category} onChange={(x) => form.set('category', x)} />
        </PanelField>
      </div>
      <PanelField label="Subject" htmlFor="bp-subj">
        <PanelSelect id="bp-subj" value={v.subject_id} onChange={(x) => form.set('subject_id', x)}>
          <option value="">None</option>
          {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </PanelSelect>
      </PanelField>
      <div className="grid grid-cols-2 gap-3">
        <PanelField label="Publisher" htmlFor="bp-pub">
          <PanelText id="bp-pub" value={v.publisher} onChange={(x) => form.set('publisher', x)} />
        </PanelField>
        <PanelField label="Publication year" htmlFor="bp-year">
          <PanelText id="bp-year" type="number" value={v.publication_year} onChange={(x) => form.set('publication_year', x)} />
        </PanelField>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <PanelField label="Pages" htmlFor="bp-pages">
          <PanelText id="bp-pages" type="number" value={v.pages} onChange={(x) => form.set('pages', x)} />
        </PanelField>
        <PanelField label="Weight (g)" htmlFor="bp-wt">
          <PanelText id="bp-wt" type="number" value={v.weight_grams} onChange={(x) => form.set('weight_grams', x)} />
        </PanelField>
        <PanelField label="Order" htmlFor="bp-ord">
          <PanelText id="bp-ord" type="number" value={v.display_order} onChange={(x) => form.set('display_order', x)} />
        </PanelField>
      </div>

      {/* Pricing */}
      <div className="space-y-3 pt-1">
        <PanelSectionTitle>Pricing</PanelSectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <PanelField label="Price (₹)" required htmlFor="bp-price">
            <PanelText id="bp-price" type="number" value={v.price} onChange={(x) => form.set('price', x)} />
          </PanelField>
          <PanelField label="Original price (₹)" htmlFor="bp-orig">
            <PanelText id="bp-orig" type="number" value={v.original_price} onChange={(x) => form.set('original_price', x)} />
          </PanelField>
        </div>
        <PanelSwitchRow label="On sale" checked={v.is_on_sale} onChange={(x) => form.set('is_on_sale', x)} />
        {v.is_on_sale && (
          <PanelField label="Sale price (₹)" required htmlFor="bp-sale">
            <PanelText id="bp-sale" type="number" value={v.sale_price} onChange={(x) => form.set('sale_price', x)} />
          </PanelField>
        )}
      </div>

      {/* Stock */}
      <div className="space-y-3 pt-1">
        <PanelSectionTitle>Stock</PanelSectionTitle>
        <div className="grid grid-cols-2 gap-3 items-start">
          <PanelField label="Stock quantity" htmlFor="bp-stock">
            <PanelText id="bp-stock" type="number" value={v.stock_quantity} onChange={(x) => form.set('stock_quantity', x)} />
          </PanelField>
          <PanelSwitchRow label="Available" hint="Visible to students" checked={v.is_available} onChange={(x) => form.set('is_available', x)} />
        </div>
      </div>

      {/* Media + Ebook + Linked docs only in edit mode (need an id for uploads) */}
      {isEdit && (
        <>
          <div className="space-y-3 pt-1">
            <PanelSectionTitle>Cover</PanelSectionTitle>
            <ImageCropField
              label="Cover image"
              aspect={16 / 9}
              hint="16:9 · JPEG/PNG/WebP · max 5MB"
              previewClassName="aspect-video"
              value={entity!.thumbnail_url}
              uploading={media.uploading}
              uploadProgress={media.progress}
              onUpload={async (file) => {
                const res = await media.run('Uploading cover', async () => booksService.uploadThumbnail(file))
                if (res) {
                  await booksService.update(entity!._id, { thumbnail_url: res.thumbnailUrl, thumbnail_s3_key: res.s3Key })
                  onRefresh?.()
                }
              }}
            />
            <div>
              <p className="text-[11px] text-slate-400 mb-1">Gallery images ({entity!.images.length})</p>
              <div className="flex gap-1.5 flex-wrap">
                {entity!.images.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} alt="" className="w-14 h-14 rounded-md object-cover ring-1 ring-slate-200" />
                    <button
                      type="button"
                      onClick={() => void removeGalleryImage(i)}
                      disabled={imageUpload.uploading}
                      className="absolute -top-1 -right-1 bg-white rounded-full ring-1 ring-slate-200 p-0.5 text-slate-400 hover:text-red-500 shadow-sm disabled:opacity-50"
                      title="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={imageUpload.uploading}
                  className="w-14 h-14 rounded-md ring-1 ring-dashed ring-slate-300 flex items-center justify-center text-slate-400 hover:bg-slate-50 disabled:opacity-50"
                  title="Add image"
                >
                  {imageUpload.uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void addGalleryImage(f) }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <PanelSectionTitle>eBook</PanelSectionTitle>
            <PanelSwitchRow label="This title has an eBook" checked={v.ebook} onChange={(x) => form.set('ebook', x)} />
            {v.ebook && (
              <>
                {entity!.ebook_file_url && (
                  <div className="rounded-lg bg-slate-50 ring-1 ring-slate-200 px-3 py-2 text-xs text-slate-600 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    {entity!.ebook_file_format?.toUpperCase() ?? 'FILE'} · {entity!.ebook_file_size_mb?.toFixed(1) ?? '?'} MB
                  </div>
                )}
                <FileUploadField
                  label={entity!.ebook_file_url ? 'Replace eBook file' : 'Upload eBook file'}
                  accept=".pdf,.epub"
                  maxMb={500}
                  buttonLabel={entity!.ebook_file_url ? 'Replace eBook' : 'Upload eBook'}
                  hint="PDF or EPUB · max 500MB"
                  uploading={ebookUpload.uploading}
                  uploadProgress={ebookUpload.progress}
                  onPick={async (file) => {
                    await ebookUpload.run('Uploading eBook', (onProgress) => booksService.uploadEbook(entity!._id, file, onProgress))
                    onRefresh?.()
                  }}
                />
              </>
            )}
          </div>

          {/* eBook → Document */}
          <div className="space-y-2 pt-1">
            <PanelSectionTitle>Linked documents</PanelSectionTitle>
            {canMakeDoc ? (
              <div className="rounded-lg ring-1 ring-slate-200 bg-slate-50/60 p-3 space-y-2">
                <p className="text-xs text-slate-500">
                  Publish this eBook as a Document so students can read it inside a subject. Title, file
                  and cover stay in sync with this book.
                </p>
                <PanelField label="Attach to subject (optional)">
                  <PanelSelect value={linkSubjectId} onChange={setLinkSubjectId}>
                    <option value="">No subject (library)</option>
                    {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </PanelSelect>
                </PanelField>
                <PanelSwitchRow label="Free document" checked={linkFree} onChange={setLinkFree} />
                <Button size="sm" className="gap-1.5" onClick={makeDocument} disabled={linking}>
                  {linking ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</> : <><FileText className="w-3.5 h-3.5" /> Make eBook a Document</>}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Enable the eBook flag and upload a PDF/EPUB above to publish it as a Document.
              </p>
            )}
          </div>
        </>
      )}
    </PanelShell>
  )
}
