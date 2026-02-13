import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { AdminUser } from '@/services/adminUsers.service'
import { MoreVertical, Pencil, Trash2, UserCircle, ShieldCheck, ShieldBan } from 'lucide-react'

interface AdminUsersColumnsProps {
  onEdit: (adminUser: AdminUser) => void
  onDelete: (adminUser: AdminUser) => void
  onToggleActive: (adminUser: AdminUser) => void
}

export function useAdminUsersColumns({
  onEdit,
  onDelete,
  onToggleActive,
}: AdminUsersColumnsProps): ColumnDef<AdminUser>[] {
  return [
    {
      id: 'admin',
      header: 'Admin',
      cell: (admin) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted shrink-0">
            <UserCircle className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{admin.name}</p>
            <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'phone',
      header: 'Phone',
      width: 'w-32',
      cell: (admin) => (
        <span className="text-sm">{admin.phone || '—'}</span>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      width: 'w-32',
      cell: (admin) => (
        <Badge variant="secondary" className="text-[10px]">
          {typeof admin.role_id === 'object' ? admin.role_id.name : '—'}
        </Badge>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-24',
      cell: (admin) => (
        <Badge className={`text-[10px] ${admin.is_active
          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
          : 'bg-red-500/10 text-red-600 border-red-200'
        }`}>
          {admin.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'created',
      header: 'Created',
      width: 'w-28',
      cell: (admin) => (
        <span className="text-xs text-muted-foreground">
          {new Date(admin.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (admin) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(admin)}>
              <Pencil className="mr-2 h-4 w-4" />Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleActive(admin)}>
              {admin.is_active ? (
                <><ShieldBan className="mr-2 h-4 w-4" />Deactivate</>
              ) : (
                <><ShieldCheck className="mr-2 h-4 w-4" />Activate</>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(admin)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
