import type { ComponentType, ReactNode } from 'react'
import { Check, type LucideProps } from 'lucide-react'
import type { Tone } from '@/components/dashboard/StatePill'
import { cn } from '@/lib/utils'

const DOT_TONE: Record<Tone, string> = {
  brand: 'bg-brand text-brand-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  info: 'bg-info text-info-foreground',
  danger: 'bg-destructive text-white',
  neutral: 'bg-muted-foreground/20 text-muted-foreground',
}

export interface TimelineItem {
  title: ReactNode
  meta?: ReactNode
  description?: ReactNode
  tone?: Tone
  icon?: ComponentType<LucideProps>
}

/**
 * A vertical event timeline: a connector rail with colour-coded nodes, each
 * carrying a title, a muted meta line (actor · time), and optional description.
 * Powers the lead activity log and company verification history.
 */
export function Timeline({
  items,
  className,
}: {
  items: TimelineItem[]
  className?: string
}) {
  return (
    <ol className={cn('relative flex flex-col', className)}>
      {items.map((item, i) => {
        const tone = item.tone ?? 'neutral'
        const Icon = item.icon
        const last = i === items.length - 1
        return (
          <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && (
              <span
                aria-hidden
                className="absolute left-3 top-6 h-[calc(100%-1rem)] w-px -translate-x-1/2 bg-border"
              />
            )}
            <span
              className={cn(
                'z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full',
                DOT_TONE[tone],
              )}
            >
              {Icon ? (
                <Icon className="size-3.5" />
              ) : (
                <span className="size-1.5 rounded-full bg-current" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">
                {item.title}
              </div>
              {item.meta && (
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {item.meta}
                </div>
              )}
              {item.description && (
                <div className="mt-1 text-sm text-muted-foreground">
                  {item.description}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export interface Step {
  label: ReactNode
  sublabel?: ReactNode
  done?: boolean
  current?: boolean
  icon?: ComponentType<LucideProps>
}

/**
 * A horizontal progress stepper on a softly dotted panel (Resend's "Domain
 * added → DNS verified → Domain verified" strip). Completed steps show an
 * emerald check; the current step is outlined; future steps are muted.
 */
export function Stepper({
  steps,
  className,
}: {
  steps: Step[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-[radial-gradient(var(--color-brand-grid)_1px,transparent_1px)] [background-size:12px_12px] p-6',
        className,
      )}
    >
      <ol className="flex items-start justify-between gap-2">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <li
              key={i}
              className="flex flex-1 flex-col items-center gap-2 text-center"
            >
              <span
                className={cn(
                  'flex size-9 items-center justify-center rounded-full border-2 bg-background',
                  step.done && 'border-success bg-success text-success-foreground',
                  step.current && !step.done && 'border-brand text-brand',
                  !step.done && !step.current && 'border-border text-muted-foreground',
                )}
              >
                {step.done ? (
                  <Check className="size-4" />
                ) : Icon ? (
                  <Icon className="size-4" />
                ) : (
                  <span className="text-xs font-semibold">{i + 1}</span>
                )}
              </span>
              <div className="min-w-0">
                <div
                  className={cn(
                    'truncate text-xs font-medium',
                    step.done || step.current
                      ? 'text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </div>
                {step.sublabel && (
                  <div className="mt-0.5 truncate text-[0.6875rem] text-muted-foreground">
                    {step.sublabel}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
