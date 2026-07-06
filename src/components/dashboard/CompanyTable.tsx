import { useNavigate } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { SortableHead } from '@/components/dashboard/SortableHead'
import { useT, useEnums, formatDate } from '@/lib/i18n'
import type { CompanySortKey, CompanySummary, SortDir } from '@/lib/api'

interface Props {
  companies: CompanySummary[]
  sort: CompanySortKey
  dir: SortDir
  onSort: (key: CompanySortKey) => void
}

export function CompanyTable({ companies, sort, dir, onSort }: Props) {
  const navigate = useNavigate()
  const { t, lang } = useT()
  const { roleLabel, vatLabel } = useEnums()

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <SortableHead
                sortKey="name"
                label={t('companies.colName')}
                ariaLabel={t('pipeline.sortBy', { col: t('companies.colName') })}
                active={sort === 'name'}
                dir={dir}
                onSort={onSort}
              />
              <TableHead>{t('companies.colCui')}</TableHead>
              <TableHead>{t('companies.colCountry')}</TableHead>
              <TableHead>{t('companies.colCaen')}</TableHead>
              <TableHead>{t('companies.colVat')}</TableHead>
              <TableHead>{t('companies.colRoles')}</TableHead>
              <SortableHead
                sortKey="created_at"
                label={t('companies.colCreated')}
                ariaLabel={t('pipeline.sortBy', {
                  col: t('companies.colCreated'),
                })}
                active={sort === 'created_at'}
                dir={dir}
                onSort={onSort}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((c) => (
              <TableRow
                key={c.id}
                className="cursor-pointer"
                onClick={() => navigate(`/dashboard/companies/${c.id}`)}
              >
                <TableCell className="font-medium">
                  {c.name || t('common.none')}
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">
                  {c.cui || c.reg_no || t('common.none')}
                </TableCell>
                <TableCell>{c.country || t('common.none')}</TableCell>
                <TableCell>{c.caen || t('common.none')}</TableCell>
                <TableCell>
                  {c.vat_status ? vatLabel(c.vat_status) : t('common.none')}
                </TableCell>
                <TableCell>
                  {c.roles && c.roles.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {c.roles.map((r) => (
                        <Badge key={r} variant="outline">
                          {roleLabel(r)}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      {t('common.none')}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                  {formatDate(lang, c.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
