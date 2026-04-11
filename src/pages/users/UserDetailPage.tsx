import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  UserCircle, ShieldBan, ShieldCheck, Loader2,
  Phone, Mail, MapPin, Calendar, GraduationCap, Globe, Smartphone,
  Monitor, Tablet, CreditCard, Package, Settings, BookOpen,
  Video, ShoppingBag, Truck, Edit, Gift, Ban,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  usersService,
  UserDetail,
  UserPurchase,
  SessionPurchase,
  EbookPurchase,
  BookOrder,
  DeviceSession,
  UpdateUserData,
  GrantPackageData,
  GrantEbookData,
  GrantSessionData,
} from '@/services/users.service'
import { UserFormModal } from '@/components/users/UserFormModal'
import { GrantPackageModal } from '@/components/users/GrantPackageModal'
import { GrantEbookModal } from '@/components/users/GrantEbookModal'
import { GrantSessionModal } from '@/components/users/GrantSessionModal'

export function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()

  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [blocking, setBlocking] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showGrantModal, setShowGrantModal] = useState(false)
  const [showGrantEbookModal, setShowGrantEbookModal] = useState(false)
  const [showGrantSessionModal, setShowGrantSessionModal] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<UserPurchase | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [revoking, setRevoking] = useState(false)
  const [revokeEbookTarget, setRevokeEbookTarget] = useState<EbookPurchase | null>(null)
  const [revokeEbookReason, setRevokeEbookReason] = useState('')
  const [revokingEbook, setRevokingEbook] = useState(false)
  const [revokeSessionTarget, setRevokeSessionTarget] = useState<SessionPurchase | null>(null)
  const [revokeSessionReason, setRevokeSessionReason] = useState('')
  const [revokingSession, setRevokingSession] = useState(false)

  const fetchUser = useCallback(async () => {
    if (!userId) return
    try {
      setLoading(true)
      const response = await usersService.getById(userId)
      if (response.success && response.data) {
        setUser(response.data)
      } else {
        toast.error(response.message || 'User not found')
        navigate('/users')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load user details')
      navigate('/users')
    } finally {
      setLoading(false)
    }
  }, [userId, navigate])

  useEffect(() => { fetchUser() }, [fetchUser])

  const handleBlockToggle = async () => {
    if (!user) return
    try {
      setBlocking(true)
      const response = user.is_active
        ? await usersService.blockUser(user._id)
        : await usersService.unblockUser(user._id)
      if (response.success) {
        toast.success(user.is_active ? 'User blocked' : 'User unblocked')
        fetchUser()
      } else {
        toast.error(response.message || 'Failed to update user status')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user status')
    } finally {
      setBlocking(false)
    }
  }

  const handleUpdateUser = async (data: UpdateUserData) => {
    if (!user) return
    try {
      const response = await usersService.updateUser(user._id, data)
      if (response.success) {
        toast.success('User updated successfully')
        fetchUser()
      } else {
        toast.error(response.message || 'Failed to update user')
        throw new Error(response.message || 'Failed to update user')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user')
      throw error
    }
  }

  const handleGrantPackage = async (data: GrantPackageData) => {
    if (!user) return
    try {
      const response = await usersService.grantPackageAccess(user._id, data)
      if (response.success) {
        toast.success('Package access granted successfully')
        fetchUser()
        return
      }
      toast.error(response.message || 'Failed to grant package access')
    } catch (error: any) {
      toast.error(error.message || 'Failed to grant package access')
    }
    throw new Error('Grant failed')
  }

  const handleRevokePurchase = async () => {
    if (!user || !revokeTarget) return
    try {
      setRevoking(true)
      const response = await usersService.revokePackageAccess(user._id, revokeTarget._id, revokeReason)
      if (response.success) {
        toast.success('Package access revoked successfully')
        fetchUser()
      } else {
        toast.error(response.message || 'Failed to revoke package access')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke package access')
    } finally {
      setRevoking(false)
      setRevokeTarget(null)
      setRevokeReason('')
    }
  }

  const handleGrantEbook = async (data: GrantEbookData) => {
    if (!user) return
    try {
      const response = await usersService.grantEbookAccess(user._id, data)
      if (response.success) {
        toast.success('Ebook access granted successfully')
        fetchUser()
        return
      }
      toast.error(response.message || 'Failed to grant ebook access')
    } catch (error: any) {
      toast.error(error.message || 'Failed to grant ebook access')
    }
    throw new Error('Grant failed')
  }

  const handleRevokeEbook = async () => {
    if (!user || !revokeEbookTarget) return
    try {
      setRevokingEbook(true)
      const response = await usersService.revokeEbookAccess(user._id, revokeEbookTarget._id, revokeEbookReason)
      if (response.success) {
        toast.success('Ebook access revoked successfully')
        fetchUser()
      } else {
        toast.error(response.message || 'Failed to revoke ebook access')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke ebook access')
    } finally {
      setRevokingEbook(false)
      setRevokeEbookTarget(null)
      setRevokeEbookReason('')
    }
  }

  const handleGrantSession = async (data: GrantSessionData) => {
    if (!user) return
    try {
      const response = await usersService.grantSessionAccess(user._id, data)
      if (response.success) {
        toast.success('Session access granted successfully')
        fetchUser()
        return
      }
      toast.error(response.message || 'Failed to grant session access')
    } catch (error: any) {
      toast.error(error.message || 'Failed to grant session access')
    }
    throw new Error('Grant failed')
  }

  const handleRevokeSession = async () => {
    if (!user || !revokeSessionTarget) return
    try {
      setRevokingSession(true)
      const response = await usersService.revokeSessionAccess(user._id, revokeSessionTarget._id, revokeSessionReason)
      if (response.success) {
        toast.success('Session access revoked successfully')
        fetchUser()
      } else {
        toast.error(response.message || 'Failed to revoke session access')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke session access')
    } finally {
      setRevokingSession(false)
      setRevokeSessionTarget(null)
      setRevokeSessionReason('')
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!user) return null

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  const formatDateTime = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const getDeviceIcon = (type: DeviceSession['device_type']) => {
    switch (type) {
      case 'iOS':
      case 'Android':
        return <Smartphone className="h-4 w-4" />
      case 'Tablet':
        return <Tablet className="h-4 w-4" />
      case 'Web':
        return <Monitor className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
      case 'pending':
        return 'bg-amber-500/10 text-amber-600 border-amber-200'
      case 'failed':
        return 'bg-red-500/10 text-red-600 border-red-200'
      case 'refunded':
        return 'bg-blue-500/10 text-blue-600 border-blue-200'
      default:
        return ''
    }
  }

  const getOrderStatusColor = (status: BookOrder['order_status']) => {
    switch (status) {
      case 'delivered':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
      case 'shipped':
        return 'bg-blue-500/10 text-blue-600 border-blue-200'
      case 'confirmed':
      case 'processing':
        return 'bg-amber-500/10 text-amber-600 border-amber-200'
      case 'pending':
        return 'bg-zinc-500/10 text-zinc-500 border-zinc-200'
      case 'cancelled':
        return 'bg-red-500/10 text-red-600 border-red-200'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={user.name || 'Unnamed User'}
        description={user.phone_number}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Users', href: '/users' },
          { label: user.name || user.phone_number },
        ]}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowGrantModal(true)}>
              <Gift className="mr-2 h-4 w-4" />
              Grant Package
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowGrantEbookModal(true)}>
              <Gift className="mr-2 h-4 w-4" />
              Grant Ebook
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowGrantSessionModal(true)}>
              <Gift className="mr-2 h-4 w-4" />
              Grant Session
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
            <Button
              variant={user.is_active ? 'destructive' : 'default'}
              size="sm"
              onClick={handleBlockToggle}
              disabled={blocking}
            >
              {blocking ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : user.is_active ? (
                <ShieldBan className="mr-2 h-4 w-4" />
              ) : (
                <ShieldCheck className="mr-2 h-4 w-4" />
              )}
              {user.is_active ? 'Block User' : 'Unblock User'}
            </Button>
          </div>
        }
      />

      {/* Profile + Personal Info Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted overflow-hidden shrink-0">
                {user.photo_url ? (
                  <img src={user.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserCircle className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <p className="text-lg font-medium">{user.name || '—'}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge className={`text-[10px] ${user.is_active
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                      : 'bg-red-500/10 text-red-600 border-red-200'
                    }`}>
                      {user.is_active ? 'Active' : 'Blocked'}
                    </Badge>
                    <Badge variant={user.onboarding_completed ? 'secondary' : 'outline'} className="text-[10px]">
                      {user.onboarding_completed ? 'Done' : 'Pending'}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{user.phone_number}</span>
                  </div>
                  {user.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{user.email}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Profile completion</span>
                    <span>{user.profile_completion_percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${user.profile_completion_percentage}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Joined {formatDate(user.createdAt)}</span>
                  <span>Last login {formatDate(user.last_login)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Date of Birth" value={formatDate(user.date_of_birth)} />
              <InfoRow label="Gender" value={user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : '—'} />
              <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Address" value={user.address || '—'} />
              <InfoRow label="Student ID" value={user.student_id || '—'} />
              <InfoRow icon={<GraduationCap className="h-3.5 w-3.5" />} label="UG College" value={user.ug_college || '—'} />
              <InfoRow icon={<GraduationCap className="h-3.5 w-3.5" />} label="PG College" value={user.pg_college || '—'} />
              <InfoRow icon={<Globe className="h-3.5 w-3.5" />} label="Timezone" value={user.timezone} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject Selections */}
      {user.subject_selections && user.subject_selections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Subject Selections
              <Badge variant="secondary" className="text-[10px] ml-1">{user.subject_selections.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {user.subject_selections.map((s, i) => {
                if (!s.subject_id) return null
                return (
                  <Badge
                    key={i}
                    variant={s.is_primary ? 'default' : 'secondary'}
                    className="text-xs py-1 px-3"
                  >
                    {typeof s.subject_id === 'object' && s.subject_id ? s.subject_id.name : String(s.subject_id)}
                    {s.is_primary && (
                      <span className="ml-1.5 text-[10px] opacity-75">Primary</span>
                    )}
                  </Badge>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Package Purchases */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Package Purchases
            <Badge variant="secondary" className="text-[10px] ml-1">{user.purchases?.length || 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!user.purchases || user.purchases.length === 0) ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No package purchases
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Package</TableHead>
                    <TableHead className="w-28">Amount</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-28">Purchased</TableHead>
                    <TableHead className="w-28">Expires</TableHead>
                    <TableHead className="w-20">Active</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.purchases.map((purchase) => (
                    <TableRow key={purchase._id}>
                      <TableCell className="font-medium text-sm">
                        {typeof purchase.package_id === 'object' && purchase.package_id
                          ? purchase.package_id.name
                          : String(purchase.package_id || 'Unknown')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {purchase.currency} {purchase.amount_paid}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${getPaymentStatusColor(purchase.payment_status)}`}>
                          {purchase.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(purchase.purchased_at)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(purchase.expires_at)}
                      </TableCell>
                      <TableCell>
                        {purchase.is_revoked ? (
                          <Badge className="text-[10px] bg-red-500/10 text-red-600 border-red-200">
                            Revoked
                          </Badge>
                        ) : (
                          <Badge variant={purchase.is_active ? 'default' : 'outline'} className="text-[10px]">
                            {purchase.is_active ? 'Yes' : 'No'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {purchase.is_active && purchase.payment_status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => setRevokeTarget(purchase)}
                          >
                            <Ban className="mr-1 h-3 w-3" />
                            Revoke
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ebook Purchases */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Ebook Purchases
            <Badge variant="secondary" className="text-[10px] ml-1">{user.ebook_purchases?.length || 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!user.ebook_purchases || user.ebook_purchases.length === 0) ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No ebook purchases
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Book</TableHead>
                    <TableHead className="w-28">Amount</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-28">Purchased</TableHead>
                    <TableHead className="w-20">Active</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.ebook_purchases.map((ep) => (
                    <TableRow key={ep._id}>
                      <TableCell className="font-medium text-sm">
                        {typeof ep.book_id === 'object' && ep.book_id ? ep.book_id.title : String(ep.book_id || 'Unknown')}
                        {ep.is_admin_granted && (
                          <Badge variant="outline" className="text-[9px] ml-2 text-violet-600 border-violet-200">Admin Granted</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {ep.currency} {ep.amount_paid}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${getPaymentStatusColor(ep.payment_status)}`}>
                          {ep.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(ep.purchased_at)}
                      </TableCell>
                      <TableCell>
                        {ep.is_revoked ? (
                          <Badge className="text-[10px] bg-red-500/10 text-red-600 border-red-200">
                            Revoked
                          </Badge>
                        ) : (
                          <Badge variant={ep.is_active ? 'default' : 'outline'} className="text-[10px]">
                            {ep.is_active ? 'Yes' : 'No'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {ep.is_active && ep.payment_status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => setRevokeEbookTarget(ep)}
                          >
                            <Ban className="mr-1 h-3 w-3" />
                            Revoke
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Purchases */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="h-4 w-4" />
            Session Purchases
            <Badge variant="secondary" className="text-[10px] ml-1">{user.session_purchases?.length || 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!user.session_purchases || user.session_purchases.length === 0) ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Video className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No session purchases
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Session</TableHead>
                    <TableHead className="w-28">Amount</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-28">Purchased</TableHead>
                    <TableHead className="w-20">Active</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.session_purchases.map((sp) => (
                    <TableRow key={sp._id}>
                      <TableCell className="font-medium text-sm">
                        {typeof sp.session_id === 'object' && sp.session_id ? sp.session_id.title : String(sp.session_id || 'Unknown')}
                        {sp.is_admin_granted && (
                          <Badge variant="outline" className="text-[9px] ml-2 text-violet-600 border-violet-200">Admin Granted</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {sp.currency} {sp.amount_paid}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${getPaymentStatusColor(sp.payment_status)}`}>
                          {sp.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(sp.purchased_at)}
                      </TableCell>
                      <TableCell>
                        {sp.is_revoked ? (
                          <Badge className="text-[10px] bg-red-500/10 text-red-600 border-red-200">
                            Revoked
                          </Badge>
                        ) : (
                          <Badge variant={sp.is_active ? 'default' : 'outline'} className="text-[10px]">
                            {sp.is_active ? 'Yes' : 'No'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {sp.is_active && sp.payment_status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => setRevokeSessionTarget(sp)}
                          >
                            <Ban className="mr-1 h-3 w-3" />
                            Revoke
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Book Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Book Orders
            <Badge variant="secondary" className="text-[10px] ml-1">{user.book_orders?.length || 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!user.book_orders || user.book_orders.length === 0) ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No book orders
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Order</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="w-24">Amount</TableHead>
                    <TableHead className="w-24">Payment</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-28">Tracking</TableHead>
                    <TableHead className="w-28">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.book_orders.map((order) => (
                    <TableRow key={order._id}>
                      <TableCell className="font-medium text-sm font-mono">
                        {order.order_number}
                      </TableCell>
                      <TableCell className="text-sm">
                        {order.items.map((item) => (
                          <div key={item.book_id} className="truncate">
                            {item.title} x{item.quantity}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell className="text-sm">
                        INR {order.total_amount}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${getPaymentStatusColor(order.payment_status)}`}>
                          {order.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${getOrderStatusColor(order.order_status)}`}>
                          {order.order_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {order.tracking_number ? (
                          <div className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {order.tracking_number}
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Device Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Device Sessions
            <Badge variant="secondary" className="text-[10px] ml-1">{user.device_sessions?.length || 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!user.device_sessions || user.device_sessions.length === 0) ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Monitor className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No device sessions
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Device</TableHead>
                    <TableHead className="w-24">Type</TableHead>
                    <TableHead className="w-36">Last Active</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.device_sessions.map((session) => (
                    <TableRow key={session._id}>
                      <TableCell className="text-sm font-medium">{session.device_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          {getDeviceIcon(session.device_type)}
                          {session.device_type}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(session.last_active)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${session.is_active
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                          : 'bg-zinc-500/10 text-zinc-500 border-zinc-200'
                        }`}>
                          {session.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferences */}
      {user.preferences && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Dark Mode</p>
                <Badge variant={user.preferences.dark_mode_enabled ? 'default' : 'outline'} className="mt-1 text-[10px]">
                  {user.preferences.dark_mode_enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Push Notifications</p>
                <Badge variant={user.preferences.push_notifications_enabled ? 'default' : 'outline'} className="mt-1 text-[10px]">
                  {user.preferences.push_notifications_enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Video Quality</p>
                <p className="mt-1 font-medium">{user.preferences.video_quality_preference}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Playback Speed</p>
                <p className="mt-1 font-medium">{user.preferences.playback_speed_default}x</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Language</p>
                <p className="mt-1 font-medium">{user.preferences.language === 'en' ? 'English' : 'Hindi'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit User Modal */}
      {user && (
        <UserFormModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleUpdateUser}
          user={user}
          mode="edit"
        />
      )}

      {/* Grant Package Modal */}
      {user && (
        <GrantPackageModal
          open={showGrantModal}
          onClose={() => setShowGrantModal(false)}
          onSubmit={handleGrantPackage}
          userName={user.name || user.phone_number}
        />
      )}

      {/* Grant Ebook Modal */}
      {user && (
        <GrantEbookModal
          open={showGrantEbookModal}
          onClose={() => setShowGrantEbookModal(false)}
          onSubmit={handleGrantEbook}
          userName={user.name || user.phone_number}
        />
      )}

      {/* Grant Session Modal */}
      {user && (
        <GrantSessionModal
          open={showGrantSessionModal}
          onClose={() => setShowGrantSessionModal(false)}
          onSubmit={handleGrantSession}
          userName={user.name || user.phone_number}
        />
      )}

      {/* Revoke Package Confirmation */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => { if (!open && !revoking) { setRevokeTarget(null); setRevokeReason('') } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Package Access</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke access to{' '}
              <span className="font-medium text-foreground">
                {typeof revokeTarget?.package_id === 'object' && revokeTarget?.package_id ? revokeTarget.package_id.name : 'this package'}
              </span>{' '}
              for {user?.name || user?.phone_number}. The user will see an "access revoked" message.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="revoke-reason">Reason (optional)</Label>
            <Input
              id="revoke-reason"
              placeholder="e.g., Refund issued, Policy violation, etc."
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              disabled={revoking}
              maxLength={500}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokePurchase}
              disabled={revoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revoking ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Revoking...</>
              ) : (
                'Revoke Access'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Ebook Confirmation */}
      <AlertDialog open={!!revokeEbookTarget} onOpenChange={(open) => { if (!open && !revokingEbook) { setRevokeEbookTarget(null); setRevokeEbookReason('') } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Ebook Access</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke access to{' '}
              <span className="font-medium text-foreground">
                {typeof revokeEbookTarget?.book_id === 'object' && revokeEbookTarget?.book_id ? revokeEbookTarget.book_id.title : 'this ebook'}
              </span>{' '}
              for {user?.name || user?.phone_number}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="revoke-ebook-reason">Reason (optional)</Label>
            <Input
              id="revoke-ebook-reason"
              placeholder="e.g., Refund issued, Policy violation, etc."
              value={revokeEbookReason}
              onChange={(e) => setRevokeEbookReason(e.target.value)}
              disabled={revokingEbook}
              maxLength={500}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokingEbook}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeEbook}
              disabled={revokingEbook}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokingEbook ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Revoking...</>
              ) : (
                'Revoke Access'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Session Confirmation */}
      <AlertDialog open={!!revokeSessionTarget} onOpenChange={(open) => { if (!open && !revokingSession) { setRevokeSessionTarget(null); setRevokeSessionReason('') } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Session Access</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke access to{' '}
              <span className="font-medium text-foreground">
                {typeof revokeSessionTarget?.session_id === 'object' && revokeSessionTarget?.session_id ? revokeSessionTarget.session_id.title : 'this session'}
              </span>{' '}
              for {user?.name || user?.phone_number}. The enrollment will also be cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="revoke-session-reason">Reason (optional)</Label>
            <Input
              id="revoke-session-reason"
              placeholder="e.g., Refund issued, Policy violation, etc."
              value={revokeSessionReason}
              onChange={(e) => setRevokeSessionReason(e.target.value)}
              disabled={revokingSession}
              maxLength={500}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokingSession}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeSession}
              disabled={revokingSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokingSession ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Revoking...</>
              ) : (
                'Revoke Access'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Helper component for key-value info rows
function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 font-medium truncate">{value}</p>
    </div>
  )
}
