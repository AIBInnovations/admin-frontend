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
import { VideoTagsPage } from '@/pages/content/VideoTagsPage'
import { BooksPage } from '@/pages/content/BooksPage'
import { BannersPage } from '@/pages/content/BannersPage'
import { HomeSectionsPage } from '@/pages/content/HomeSectionsPage'
import { HomeSectionDetailPage } from '@/pages/content/HomeSectionDetailPage'
import { InvoicesPage } from '@/pages/commerce/InvoicesPage'
import { PackageTypesPage } from '@/pages/content/PackageTypesPage'
import { RecordingsPage } from '@/pages/content/RecordingsPage'
import { VideoReviewsPage } from '@/pages/content/VideoReviewsPage'
import { ArchivesPage } from '@/pages/content/ArchivesPage'
import { FormsPage } from '@/pages/content/FormsPage'
import { FormSubmissionsPage } from '@/pages/content/FormSubmissionsPage'
import { TutorialsPage } from '@/pages/content/TutorialsPage'
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage'
import { DeleteAccountPage } from '@/pages/DeleteAccountPage'

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

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              {/* Dashboard */}
              <Route path="/" element={<DashboardPage />} />

              {/* Users */}
              <Route path="/users" element={<UsersPage />} />
              <Route path="/users/grant-access" element={<GrantAccessPage />} />
              <Route path="/users/:userId" element={<UserDetailPage />} />

              {/* Content */}
              <Route path="/content/subjects" element={<SubjectsPage />} />
              <Route path="/content/subjects/:subjectId" element={<SubjectDetailPage />} />
              <Route path="/content/packages" element={<PackagesPage />} />
              <Route path="/content/packages/:packageId" element={<PackageDetailPage />} />
              <Route path="/content/package-types" element={<PackageTypesPage />} />
              <Route path="/content/series" element={<SeriesPage />} />
              <Route path="/content/modules" element={<ModulesPage />} />
              <Route path="/content/videos" element={<VideosPage />} />
              <Route path="/content/documents" element={<DocumentsPage />} />
              <Route path="/content/recordings" element={<RecordingsPage />} />
              <Route path="/content/video-tags" element={<VideoTagsPage />} />
              <Route path="/content/books" element={<BooksPage />} />
              <Route path="/content/banners" element={<BannersPage />} />
              <Route path="/content/home-sections" element={<HomeSectionsPage />} />
              <Route path="/content/home-sections/:sectionId" element={<HomeSectionDetailPage />} />
              <Route path="/content/video-reviews" element={<VideoReviewsPage />} />
              <Route path="/content/archives" element={<ArchivesPage />} />
              <Route path="/content/forms" element={<FormsPage />} />
              <Route path="/content/forms/:formId/submissions" element={<FormSubmissionsPage />} />
              <Route path="/content/tutorials" element={<TutorialsPage />} />

              {/* Live Sessions */}
              <Route path="/sessions" element={<SessionsPage />} />
              <Route path="/sessions/:sessionId" element={<SessionDetailPage />} />
              <Route path="/sessions/:sessionId/attendees" element={<SessionAttendeesPage />} />

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
