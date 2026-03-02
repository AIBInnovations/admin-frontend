import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Pencil, Plus, Trash2, Layers, Calendar, Hash,
  MoreVertical, LayoutGrid,
} from 'lucide-react'
import { toast } from 'sonner'
import type { DeleteImpactResponse } from '@/types/api.types'
import {
  homeSectionsService,
  HomeSection, HomeSectionItem,
  HomeSectionFormData,
} from '@/services/homeSections.service'
import { HomeSectionFormModal } from '@/components/homeSections/HomeSectionFormModal'
import { HomeSectionItemFormModal } from '@/components/homeSections/HomeSectionItemFormModal'
import { DeleteModal } from '@/components/modals/DeleteModal'

export function HomeSectionDetailPage() {
  const { sectionId } = useParams<{ sectionId: string }>()
  const navigate = useNavigate()

  const [section, setSection] = useState<HomeSection | null>(null)
  const [loading, setLoading] = useState(true)

  // Modal states
  const [editSectionOpen, setEditSectionOpen] = useState(false)
  const [itemFormOpen, setItemFormOpen] = useState(false)
  const [itemMode, setItemMode] = useState<'create' | 'edit'>('create')
  const [selectedItem, setSelectedItem] = useState<HomeSectionItem | null>(null)

  const [deleteSectionOpen, setDeleteSectionOpen] = useState(false)
  const [deleteImpact, setDeleteImpact] = useState<DeleteImpactResponse | null>(null)
  const [loadingDeleteImpact, setLoadingDeleteImpact] = useState(false)

  const [deleteItemOpen, setDeleteItemOpen] = useState(false)

  const fetchSection = useCallback(async () => {
    if (!sectionId) return
    try {
      setLoading(true)
      const response = await homeSectionsService.getById(sectionId)
      if (response.success && response.data) {
        setSection(response.data)
      } else {
        toast.error('Section not found')
        navigate('/content/home-sections')
      }
    } catch {
      toast.error('Failed to load section details')
      navigate('/content/home-sections')
    } finally {
      setLoading(false)
    }
  }, [sectionId, navigate])

  useEffect(() => { fetchSection() }, [fetchSection])

  // Section handlers
  const handleSectionUpdate = async (data: HomeSectionFormData) => {
    if (!section) return
    try {
      const response = await homeSectionsService.update(section._id, data)
      if (response.success) {
        toast.success('Section updated successfully')
        fetchSection()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update section')
      throw error
    }
  }

  const handleDeleteSectionClick = async () => {
    if (!section) return
    setDeleteSectionOpen(true)
    setLoadingDeleteImpact(true)
    setDeleteImpact(null)
    try {
      const response = await homeSectionsService.getDeleteImpact(section._id)
      if (response.success && response.data) {
        setDeleteImpact(response.data)
      }
    } catch {
      setDeleteImpact(null)
    } finally {
      setLoadingDeleteImpact(false)
    }
  }

  const handleDeleteSectionConfirm = async () => {
    if (!section) return
    try {
      const response = await homeSectionsService.delete(section._id)
      if (response.success) {
        toast.success('Section deleted successfully')
        navigate('/content/home-sections')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete section')
      throw error
    }
  }

  // Item handlers
  const handleAddItem = () => {
    setItemMode('create')
    setSelectedItem(null)
    setItemFormOpen(true)
  }

  const handleEditItem = (item: HomeSectionItem) => {
    setItemMode('edit')
    setSelectedItem(item)
    setItemFormOpen(true)
  }

  const handleDeleteItemClick = (item: HomeSectionItem) => {
    setSelectedItem(item)
    setDeleteItemOpen(true)
  }


  const handleDeleteItemConfirm = async () => {
    if (!section || !selectedItem) return
    try {
      const response = await homeSectionsService.deleteItem(section._id, selectedItem._id)
      if (response.success) {
        toast.success('Item deleted successfully')
        fetchSection()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete item')
      throw error
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!section) return null

  const items = section.items || []

  return (
    <div className="space-y-6">
      <PageHeader
        title={section.title || 'Untitled Section'}
        description={section.subtitle || undefined}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Content' },
          { label: 'Home Sections', href: '/content/home-sections' },
          { label: section.title || 'Untitled Section' },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditSectionOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />Edit Section
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteSectionClick}>
              <Trash2 className="mr-2 h-4 w-4" />Delete
            </Button>
          </div>
        }
      />

      {/* Section Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Section Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge className={`mt-1 text-[10px] ${
                section.is_active
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                  : 'bg-red-500/10 text-red-600 border-red-200'
              }`}>
                {section.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" /> Display Order
              </p>
              <p className="mt-0.5 text-sm font-medium">{section.display_order}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Colors</p>
              <div className="mt-1 flex items-center gap-2">
                {section.background_color ? (
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded border border-border" style={{ backgroundColor: section.background_color }} />
                    <span className="text-xs font-mono">{section.background_color}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Default BG</span>
                )}
                {section.text_color ? (
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded border border-border" style={{ backgroundColor: section.text_color }} />
                    <span className="text-xs font-mono">{section.text_color}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Default Text</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Date Range
              </p>
              <p className="mt-0.5 text-sm">
                {section.start_date ? formatDate(section.start_date) : 'No start'}
                {section.end_date ? ` — ${formatDate(section.end_date)}` : ''}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Items
            <Badge variant="secondary" className="text-[10px] ml-1">{items.length}</Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleAddItem}>
            <Plus className="mr-2 h-4 w-4" />Add Item
          </Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Layers className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No items in this section</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={handleAddItem}>
                <Plus className="mr-2 h-4 w-4" />Add your first item
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-20">Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-16">Image</TableHead>
                    <TableHead className="w-24">Link</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        {item.display_order}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {item.card_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.title || 'Untitled'}
                          </p>
                          {item.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt=""
                            className="h-10 w-10 rounded border object-cover"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${
                          item.link_type === 'internal' ? 'border-blue-200 text-blue-600'
                            : item.link_type === 'external' ? 'border-purple-200 text-purple-600'
                            : ''
                        }`}>
                          {item.link_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${
                          item.is_active
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                            : 'bg-red-500/10 text-red-600 border-red-200'
                        }`}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditItem(item)}>
                              <Pencil className="mr-2 h-4 w-4" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteItemClick(item)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Section Modal */}
      <HomeSectionFormModal
        open={editSectionOpen}
        onClose={() => setEditSectionOpen(false)}
        onSubmit={handleSectionUpdate}
        section={section}
        mode="edit"
      />

      {/* Item Form Modal */}
      <HomeSectionItemFormModal
        open={itemFormOpen}
        onOpenChange={setItemFormOpen}
        sectionId={section._id}
        item={selectedItem}
        mode={itemMode}
        onSuccess={fetchSection}
      />

      {/* Delete Section Modal */}
      <DeleteModal
        open={deleteSectionOpen}
        onClose={() => { setDeleteSectionOpen(false); setDeleteImpact(null) }}
        onConfirm={handleDeleteSectionConfirm}
        title="Delete Home Section"
        itemName={section.title || 'this section'}
        isLoadingImpact={loadingDeleteImpact}
        blocked={deleteImpact?.blocked}
        warning={deleteImpact?.dependencies?.length ? {
          message: deleteImpact.blocked
            ? 'Cannot delete. Remove the following dependencies first:'
            : 'The following associated data will be affected:',
          details: deleteImpact.dependencies.map(d => ({
            label: d.label,
            count: d.count,
            blocking: d.blocking,
          })),
        } : undefined}
      />

      {/* Delete Item Modal */}
      <DeleteModal
        open={deleteItemOpen}
        onClose={() => { setDeleteItemOpen(false); setSelectedItem(null) }}
        onConfirm={handleDeleteItemConfirm}
        title="Delete Item"
        itemName={selectedItem?.title || 'this item'}
      />
    </div>
  )
}
