import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Search, Package, BookOpen, Calendar, User as UserIcon, Phone, Mail, Hash, History } from 'lucide-react'
import {
  usersService, User, UserDetail, GrantPackageData, GrantEbookData, GrantSessionData,
  UserPurchase, EbookPurchase, SessionPurchase,
} from '@/services/users.service'
import { GrantPackageModal } from '@/components/users/GrantPackageModal'
import { GrantEbookModal } from '@/components/users/GrantEbookModal'
import { GrantSessionModal } from '@/components/users/GrantSessionModal'

// Unified history item for display
interface GrantHistoryItem {
  id: string
  type: 'package' | 'ebook' | 'session'
  name: string
  amount: number
  currency: string
  invoiceCreated: boolean
  reason: string | null
  grantedAt: string
  expiresAt: string | null
  isActive: boolean
  isRevoked: boolean
  revokedAt: string | null
  revokedReason: string | null
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  } catch { return dateStr }
}

function buildHistory(detail: UserDetail): GrantHistoryItem[] {
  const items: GrantHistoryItem[] = []

  // Admin-granted packages
  ;(detail.purchases || []).forEach((p: UserPurchase) => {
    if (!p.is_admin_granted) return
    const pkg = typeof p.package_id === 'object' ? p.package_id : null
    items.push({
      id: p._id,
      type: 'package',
      name: pkg?.name || (p.package_id as string),
      amount: p.amount_paid,
      currency: p.currency || 'INR',
      invoiceCreated: !!p.zoho_invoice_id,
      reason: p.admin_grant_reason || null,
      grantedAt: p.purchased_at,
      expiresAt: p.expires_at || null,
      isActive: p.is_active,
      isRevoked: !!p.is_revoked,
      revokedAt: p.revoked_at || null,
      revokedReason: p.revoked_reason || null,
    })
  })

  // Admin-granted ebooks
  ;(detail.ebook_purchases || []).forEach((ep: EbookPurchase) => {
    if (!ep.is_admin_granted) return
    const book = typeof ep.book_id === 'object' ? ep.book_id : null
    items.push({
      id: ep._id,
      type: 'ebook',
      name: book?.title || (ep.book_id as string),
      amount: ep.amount_paid,
      currency: ep.currency || 'INR',
      invoiceCreated: !!ep.zoho_invoice_id,
      reason: ep.admin_grant_reason || null,
      grantedAt: ep.purchased_at,
      expiresAt: null,
      isActive: ep.is_active,
      isRevoked: !!ep.is_revoked,
      revokedAt: ep.revoked_at || null,
      revokedReason: ep.revoked_reason || null,
    })
  })

  // Admin-granted sessions
  ;(detail.session_purchases || []).forEach((sp: SessionPurchase) => {
    if (!sp.is_admin_granted) return
    const session = typeof sp.session_id === 'object' ? sp.session_id : null
    items.push({
      id: sp._id,
      type: 'session',
      name: session?.title || (sp.session_id as string),
      amount: sp.amount_paid,
      currency: sp.currency || 'INR',
      invoiceCreated: !!sp.zoho_invoice_id,
      reason: sp.admin_grant_reason || null,
      grantedAt: sp.purchased_at,
      expiresAt: null,
      isActive: sp.is_active,
      isRevoked: !!sp.is_revoked,
      revokedAt: sp.revoked_at || null,
      revokedReason: sp.revoked_reason || null,
    })
  })

  // Sort by granted date descending
  items.sort((a, b) => new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime())
  return items
}

