import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { User } from '@/services/users.service'
import { MoreVertical, Eye, ShieldBan, ShieldCheck, UserCircle } from 'lucide-react'

interface UsersColumnsProps {
  onNavigate: (user: User) => void
  onBlockToggle: (user: User) => void
}

export function useUsersColumns({
  onNavigate,
  onBlockToggle,
}: UsersColumnsProps): ColumnDef<User>[] {
  return [
    {
      id: 'user',
      header: 'User',
      cell: (user) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted overflow-hidden shrink-0">
            {user.photo_url ? (
              <img src={user.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserCircle className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user.name || '—'}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email || user.phone_number}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'phone',
      header: 'Phone',
      width: 'w-32',
      cell: (user) => (
        <span className="text-sm">{user.phone_number}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-24',
      cell: (user) => (
        <Badge className={`text-[10px] ${user.is_active
          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
          : 'bg-red-500/10 text-red-600 border-red-200'
        }`}>
          {user.is_active ? 'Active' : 'Blocked'}
        </Badge>
      ),
    },
    {
      id: 'onboarding',
      header: 'Onboarding',
      width: 'w-28',
      cell: (user) => (
        <Badge variant={user.onboarding_completed ? 'secondary' : 'outline'} className="text-[10px]">
          {user.onboarding_completed ? 'Done' : 'Pending'}
        </Badge>
      ),
    },
    {
      id: 'profile',
      header: 'Profile',
      width: 'w-28',
      cell: (user) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${user.profile_completion_percentage}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{user.profile_completion_percentage}%</span>
        </div>
      ),
    },
    {
      id: 'lastLogin',
      header: 'Last Login',
      width: 'w-28',
      cell: (user) => (
        <span className="text-xs text-muted-foreground">
          {user.last_login
            ? new Date(user.last_login).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })
            : '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (user) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onNavigate(user)}>
                <Eye className="mr-2 h-4 w-4" />View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onBlockToggle(user)}
                className={user.is_active ? 'text-destructive' : ''}
              >
                {user.is_active ? (
                  <><ShieldBan className="mr-2 h-4 w-4" />Block User</>
                ) : (
                  <><ShieldCheck className="mr-2 h-4 w-4" />Unblock User</>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]
}
