import { useParams, useNavigate } from 'react-router-dom'
import { Building2, BuildingIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { administratorName } from '@/lib/api'
import { CompanyRolesEditor } from '@/components/dashboard/CompanyRolesEditor'
import { PageShell } from '@/components/layout/PageShell'
import { QueryState } from '@/components/dashboard/QueryState'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { DetailHeader, MetaField } from '@/components/dashboard/DetailHeader'
import { SectionCard } from '@/components/dashboard/SectionCard'
import { Banner } from '@/components/dashboard/Banner'
import { StatePill, type Tone } from '@/components/dashboard/StatePill'
import { useCompanyDetail } from '@/hooks/useDashboard'
import {
  useT,
  useEnums,
  formatRON,
  formatDate,
  formatDateTime,
} from '@/lib/i18n'

interface FieldProps {
  label: string
  value?: string | number | null
}

function Field({ label, value }: FieldProps) {
  if (value == null || value === '') return null
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium mt-0.5 break-words">
        {String(value)}
      </dd>
    </div>
  )
}

/** Maps the canonical VAT status to a soft StatePill tone. */
function vatTone(status: string | null | undefined): Tone {
  switch (status) {
    case 'active':
      return 'success'
    case 'inactive':
      return 'danger'
    case 'not_registered':
      return 'neutral'
    default:
      return 'neutral'
  }
}

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, lang } = useT()
  const { vatLabel } = useEnums()
  const {
    data: company,
    isLoading,
    error,
    refetch,
  } = useCompanyDetail(id ?? '')

  return (
    <QueryState
      isLoading={isLoading}
      error={error || (!company && !isLoading ? new Error('not found') : undefined)}
      errorMessage={t('companies.notFound')}
      onRetry={refetch}
      skeleton={
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-full rounded-xl" />
            ))}
          </div>
        </div>
      }
    >
      {company ? (
        <CompanyDetailBody
          company={company}
          lang={lang}
          t={t}
          vatLabel={vatLabel}
        />
      ) : (
        <EmptyState
          icon={BuildingIcon}
          title={t('companies.notFound')}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard/companies')}
            >
              {t('common.back')}
            </Button>
          }
        />
      )}
    </QueryState>
  )
}

type Company = NonNullable<ReturnType<typeof useCompanyDetail>['data']>

