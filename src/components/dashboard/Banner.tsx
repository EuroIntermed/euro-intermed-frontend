import type { ComponentType, ReactNode } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  type LucideProps,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type BannerTone = 'success' | 'info' | 'warning' | 'danger'

const TONE: Record<
  BannerTone,
  { wrap: string; icon: string; defaultIcon: ComponentType<LucideProps> }
> = {
  success: {
    wrap: 'bg-success-soft text-success',
    icon: 'text-success',
    defaultIcon: CheckCircle2,
  },
  info: { wrap: 'bg-info-soft text-info', icon: 'text-info', defaultIcon: Info },
  warning: {
    wrap: 'bg-warning-soft text-warning',
    icon: 'text-warning',
    defaultIcon: AlertTriangle,
  },
  danger: {
    wrap: 'bg-destructive-soft text-destructive',
    icon: 'text-destructive',
    defaultIcon: XCircle,
  },
}

interface Props {
  tone: BannerTone
  title: ReactNode
  description?: ReactNode
  /** Override the default tone icon. */
  icon?: ComponentType<LucideProps>
  /** Right-aligned action (e.g. a button or link). */
  action?: ReactNode
  className?: string
}

/**
 * A soft, tinted announcement bar (Resend's green "Domain verified" callout):
 * an icon, a bold title, optional description, and an optional action. The
 * reusable replacement for the one-off HandoffCallout-style cards.
 */
export function Banner({
  tone,
  title,
  description,
  icon,
  action,
  className,
}: Props) {
  const cfg = TONE[tone]
  const Icon = icon ?? cfg.defaultIcon
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg px-4 py-3',
        cfg.wrap,
        className,
      )}
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', cfg.icon)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
