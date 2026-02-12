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
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus, Search, Download, MoreVertical, ShieldBan, ShieldCheck,
  CalendarPlus, Eye, Users, UserCheck, UserX,
} from 'lucide-react'
import { mockUsers } from '@/lib/mock-data'

export function UsersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState<typeof mockUsers[0] | null>(null)

  const filtered = mockUsers.filter((u) => {
    const matchesSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.phone_number.includes(search) || u.email.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && u.is_active) || (statusFilter === 'inactive' && !u.is_active)
    return matchesSearch && matchesStatus
  })

  const totalUsers = mockUsers.length
  const activeUsers = mockUsers.filter((u) => u.is_active).length

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage all registered users and their access"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Users' }]}
        action={<Button><Plus className="mr-2 h-4 w-4" />Add User</Button>}
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{totalUsers}</p><p className="text-xs text-muted-foreground">Total Users</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10"><UserCheck className="h-5 w-5 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold">{activeUsers}</p><p className="text-xs text-muted-foreground">Active</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10"><UserX className="h-5 w-5 text-red-500" /></div>
          <div><p className="text-2xl font-bold">{totalUsers - activeUsers}</p><p className="text-xs text-muted-foreground">Blocked</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name, phone, email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Blocked</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Export</Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Onboarding</TableHead>
              <TableHead>Profile</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((user) => (
              <TableRow key={user._id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {user.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{user.phone_number}</TableCell>
                <TableCell><span className="text-sm capitalize">{user.gender || '—'}</span></TableCell>
                <TableCell>
                  <Badge variant={user.is_active ? 'default' : 'destructive'} className="text-[10px]">
                    {user.is_active ? 'Active' : 'Blocked'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.onboarding_completed ? 'secondary' : 'outline'} className="text-[10px]">
                    {user.onboarding_completed ? 'Done' : 'Pending'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${user.profile_completion_percentage}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{user.profile_completion_percentage}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(user.last_login).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedUser(user)}><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
                      <DropdownMenuItem><CalendarPlus className="mr-2 h-4 w-4" />Extend Subscription</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className={user.is_active ? 'text-red-600' : 'text-emerald-600'}>
                        {user.is_active ? <><ShieldBan className="mr-2 h-4 w-4" />Block User</> : <><ShieldCheck className="mr-2 h-4 w-4" />Unblock User</>}
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
        <p className="text-sm text-muted-foreground">Showing {filtered.length} of {totalUsers} users</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedUser?.name}</DialogTitle>
            <DialogDescription>{selectedUser?.email}</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{selectedUser.phone_number}</p></div>
              <div><p className="text-muted-foreground">Gender</p><p className="font-medium capitalize">{selectedUser.gender || 'Not set'}</p></div>
              <div><p className="text-muted-foreground">Status</p><p><Badge variant={selectedUser.is_active ? 'default' : 'destructive'}>{selectedUser.is_active ? 'Active' : 'Blocked'}</Badge></p></div>
              <div><p className="text-muted-foreground">Profile Completion</p><p className="font-medium">{selectedUser.profile_completion_percentage}%</p></div>
              <div><p className="text-muted-foreground">Subjects Selected</p><p className="font-medium">{selectedUser.subject_selections.length}</p></div>
              <div><p className="text-muted-foreground">Onboarding</p><p className="font-medium">{selectedUser.onboarding_completed ? 'Completed' : 'Pending'}</p></div>
              <div><p className="text-muted-foreground">Last Login</p><p className="font-medium">{new Date(selectedUser.last_login).toLocaleString('en-IN')}</p></div>
              <div><p className="text-muted-foreground">Joined</p><p className="font-medium">{new Date(selectedUser.createdAt).toLocaleDateString('en-IN')}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
