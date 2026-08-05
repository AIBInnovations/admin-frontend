import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { DashboardLayout } from '@/components/layouts'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Toaster } from '@/components/ui/sonner'

// Pages
import { LoginPage } from '@/pages/auth/LoginPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { UnauthorizedPage } from '@/pages/UnauthorizedPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { UsersPage } from '@/pages/users/UsersPage'
import { UserDetailPage } from '@/pages/users/UserDetailPage'
import { GrantAccessPage } from '@/pages/users/GrantAccessPage'
import { ExcludedUsersPage } from '@/pages/users/ExcludedUsersPage'
import { SubscriptionsPage } from '@/pages/subscriptions/SubscriptionsPage'
import { SubjectsPage } from '@/pages/content/SubjectsPage'
import { SubjectDetailPage } from '@/pages/content/SubjectDetailPage'
import { PackagesPage } from '@/pages/content/PackagesPage'
import { PackageDetailPage } from '@/pages/content/PackageDetailPage'
import { SeriesPage } from '@/pages/content/SeriesPage'
import { ModulesPage } from '@/pages/content/ModulesPage'
import { VideosPage } from '@/pages/content/VideosPage'
import { DocumentsPage } from '@/pages/content/DocumentsPage'
import { SessionsPage } from '@/pages/sessions/SessionsPage'
import { SessionDetailPage } from '@/pages/sessions/SessionDetailPage'
import { SessionAttendeesPage } from '@/pages/sessions/SessionAttendeesPage'
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
import { WebStoreRedirectRulesPage } from '@/pages/settings/WebStoreRedirectRulesPage'
import { VideoTagsPage } from '@/pages/content/VideoTagsPage'
import { BooksPage } from '@/pages/content/BooksPage'
import { BannersPage } from '@/pages/content/BannersPage'
import { HomeSectionsPage } from '@/pages/content/HomeSectionsPage'
import { HomeSectionDetailPage } from '@/pages/content/HomeSectionDetailPage'
import { InvoicesPage } from '@/pages/commerce/InvoicesPage'
import { CouponsPage } from '@/pages/commerce/CouponsPage'
import { PackageTypesPage } from '@/pages/content/PackageTypesPage'
import { RecordingsPage } from '@/pages/content/RecordingsPage'
import { VideoReviewsPage } from '@/pages/content/VideoReviewsPage'
import { ArchivesPage } from '@/pages/content/ArchivesPage'
import { FormsPage } from '@/pages/content/FormsPage'
import { FormSubmissionsPage } from '@/pages/content/FormSubmissionsPage'
import { TutorialsPage } from '@/pages/content/TutorialsPage'
import { ExportsPage } from '@/pages/exports/ExportsPage'
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage'
import { DeleteAccountPage } from '@/pages/DeleteAccountPage'
import { ExplorerPage } from '@/pages/explorer/ExplorerPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/delete-account" element={<DeleteAccountPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected Routes. Inner ProtectedRoute wrappers gate by permission
              (mirror Sidebar nav permissions); they redirect to /unauthorized. */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              {/* Dashboard — always available to any authenticated admin */}
              <Route path="/" element={<DashboardPage />} />

              {/* Users */}
              <Route element={<ProtectedRoute requiredPermission="users.read" />}>
                <Route path="/users" element={<UsersPage />} />
                <Route path="/users/subscriptions" element={<SubscriptionsPage />} />
                <Route path="/users/email-excluded" element={<ExcludedUsersPage />} />
                <Route path="/users/:userId" element={<UserDetailPage />} />
                {/* Exports use users.read on the backend */}
                <Route path="/exports" element={<ExportsPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="users.update" />}>
                <Route path="/users/grant-access" element={<GrantAccessPage />} />
              </Route>

              {/* Content */}
              <Route element={<ProtectedRoute requiredPermission="subjects.read" />}>
                <Route path="/content/subjects" element={<SubjectsPage />} />
                <Route path="/content/subjects/:subjectId" element={<SubjectDetailPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="packages.read" />}>
                <Route path="/content/packages" element={<PackagesPage />} />
                <Route path="/content/packages/:packageId" element={<PackageDetailPage />} />
                <Route path="/content/package-types" element={<PackageTypesPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="series.read" />}>
                <Route path="/content/series" element={<SeriesPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="modules.read" />}>
                <Route path="/content/modules" element={<ModulesPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="videos.read" />}>
                <Route path="/content/videos" element={<VideosPage />} />
                <Route path="/content/video-reviews" element={<VideoReviewsPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="video_tags.read" />}>
                <Route path="/content/video-tags" element={<VideoTagsPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="documents.read" />}>
                <Route path="/content/documents" element={<DocumentsPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="live_sessions.read" />}>
                <Route path="/content/recordings" element={<RecordingsPage />} />
                {/* Live Sessions */}
                <Route path="/sessions" element={<SessionsPage />} />
                <Route path="/sessions/:sessionId" element={<SessionDetailPage />} />
                <Route path="/sessions/:sessionId/attendees" element={<SessionAttendeesPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="books.read" />}>
                <Route path="/content/books" element={<BooksPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="banners.read" />}>
                <Route path="/content/banners" element={<BannersPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="home-sections.read" />}>
                <Route path="/content/home-sections" element={<HomeSectionsPage />} />
                <Route path="/content/home-sections/:sectionId" element={<HomeSectionDetailPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="forms.read" />}>
                <Route path="/content/forms" element={<FormsPage />} />
                <Route path="/content/forms/:formId/submissions" element={<FormSubmissionsPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="tutorials.read" />}>
                <Route path="/content/tutorials" element={<TutorialsPage />} />
              </Route>

              {/* Faculty */}
              <Route element={<ProtectedRoute requiredPermission="faculty.read" />}>
                <Route path="/faculty" element={<FacultyPage />} />
              </Route>

              {/* Commerce */}
              <Route element={<ProtectedRoute requiredPermission="payments.read" />}>
                <Route path="/commerce/purchases" element={<PurchasesPage />} />
                <Route path="/commerce/payments" element={<PaymentsPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="book_orders.read" />}>
                <Route path="/commerce/book-orders" element={<BookOrdersPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="invoices.read" />}>
                <Route path="/commerce/invoices" element={<InvoicesPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="coupons.read" />}>
                <Route path="/commerce/coupons" element={<CouponsPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="analytics.read" />}>
                <Route path="/commerce/revenue" element={<RevenuePage />} />
                {/* Analytics */}
                <Route path="/analytics" element={<AnalyticsPage />} />
              </Route>

              {/* Notifications */}
              <Route element={<ProtectedRoute requiredPermission="notifications.read" />}>
                <Route path="/notifications" element={<NotificationsPage />} />
              </Route>

              {/* Settings */}
              <Route element={<ProtectedRoute requiredPermission="admin_users.read" />}>
                <Route path="/settings/admin-users" element={<AdminUsersPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="admin_roles.read" />}>
                <Route path="/settings/admin-roles" element={<AdminRolesPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="settings.read" />}>
                <Route path="/settings/app" element={<AppSettingsPage />} />
                <Route path="/settings/web-store-redirect" element={<WebStoreRedirectRulesPage />} />
              </Route>

              {/* Super-admin only: Explorer (edits all entities) + Archives */}
              <Route element={<ProtectedRoute requiredPermission="*" />}>
                <Route path="/content/explorer/*" element={<ExplorerPage />} />
                <Route path="/content/archives" element={<ArchivesPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
