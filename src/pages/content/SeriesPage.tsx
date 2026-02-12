import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, MoreVertical, Pencil, Trash2, ArrowUpDown, Layers } from 'lucide-react'
import { mockSeries } from '@/lib/mock-data'

export function SeriesPage() {
  return (
    <div>
      <PageHeader
        title="Series"
        description="Manage course series within packages"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Series' }]}
        action={<Button><Plus className="mr-2 h-4 w-4" />Add Series</Button>}
      />

      {/* Table */}
      <div className="rounded-lg border border-[hsl(var(--border))]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Order</TableHead>
              <TableHead>Series Name</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Modules</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockSeries.map((series) => (
              <TableRow key={series._id}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <ArrowUpDown className="h-3 w-3 cursor-grab text-[hsl(var(--muted-foreground))]" />
                    <span className="text-sm font-medium">{series.display_order}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0000C8]/10 text-sm font-bold text-[#0000C8]">
                      {series.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{series.name}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{series.description}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{series.package_name}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                    <span className="text-sm">{series.module_count} modules</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={series.is_active ? 'default' : 'outline'} className="text-[10px]">
                    {series.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                      <DropdownMenuItem><Layers className="mr-2 h-4 w-4" />Manage Modules</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
