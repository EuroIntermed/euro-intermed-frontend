import { Link, useLocation } from 'react-router-dom'
import {
  Boxes,
  Building2,
  ChevronsUpDown,
  Code2,
  Inbox,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Workflow,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
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
  '/dashboard/widget',
]

const NAV_ITEMS: {
  to: string
  labelKey: TKey
  icon: typeof LayoutDashboard
}[] = [
  { to: '/dashboard', labelKey: 'nav.overview', icon: LayoutDashboard },
  { to: '/dashboard/pipeline', labelKey: 'nav.pipeline', icon: Workflow },
  { to: '/dashboard/inventory', labelKey: 'nav.inventory', icon: Boxes },
  { to: '/dashboard/companies', labelKey: 'nav.companies', icon: Building2 },
  { to: '/dashboard/handoffs', labelKey: 'nav.handoffs', icon: Inbox },
  { to: '/dashboard/tasks', labelKey: 'nav.tasks', icon: ListTodo },
  { to: '/dashboard/widget', labelKey: 'nav.widget', icon: Code2 },
]

export function AppSidebar() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const { t } = useT()

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
                <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                  EI
                </span>
                <span className="font-semibold">Euro Intermed</span>
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
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
