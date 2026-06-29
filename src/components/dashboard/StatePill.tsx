import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * Semantic tone of a pill. Each maps to a soft tinted background paired with the
 * solid family color as text (see the `--*-soft` tokens in index.css), so a
 * status reads at a glance by colour, not just by label.
 */
export type Tone = 'brand' | 'success' | 'warning' | 'info' | 'danger' | 'neutral'

const TONE_CLASS: Record<Tone, string> = {
  brand: 'bg-brand-soft text-brand',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
  danger: 'bg-destructive-soft text-destructive',
  neutral: 'bg-muted text-muted-foreground',
}

interface Props {
  tone: Tone
  children: ReactNode
  /** Show the leading status dot (defaults to true). */
  dot?: boolean
  className?: string
}

/**
 * A soft, colour-coded status pill with an optional leading dot. The reusable
 * backbone for every status badge in the dashboard (leads, listings, tasks,
 * verification …) — compose it, don't hardcode colours per call site.
 */
export function StatePill({ tone, children, dot = true, className }: Props) {
  return (
    <Badge
      variant="outline"
      className={cn('border-transparent font-medium', TONE_CLASS[tone], className)}
    >
      {dot && (
        <span
          aria-hidden
          className="size-1.5 rounded-full bg-current opacity-80"
        />
      )}
      {children}
    </Badge>
  )
}
