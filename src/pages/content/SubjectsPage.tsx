import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, MoreVertical, Pencil, Trash2, ArrowUpDown } from 'lucide-react'
import { mockSubjects } from '@/lib/mock-data'

export function SubjectsPage() {
  return (
    <div>
      <PageHeader
        title="Subjects"
        description="Manage medical subjects and specialties"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Subjects' }]}
        action={<Button><Plus className="mr-2 h-4 w-4" />Add Subject</Button>}
      />

      <div className="rounded-lg border border-[hsl(var(--border))]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Order</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Packages</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockSubjects.map((subject) => (
              <TableRow key={subject._id}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <ArrowUpDown className="h-3 w-3 cursor-grab text-[hsl(var(--muted-foreground))]" />
                    <span className="text-sm font-medium">{subject.display_order}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0000C8]/10 text-sm font-bold text-[#0000C8]">
                      {subject.name.charAt(0)}
                    </div>
                    <span className="font-medium">{subject.name}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm text-[hsl(var(--muted-foreground))]">{subject.description}</TableCell>
                <TableCell><Badge variant="secondary">{subject.package_count} packages</Badge></TableCell>
                <TableCell>
                  <Badge variant={subject.is_active ? 'default' : 'outline'} className="text-[10px]">
                    {subject.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-[hsl(var(--muted-foreground))]">
                  {new Date(subject.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
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
