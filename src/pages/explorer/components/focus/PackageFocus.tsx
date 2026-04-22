import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Pencil, Film, Image, Tag, MoreHorizontal, ListTree, Trash2, Eye, EyeOff } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { PublishBadge, SaleBadge } from '../../ui/StatusBadge'
import { PackageFormDialog } from '../../forms/PackageFormDialog'
import { DeletePackageDialog } from '../../dialogs/DeletePackageDialog'
import { PublishDialog } from '../../dialogs/PublishDialog'
import { useExplorerMutation } from '../../hooks/useExplorerMutation'
import { packagesService } from '@/services/packages.service'
import { getParentUrl, type ExplorerFocus } from '../../parseExplorerPath'
import { toast } from 'sonner'
import type { PackageDetail } from '@/services/packages.service'

interface PackageFocusProps {
  pkg: PackageDetail
  focus?: ExplorerFocus
  onRefresh?: () => void
}

function formatPrice(price: number): string {
  if (price === 0) return 'Free'
  return `₹${price.toLocaleString('en-IN')}`
}

function getSubjectId(pkg: PackageDetail): string {
  if (typeof pkg.subject_id === 'object') return (pkg.subject_id as { _id: string })._id
  return pkg.subject_id ?? ''
}

export function PackageFocus({ pkg, focus, onRefresh }: PackageFocusProps) {
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const comingSoon = (action: string) => () => toast.info(`${action} — coming soon`)
  const isPublished = pkg.publish_status === 'published'

  const handleDeleteSuccess = () => {
    setDeleteOpen(false)
    if (focus) {
      const parentUrl = getParentUrl(focus)
      if (parentUrl) navigate(parentUrl, { replace: true })
    }
    onRefresh?.()
  }

  const toggleMutation = useExplorerMutation({
    name: 'Toggle active',
    fn: () => packagesService.toggleActive(pkg._id, !pkg.is_active),
    onSuccess: () => onRefresh?.(),
    successMessage: pkg.is_active ? `"${pkg.name}" deactivated` : `"${pkg.name}" activated`,
  })

  return (
    <>
      <div className="px-5 sm:px-6 py-5">
        <div className="flex items-start gap-4">
          <Avatar className="w-12 h-12 rounded-xl shrink-0">
            {pkg.thumbnail_url && <AvatarImage src={pkg.thumbnail_url} alt={pkg.name} />}
            <AvatarFallback className="rounded-xl bg-violet-100 text-violet-700 text-base font-bold">
              {pkg.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-semibold text-slate-900 leading-snug truncate">{pkg.name}</h1>
              <PublishBadge status={pkg.publish_status} />
              {pkg.is_on_sale && <SaleBadge />}
              <div
                className="flex items-center gap-1.5"
                title={pkg.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
              >
                <Switch
                  checked={pkg.is_active}
                  onCheckedChange={toggleMutation.execute}
                  disabled={toggleMutation.loading}
                  className="scale-[0.8] origin-left"
                />
                <span className={`text-xs font-medium ${pkg.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {pkg.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 flex-wrap">
              <span className="font-semibold text-slate-700 text-sm">
                {pkg.is_on_sale && pkg.sale_price != null
                  ? formatPrice(pkg.sale_price)
                  : formatPrice(pkg.price)}
              </span>
              {pkg.is_on_sale && pkg.sale_price != null && (
                <span className="line-through text-slate-400">{formatPrice(pkg.price)}</span>
              )}
              <span className="flex items-center gap-1">
                <ListTree className="w-3.5 h-3.5" />
                {pkg.series_count ?? 0} series
              </span>
              <span>{pkg.duration_days} days</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8 text-slate-600 border-slate-200 hover:bg-slate-50"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              className={`gap-1.5 h-8 ${isPublished
                ? 'text-amber-600 border-amber-200 hover:bg-amber-50'
                : 'text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              onClick={() => setPublishOpen(true)}
            >
              {isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isPublished ? 'Unpublish' : 'Publish'}</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={comingSoon('Manage trailer')}>
                  <Film className="w-3.5 h-3.5 mr-2" /> Manage trailer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={comingSoon('Manage thumbnails')}>
                  <Image className="w-3.5 h-3.5 mr-2" /> Manage thumbnails
                </DropdownMenuItem>
                <DropdownMenuItem onClick={comingSoon('Pricing tiers')}>
                  <Tag className="w-3.5 h-3.5 mr-2" /> Pricing tiers
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete package
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <PackageFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => { setEditOpen(false); onRefresh?.() }}
        subjectId={getSubjectId(pkg)}
        pkg={pkg}
      />

      <DeletePackageDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onSuccess={handleDeleteSuccess}
        packageId={pkg._id}
        packageName={pkg.name}
      />

      <PublishDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onSuccess={() => { setPublishOpen(false); onRefresh?.() }}
        entityType="package"
        entityId={pkg._id}
        entityName={pkg.name}
        currentStatus={pkg.publish_status === 'published' ? 'published' : 'draft'}
      />
    </>
  )
}
