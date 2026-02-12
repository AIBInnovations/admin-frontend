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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus, Search, MoreVertical, GraduationCap, ShieldCheck, Clock,
  Eye, Pencil, UserCheck, Calendar, Video, UserX, UserCog,
  CheckCircle2,
} from 'lucide-react'
import { mockFaculty } from '@/lib/mock-data'

export function FacultyPage() {
  const [search, setSearch] = useState('')
  const [selectedFaculty, setSelectedFaculty] = useState<typeof mockFaculty[0] | null>(null)

  const filtered = mockFaculty.filter((f) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      f.name.toLowerCase().includes(q) ||
      f.email.toLowerCase().includes(q) ||
      f.phone.includes(search) ||
      f.specialization.toLowerCase().includes(q)
    )
  })

  const totalFaculty = mockFaculty.length
  const verifiedCount = mockFaculty.filter((f) => f.is_verified).length
  const pendingCount = mockFaculty.filter((f) => !f.is_verified).length

  function getInitials(name: string) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  return (
    <div>
      <PageHeader
        title="Faculty"
        description="Manage faculty members and their sessions"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Faculty' }]}
        action={<Button><Plus className="mr-2 h-4 w-4" />Add Faculty</Button>}
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0000C8]/10"><GraduationCap className="h-5 w-5 text-[#0000C8]" /></div>
          <div><p className="text-2xl font-bold">{totalFaculty}</p><p className="text-xs text-[hsl(var(--muted-foreground))]">Total Faculty</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10"><ShieldCheck className="h-5 w-5 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold">{verifiedCount}</p><p className="text-xs text-[hsl(var(--muted-foreground))]">Verified</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10"><Clock className="h-5 w-5 text-amber-600" /></div>
          <div><p className="text-2xl font-bold">{pendingCount}</p><p className="text-xs text-[hsl(var(--muted-foreground))]">Pending Verification</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <Input placeholder="Search name, email, phone, specialization..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[hsl(var(--border))]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Faculty</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Specialization</TableHead>
              <TableHead>Qualifications</TableHead>
              <TableHead>Experience</TableHead>
              <TableHead>Sessions</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((faculty) => (
              <TableRow key={faculty._id}>
                {/* Faculty: avatar + name + email */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-xs font-semibold">
                      {getInitials(faculty.name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{faculty.name}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{faculty.email}</p>
                    </div>
                  </div>
                </TableCell>

                {/* Phone */}
                <TableCell className="text-sm">{faculty.phone}</TableCell>

                {/* Specialization */}
                <TableCell>
                  <Badge variant="secondary" className="text-[10px]">{faculty.specialization}</Badge>
                </TableCell>

                {/* Qualifications */}
                <TableCell className="max-w-[160px]">
                  <p className="truncate text-sm">{faculty.qualifications}</p>
                </TableCell>

                {/* Experience */}
                <TableCell className="text-sm">{faculty.experience_years} years</TableCell>

                {/* Sessions */}
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Video className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                    <span className="text-sm">{faculty.session_count}</span>
                  </div>
                </TableCell>

                {/* Verified */}
                <TableCell>
                  {faculty.is_verified ? (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700 text-[10px]">Verified</Badge>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <Badge className="border-amber-200 bg-amber-100 text-amber-700 text-[10px]">Pending</Badge>
                    </div>
                  )}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge variant={faculty.is_active ? 'default' : 'destructive'} className="text-[10px]">
                    {faculty.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>

                {/* Last Login */}
                <TableCell className="whitespace-nowrap text-xs text-[hsl(var(--muted-foreground))]">
                  {new Date(faculty.last_login).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedFaculty(faculty)}>
                        <Eye className="mr-2 h-4 w-4" />View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Pencil className="mr-2 h-4 w-4" />Edit
                      </DropdownMenuItem>
                      {!faculty.is_verified && (
                        <DropdownMenuItem className="text-emerald-600">
                          <UserCheck className="mr-2 h-4 w-4" />Verify Faculty
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem>
                        <Calendar className="mr-2 h-4 w-4" />Manage Sessions
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className={faculty.is_active ? 'text-red-600' : 'text-emerald-600'}>
                        {faculty.is_active ? (
                          <><UserX className="mr-2 h-4 w-4" />Deactivate</>
                        ) : (
                          <><UserCog className="mr-2 h-4 w-4" />Activate</>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Showing {filtered.length} of {totalFaculty} faculty members</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>

      {/* Faculty Detail Dialog */}
      <Dialog open={!!selectedFaculty} onOpenChange={() => setSelectedFaculty(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedFaculty?.name}</DialogTitle>
            <DialogDescription>{selectedFaculty?.email}</DialogDescription>
          </DialogHeader>
          {selectedFaculty && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[hsl(var(--muted-foreground))]">Phone</p>
                <p className="font-medium">{selectedFaculty.phone}</p>
              </div>
              <div>
                <p className="text-[hsl(var(--muted-foreground))]">Specialization</p>
                <p className="font-medium">{selectedFaculty.specialization}</p>
              </div>
              <div>
                <p className="text-[hsl(var(--muted-foreground))]">Qualifications</p>
                <p className="font-medium">{selectedFaculty.qualifications}</p>
              </div>
              <div>
                <p className="text-[hsl(var(--muted-foreground))]">Experience</p>
                <p className="font-medium">{selectedFaculty.experience_years} years</p>
              </div>
              <div className="col-span-2">
                <p className="text-[hsl(var(--muted-foreground))]">Bio</p>
                <p className="font-medium">{selectedFaculty.bio}</p>
              </div>
              <div>
                <p className="text-[hsl(var(--muted-foreground))]">Sessions Conducted</p>
                <p className="font-medium">{selectedFaculty.session_count}</p>
              </div>
              <div>
                <p className="text-[hsl(var(--muted-foreground))]">Verified</p>
                <p>
                  <Badge className={selectedFaculty.is_verified ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-amber-200 bg-amber-100 text-amber-700'}>
                    {selectedFaculty.is_verified ? 'Verified' : 'Pending'}
                  </Badge>
                </p>
              </div>
              <div>
                <p className="text-[hsl(var(--muted-foreground))]">Status</p>
                <p>
                  <Badge variant={selectedFaculty.is_active ? 'default' : 'destructive'}>
                    {selectedFaculty.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </p>
              </div>
              <div>
                <p className="text-[hsl(var(--muted-foreground))]">Last Login</p>
                <p className="font-medium">{new Date(selectedFaculty.last_login).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-[hsl(var(--muted-foreground))]">Joined</p>
                <p className="font-medium">{new Date(selectedFaculty.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
