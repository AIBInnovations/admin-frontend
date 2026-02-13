import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  UserCircle, ShieldBan, ShieldCheck, Loader2,
  Phone, Mail, MapPin, Calendar, GraduationCap, Globe, Smartphone,
  Monitor, Tablet, CreditCard, Package, Settings, BookOpen,
  Video, ShoppingBag, Truck,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  usersService,
  UserDetail,
  UserPurchase,
  SessionPurchase,
  BookOrder,
  DeviceSession,
} from '@/services/users.service'

export function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()

  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [blocking, setBlocking] = useState(false)

  const fetchUser = useCallback(async () => {
    if (!userId) return
    try {
      setLoading(true)
      const response = await usersService.getById(userId)
      if (response.success && response.data) {
        setUser(response.data)
      } else {
        toast.error('User not found')
        navigate('/users')
      }
    } catch {
      toast.error('Failed to load user details')
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
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user status')
    } finally {
      setBlocking(false)
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
              {user.subject_selections.map((s, i) => (
                <Badge
                  key={i}
                  variant={s.is_primary ? 'default' : 'secondary'}
                  className="text-xs py-1 px-3"
                >
                  {typeof s.subject_id === 'object' ? s.subject_id.name : s.subject_id}
                  {s.is_primary && (
                    <span className="ml-1.5 text-[10px] opacity-75">Primary</span>
                  )}
                </Badge>
              ))}
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.purchases.map((purchase) => (
                    <TableRow key={purchase._id}>
                      <TableCell className="font-medium text-sm">
                        {typeof purchase.package_id === 'object'
                          ? purchase.package_id.name
                          : purchase.package_id}
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
                        <Badge variant={purchase.is_active ? 'default' : 'outline'} className="text-[10px]">
                          {purchase.is_active ? 'Yes' : 'No'}
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.session_purchases.map((sp) => (
                    <TableRow key={sp._id}>
                      <TableCell className="font-medium text-sm">
                        {typeof sp.session_id === 'object' ? sp.session_id.title : sp.session_id}
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
