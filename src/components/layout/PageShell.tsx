import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export interface Crumb {
  label: string
  /** Link target. Omit for the current (last) page — rendered as plain text. */
  to?: string
}

interface Props {
  /** Trail after the implicit Home root; the last item is the current page. */
  breadcrumbs: Crumb[]
  title: string
  /** Badges shown next to the title (e.g. status / vertical). */
  titleBadges?: ReactNode
  /** Right-aligned header actions (e.g. the transcript trigger). */
  actions?: ReactNode
  children: ReactNode
}

/**
 * The standard dashboard page shell used by every screen: a sticky top bar with
 * the sidebar trigger + breadcrumbs, then the page header (title + optional
 * badges/actions) separated below, then the content — all on a consistent
 * max-width, padding, and vertical rhythm. Mobile-friendly: the bar never wraps
 * (the last crumb truncates) and the title row stacks above its actions.
 */
export function PageShell({
  breadcrumbs,
  title,
  titleBadges,
  actions,
  children,
}: Props) {
  const { t } = useT()

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-1 h-4" />
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/dashboard" aria-label={t('nav.home')}>
                  <Home className="h-3.5 w-3.5" />
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.map((c, i) => {
              const last = i === breadcrumbs.length - 1
              return (
                <Fragment key={`${c.label}-${i}`}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem className={cn('min-w-0', last && 'truncate')}>
                    {c.to && !last ? (
                      <BreadcrumbLink asChild>
                        <Link to={c.to}>{c.label}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="truncate">
                        {c.label}
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">
                {title}
              </h1>
              {titleBadges}
            </div>
          </div>
          {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </div>

        {children}
      </div>
    </>
  )
}
