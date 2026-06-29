import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface Props {
  /** Localized item-count label shown on the left (e.g. "12 leads"). */
  countLabel: ReactNode
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
  /** When both are set, renders "Page x of y" (offset pagination). */
  page?: number
  pageCount?: number
  /** Disables the pager while a fetch is in flight. */
  busy?: boolean
  className?: string
}

/**
 * The shared list footer: an item count on the left and prev/next pagination on
 * the right (with an optional "Page x of y"). Works for both offset and cursor
 * lists — extracted from the duplicated pager markup across the list screens.
 */
export function ListFooter({
  countLabel,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  page,
  pageCount,
  busy,
  className,
}: Props) {
  const { t } = useT()
  const showPageOf = page !== undefined && pageCount !== undefined

  return (
    <div className={cn('mt-4 flex items-center justify-between gap-2', className)}>
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {countLabel}
      </span>
      <div className="flex items-center gap-3">
        {showPageOf && (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {t('common.pageOf', { x: page, y: pageCount })}
          </span>
        )}
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationLink
                href="#"
                size="default"
                aria-label={t('common.prev')}
                aria-disabled={!hasPrev || busy}
                className={cn(
                  'gap-1 px-2.5',
                  (!hasPrev || busy) && 'pointer-events-none opacity-50',
                )}
                onClick={(e) => {
                  e.preventDefault()
                  if (hasPrev && !busy) onPrev()
                }}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:block">{t('common.prev')}</span>
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink
                href="#"
                size="default"
                aria-label={t('common.next')}
                aria-disabled={!hasNext || busy}
                className={cn(
                  'gap-1 px-2.5',
                  (!hasNext || busy) && 'pointer-events-none opacity-50',
                )}
                onClick={(e) => {
                  e.preventDefault()
                  if (hasNext && !busy) onNext()
                }}
              >
                <span className="hidden sm:block">{t('common.next')}</span>
                <ChevronRight className="h-4 w-4" />
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
