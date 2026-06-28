import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthProvider } from '@/auth/AuthProvider'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { LanguageProvider } from '@/lib/i18n'
import { Toaster } from '@/components/ui/sonner'

// The app is dashboard-first: every real screen lives under /dashboard and is
// code-split so each route only loads when an operator reaches it.
const OverviewPage = lazy(() =>
  import('@/pages/OverviewPage').then((m) => ({ default: m.OverviewPage })),
)
const PipelinePage = lazy(() =>
  import('@/pages/PipelinePage').then((m) => ({ default: m.PipelinePage })),
)
const LeadDetailPage = lazy(() =>
  import('@/pages/LeadDetailPage').then((m) => ({ default: m.LeadDetailPage })),
)
const InventoryPage = lazy(() =>
  import('@/pages/InventoryPage').then((m) => ({ default: m.InventoryPage })),
)
const CompaniesPage = lazy(() =>
  import('@/pages/CompaniesPage').then((m) => ({ default: m.CompaniesPage })),
)
const CompanyDetailPage = lazy(() =>
  import('@/pages/CompanyDetailPage').then((m) => ({
    default: m.CompanyDetailPage,
  })),
)
const HandoffsPage = lazy(() =>
  import('@/pages/HandoffsPage').then((m) => ({ default: m.HandoffsPage })),
)
const TasksPage = lazy(() =>
  import('@/pages/TasksPage').then((m) => ({ default: m.TasksPage })),
)
const WidgetPage = lazy(() =>
  import('@/pages/WidgetPage').then((m) => ({ default: m.WidgetPage })),
)
const UsersPage = lazy(() =>
  import('@/pages/UsersPage').then((m) => ({ default: m.UsersPage })),
)
const LoginPage = lazy(() =>
  import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // one retry on transient failures, then surface the error
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

function RouteFallback() {
  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center py-20" />
  )
}

function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Dashboard-first: the root redirects into the dashboard, which
            ProtectedRoute bounces to /login when unauthenticated. */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Authenticated shell: one ProtectedRoute + sidebar layout wraps every
            dashboard page (rendered via <Outlet/>). */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<OverviewPage />} />
          <Route path="/dashboard/pipeline" element={<PipelinePage />} />
          <Route path="/dashboard/inventory" element={<InventoryPage />} />
          <Route path="/dashboard/companies" element={<CompaniesPage />} />
          <Route
            path="/dashboard/companies/:id"
            element={<CompanyDetailPage />}
          />
          <Route path="/dashboard/handoffs" element={<HandoffsPage />} />
          <Route path="/dashboard/tasks" element={<TasksPage />} />
          <Route path="/dashboard/users" element={<UsersPage />} />
          <Route path="/dashboard/widget" element={<WidgetPage />} />
          {/* Back-compat: the widget hub used to live at /test-widget. */}
          <Route
            path="/dashboard/test-widget"
            element={<Navigate to="/dashboard/widget" replace />}
          />
          <Route path="/dashboard/:id" element={<LeadDetailPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <AuthProvider>
                <AppRoutes />
                <Toaster richColors position="top-right" />
              </AuthProvider>
            </BrowserRouter>
          </QueryClientProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
