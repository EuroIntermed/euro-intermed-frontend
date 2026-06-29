import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface Props {
  isLoading: boolean
  /** Truthy when the query failed. */
  error?: unknown
  /** True once data has loaded but there are no rows to show. */
  isEmpty?: boolean
  /** Custom skeleton; defaults to a stack of bordered row placeholders. */
  skeleton?: ReactNode
  /** Number of placeholder rows for the default skeleton. */
  skeletonRows?: number
  /** What to render in the empty branch (typically an <EmptyState />). */
  empty?: ReactNode
  /** Localized error headline; falls back to a generic message. */
  errorMessage?: string
  onRetry?: () => void
  /** The loaded content, rendered when not loading / error / empty. */
  children: ReactNode
  className?: string
}

/**
 * Unifies the loading / error / empty / content branching that every list and
 * panel repeats. One component, one consistent treatment for all four states —
 * pass the skeleton, the empty state, and the content; it picks the right one.
 */
export function QueryState({
  isLoading,
  error,
  isEmpty,
  skeleton,
  skeletonRows = 8,
  empty,
  errorMessage,
  onRetry,
  children,
  className,
}: Props) {
  const { t } = useT()

  if (isLoading) {
    return (
      <div className={className}>
        {skeleton ?? (
          <div className="flex flex-col gap-3 rounded-lg border p-4">
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={cn(
          'flex flex-col items-center gap-3 py-16 text-center',
          className,
        )}
      >
        <div className="flex size-12 items-center justify-center rounded-xl bg-destructive-soft text-destructive">
          <AlertCircle className="size-6" />
        </div>
        <p className="text-sm font-medium text-foreground">
          {errorMessage ?? t('common.errorTitle')}
        </p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        )}
      </div>
    )
  }

  if (isEmpty) return <div className={className}>{empty}</div>

  return <div className={className}>{children}</div>
}
