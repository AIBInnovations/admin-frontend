import { useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { DetailSkeleton, ErrorState } from '@/components/common/detail'
import { GRANT_TYPES, GrantForm, type GrantType } from '@/components/users/GrantForm'
import { Notice, Segmented, personName } from '@/components/users/kit'
import { unwrap, useResource } from '@/components/users/lib'
import { usersService, type UserDetail } from '@/services/users.service'

/** /users/:userId/grant?type=package|ebook|session */
export function UserGrantPage() {
  const { userId = '' } = useParams<{ userId: string }>()
  const [params, setParams] = useSearchParams()
  const type: GrantType = GRANT_TYPES.some((t) => t.value === params.get('type')) ? (params.get('type') as GrantType) : 'package'
  const fromGrantAccess = params.get('from') === 'grant-access'
  const meta = GRANT_TYPES.find((t) => t.value === type)!
  const { data: user, loading, error, status, reload } = useResource<UserDetail>(async () => unwrap(await usersService.getById(userId), 'User not found'), [userId])

  if (loading && !user) return <DetailSkeleton />
  if (!user) {
    const gone = status === 404 || status === 400
    return <ErrorState title={gone ? 'User not found' : 'This user could not be loaded'} message={gone ? 'The account may have been deleted, or the link is wrong.' : error ?? undefined} onRetry={gone ? undefined : () => reload()} back={{ label: 'Back to Users', href: '/users' }} />
  }

  const doneHref = fromGrantAccess ? `/users/grant-access?user=${user._id}&type=${type}` : `/users/${user._id}`
  return (
    <div className="space-y-6">
      <PageHeader
        title={meta.title}
        description={`Grant complimentary ${type === 'session' ? 'live session' : type} access to ${personName(user)}`}
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Users', href: '/users' }, { label: personName(user), href: `/users/${user._id}` }, { label: meta.title }]}
      />
      {!user.is_active && <Notice tone="warning" title="This user is blocked">They cannot sign in, so they will not see the access until you unblock them.</Notice>}
      <Segmented
        label="What to grant" value={type}
        onChange={(t) => setParams((prev) => { const next = new URLSearchParams(prev); next.set('type', t); return next }, { replace: true })}
        options={GRANT_TYPES.map((t) => ({ value: t.value, label: t.label, icon: t.icon }))}
      />
      <GrantForm key={`${user._id}:${type}`} user={user} type={type} doneHref={doneHref} />
    </div>
  )
}
