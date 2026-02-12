import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Shield, Users, Lock, CheckCircle2 } from 'lucide-react'
import { mockAdminUsers } from '@/lib/mock-data'

interface RoleDefinition {
  key: string
  name: string
  description: string
  accentColor: string
  accentBg: string
  accentBorder: string
  iconBg: string
  badgeBg: string
  badgeText: string
  permissions: string[]
  editable: boolean
}

const roles: RoleDefinition[] = [
  {
    key: 'super_admin',
    name: 'Super Admin',
    description: 'Full system access with all permissions',
    accentColor: 'text-purple-700',
    accentBg: 'bg-purple-50',
    accentBorder: 'border-purple-200',
    iconBg: 'bg-purple-100',
    badgeBg: 'bg-purple-100 border-purple-200',
    badgeText: 'text-purple-700',
    permissions: ['All Permissions'],
    editable: false,
  },
  {
    key: 'admin',
    name: 'Admin',
    description: 'Manage content, users, and commerce',
    accentColor: 'text-blue-700',
    accentBg: 'bg-blue-50',
    accentBorder: 'border-blue-200',
    iconBg: 'bg-blue-100',
    badgeBg: 'bg-blue-100 border-blue-200',
    badgeText: 'text-blue-700',
    permissions: [
      'Manage Users',
      'Manage Content',
      'Manage Commerce',
      'View Analytics',
      'Manage Sessions',
      'Manage Faculty',
    ],
    editable: true,
  },
  {
    key: 'moderator',
    name: 'Moderator',
    description: 'Monitor content and moderate sessions',
    accentColor: 'text-amber-700',
    accentBg: 'bg-amber-50',
    accentBorder: 'border-amber-200',
    iconBg: 'bg-amber-100',
    badgeBg: 'bg-amber-100 border-amber-200',
    badgeText: 'text-amber-700',
    permissions: [
      'View Users',
      'View Content',
      'Moderate Sessions',
      'View Analytics',
    ],
    editable: true,
  },
]

export function AdminRolesPage() {
  const getUserCount = (roleKey: string) =>
    mockAdminUsers.filter((u) => u.role_name === roleKey).length

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description="Configure admin roles and their associated permissions"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Settings' },
          { label: 'Admin Roles' },
        ]}
      />

      <div className="grid gap-6 md:grid-cols-3">
        {roles.map((role) => {
          const userCount = getUserCount(role.key)
          return (
            <Card key={role.key} className={`border-t-4 ${role.accentBorder}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${role.iconBg}`}>
                    <Shield className={`h-5 w-5 ${role.accentColor}`} />
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${role.badgeBg} ${role.badgeText}`}>
                    {role.name}
                  </Badge>
                </div>
                <CardTitle className="mt-3 text-lg">{role.name}</CardTitle>
                <CardDescription>{role.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* User Count */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{userCount} {userCount === 1 ? 'user' : 'users'} assigned</span>
                </div>

                <Separator />

                {/* Permissions */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Permissions
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {role.permissions.map((perm) => (
                      <Badge
                        key={perm}
                        variant="secondary"
                        className="text-[10px] font-normal"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {perm}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Action */}
                <div>
                  {role.editable ? (
                    <Button variant="outline" size="sm" className="w-full">
                      <Lock className="mr-2 h-4 w-4" />
                      Edit Permissions
                    </Button>
                  ) : (
                    <p className="text-center text-xs text-muted-foreground">
                      Cannot modify
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
