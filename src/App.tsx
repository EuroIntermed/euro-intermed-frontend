import { lazy, Suspense, type ComponentType } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthProvider } from '@/auth/AuthProvider'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { LanguageProvider } from '@/lib/i18n'
import { Toaster } from '@/components/ui/sonner'

// lazyWithReload is lazy() that self-heals after a redeploy. When a route chunk
// fails to load — typically because the app was redeployed with new hashes while
// this tab was open, so the old chunk 404s and the SPA fallback returns
// index.html (text/html → "not a valid JavaScript MIME type") — it reloads the
// page once to pull the fresh index.html + chunks. A sessionStorage guard keeps
// a genuinely missing chunk from looping; it clears on any successful load.
function lazyWithReload<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  const RELOAD_KEY = 'chunk-reload-once'
  return lazy(() =>
    factory()
      .then((mod) => {
        sessionStorage.removeItem(RELOAD_KEY)
        return mod
      })
      .catch((err: unknown) => {
        if (!sessionStorage.getItem(RELOAD_KEY)) {
          sessionStorage.setItem(RELOAD_KEY, '1')
          window.location.reload()
          // Suspend until the reload takes over; never render the failed chunk.
          return new Promise<{ default: T }>(() => {})
        }
        throw err
      }),
  )
}

// The app is dashboard-first: every real screen lives under /dashboard and is
// code-split so each route only loads when an operator reaches it.
const OverviewPage = lazyWithReload(() =>
  import('@/pages/OverviewPage').then((m) => ({ default: m.OverviewPage })),
)
const PipelinePage = lazyWithReload(() =>
  import('@/pages/PipelinePage').then((m) => ({ default: m.PipelinePage })),
)
const LeadDetailPage = lazyWithReload(() =>
  import('@/pages/LeadDetailPage').then((m) => ({ default: m.LeadDetailPage })),
)
const InventoryPage = lazyWithReload(() =>
  import('@/pages/InventoryPage').then((m) => ({ default: m.InventoryPage })),
)
const CompaniesPage = lazyWithReload(() =>
  import('@/pages/CompaniesPage').then((m) => ({ default: m.CompaniesPage })),
)
const CompanyDetailPage = lazyWithReload(() =>
  import('@/pages/CompanyDetailPage').then((m) => ({
    default: m.CompanyDetailPage,
  })),
)
const HandoffsPage = lazyWithReload(() =>
  import('@/pages/HandoffsPage').then((m) => ({ default: m.HandoffsPage })),
)
const TasksPage = lazyWithReload(() =>
  import('@/pages/TasksPage').then((m) => ({ default: m.TasksPage })),
)
const WidgetPage = lazyWithReload(() =>
  import('@/pages/WidgetPage').then((m) => ({ default: m.WidgetPage })),
)
const UsersPage = lazyWithReload(() =>
  import('@/pages/UsersPage').then((m) => ({ default: m.UsersPage })),
)
const SuppliersPage = lazyWithReload(() =>
  import('@/pages/SuppliersPage').then((m) => ({ default: m.SuppliersPage })),
)
const TodayAngrosistPage = lazyWithReload(() =>
  import('@/pages/kpi/TodayAngrosistPage').then((m) => ({
    default: m.TodayAngrosistPage,
  })),
)
const PortfolioClearancePage = lazyWithReload(() =>
  import('@/pages/kpi/PortfolioClearancePage').then((m) => ({
    default: m.PortfolioClearancePage,
  })),
)
const ThisMonthPage = lazyWithReload(() =>
  import('@/pages/kpi/ThisMonthPage').then((m) => ({
    default: m.ThisMonthPage,
  })),
)
const PlatformHealthPage = lazyWithReload(() =>
  import('@/pages/kpi/PlatformHealthPage').then((m) => ({
    default: m.PlatformHealthPage,
  })),
)
const KpiSettingsPage = lazyWithReload(() =>
  import('@/pages/kpi/KpiSettingsPage').then((m) => ({
    default: m.KpiSettingsPage,
  })),
)
const LoginPage = lazyWithReload(() =>
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
          <Route
            path="/dashboard/kpi/today"
            element={<TodayAngrosistPage />}
          />
          <Route
            path="/dashboard/kpi/clearance"
            element={<PortfolioClearancePage />}
          />
          <Route path="/dashboard/kpi/month" element={<ThisMonthPage />} />
          <Route
            path="/dashboard/kpi/health"
            element={<PlatformHealthPage />}
          />
          <Route
            path="/dashboard/kpi/settings"
            element={<KpiSettingsPage />}
          />
          <Route path="/dashboard/users" element={<UsersPage />} />
          <Route path="/dashboard/suppliers" element={<SuppliersPage />} />
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
