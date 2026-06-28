import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/AppSidebar'

function RouteFallback() {
  return <div className="flex flex-1 items-center justify-center py-20" />
}

/**
 * Authenticated shell: a collapsible sidebar + the routed page in SidebarInset.
 * Each page renders its own sticky top bar (with the sidebar trigger) via
 * PageShell, so the inset just hosts the scrolling page. Unauthenticated screens
 * (login) render outside this layout.
 */
export function DashboardLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-y-auto">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  )
}
