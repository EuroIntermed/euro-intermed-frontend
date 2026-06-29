import type { ComponentType, ReactNode } from 'react'
import type { LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetaFieldProps {
  label: string
  children: ReactNode
  className?: string
}

/**
 * A single labelled cell in a DetailHeader's metadata strip: an uppercase muted
 * label over its value (mirrors Resend's CREATED / STATUS / REGION row).
 */
export function MetaField({ label, children, className }: MetaFieldProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="truncate text-sm font-medium text-foreground">
        {children}
      </span>
    </div>
  )
}

interface DetailHeaderProps {
  /** Lucide icon for the rounded brand tile. */
  icon: ComponentType<LucideProps>
  /** Small label above the title (e.g. "Lead", "Company"). */
  eyebrow?: string
  title: string
  /** Badges shown next to the title (status pills etc.). */
  badges?: ReactNode
  /** Right-aligned actions. */
  actions?: ReactNode
  /** MetaField cells; rendered in a responsive strip below the title. */
  meta?: ReactNode
  className?: string
}

/**
 * The page-level header for detail screens: a brand icon tile, an eyebrow +
 * large title with inline badges, right-aligned actions, and a metadata strip —
 * the Resend domain-detail pattern, reused by Lead and Company detail pages.
 */
export function DetailHeader({
  icon: Icon,
  eyebrow,
  title,
  badges,
  actions,
  meta,
  className,
}: DetailHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Icon className="size-6" />
          </div>
          <div className="min-w-0">
            {eyebrow && (
              <span className="text-xs font-medium text-muted-foreground">
                {eyebrow}
              </span>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">
                {title}
              </h1>
              {badges}
            </div>
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      {meta && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-5 sm:grid-cols-3 lg:grid-cols-4">
          {meta}
        </div>
      )}
    </div>
  )
}
