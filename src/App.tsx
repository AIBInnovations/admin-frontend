import { lazy, Suspense, type ComponentType } from 'react'
import { createBrowserRouter, createRoutesFromElements, Outlet, Route, RouterProvider } from 'react-router-dom'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Toaster } from '@/components/ui/sonner'
import { PageSkeleton } from '@/components/common/PageSkeleton'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RouteErrorPage } from '@/components/errors/RouteErrorPage'

/**
 * Pages load on first visit, so opening the panel does not download every
 * section. Adding a page: one `page(...)` line here and one <Route> below.
 */
function page<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(async () => ({ default: (await load())[name] }))
}

const ForgotPasswordPage = page(() => import('@/pages/auth/ForgotPasswordPage'), 'ForgotPasswordPage')
const UnauthorizedPage = page(() => import('@/pages/UnauthorizedPage'), 'UnauthorizedPage')
const ProfilePage = page(() => import('@/pages/ProfilePage'), 'ProfilePage')
const NotFoundPage = page(() => import('@/pages/NotFoundPage'), 'NotFoundPage')
const DashboardPage = page(() => import('@/pages/DashboardPage'), 'DashboardPage')
const UsersPage = page(() => import('@/pages/users/UsersPage'), 'UsersPage')
const UserDetailPage = page(() => import('@/pages/users/UserDetailPage'), 'UserDetailPage')
const UserEditorPage = page(() => import('@/pages/users/UserEditorPage'), 'UserEditorPage')
const UserGrantPage = page(() => import('@/pages/users/UserGrantPage'), 'UserGrantPage')
const GrantAccessPage = page(() => import('@/pages/users/GrantAccessPage'), 'GrantAccessPage')
const ExcludedUsersPage = page(() => import('@/pages/users/ExcludedUsersPage'), 'ExcludedUsersPage')
const SubscriptionsPage = page(() => import('@/pages/subscriptions/SubscriptionsPage'), 'SubscriptionsPage')
const SubjectsPage = page(() => import('@/pages/content/SubjectsPage'), 'SubjectsPage')
const SubjectDetailPage = page(() => import('@/pages/content/SubjectDetailPage'), 'SubjectDetailPage')
const PackagesPage = page(() => import('@/pages/content/PackagesPage'), 'PackagesPage')
const PackageDetailPage = page(() => import('@/pages/content/PackageDetailPage'), 'PackageDetailPage')
const PackageEditorPage = page(() => import('@/pages/content/PackageEditorPage'), 'PackageEditorPage')
const SeriesPage = page(() => import('@/pages/content/SeriesPage'), 'SeriesPage')
const ModulesPage = page(() => import('@/pages/content/ModulesPage'), 'ModulesPage')
const VideosPage = page(() => import('@/pages/content/VideosPage'), 'VideosPage')
const DocumentsPage = page(() => import('@/pages/content/DocumentsPage'), 'DocumentsPage')
const SessionsPage = page(() => import('@/pages/sessions/SessionsPage'), 'SessionsPage')
const SessionDetailPage = page(() => import('@/pages/sessions/SessionDetailPage'), 'SessionDetailPage')
const SessionEditorPage = page(() => import('@/pages/sessions/SessionEditorPage'), 'SessionEditorPage')
const SessionAttendeesPage = page(() => import('@/pages/sessions/SessionAttendeesPage'), 'SessionAttendeesPage')
const WorkshopsPage = page(() => import('@/pages/workshops/WorkshopsPage'), 'WorkshopsPage')
const WorkshopDetailPage = page(() => import('@/pages/workshops/WorkshopDetailPage'), 'WorkshopDetailPage')
const WorkshopEditorPage = page(() => import('@/pages/workshops/WorkshopEditorPage'), 'WorkshopEditorPage')
const WorkshopEnrolleesPage = page(() => import('@/pages/workshops/WorkshopEnrolleesPage'), 'WorkshopEnrolleesPage')
const FacultyPage = page(() => import('@/pages/faculty/FacultyPage'), 'FacultyPage')
const FacultyDetailPage = page(() => import('@/pages/faculty/FacultyDetailPage'), 'FacultyDetailPage')
const FacultyEditorPage = page(() => import('@/pages/faculty/FacultyEditorPage'), 'FacultyEditorPage')
const FeedbackPage = page(() => import('@/pages/feedback/FeedbackPage'), 'FeedbackPage')
const FeedbackDetailPage = page(() => import('@/pages/feedback/FeedbackDetailPage'), 'FeedbackDetailPage')
const FeedbackFacultyPage = page(() => import('@/pages/feedback/FeedbackScopePage'), 'FeedbackFacultyPage')
const FeedbackVideoPage = page(() => import('@/pages/feedback/FeedbackScopePage'), 'FeedbackVideoPage')
const CareersPage = page(() => import('@/pages/careers/CareersPage'), 'CareersPage')
const CareerDetailPage = page(() => import('@/pages/careers/CareerDetailPage'), 'CareerDetailPage')
const PurchasesPage = page(() => import('@/pages/commerce/PurchasesPage'), 'PurchasesPage')
const PaymentsPage = page(() => import('@/pages/commerce/PaymentsPage'), 'PaymentsPage')
const BookOrdersPage = page(() => import('@/pages/commerce/BookOrdersPage'), 'BookOrdersPage')
const RevenuePage = page(() => import('@/pages/commerce/RevenuePage'), 'RevenuePage')
const AnalyticsPage = page(() => import('@/pages/analytics/AnalyticsPage'), 'AnalyticsPage')
const NotificationsPage = page(() => import('@/pages/notifications/NotificationsPage'), 'NotificationsPage')
const NotificationDetailPage = page(() => import('@/pages/notifications/NotificationDetailPage'), 'NotificationDetailPage')
const AdminUsersPage = page(() => import('@/pages/settings/AdminUsersPage'), 'AdminUsersPage')
const AdminRolesPage = page(() => import('@/pages/settings/AdminRolesPage'), 'AdminRolesPage')
const AppSettingsPage = page(() => import('@/pages/settings/AppSettingsPage'), 'AppSettingsPage')
const WebStoreRedirectRulesPage = page(() => import('@/pages/settings/WebStoreRedirectRulesPage'), 'WebStoreRedirectRulesPage')
const StudentProfileFieldsPage = page(() => import('@/pages/settings/StudentProfileFieldsPage'), 'StudentProfileFieldsPage')
const VideoTagsPage = page(() => import('@/pages/content/VideoTagsPage'), 'VideoTagsPage')
const BooksPage = page(() => import('@/pages/content/BooksPage'), 'BooksPage')
const BookDetailPage = page(() => import('@/pages/content/BookDetailPage'), 'BookDetailPage')
const BookEditorPage = page(() => import('@/pages/content/BookEditorPage'), 'BookEditorPage')
const BannersPage = page(() => import('@/pages/content/BannersPage'), 'BannersPage')
const BannerEditorPage = page(() => import('@/pages/content/BannerEditorPage'), 'BannerEditorPage')
const HomeSectionsPage = page(() => import('@/pages/content/HomeSectionsPage'), 'HomeSectionsPage')
const HomeSectionDetailPage = page(() => import('@/pages/content/HomeSectionDetailPage'), 'HomeSectionDetailPage')
const HomeSectionItemEditorPage = page(() => import('@/pages/content/HomeSectionItemEditorPage'), 'HomeSectionItemEditorPage')
const InvoicesPage = page(() => import('@/pages/commerce/InvoicesPage'), 'InvoicesPage')
const CouponsPage = page(() => import('@/pages/commerce/CouponsPage'), 'CouponsPage')
const CouponDetailPage = page(() => import('@/pages/commerce/CouponDetailPage'), 'CouponDetailPage')
const CouponEditorPage = page(() => import('@/pages/commerce/CouponEditorPage'), 'CouponEditorPage')
const DeliveryNotesPage = page(() => import('@/pages/commerce/DeliveryNotesPage'), 'DeliveryNotesPage')
const PurchaseDetailPage = page(() => import('@/pages/commerce/PurchaseDetailPage'), 'PurchaseDetailPage')
const PaymentDetailPage = page(() => import('@/pages/commerce/PaymentDetailPage'), 'PaymentDetailPage')
const InvoiceDetailPage = page(() => import('@/pages/commerce/InvoiceDetailPage'), 'InvoiceDetailPage')
const BookOrderDetailPage = page(() => import('@/pages/commerce/BookOrderDetailPage'), 'BookOrderDetailPage')
const CasesPage = page(() => import('@/pages/commerce/CasesPage'), 'CasesPage')
const CaseDetailPage = page(() => import('@/pages/commerce/CaseDetailPage'), 'CaseDetailPage')
const CaseEvidencePage = page(() => import('@/pages/commerce/CaseEvidencePage'), 'CaseEvidencePage')
const PackageTypesPage = page(() => import('@/pages/content/PackageTypesPage'), 'PackageTypesPage')
const RecordingsPage = page(() => import('@/pages/content/RecordingsPage'), 'RecordingsPage')
const RecordingEditorPage = page(() => import('@/pages/content/RecordingEditorPage'), 'RecordingEditorPage')
const VideoReviewsPage = page(() => import('@/pages/content/VideoReviewsPage'), 'VideoReviewsPage')
const ArchivesPage = page(() => import('@/pages/content/ArchivesPage'), 'ArchivesPage')
const FormsPage = page(() => import('@/pages/content/FormsPage'), 'FormsPage')
const FormEditorPage = page(() => import('@/pages/content/FormEditorPage'), 'FormEditorPage')
const FormSubmissionDetailPage = page(() => import('@/pages/content/FormSubmissionDetailPage'), 'FormSubmissionDetailPage')
const FormSubmissionsPage = page(() => import('@/pages/content/FormSubmissionsPage'), 'FormSubmissionsPage')
const TutorialsPage = page(() => import('@/pages/content/TutorialsPage'), 'TutorialsPage')
const TutorialEditorPage = page(() => import('@/pages/content/TutorialEditorPage'), 'TutorialEditorPage')
const ExportsPage = page(() => import('@/pages/exports/ExportsPage'), 'ExportsPage')
const PrivacyPolicyPage = page(() => import('@/pages/PrivacyPolicyPage'), 'PrivacyPolicyPage')
const DeleteAccountPage = page(() => import('@/pages/DeleteAccountPage'), 'DeleteAccountPage')
const ExplorerPage = page(() => import('@/pages/explorer/ExplorerPage'), 'ExplorerPage')

