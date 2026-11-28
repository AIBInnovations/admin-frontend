import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { StatusPill } from '@/components/common/detail'
import { PersonAvatar, personName } from '@/components/users/kit'
import { dayIST } from '@/components/users/lib'
import { StudentLink } from '@/components/students/StudentLink'
import { User } from '@/services/users.service'
import { MoreVertical, Eye, Pencil, ShieldBan, ShieldCheck } from 'lucide-react'

interface UsersColumnsProps {
  onNavigate: (user: User) => void
  /** Missing when the admin may not change users. */
  onEdit?: (user: User) => void
  onBlockToggle?: (user: User) => void
}

export function useUsersColumns({
  onNavigate,
  onEdit,
  onBlockToggle,
}: UsersColumnsProps): ColumnDef<User>[] {
  return [
    {
      id: 'user',
      header: 'User',
      cell: (user) => (
        <div className="flex min-w-[220px] items-center gap-3">
          <PersonAvatar name={user.name} photo={user.photo_url} />
          <div className="min-w-0 max-w-[280px]">
            <p className="truncate text-sm"><StudentLink student={user} fallback="Unnamed User" from="Users" className="text-foreground hover:text-primary" /></p>
            <p className="truncate text-xs text-muted-foreground">{user.email || user.phone_number}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'phone',
      header: 'Phone',
      width: 'w-32',
      cell: (user) => (
        <span className="font-mono text-[13px]">{user.phone_number}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-36',
      cell: (user) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill tone={user.is_active ? 'success' : 'danger'}>{user.is_active ? 'Active' : 'Blocked'}</StatusPill>
          {user.email_excluded && (
            <span title={user.email_excluded_reason === 'user_unsubscribed' ? 'Self-unsubscribed' : 'Excluded by admin'}>
              <StatusPill tone="warning">No Email</StatusPill>
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'onboarding',
      header: 'Onboarding',
      width: 'w-28',
      cell: (user) => (
        <StatusPill tone={user.onboarding_completed ? 'neutral' : 'warning'}>{user.onboarding_completed ? 'Done' : 'Pending'}</StatusPill>
      ),
    },
    {
      id: 'profile',
      header: 'Profile',
      width: 'w-28',
      cell: (user) => (
        <div className="flex items-center gap-2">
          <div aria-hidden="true" className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, user.profile_completion_percentage || 0))}%` }} />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{Math.round(user.profile_completion_percentage || 0)}%</span>
        </div>
      ),
    },
    {
      id: 'lastLogin',
      header: 'Last Login',
      width: 'w-28',
      cell: (user) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">{user.last_login ? dayIST(user.last_login) : '—'}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (user) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${personName(user)}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onNavigate(user)}>
              <Eye className="mr-2 h-4 w-4" />View Details
            </DropdownMenuItem>
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(user)}>
                <Pencil className="mr-2 h-4 w-4" />Edit
              </DropdownMenuItem>
            )}
            {onBlockToggle && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onBlockToggle(user)} className={user.is_active ? 'text-danger focus:text-danger' : ''}>
                  {user.is_active ? (
                    <><ShieldBan className="mr-2 h-4 w-4" />Block User</>
                  ) : (
                    <><ShieldCheck className="mr-2 h-4 w-4" />Unblock User</>
                  )}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
