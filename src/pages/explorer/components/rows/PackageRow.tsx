import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChevronRight, MoreHorizontal, Pencil, ListTree, Copy, Braces } from 'lucide-react'
import { PublishBadge, ActiveBadge, SaleBadge } from '../../ui/StatusBadge'
import { PackageFormDialog } from '../../forms/PackageFormDialog'
import { RawJsonDrawer } from '../popovers/RawJsonDrawer'
import { buildChildUrl, type ExplorerFocus } from '../../parseExplorerPath'
import { copyText } from '../../copyShareLink'
import type { Package } from '@/services/packages.service'

interface PackageRowProps {
  pkg: Package
  parentFocus: ExplorerFocus
  onEdit?: (pkg: Package) => void
  onRefresh?: () => void
}

function formatPrice(price: number): string {
  if (price === 0) return 'Free'
  return `₹${price.toLocaleString('en-IN')}`
}

function getSubjectId(pkg: Package): string {
  if (typeof pkg.subject_id === 'object') return (pkg.subject_id as { _id: string })._id
  return pkg.subject_id ?? ''
}

export function PackageRow({ pkg, parentFocus, onRefresh }: PackageRowProps) {
  const navigate = useNavigate()
  const drillUrl = buildChildUrl(parentFocus, pkg._id)
  const [editOpen, setEditOpen] = useState(false)
  const [rawJsonOpen, setRawJsonOpen] = useState(false)

  return (
    <>
      <div
        className="flex items-center gap-3 px-3 py-2.5 mx-2 my-0.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
        onClick={() => navigate(drillUrl)}
      >
        <Avatar className="w-9 h-9 rounded-lg shrink-0">
          {pkg.thumbnail_url && <AvatarImage src={pkg.thumbnail_url} alt={pkg.name} />}
          <AvatarFallback className="rounded-lg bg-violet-100 text-violet-700 text-xs font-semibold">
            {pkg.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{pkg.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-semibold text-slate-700">
              {pkg.is_on_sale && pkg.sale_price != null ? formatPrice(pkg.sale_price) : formatPrice(pkg.price)}
            </span>
            {pkg.is_on_sale && pkg.sale_price != null && (
              <span className="text-xs line-through text-slate-400">{formatPrice(pkg.price)}</span>
            )}
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <ListTree className="w-3 h-3" />
              {pkg.series_count ?? 0} series
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <PublishBadge status={pkg.publish_status} />
          <ActiveBadge active={pkg.is_active} />
          {pkg.is_on_sale && <SaleBadge />}
        </div>

        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyText(pkg._id, 'Package ID')}>
                <Copy className="w-3.5 h-3.5 mr-2" /> Copy ID
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRawJsonOpen(true)}>
                <Braces className="w-3.5 h-3.5 mr-2" /> View raw JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-300 hover:text-slate-600 hover:bg-slate-100"
            onClick={() => navigate(drillUrl)}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <PackageFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => { setEditOpen(false); onRefresh?.() }}
        subjectId={getSubjectId(pkg)}
        pkg={pkg}
      />
      <RawJsonDrawer
        open={rawJsonOpen}
        onClose={() => setRawJsonOpen(false)}
        label={pkg.name}
        data={pkg}
      />
    </>
  )
}
