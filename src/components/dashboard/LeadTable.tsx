import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { SortableHead } from '@/components/dashboard/SortableHead'
import { cn } from '@/lib/utils'
import { useT, formatRON, formatDate } from '@/lib/i18n'
import type { LeadSortKey, LeadSummary, PublicUser, SortDir } from '@/lib/api'

interface Props {
  leads: LeadSummary[]
  users: PublicUser[]
  sort: LeadSortKey
  dir: SortDir
  onSort: (key: LeadSortKey) => void
}

export function LeadTable({ leads, users, sort, dir, onSort }: Props) {
  const navigate = useNavigate()
  const { t, lang } = useT()
  const userById = new Map(users.map((u) => [u.id, u.name || u.email]))

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow>
              <SortableHead
                sortKey="company"
                label={t('pipeline.colCompany')}
                ariaLabel={t('pipeline.sortBy', { col: t('pipeline.colCompany') })}
                active={sort === 'company'}
                dir={dir}
                onSort={onSort}
              />
              <TableHead>{t('pipeline.colProduct')}</TableHead>
              <TableHead>{t('pipeline.colQuantity')}</TableHead>
              <TableHead>{t('pipeline.colLocation')}</TableHead>
              <SortableHead
                sortKey="status"
                label={t('pipeline.colStatus')}
                ariaLabel={t('pipeline.sortBy', { col: t('pipeline.colStatus') })}
                active={sort === 'status'}
                dir={dir}
                onSort={onSort}
              />
              <TableHead>{t('pipeline.colAssignee')}</TableHead>
              <SortableHead
                sortKey="offer_value"
                label={t('pipeline.colValue')}
                ariaLabel={t('pipeline.sortBy', { col: t('pipeline.colValue') })}
                active={sort === 'offer_value'}
                dir={dir}
                onSort={onSort}
                align="right"
              />
              <SortableHead
                sortKey="created_at"
                label={t('pipeline.colCreated')}
                ariaLabel={t('pipeline.sortBy', { col: t('pipeline.colCreated') })}
                active={sort === 'created_at'}
                dir={dir}
                onSort={onSort}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow
                key={lead.id}
                className={cn(
                  'cursor-pointer',
                  lead.needs_human && 'bg-destructive/5 hover:bg-destructive/10',
                )}
                onClick={() => navigate(`/dashboard/${lead.id}`)}
              >
                <TableCell className="font-medium">
                  <span className="flex items-center gap-1.5">
                    {lead.needs_human && (
                      <AlertTriangle
                        className="h-3.5 w-3.5 text-destructive shrink-0"
                        aria-label={t('pipeline.needsHuman')}
                      />
                    )}
                    {lead.seq != null && (
                      <span
                        className="shrink-0 font-normal tabular-nums text-muted-foreground"
                        aria-label={t('pipeline.seqHandle', { n: lead.seq })}
                        title={t('pipeline.seqHandle', { n: lead.seq })}
                      >
                        #{lead.seq}
                      </span>
                    )}
                    {lead.company_name || t('common.none')}
                  </span>
                </TableCell>
                <TableCell>{lead.product_name || t('common.none')}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {lead.quantity != null
                    ? `${lead.quantity} ${lead.unit}`
                    : t('common.none')}
                </TableCell>
                <TableCell>
                  {lead.delivery_location || t('common.none')}
                </TableCell>
                <TableCell>
                  <StatusBadge status={lead.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {lead.assigned_to ? (
                    userById.get(lead.assigned_to) ?? lead.assigned_to
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      {t('pipeline.unassigned')}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap tabular-nums">
                  {formatRON(lang, lead.offer_value, t('common.none'))}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                  {formatDate(lang, lead.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
