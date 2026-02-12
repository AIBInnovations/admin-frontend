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
  Play, Video, Eye, HardDrive, Loader2,
} from 'lucide-react'
import { mockVideos } from '@/lib/mock-data'

function formatDuration(seconds: number): string {
  if (seconds === 0) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatSize(mb: number): string {
  if (mb === 0) return '--'
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb} MB`
}

export function VideosPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = mockVideos.filter((v) => {
    const matchesSearch = !search || v.title.toLowerCase().includes(search.toLowerCase()) || v.faculty_name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || v.processing_status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalVideos = mockVideos.length
  const totalViews = mockVideos.reduce((sum, v) => sum + v.view_count, 0)
  const totalSizeMb = mockVideos.reduce((sum, v) => sum + v.file_size_mb, 0)
  const processingCount = mockVideos.filter((v) => v.processing_status === 'processing').length

  return (
    <div>
      <PageHeader
        title="Videos"
        description="Manage video content, uploads, and processing"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Videos' }]}
        action={<Button><Plus className="mr-2 h-4 w-4" />Upload Video</Button>}
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0000C8]/10"><Video className="h-5 w-5 text-[#0000C8]" /></div>
          <div><p className="text-2xl font-bold">{totalVideos}</p><p className="text-xs text-[hsl(var(--muted-foreground))]">Total Videos</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10"><Eye className="h-5 w-5 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold">{totalViews.toLocaleString('en-IN')}</p><p className="text-xs text-[hsl(var(--muted-foreground))]">Total Views</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10"><HardDrive className="h-5 w-5 text-violet-600" /></div>
          <div><p className="text-2xl font-bold">{formatSize(totalSizeMb)}</p><p className="text-xs text-[hsl(var(--muted-foreground))]">Total Size</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10"><Loader2 className="h-5 w-5 text-amber-600" /></div>
          <div><p className="text-2xl font-bold">{processingCount}</p><p className="text-xs text-[hsl(var(--muted-foreground))]">Processing</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <Input placeholder="Search videos or faculty..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[hsl(var(--border))]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Video</TableHead>
              <TableHead>Faculty</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((video) => (
              <TableRow key={video._id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0000C8]/10">
                      <Play className="h-4 w-4 text-[#0000C8]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{video.title}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{video.module_name}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{video.faculty_name}</TableCell>
                <TableCell className="text-sm font-mono">{formatDuration(video.duration_seconds)}</TableCell>
                <TableCell className="text-sm">{formatSize(video.file_size_mb)}</TableCell>
                <TableCell className="text-sm">{video.view_count.toLocaleString('en-IN')}</TableCell>
                <TableCell>
                  <Badge variant={video.is_free ? 'secondary' : 'outline'} className="text-[10px]">
                    {video.is_free ? 'Free' : 'Paid'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {video.processing_status === 'ready' ? (
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-xs text-emerald-600">Ready</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                      <span className="text-xs text-amber-600">Processing</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Play className="mr-2 h-4 w-4" />Preview</DropdownMenuItem>
                      <DropdownMenuItem><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                      <DropdownMenuItem><BarChart3 className="mr-2 h-4 w-4" />View Analytics</DropdownMenuItem>
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
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Showing {filtered.length} of {totalVideos} videos</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>
    </div>
  )
}
