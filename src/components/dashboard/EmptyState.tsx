import type { ComponentType, ReactNode } from 'react'
import type { LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  /** Lucide icon component shown in the soft tile. */
  icon: ComponentType<LucideProps>
  title: string
  description?: string
  /** Optional call-to-action (e.g. a Button) rendered under the description. */
  action?: ReactNode
  /** Tighter vertical padding for in-card empties (defaults to roomy page-level). */
  compact?: boolean
  className?: string
}

/**
 * The standard "nothing here yet" state used across every screen: a soft
 * emerald-tinted icon tile, a title, an optional one-line description, and an
 * optional CTA — centered. Replaces the bare muted `<span>` empties so empty
 * screens feel intentional rather than broken.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-12' : 'py-20',
        className,
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-brand-soft text-brand">
        <Icon className="size-6" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
