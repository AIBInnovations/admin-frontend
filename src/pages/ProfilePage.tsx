import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/components/common/PageHeader'
import { FactGrid, Section } from '@/components/common/detail'
import { Button } from '@/components/ui/button'

/** The signed-in admin: who they are and what they are allowed to do. */
export function ProfilePage() {
  const { user } = useAuth()
  const permissions = useMemo(() => {
    const all = user?.permissions ?? []
    if (all.includes('*')) return null
    const byArea = new Map<string, string[]>()
    for (const p of all) {
      const [area, action] = p.split('.')
      byArea.set(area, [...(byArea.get(area) ?? []), action ?? 'all'])
    }
    return [...byArea.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [user])

  return (
    <div className="space-y-6">
      <PageHeader title="Your profile" description="Your account on this panel. Ask a super admin to change your name, email or role." />
      <Section title="Account">
        <FactGrid
          facts={[
            { label: 'Name', value: user?.name },
            { label: 'Email', value: user?.email },
            { label: 'Role', value: user?.role_name },
          ]}
        />
        <div className="mt-5 border-t border-border pt-4">
          <Button asChild variant="outline" size="sm"><Link to="/forgot-password"><KeyRound className="h-4 w-4" />Change password</Link></Button>
          <p className="mt-2 text-xs text-muted-foreground">We send a one-time code to the phone number on your account.</p>
        </div>
      </Section>
      <Section title="What you can do" description="Set by your role.">
        {permissions === null ? (
          <p className="flex items-center gap-2 text-sm"><ShieldCheck aria-hidden="true" className="h-4 w-4 text-success" />Full access to every section.</p>
        ) : permissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No permissions are assigned to your role yet.</p>
        ) : (
          <dl className="divide-y divide-border">
            {permissions.map(([area, actions]) => (
              <div key={area} className="grid gap-1 py-2.5 sm:grid-cols-[200px_1fr]">
                <dt className="text-sm font-medium capitalize">{area.replace(/[_-]/g, ' ')}</dt>
                <dd className="text-sm text-muted-foreground">{actions.join(', ')}</dd>
              </div>
            ))}
          </dl>
        )}
      </Section>
    </div>
  )
}
