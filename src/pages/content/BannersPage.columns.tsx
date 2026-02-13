import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { Banner } from '@/services/banners.service'
import { MoreVertical, Pencil, Trash2, Image, ExternalLink } from 'lucide-react'

interface BannersColumnsProps {
  onEdit: (banner: Banner) => void
  onDelete: (banner: Banner) => void
}

export function useBannersColumns({
  onEdit,
  onDelete,
}: BannersColumnsProps): ColumnDef<Banner>[] {
  return [
    {
      id: 'banner',
      header: 'Banner',
      cell: (banner) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-16 items-center justify-center rounded bg-muted overflow-hidden shrink-0">
            {banner.image_url ? (
              <img src={banner.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Image className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{banner.title}</p>
            {banner.subtitle && (
              <p className="text-xs text-muted-foreground truncate">{banner.subtitle}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'link',
      header: 'Link',
      width: 'w-32',
      cell: (banner) => (
        banner.click_url ? (
          <a
            href={banner.click_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline truncate max-w-[120px]"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            Link
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )
      ),
    },
    {
      id: 'order',
      header: 'Order',
      width: 'w-16',
      cell: (banner) => (
        <span className="text-sm font-mono">{banner.display_order}</span>
      ),
    },
    {
      id: 'dates',
      header: 'Date Range',
      width: 'w-40',
      cell: (banner) => (
        <div className="text-xs text-muted-foreground">
          <p>{new Date(banner.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          {banner.end_date && (
            <p>to {new Date(banner.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          )}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-24',
      cell: (banner) => (
        <Badge className={`text-[10px] ${
          banner.is_active
            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
            : 'bg-red-500/10 text-red-600 border-red-200'
        }`}>
          {banner.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (banner) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(banner)}>
              <Pencil className="mr-2 h-4 w-4" />Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(banner)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
