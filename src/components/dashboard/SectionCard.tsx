import type { ComponentType, ReactNode } from 'react'
import type { LucideProps } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Props {
  title: ReactNode
  description?: ReactNode
  /** Optional leading icon next to the title. */
  icon?: ComponentType<LucideProps>
  /** Right-aligned header action (e.g. an edit button). */
  action?: ReactNode
  children: ReactNode
  /** Remove the CardContent padding (for tables flush to the card edges). */
  flush?: boolean
  className?: string
  contentClassName?: string
}

/**
 * A titled content card with a consistent header (icon + title + description +
 * action) and body — standardizes the many ad-hoc Card layouts on the detail
 * and overview screens so panels share one rhythm.
 */
export function SectionCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  flush,
  className,
  contentClassName,
}: Props) {
  return (
    <Card className={className}>
      <CardHeader className={cn(action && 'flex flex-row items-start justify-between gap-3')}>
        <div className="min-w-0 space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            {Icon && <Icon className="size-4 text-muted-foreground" />}
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </CardHeader>
      <CardContent className={cn(flush && 'px-0 pb-0', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}
