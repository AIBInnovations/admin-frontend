import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { Banner } from '@/services/banners.service'
import { MoreVertical, Pencil, Archive, Image, ExternalLink, BookOpen, FlaskConical, BookMarked } from 'lucide-react'

interface BannersColumnsProps {
  onEdit: (banner: Banner) => void
  onArchive: (banner: Banner) => void
}

export function useBannersColumns({
  onEdit,
  onArchive,
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
      header: 'Click Action',
      width: 'w-36',
      cell: (banner) => {
        if (banner.banner_type === 'theory_package') {
          return (
            <Badge className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-200">
              <BookOpen className="mr-1 h-3 w-3" />Theory Package
            </Badge>
          )
        }
        if (banner.banner_type === 'practical_package') {
          return (
            <Badge className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-200">
              <FlaskConical className="mr-1 h-3 w-3" />Practical Package
            </Badge>
          )
        }
        if (banner.banner_type === 'ebook') {
          return (
            <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200">
              <BookMarked className="mr-1 h-3 w-3" />Book
            </Badge>
          )
        }
        if (banner.click_url && banner.link_type === 'external') {
          return (
            <a
              href={banner.click_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline truncate max-w-[120px]"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              External Link
            </a>
          )
        }
        return <span className="text-xs text-muted-foreground">No Action</span>
      },
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
            <DropdownMenuItem onClick={() => onArchive(banner)} className="text-amber-600">
              <Archive className="mr-2 h-4 w-4" />Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