export function GrantAccessPage() {
  const navigate = useNavigate()

  // User search state
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Grant history
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [grantHistory, setGrantHistory] = useState<GrantHistoryItem[]>([])

  // Grant modal state
  const [grantPackageOpen, setGrantPackageOpen] = useState(false)
  const [grantEbookOpen, setGrantEbookOpen] = useState(false)
  const [grantSessionOpen, setGrantSessionOpen] = useState(false)

  // Debounce search
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [searchQuery])

  // Search users from API
  const searchUsers = useCallback(async () => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSearchResults([])
      return
    }
    try {
      setSearching(true)
      const response = await usersService.getAll({ search: debouncedQuery, limit: 10 })
      if (response.success && response.data) {
        setSearchResults(response.data.entities || [])
      }
    } catch {
      toast.error('Failed to search users')
    } finally {
      setSearching(false)
    }
  }, [debouncedQuery])

  useEffect(() => { searchUsers() }, [searchUsers])

  // Fetch user detail when selected
  const fetchUserDetail = useCallback(async () => {
    if (!selectedUser) {
      setUserDetail(null)
      setGrantHistory([])
      return
    }
    try {
      setLoadingDetail(true)
      const response = await usersService.getById(selectedUser._id)
      if (response.success && response.data) {
        setUserDetail(response.data)
        setGrantHistory(buildHistory(response.data))
      }
    } catch {
      // Non-blocking — history just won't show
    } finally {
      setLoadingDetail(false)
    }
  }, [selectedUser])

  useEffect(() => { fetchUserDetail() }, [fetchUserDetail])

  // Grant handlers — refresh history after success
  const handleGrantPackage = async (data: GrantPackageData) => {
    if (!selectedUser) return
    try {
      const response = await usersService.grantPackageAccess(selectedUser._id, data)
      if (response.success) {
        toast.success(`Package access granted to ${selectedUser.name || selectedUser.phone_number}`)
        fetchUserDetail()
        return
      }
      toast.error(response.message || 'Failed to grant package access')
    } catch (error: any) {
      toast.error(error.message || 'Failed to grant package access')
    }
    throw new Error('Grant failed')
  }

  const handleGrantEbook = async (data: GrantEbookData) => {
    if (!selectedUser) return
    try {
      const response = await usersService.grantEbookAccess(selectedUser._id, data)
      if (response.success) {
        toast.success(`Ebook access granted to ${selectedUser.name || selectedUser.phone_number}`)
        fetchUserDetail()
        return
      }
      toast.error(response.message || 'Failed to grant ebook access')
    } catch (error: any) {
      toast.error(error.message || 'Failed to grant ebook access')
    }
    throw new Error('Grant failed')
  }

  const handleGrantSession = async (data: GrantSessionData) => {
    if (!selectedUser) return
    try {
      const response = await usersService.grantSessionAccess(selectedUser._id, data)
      if (response.success) {
        toast.success(`Session access granted to ${selectedUser.name || selectedUser.phone_number}`)
        fetchUserDetail()
        return
      }
      toast.error(response.message || 'Failed to grant session access')
    } catch (error: any) {
      toast.error(error.message || 'Failed to grant session access')
    }
    throw new Error('Grant failed')
  }

  const userName = selectedUser?.name || selectedUser?.phone_number || 'User'

  const typeBadge = (type: GrantHistoryItem['type']) => {
    const colors = {
      package: 'bg-blue-500/10 text-blue-700 border-blue-200',
      ebook: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
      session: 'bg-purple-500/10 text-purple-700 border-purple-200',
    }
    const labels = { package: 'Package', ebook: 'Ebook', session: 'Session' }
    return <Badge variant="outline" className={`text-[10px] ${colors[type]}`}>{labels[type]}</Badge>
  }

  const statusBadge = (item: GrantHistoryItem) => {
    if (item.isRevoked) return <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 border-red-200">Revoked</Badge>
    if (!item.isActive) {
      if (item.expiresAt && new Date(item.expiresAt) < new Date()) {
        return <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-200">Expired</Badge>
      }
      return <Badge variant="outline" className="text-[10px] bg-gray-500/10 text-gray-600 border-gray-200">Inactive</Badge>
    }
    return <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-200">Active</Badge>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grant Access"
        description="Search for a user and grant them access to packages, ebooks, or live sessions"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Users', href: '/users' },
          { label: 'Grant Access' },
        ]}
      />

      {/* Step 1: User Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step 1: Find User</CardTitle>
          <CardDescription>Search by name, email, phone number, or student ID</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                if (selectedUser) setSelectedUser(null)
              }}
              className="pl-10"
            />
          </div>

          {/* Search Results */}
          {searching && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          )}

          {!searching && !selectedUser && debouncedQuery.length >= 2 && searchResults.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No users found for "{debouncedQuery}"
            </p>
          )}

          {!searching && !selectedUser && searchResults.length > 0 && (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {searchResults.map((user) => (
                <button
                  key={user._id}
                  onClick={() => {
                    setSelectedUser(user)
                    setSearchResults([])
                    setSearchQuery(user.name || user.phone_number)
                  }}
                  className="w-full flex items-center gap-4 rounded-lg border p-3 text-left transition-colors hover:bg-accent border-border"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{user.name || 'Unnamed User'}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {user.phone_number && (
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{user.phone_number}</span>
                      )}
                      {user.email && (
                        <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{user.email}</span>
                      )}
                      {user.student_id && (
                        <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{user.student_id}</span>
                      )}
                    </div>
                  </div>
                  <Badge variant={user.is_active ? 'default' : 'destructive'} className="text-[10px] shrink-0">
                    {user.is_active ? 'Active' : 'Blocked'}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {/* Selected User Card */}
          {selectedUser && (
            <div className="flex items-center gap-4 rounded-lg border border-primary bg-primary/5 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{selectedUser.name || 'Unnamed User'}</p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {selectedUser.phone_number && <span>{selectedUser.phone_number}</span>}
                  {selectedUser.email && <span>{selectedUser.email}</span>}
                  {selectedUser.student_id && <span>ID: {selectedUser.student_id}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={selectedUser.is_active ? 'default' : 'destructive'}>
                  {selectedUser.is_active ? 'Active' : 'Blocked'}
                </Badge>
                <button
                  onClick={() => navigate(`/users/${selectedUser._id}`)}
                  className="text-xs text-primary hover:underline"
                >
                  View Profile
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Choose Grant Type */}
      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 2: Grant Access</CardTitle>
            <CardDescription>
              Choose what to grant to <strong>{userName}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="package">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="package" className="gap-2">
                  <Package className="h-4 w-4" />
                  Package
                </TabsTrigger>
                <TabsTrigger value="ebook" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Ebook
                </TabsTrigger>
                <TabsTrigger value="session" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Live Session
                </TabsTrigger>
              </TabsList>

              <TabsContent value="package" className="mt-6">
                <div className="max-w-md space-y-3">
                  <div>
                    <h3 className="font-medium">Grant Package Access</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Give the user access to a content package with a specific duration.
                    </p>
                  </div>
                  <button
                    onClick={() => setGrantPackageOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Package className="h-4 w-4" />
                    Grant Package
                  </button>
                </div>
              </TabsContent>

              <TabsContent value="ebook" className="mt-6">
                <div className="max-w-md space-y-3">
                  <div>
                    <h3 className="font-medium">Grant Ebook Access</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Give the user perpetual access to an ebook. Optionally create an invoice.
                    </p>
                  </div>
                  <button
                    onClick={() => setGrantEbookOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <BookOpen className="h-4 w-4" />
                    Grant Ebook
                  </button>
                </div>
              </TabsContent>

              <TabsContent value="session" className="mt-6">
                <div className="max-w-md space-y-3">
                  <div>
                    <h3 className="font-medium">Grant Live Session Access</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Give the user access to a live session with guaranteed enrollment. Optionally create an invoice.
                    </p>
                  </div>
                  <button
                    onClick={() => setGrantSessionOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Calendar className="h-4 w-4" />
                    Grant Session
                  </button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Grant History */}
      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Admin Grant History
            </CardTitle>
            <CardDescription>
              All admin-granted access for <strong>{userName}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDetail ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : grantHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No admin grants found for this user.
              </p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Item</TableHead>
                      <TableHead className="text-xs">Amount</TableHead>
                      <TableHead className="text-xs">Invoice</TableHead>
                      <TableHead className="text-xs">Reason</TableHead>
                      <TableHead className="text-xs">Granted</TableHead>
                      <TableHead className="text-xs">Expires</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grantHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{typeBadge(item.type)}</TableCell>
                        <TableCell className="text-sm font-medium max-w-48 truncate">{item.name}</TableCell>
                        <TableCell className="text-sm">
                          {item.amount > 0 ? `${item.currency} ${item.amount}` : 'Free'}
                        </TableCell>
                        <TableCell>
                          {item.invoiceCreated ? (
                            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-200">Yes</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-40 truncate" title={item.reason || undefined}>
                          {item.reason || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(item.grantedAt)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {item.expiresAt ? formatDate(item.expiresAt) : 'Never'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {statusBadge(item)}
                            {item.isRevoked && item.revokedReason && (
                              <span className="text-[10px] text-muted-foreground truncate max-w-24" title={item.revokedReason}>
                                {item.revokedReason}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grant Modals */}
      <GrantPackageModal
        open={grantPackageOpen}
        onClose={() => setGrantPackageOpen(false)}
        onSubmit={handleGrantPackage}
        userName={userName}
      />
      <GrantEbookModal
        open={grantEbookOpen}
        onClose={() => setGrantEbookOpen(false)}
        onSubmit={handleGrantEbook}
        userName={userName}
      />
      <GrantSessionModal
        open={grantSessionOpen}
        onClose={() => setGrantSessionOpen(false)}
        onSubmit={handleGrantSession}
        userName={userName}
      />
    </div>
  )
}
