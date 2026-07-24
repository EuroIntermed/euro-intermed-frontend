import { Link, useLocation } from 'react-router-dom'
import {
  Activity,
  Boxes,
  Building2,
  CalendarRange,
  ChevronsUpDown,
  Code2,
  Inbox,
  LayoutDashboard,
  ListTodo,
  LogOut,
  PackageOpen,
  PackageX,
  SlidersHorizontal,
  Sun,
  Truck,
  UserCog,
  UsersRound,
  Workflow,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import { useAuth } from '@/auth/useAuth'
import { useOfferBatches } from '@/hooks/useDashboard'
import { useT } from '@/lib/i18n'
import type { TKey } from '@/lib/i18n/types'

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// Section prefixes that own their own subtree. Pipeline additionally owns the
// lead detail (/dashboard/:id), which doesn't match any section prefix.
const SECTION_PREFIXES = [
  '/dashboard/pipeline',
  '/dashboard/inventory',
  '/dashboard/companies',
  '/dashboard/handoffs',
  '/dashboard/tasks',
  '/dashboard/group-invites',
  '/dashboard/newsletter',
  '/dashboard/offers',
  '/dashboard/kpi',
  '/dashboard/suppliers',
  '/dashboard/users',
  '/dashboard/widget',
]

type NavItem = {
  to: string
  labelKey: TKey
  icon: typeof LayoutDashboard
  /** When true the item is only shown to admins. */
  adminOnly?: boolean
}

// Day-to-day operations.
const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', labelKey: 'nav.overview', icon: LayoutDashboard },
  { to: '/dashboard/pipeline', labelKey: 'nav.pipeline', icon: Workflow },
  { to: '/dashboard/inventory', labelKey: 'nav.inventory', icon: Boxes },
  { to: '/dashboard/companies', labelKey: 'nav.companies', icon: Building2 },
  { to: '/dashboard/handoffs', labelKey: 'nav.handoffs', icon: Inbox },
  { to: '/dashboard/tasks', labelKey: 'nav.tasks', icon: ListTodo },
  {
    to: '/dashboard/group-invites',
    labelKey: 'nav.groupInvites',
    icon: UsersRound,
  },
  { to: '/dashboard/offers', labelKey: 'nav.offers', icon: PackageOpen },
]

// KPI action boards (KPI_PLAN §E.2) — analytics, grouped away from the daily nav.
const KPI_ITEMS: NavItem[] = [
  { to: '/dashboard/kpi/today', labelKey: 'nav.kpiToday', icon: Sun },
  {
    to: '/dashboard/kpi/clearance',
    labelKey: 'nav.kpiClearance',
    icon: PackageX,
  },
  { to: '/dashboard/kpi/month', labelKey: 'nav.kpiMonth', icon: CalendarRange },
  { to: '/dashboard/kpi/health', labelKey: 'nav.kpiHealth', icon: Activity },
  {
    to: '/dashboard/kpi/settings',
    labelKey: 'nav.kpiSettings',
    icon: SlidersHorizontal,
    adminOnly: true,
  },
]

// Admin / configuration — separated from the daily workflow nav.
const ADMIN_ITEMS: NavItem[] = [
  { to: '/dashboard/suppliers', labelKey: 'nav.suppliers', icon: Truck },
  { to: '/dashboard/users', labelKey: 'nav.users', icon: UserCog, adminOnly: true },
  { to: '/dashboard/widget', labelKey: 'nav.widget', icon: Code2 },
]

export function AppSidebar() {
  const { pathname } = useLocation()
  const { user, logout, isAdmin } = useAuth()
  const { t } = useT()

  const kpiItems = KPI_ITEMS.filter((i) => !i.adminOnly || isAdmin)
  const adminItems = ADMIN_ITEMS.filter((i) => !i.adminOnly || isAdmin)

  // Count of offer batches awaiting review (status=parsed), shown as a badge on
  // the "Oferte furnizori" nav item. A 403/empty simply renders no badge.
  const { data: pendingOffers } = useOfferBatches({ status: 'parsed' })
  const offerReviewCount = pendingOffers?.length ?? 0

  function isActive(to: string) {
    // Overview is the dashboard root — match it exactly.
    if (to === '/dashboard') return pathname === '/dashboard'
    // Pipeline owns its own subtree plus the lead detail (/dashboard/:id).
    if (to === '/dashboard/pipeline') {
      if (pathname.startsWith('/dashboard/pipeline')) return true
      return (
        pathname !== '/dashboard' &&
        !SECTION_PREFIXES.some((p) => pathname.startsWith(p))
      )
    }
    return pathname.startsWith(to)
  }

  const display = user?.name || user?.email || ''

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link to="/dashboard">
                <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-sm">
                  EI
                </span>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">Euro Intermed</span>
                  <span className="truncate text-xs text-muted-foreground">
                    B2B Platform
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.to)}
                    tooltip={t(item.labelKey)}
                  >
                    <Link to={item.to}>
                      <item.icon />
                      <span>{t(item.labelKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.to === '/dashboard/offers' && offerReviewCount > 0 && (
                    <SidebarMenuBadge>{offerReviewCount}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.kpiGroup')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {kpiItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.to)}
                    tooltip={t(item.labelKey)}
                  >
                    <Link to={item.to}>
                      <item.icon />
                      <span>{t(item.labelKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {adminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>{t('nav.adminGroup')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.to)}
                      tooltip={t(item.labelKey)}
                    >
                      <Link to={item.to}>
                        <item.icon />
                        <span>{t(item.labelKey)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                      {initials(display)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{display}</span>
                    <span className="truncate text-xs text-muted-foreground capitalize">
                      {user?.role}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="end"
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
              >
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="truncate">{display}</span>
                  <span className="text-xs font-normal text-muted-foreground capitalize">
                    {user?.role}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* Preferences: theme + language live here. These rows are not
                    menu items, so interacting with them keeps the menu open. */}
                <div className="flex items-center justify-between px-2 py-1.5 text-sm">
                  <span className="text-muted-foreground">
                    {t('nav.theme')}
                  </span>
                  <ThemeToggle />
                </div>
                <div className="flex items-center justify-between px-2 py-1.5 text-sm">
                  <span className="text-muted-foreground">
                    {t('lang.label')}
                  </span>
                  <LanguageToggle />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} variant="destructive">
                  <LogOut className="h-4 w-4" />
                  {t('auth.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
