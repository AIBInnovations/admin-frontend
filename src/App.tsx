import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { DashboardLayout } from '@/components/layouts'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

// Pages
import { LoginPage } from '@/pages/auth/LoginPage'
import { UnauthorizedPage } from '@/pages/UnauthorizedPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { UsersPage } from '@/pages/users/UsersPage'
import { UserDetailPage } from '@/pages/users/UserDetailPage'
import { SubjectsPage } from '@/pages/content/SubjectsPage'
import { SubjectDetailPage } from '@/pages/content/SubjectDetailPage'
import { PackagesPage } from '@/pages/content/PackagesPage'
import { PackageDetailPage } from '@/pages/content/PackageDetailPage'
import { SeriesPage } from '@/pages/content/SeriesPage'
import { ModulesPage } from '@/pages/content/ModulesPage'
import { VideosPage } from '@/pages/content/VideosPage'
import { DocumentsPage } from '@/pages/content/DocumentsPage'
import { SessionsPage } from '@/pages/sessions/SessionsPage'
import { FacultyPage } from '@/pages/faculty/FacultyPage'
import { PurchasesPage } from '@/pages/commerce/PurchasesPage'
import { PaymentsPage } from '@/pages/commerce/PaymentsPage'
import { BookOrdersPage } from '@/pages/commerce/BookOrdersPage'
import { RevenuePage } from '@/pages/commerce/RevenuePage'
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage'
import { NotificationsPage } from '@/pages/notifications/NotificationsPage'
import { AdminUsersPage } from '@/pages/settings/AdminUsersPage'
import { AdminRolesPage } from '@/pages/settings/AdminRolesPage'
import { AppSettingsPage } from '@/pages/settings/AppSettingsPage'
import { VideoTagsPage } from '@/pages/content/VideoTagsPage'
import { BooksPage } from '@/pages/content/BooksPage'
import { BannersPage } from '@/pages/content/BannersPage'
import { InvoicesPage } from '@/pages/commerce/InvoicesPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              {/* Dashboard */}
              <Route path="/" element={<DashboardPage />} />

              {/* Users */}
              <Route path="/users" element={<UsersPage />} />
              <Route path="/users/:userId" element={<UserDetailPage />} />

              {/* Content */}
              <Route path="/content/subjects" element={<SubjectsPage />} />
              <Route path="/content/subjects/:subjectId" element={<SubjectDetailPage />} />
              <Route path="/content/packages" element={<PackagesPage />} />
              <Route path="/content/packages/:packageId" element={<PackageDetailPage />} />
              <Route path="/content/series" element={<SeriesPage />} />
              <Route path="/content/modules" element={<ModulesPage />} />
              <Route path="/content/videos" element={<VideosPage />} />
              <Route path="/content/documents" element={<DocumentsPage />} />
              <Route path="/content/video-tags" element={<VideoTagsPage />} />
              <Route path="/content/books" element={<BooksPage />} />
              <Route path="/content/banners" element={<BannersPage />} />

              {/* Live Sessions */}
              <Route path="/sessions" element={<SessionsPage />} />

              {/* Faculty */}
              <Route path="/faculty" element={<FacultyPage />} />

              {/* Commerce */}
              <Route path="/commerce/purchases" element={<PurchasesPage />} />
              <Route path="/commerce/payments" element={<PaymentsPage />} />
              <Route path="/commerce/book-orders" element={<BookOrdersPage />} />
              <Route path="/commerce/revenue" element={<RevenuePage />} />
              <Route path="/commerce/invoices" element={<InvoicesPage />} />

              {/* Analytics */}
              <Route path="/analytics" element={<AnalyticsPage />} />

              {/* Notifications */}
              <Route path="/notifications" element={<NotificationsPage />} />

              {/* Settings */}
              <Route path="/settings/admin-users" element={<AdminUsersPage />} />
              <Route path="/settings/admin-roles" element={<AdminRolesPage />} />
              <Route path="/settings/app" element={<AppSettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