function CompanyDetailBody({
  company,
  lang,
  t,
  vatLabel,
}: {
  company: Company
  lang: ReturnType<typeof useT>['lang']
  t: ReturnType<typeof useT>['t']
  vatLabel: ReturnType<typeof useEnums>['vatLabel']
}) {
  const verification = company.verification
  // Administrators may live on the detail body or the verification snapshot, as
  // string[] or object[]. Prefer the detail field; fall back to verification.
  const rawAdmins =
    (company.administrators?.length
      ? company.administrators
      : verification?.administrators) ?? []
  const administrators = rawAdmins
    .map((a) => administratorName(a))
    .filter((name) => name.length > 0)
  const financials = company.financials ?? []

  const title = company.name || t('companies.fallbackTitle')

  return (
    <PageShell
      hideTitle
      breadcrumbs={[
        { label: t('nav.companies'), to: '/dashboard/companies' },
        { label: title },
      ]}
      title={title}
    >
      <DetailHeader
        className="mb-6"
        icon={Building2}
        eyebrow={t('detail.eyebrowCompany')}
        title={title}
        badges={
          company.is_active != null && (
            <StatePill tone={company.is_active ? 'success' : 'danger'}>
              {company.is_active ? t('companies.active') : t('companies.inactive')}
            </StatePill>
          )
        }
        meta={
          <>
            {(company.cui || company.reg_no) && (
              <MetaField label={t('detail.metaCui')}>
                {company.cui || company.reg_no}
              </MetaField>
            )}
            {company.country && (
              <MetaField label={t('detail.metaCountry')}>
                {company.country}
              </MetaField>
            )}
            {company.caen && (
              <MetaField label={t('detail.metaCaen')}>{company.caen}</MetaField>
            )}
            <MetaField label={t('detail.metaVat')}>
              <StatePill tone={vatTone(company.vat_status)}>
                {vatLabel(company.vat_status)}
              </StatePill>
            </MetaField>
          </>
        }
      />

      {/* Verification status banner (Resend's "verified" bar). */}
      {verification ? (
        <Banner
          className="mb-4"
          tone="success"
          title={t('detail.verifiedTitle')}
          description={
            verification.checked_at
              ? t('detail.verifiedDesc', {
                  date: formatDateTime(lang, verification.checked_at),
                })
              : undefined
          }
        />
      ) : (
        <Banner
          className="mb-4"
          tone="warning"
          title={t('detail.unverifiedTitle')}
          description={t('detail.unverifiedDesc')}
        />
      )}

      {/* Main (registry + financials) + a narrower sidebar (verification,
          administrators, roles). Cards flow within each column so short cards no
          longer leave a tall void beside the identity card. */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Identity / registry — two-column dl so the tall list reads compactly */}
          <SectionCard title={t('companies.identity')}>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <Field label={t('companies.colName')} value={company.name} />
              <Field
                label={t('companies.colCui')}
                value={company.cui || company.reg_no}
              />
              <Field label={t('companies.colCountry')} value={company.country} />
              <Field label={t('companies.regNo')} value={company.reg_no} />
              <Field
                label={t('companies.registrationNumber')}
                value={company.registration_number}
              />
              <Field
                label={t('companies.registrationDate')}
                value={
                  company.registration_date
                    ? formatDate(lang, company.registration_date)
                    : undefined
                }
              />
              <Field
                label={t('companies.legalForm')}
                value={company.legal_form}
              />
              <Field label={t('companies.colCaen')} value={company.caen} />

              {/* VAT status — localized label + colored pill. */}
              <div>
                <dt className="text-xs text-muted-foreground mb-1.5">
                  {t('companies.vatStatus')}
                </dt>
                <dd>
                  <StatePill tone={vatTone(company.vat_status)}>
                    {vatLabel(company.vat_status)}
                  </StatePill>
                </dd>
              </div>

              {/* e-Factura yes/no pill. */}
              {company.e_factura != null && (
                <div>
                  <dt className="text-xs text-muted-foreground mb-1.5">
                    {t('companies.eFactura')}
                  </dt>
                  <dd>
                    <StatePill tone={company.e_factura ? 'success' : 'neutral'}>
                      {company.e_factura ? t('detail.yes') : t('detail.no')}
                    </StatePill>
                  </dd>
                </div>
              )}

              <Field label={t('companies.address')} value={company.address} />
              <Field label={t('companies.county')} value={company.county} />
            </dl>
          </SectionCard>

          {/* Financials (multi-year) */}
          <SectionCard title={t('companies.financials')} flush>
            {financials.length > 0 ? (
              <>
                <Separator />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('companies.year')}</TableHead>
                      <TableHead className="text-right">
                        {t('companies.turnover')}
                      </TableHead>
                      <TableHead className="text-right">
                        {t('companies.netProfit')}
                      </TableHead>
                      <TableHead className="text-right">
                        {t('companies.employees')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financials.map((f) => (
                      <TableRow key={f.year}>
                        <TableCell className="tabular-nums">{f.year}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatRON(lang, f.turnover, t('common.none'))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatRON(lang, f.net_profit, t('common.none'))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {f.employees == null ? t('common.none') : f.employees}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            ) : (
              <div className="px-6 pb-6">
                <p className="text-sm text-muted-foreground">
                  {t('companies.noFinancials')}
                </p>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Sidebar: verification, administrators, roles */}
        <div className="flex flex-col gap-4">
          <SectionCard title={t('companies.verification')}>
            {verification ? (
              <dl className="flex flex-col gap-3">
                <div>
                  <dt className="text-xs text-muted-foreground mb-1.5">
                    {t('companies.vatStatus')}
                  </dt>
                  <dd>
                    <StatePill tone={vatTone(verification.vat_status)}>
                      {vatLabel(verification.vat_status)}
                    </StatePill>
                  </dd>
                </div>
                <Field
                  label={t('detail.checkedAt')}
                  value={
                    verification.checked_at
                      ? formatDateTime(lang, verification.checked_at)
                      : undefined
                  }
                />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('detail.noVerification')}
              </p>
            )}
          </SectionCard>

          <SectionCard title={t('companies.administrators')}>
            {administrators.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {administrators.map((name, i) => (
                  <li key={`${name}-${i}`} className="text-sm font-medium">
                    {name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t('common.none')}</p>
            )}
          </SectionCard>

          <SectionCard title={t('detail.roles')}>
            <CompanyRolesEditor
              companyId={company.id}
              roles={company.roles ?? []}
            />
          </SectionCard>
        </div>
      </div>
    </PageShell>
  )
}
