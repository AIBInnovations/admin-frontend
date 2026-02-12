import { useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus, Search, MoreVertical, Pencil, Trash2, BarChart3,
  Tag, Package, CheckCircle, Percent,
} from 'lucide-react'
import { mockPackages } from '@/lib/mock-data'

function formatDuration(days: number): string {
  if (days >= 365) return `${Math.round(days / 365)} year`
  if (days >= 30) return `${Math.round(days / 30)} months`
  return `${days} days`
}

export function PackagesPage() {
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')

  const filtered = mockPackages.filter((pkg) => {
    const matchesSearch = !search || pkg.name.toLowerCase().includes(search.toLowerCase())
    const matchesSubject = subjectFilter === 'all' || pkg.subject_name.toLowerCase() === subjectFilter.toLowerCase()
    return matchesSearch && matchesSubject
  })

  const totalPackages = mockPackages.length
  const activePackages = mockPackages.filter((p) => p.is_active).length
  const onSalePackages = mockPackages.filter((p) => p.is_on_sale).length

  return (
    <div>
      <PageHeader
        title="Packages"
        description="Manage course packages, pricing, and enrollment"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Packages' }]}
        action={<Button><Plus className="mr-2 h-4 w-4" />Add Package</Button>}
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Package className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{totalPackages}</p><p className="text-xs text-muted-foreground">Total Packages</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10"><CheckCircle className="h-5 w-5 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold">{activePackages}</p><p className="text-xs text-muted-foreground">Active</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10"><Percent className="h-5 w-5 text-amber-600" /></div>
          <div><p className="text-2xl font-bold">{onSalePackages}</p><p className="text-xs text-muted-foreground">On Sale</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search packages..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            <SelectItem value="anatomy">Anatomy</SelectItem>
            <SelectItem value="physiology">Physiology</SelectItem>
            <SelectItem value="biochemistry">Biochemistry</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Package</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Enrolled</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((pkg) => (
              <TableRow key={pkg._id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                      {pkg.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{pkg.name}</p>
                      <Badge variant="outline" className="mt-0.5 text-[10px]">{pkg.type_name}</Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{pkg.subject_name}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    {pkg.is_on_sale ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-emerald-600">₹{pkg.sale_price?.toLocaleString('en-IN')}</span>
                          <Badge className="bg-emerald-500/10 text-[10px] text-emerald-700 hover:bg-emerald-500/10">SALE</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground line-through">₹{(pkg.original_price ?? pkg.price).toLocaleString('en-IN')}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-semibold">₹{pkg.price.toLocaleString('en-IN')}</span>
                        {pkg.original_price && (
                          <span className="text-xs text-muted-foreground line-through">₹{pkg.original_price.toLocaleString('en-IN')}</span>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{formatDuration(pkg.duration_days)}</TableCell>
                <TableCell><Badge variant="secondary">{pkg.enrolled_count} students</Badge></TableCell>
                <TableCell>
                  <Badge variant={pkg.is_active ? 'default' : 'outline'} className="text-[10px]">
                    {pkg.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                      <DropdownMenuItem><BarChart3 className="mr-2 h-4 w-4" />View Analytics</DropdownMenuItem>
                      <DropdownMenuItem><Tag className="mr-2 h-4 w-4" />Toggle Sale</DropdownMenuItem>
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

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Showing {filtered.length} of {totalPackages} packages</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>
    </div>
  )
}
