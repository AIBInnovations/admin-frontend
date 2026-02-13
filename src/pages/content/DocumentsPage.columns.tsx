import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { Document } from '@/services/documents.service'
import { MoreVertical, Pencil, Trash2, FileText, Download } from 'lucide-react'

const formatBadge: Record<string, string> = {
  pdf: 'bg-red-500/10 text-red-600 border-red-200',
  epub: 'bg-purple-500/10 text-purple-600 border-purple-200',
  doc: 'bg-blue-500/10 text-blue-600 border-blue-200',
  docx: 'bg-blue-500/10 text-blue-600 border-blue-200',
  ppt: 'bg-orange-500/10 text-orange-600 border-orange-200',
  pptx: 'bg-orange-500/10 text-orange-600 border-orange-200',
}

function formatFileSize(mb: number): string {
  if (mb >= 1000) return `${(mb / 1000).toFixed(1)} GB`
  return `${mb.toFixed(1)} MB`
}

interface DocumentsColumnsProps {
  onEdit: (doc: Document) => void
  onDelete: (doc: Document) => void
}

export function useDocumentsColumns({
  onEdit,
  onDelete,
}: DocumentsColumnsProps): ColumnDef<Document>[] {
  return [
    {
      id: 'document',
      header: 'Document',
      cell: (doc) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{doc.title}</p>
            <p className="max-w-[200px] truncate text-xs text-muted-foreground">
              {doc.description || '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'series',
      header: 'Series',
      cell: (doc) => (
        <Badge variant="secondary" className="text-[10px]">
          {typeof doc.series_id === 'object' ? doc.series_id.name : '—'}
        </Badge>
      ),
    },
    {
      id: 'format',
      header: 'Format',
      width: 'w-20',
      cell: (doc) => (
        <Badge className={`text-[10px] uppercase ${formatBadge[doc.file_format] || ''}`}>
          {doc.file_format}
        </Badge>
      ),
    },
    {
      id: 'size',
      header: 'Size',
      width: 'w-24',
      cell: (doc) => (
        <span className="text-xs text-muted-foreground">{formatFileSize(doc.file_size_mb)}</span>
      ),
    },
    {
      id: 'pages',
      header: 'Pages',
      width: 'w-20',
      cell: (doc) => (
        <span className="text-sm">{doc.page_count || '—'}</span>
      ),
    },
    {
      id: 'access',
      header: 'Access',
      width: 'w-20',
      cell: (doc) => (
        <Badge variant={doc.is_free ? 'secondary' : 'outline'} className="text-[10px]">
          {doc.is_free ? 'Free' : 'Paid'}
        </Badge>
      ),
    },
    {
      id: 'downloads',
      header: 'Downloads',
      width: 'w-24',
      cell: (doc) => (
        <div className="flex items-center gap-1">
          <Download className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">{doc.download_count.toLocaleString()}</span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (doc) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(doc)}>
              <Pencil className="mr-2 h-4 w-4" />Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(doc)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