/** Auth lives inside the router (it navigates), above every route. */
function Root() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors closeButton />
      <Suspense fallback={<div className="p-6"><PageSkeleton /></div>}>
        <Outlet />
      </Suspense>
    </AuthProvider>
  )
}

// A data router, so unsaved edits can block navigation (see NavigationGuard).
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<Root />} errorElement={<RouteErrorPage />}>
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
              <Route path="/profile" element={<ProfilePage />} />

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
                <Route path="/users/:userId/edit" element={<UserEditorPage />} />
                <Route path="/users/:userId/grant" element={<UserGrantPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="users.create" />}>
                <Route path="/users/new" element={<UserEditorPage />} />
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
              <Route element={<ProtectedRoute requiredPermission="packages.create" />}>
                <Route path="/content/packages/new" element={<PackageEditorPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="packages.update" />}>
                <Route path="/content/packages/:packageId/edit" element={<PackageEditorPage />} />
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
                <Route path="/content/recordings/new" element={<RecordingEditorPage />} />
                <Route path="/content/recordings/:recordingId" element={<RecordingEditorPage />} />
                {/* Live Sessions */}
                <Route path="/sessions" element={<SessionsPage />} />
                <Route path="/sessions/:sessionId" element={<SessionDetailPage />} />
                <Route path="/sessions/:sessionId/attendees" element={<SessionAttendeesPage />} />
                {/* Workshops — multi-day programmes, gated by the same permission */}
                <Route path="/workshops" element={<WorkshopsPage />} />
                <Route path="/workshops/:workshopId" element={<WorkshopDetailPage />} />
                <Route path="/workshops/:workshopId/enrollees" element={<WorkshopEnrolleesPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="live_sessions.create" />}>
                <Route path="/sessions/new" element={<SessionEditorPage />} />
                <Route path="/workshops/new" element={<WorkshopEditorPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="live_sessions.update" />}>
                <Route path="/sessions/:sessionId/edit" element={<SessionEditorPage />} />
                <Route path="/workshops/:workshopId/edit" element={<WorkshopEditorPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="books.read" />}>
                <Route path="/content/books" element={<BooksPage />} />
                <Route path="/content/books/:bookId" element={<BookDetailPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="books.create" />}>
                <Route path="/content/books/new" element={<BookEditorPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="books.update" />}>
                <Route path="/content/books/:bookId/edit" element={<BookEditorPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="banners.read" />}>
                <Route path="/content/banners" element={<BannersPage />} />
                {/* Read-only without banners.update; the page itself checks */}
                <Route path="/content/banners/new" element={<BannerEditorPage />} />
                <Route path="/content/banners/:bannerId/edit" element={<BannerEditorPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="home-sections.read" />}>
                <Route path="/content/home-sections" element={<HomeSectionsPage />} />
                <Route path="/content/home-sections/:sectionId" element={<HomeSectionDetailPage />} />
                <Route path="/content/home-sections/:sectionId/items/new" element={<HomeSectionItemEditorPage />} />
                <Route path="/content/home-sections/:sectionId/items/:itemId/edit" element={<HomeSectionItemEditorPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="forms.read" />}>
                <Route path="/content/forms" element={<FormsPage />} />
                <Route path="/content/forms/new" element={<FormEditorPage />} />
                <Route path="/content/forms/:formId/edit" element={<FormEditorPage />} />
                <Route path="/content/forms/:formId/submissions" element={<FormSubmissionsPage />} />
                <Route path="/content/forms/:formId/submissions/:submissionId" element={<FormSubmissionDetailPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="tutorials.read" />}>
                <Route path="/content/tutorials" element={<TutorialsPage />} />
                <Route path="/content/tutorials/new" element={<TutorialEditorPage />} />
                <Route path="/content/tutorials/:tutorialId/edit" element={<TutorialEditorPage />} />
              </Route>

              {/* Faculty */}
              <Route element={<ProtectedRoute requiredPermission="faculty.read" />}>
                <Route path="/faculty" element={<FacultyPage />} />
                <Route path="/faculty/:facultyId" element={<FacultyDetailPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="faculty.create" />}>
                <Route path="/faculty/new" element={<FacultyEditorPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="faculty.update" />}>
                <Route path="/faculty/:facultyId/edit" element={<FacultyEditorPage />} />
              </Route>

              {/* Feedback */}
              <Route element={<ProtectedRoute requiredPermission="videos.read" />}>
                <Route path="/feedback" element={<FeedbackPage />} />
                <Route path="/feedback/faculty/:facultyId" element={<FeedbackFacultyPage />} />
                <Route path="/feedback/videos/:videoId" element={<FeedbackVideoPage />} />
                <Route path="/feedback/:reviewId" element={<FeedbackDetailPage />} />
              </Route>

              {/* Careers */}
              <Route element={<ProtectedRoute requiredPermission="careers.read" />}>
                <Route path="/careers" element={<CareersPage />} />
                <Route path="/careers/:applicationId" element={<CareerDetailPage />} />
              </Route>

              {/* A purchase opens from Purchases (payments.read) and Subscriptions (users.read) */}
              <Route element={<ProtectedRoute requiredPermissions={['payments.read', 'users.read']} />}>
                <Route path="/commerce/purchases/:type/:id" element={<PurchaseDetailPage />} />
              </Route>

              {/* Commerce */}
              <Route element={<ProtectedRoute requiredPermission="payments.read" />}>
                <Route path="/commerce/purchases" element={<PurchasesPage />} />
                <Route path="/commerce/payments" element={<PaymentsPage />} />
                <Route path="/commerce/payments/:type/:id" element={<PaymentDetailPage />} />
                <Route path="/commerce/cases" element={<CasesPage />} />
                <Route path="/commerce/cases/:caseId" element={<CaseDetailPage />} />
                <Route path="/commerce/cases/:caseId/evidence" element={<CaseEvidencePage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="book_orders.read" />}>
                <Route path="/commerce/book-orders" element={<BookOrdersPage />} />
                <Route path="/commerce/book-orders/:orderId" element={<BookOrderDetailPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="invoices.read" />}>
                <Route path="/commerce/invoices" element={<InvoicesPage />} />
                <Route path="/commerce/invoices/:invoiceId" element={<InvoiceDetailPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="coupons.read" />}>
                <Route path="/commerce/coupons" element={<CouponsPage />} />
                <Route path="/commerce/coupons/:couponId" element={<CouponDetailPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="payments.read" />}>
                <Route path="/commerce/delivery-notes" element={<DeliveryNotesPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="coupons.create" />}>
                <Route path="/commerce/coupons/new" element={<CouponEditorPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="coupons.update" />}>
                <Route path="/commerce/coupons/:couponId/edit" element={<CouponEditorPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="analytics.read" />}>
                <Route path="/commerce/revenue" element={<RevenuePage />} />
                {/* Analytics */}
                <Route path="/analytics" element={<AnalyticsPage />} />
              </Route>

              {/* Notifications */}
              <Route element={<ProtectedRoute requiredPermission="notifications.read" />}>
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/notifications/:notificationId" element={<NotificationDetailPage />} />
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
                <Route path="/settings/profile-fields" element={<StudentProfileFieldsPage />} />
              </Route>

              {/* Content library. Each action inside it checks its own permission. */}
              <Route element={<ProtectedRoute requiredPermission="subjects.read" />}>
                <Route path="/content/explorer/*" element={<ExplorerPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="*" />}>
                <Route path="/content/archives" element={<ArchivesPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
    </Route>
  )
)

function App() {
  return <RouterProvider router={router} />
}

export default App
