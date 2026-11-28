import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Image, Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { DetailSkeleton, FactGrid, Section } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/contexts/AuthContext'
import { homeSectionsService, HomeSection, HomeSectionFormData, HomeSectionItem } from '@/services/homeSections.service'
import { HomeSectionFormModal } from '@/components/homeSections/HomeSectionFormModal'
import { DeleteSectionDock } from '@/components/homeSections/DeleteSectionDock'
import { ConfirmDock, must } from '@/components/forms/editor/ConfirmDock'
import { RecordError, useRecord } from '@/components/forms/editor/EditorPage'
import { Note } from '@/components/forms/editor/fields'
import { ActivePill, PublishStatusPill, RowMenu, Tag, Thumb } from '@/components/forms/editor/list'
import { istDay } from '@/components/forms/editor/ist'

export function HomeSectionDetailPage() {
  const { sectionId } = useParams<{ sectionId: string }>()
  const { record: section, loading, error, reload } = useRecord(sectionId, (id) => homeSectionsService.getById(id))

  if (loading && !section) return <DetailSkeleton />
  if (!section) return <RecordError status={error?.status ?? null} message={error?.message ?? ''} noun="home section" back={{ label: 'Back to home sections', href: '/content/home-sections' }} onRetry={reload} />
  return <SectionDetail key={section._id} section={section} refreshError={error?.message ?? null} reload={reload} />
}

function Colour({ value, fallback }: { value: string | null; fallback: string }) {
  if (!value) return <span className="font-normal text-muted-foreground">{fallback}</span>
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className="h-5 w-5 rounded border border-border" style={{ backgroundColor: value }} />
      <span className="font-mono text-[13px]">{value}</span>
    </span>
  )
}

function SectionDetail({ section, refreshError, reload }: { section: HomeSection; refreshError: string | null; reload: () => void }) {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('home-sections.create')
  const canUpdate = hasPermission('home-sections.update')
  const canDelete = hasPermission('home-sections.delete')

  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletingItem, setDeletingItem] = useState<HomeSectionItem | null>(null)

  const items = section.items || []
  const title = section.title || 'Untitled Section'
  const openItem = (item: HomeSectionItem) => navigate(`/content/home-sections/${section._id}/items/${item._id}/edit`)

  const save = async (data: HomeSectionFormData) => {
    must(await homeSectionsService.update(section._id, data), 'Failed to update section')
    toast.success('Section updated successfully')
    reload()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={section.subtitle || undefined}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Content' },
          { label: 'Home Sections', href: '/content/home-sections' },
          { label: title },
        ]}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {canUpdate && <Button variant="outline" size="sm" className="bg-card" onClick={() => setEditing(true)}><Pencil aria-hidden="true" />Edit Section</Button>}
            {canDelete && <Button variant="destructive" size="sm" onClick={() => setDeleting(true)}><Trash2 aria-hidden="true" />Delete</Button>}
          </div>
        }
      />

      {refreshError && <Note tone="danger">{refreshError} <button type="button" className="font-medium underline underline-offset-2" onClick={reload}>Try again</button></Note>}

      <Section title="Section Details">
        <FactGrid
          className="xl:grid-cols-4"
          facts={[
            { label: 'Status', value: <span className="flex flex-wrap gap-1.5"><ActivePill active={section.is_active} /><PublishStatusPill status={section.publish_status} /></span> },
            { label: 'Display Order', value: <span className="tabular-nums">{section.display_order ?? '—'}</span> },
            { label: 'Colors', value: <span className="flex flex-wrap items-center gap-3"><Colour value={section.background_color} fallback="Default BG" /><Colour value={section.text_color} fallback="Default Text" /></span> },
            { label: 'Date Range', value: `${section.start_date ? istDay(section.start_date) : 'No start'}${section.end_date ? ` to ${istDay(section.end_date)}` : ''}` },
          ]}
        />
      </Section>

      <Section
        title={<>Items <span className="ml-1 font-normal tabular-nums text-muted-foreground">{items.length}</span></>}
        action={canCreate ? <Button asChild variant="outline" size="sm" className="bg-card"><Link to={`/content/home-sections/${section._id}/items/new`}><Plus aria-hidden="true" />Add Item</Link></Button> : undefined}
        flush
      >
        {items.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No items in this section"
            description="Students see nothing here until it has an item."
            action={canCreate ? <Button asChild variant="outline" size="sm" className="bg-card"><Link to={`/content/home-sections/${section._id}/items/new`}><Plus aria-hidden="true" />Add your first item</Link></Button> : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 pl-5">#</TableHead>
                <TableHead className="w-28">Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-16">Image</TableHead>
                <TableHead className="w-24">Link</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-10 pr-5"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item._id}
                  tabIndex={0}
                  className="cursor-pointer hover:bg-accent/50 focus-visible:bg-accent/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
                  onClick={(e) => { if (!(e.target as HTMLElement).closest('button, a, [role="menuitem"]')) openItem(item) }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) openItem(item) }}
                >
                  <TableCell className="pl-5 text-sm tabular-nums text-muted-foreground">{item.display_order ?? '—'}</TableCell>
                  <TableCell><Tag className="font-mono">{item.card_type}</Tag></TableCell>
                  <TableCell>
                    <div className="max-w-[360px]">
                      <p className="truncate text-sm font-medium" title={item.title || undefined}>{item.title || 'Untitled'}</p>
                      {item.subtitle && <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Thumb src={item.image_url} icon={Image} className="h-10 w-10" />
                  </TableCell>
                  <TableCell><Tag>{(item.link_type || 'none').replace(/^./, (c) => c.toUpperCase())}</Tag></TableCell>
                  <TableCell><ActivePill active={item.is_active} /></TableCell>
                  <TableCell className="pr-5">
                    <RowMenu
                      label={`Actions for ${item.title || 'Untitled'}`}
                      actions={[
                        { label: 'Edit', icon: Pencil, onSelect: () => openItem(item), hidden: !canUpdate },
                        { label: 'Delete', icon: Trash2, onSelect: () => setDeletingItem(item), tone: 'danger', separated: true, hidden: !canDelete },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <HomeSectionFormModal open={editing} onClose={() => setEditing(false)} onSubmit={save} section={section} mode="edit" />
      <DeleteSectionDock section={deleting ? section : null} onClose={() => setDeleting(false)} onDone={() => navigate('/content/home-sections')} />
      <ConfirmDock
        open={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        title="Delete Item"
        confirmLabel="Delete"
        busyLabel="Deleting..."
        tone="danger"
        onConfirm={async () => {
          if (!deletingItem) return
          must(await homeSectionsService.deleteItem(section._id, deletingItem._id), 'Failed to delete item')
          toast.success('Item deleted successfully')
          reload()
        }}
      >
        <p>Are you sure you want to delete <span className="font-medium text-foreground">{deletingItem?.title || 'this item'}</span>? This action cannot be undone.</p>
      </ConfirmDock>
    </div>
  )
}
