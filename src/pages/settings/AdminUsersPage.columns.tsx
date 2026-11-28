import { KeyRound, MoreVertical, Pencil, ShieldBan, ShieldCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { StatusPill } from '@/components/common/detail'
import type { ColumnDef } from '@/components/common/DataTable'
import { PersonAvatar } from '@/components/users/kit'
import { dayIST } from '@/components/users/lib'
import type { AdminUser } from '@/services/adminUsers.service'

interface AdminUsersColumnsProps {
  isSelf: (admin: AdminUser) => boolean
  /** Each is missing when the signed-in admin may not do it. */
  onEdit?: (adminUser: AdminUser) => void
  onDelete?: (adminUser: AdminUser) => void
  onToggleActive?: (adminUser: AdminUser) => void
  onResetPassword?: (adminUser: AdminUser) => void
}

export function useAdminUsersColumns({ isSelf, onEdit, onDelete, onToggleActive, onResetPassword }: AdminUsersColumnsProps): ColumnDef<AdminUser>[] {
  return [
    {
      id: 'admin',
      header: 'Admin',
      cell: (admin) => (
        <div className="flex min-w-[220px] items-center gap-3">
          <PersonAvatar name={admin.name} />
          <div className="min-w-0 max-w-[300px]">
            <p className="truncate text-sm font-medium">{admin.name || 'Unnamed admin'}{isSelf(admin) && <span className="ml-1.5 rounded-full bg-accent px-2 py-px text-xs text-accent-foreground">You</span>}</p>
            <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
          </div>
        </div>
      ),
    },
    { id: 'phone', header: 'Phone', width: 'w-32', cell: (admin) => admin.phone ? <span className="font-mono text-[13px]">{admin.phone}</span> : <span className="text-xs text-muted-foreground">Not set</span> },
    { id: 'role', header: 'Role', width: 'w-44', cell: (admin) => <span className="block max-w-[220px] break-words text-sm">{admin.role_id && typeof admin.role_id === 'object' ? admin.role_id.name : 'Deleted role'}</span> },
    { id: 'status', header: 'Status', width: 'w-24', cell: (admin) => <StatusPill tone={admin.is_active ? 'success' : 'danger'}>{admin.is_active ? 'Active' : 'Inactive'}</StatusPill> },
    { id: 'created', header: 'Created', width: 'w-28', cell: (admin) => <span className="whitespace-nowrap text-xs text-muted-foreground">{dayIST(admin.createdAt)}</span> },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (admin) => {
        const self = isSelf(admin)
        if (!onEdit && !onDelete && !onToggleActive && !onResetPassword) return null
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${admin.name}`}><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && <DropdownMenuItem onClick={() => onEdit(admin)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>}
              {onResetPassword && <DropdownMenuItem onClick={() => onResetPassword(admin)}><KeyRound className="mr-2 h-4 w-4" />Reset Password</DropdownMenuItem>}
              {onToggleActive && (
                <DropdownMenuItem onClick={() => onToggleActive(admin)} disabled={self && admin.is_active} title={self ? 'You cannot deactivate yourself' : undefined}>
                  {admin.is_active ? <><ShieldBan className="mr-2 h-4 w-4" />Deactivate{self ? ' (not yourself)' : ''}</> : <><ShieldCheck className="mr-2 h-4 w-4" />Activate</>}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(admin)} disabled={self} title={self ? 'You cannot delete yourself' : undefined} className="text-danger focus:text-danger">
                    <Trash2 className="mr-2 h-4 w-4" />Delete{self ? ' (not yourself)' : ''}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
