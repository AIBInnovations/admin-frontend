import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Search, Package, BookOpen, Calendar, User as UserIcon, Phone, Mail, Hash } from 'lucide-react'
import { usersService, User, GrantPackageData, GrantEbookData, GrantSessionData } from '@/services/users.service'
import { GrantPackageModal } from '@/components/users/GrantPackageModal'
import { GrantEbookModal } from '@/components/users/GrantEbookModal'
import { GrantSessionModal } from '@/components/users/GrantSessionModal'

export function GrantAccessPage() {
  const navigate = useNavigate()

  // User search state
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

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
      const response = await usersService.getAll({
        search: debouncedQuery,
        limit: 10,
      })
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

  // Grant handlers
  const handleGrantPackage = async (data: GrantPackageData) => {
    if (!selectedUser) return
    try {
      const response = await usersService.grantPackageAccess(selectedUser._id, data)
      if (response.success) {
        toast.success(`Package access granted to ${selectedUser.name || selectedUser.phone_number}`)
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
        return
      }
      toast.error(response.message || 'Failed to grant session access')
    } catch (error: any) {
      toast.error(error.message || 'Failed to grant session access')
    }
    throw new Error('Grant failed')
  }

  const userName = selectedUser?.name || selectedUser?.phone_number || 'User'

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
                if (!e.target.value) setSelectedUser(null)
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

          {!searching && debouncedQuery.length >= 2 && searchResults.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No users found for "{debouncedQuery}"
            </p>
          )}

          {!searching && searchResults.length > 0 && (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {searchResults.map((user) => (
                <button
                  key={user._id}
                  onClick={() => {
                    setSelectedUser(user)
                    setSearchResults([])
                    setSearchQuery(user.name || user.phone_number)
                  }}
                  className={`w-full flex items-center gap-4 rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                    selectedUser?._id === user._id ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {user.name || 'Unnamed User'}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {user.phone_number && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {user.phone_number}
                        </span>
                      )}
                      {user.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </span>
                      )}
                      {user.student_id && (
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {user.student_id}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <Badge variant={user.is_active ? 'default' : 'destructive'} className="text-[10px]">
                      {user.is_active ? 'Active' : 'Blocked'}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selected User Card */}
          {selectedUser && searchResults.length === 0 && (
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
      {selectedUser && searchResults.length === 0 && (
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
