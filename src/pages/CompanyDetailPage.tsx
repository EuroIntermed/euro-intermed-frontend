import { useParams, useNavigate } from 'react-router-dom'
import {
  Building2,
  BuildingIcon,
  Check,
  HelpCircle,
  Loader2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
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

/** Renders the leading status icon for a StatusCard from its tone. */
function ToneIcon({ tone }: { tone: Tone }) {
  switch (tone) {
    case 'success':
      return <Check className="size-4" />
    case 'danger':
    case 'warning':
      return <X className="size-4" />
    default:
      return <HelpCircle className="size-4" />
  }
}

/** Soft background paired with the family text colour, matching StatePill tones. */
const CARD_TONE_CLASS: Record<Tone, string> = {
  brand: 'bg-brand-soft text-brand',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
  danger: 'bg-destructive-soft text-destructive',
  neutral: 'bg-muted text-muted-foreground',
}

interface StatusCardProps {
  label: string
  value: string
  tone: Tone
  /** Optional small sub-line shown muted under the value. */
  hint?: string
}

/**
 * A single demoanaf-style status tile: a tinted icon chip + a label and a
 * colour-coded value. Reuses the same tone vocabulary as StatePill so colours
 * stay consistent across the page.
 */
function StatusCard({ label, value, tone, hint }: StatusCardProps) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row items-center gap-3 px-4 py-4">
        <span
          aria-hidden
          className={`flex size-9 shrink-0 items-center justify-center rounded-full ${CARD_TONE_CLASS[tone]}`}
        >
          <ToneIcon tone={tone} />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <CardTitle className="mt-0.5 truncate text-sm font-semibold">
            {value}
          </CardTitle>
          {hint && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {hint}
            </p>
          )}
        </div>
      </CardHeader>
    </Card>
  )
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

  // --- Status cards (mirror demoanaf.ro) -----------------------------------
  // TVA: prefer the explicit boolean; fall back to the canonical vat_status.
  let tvaTone: Tone
  let tvaValue: string
  if (company.vat_registered === true) {
    tvaTone = 'success'
    tvaValue = t('companies.vatRegistered')
  } else if (company.vat_registered === false) {
    tvaTone = 'danger'
    tvaValue = t('companies.vatUnregistered')
  } else if (company.vat_status === 'active') {
    tvaTone = 'success'
    tvaValue = t('companies.vatRegistered')
  } else if (
    company.vat_status === 'not_registered' ||
    company.vat_status === 'inactive'
  ) {
    tvaTone = company.vat_status === 'inactive' ? 'danger' : 'neutral'
    tvaValue = t('companies.vatUnregistered')
  } else {
    tvaTone = 'neutral'
    tvaValue = t('companies.statusUnknown')
  }

  // Status ONRC
  const onrcTone: Tone = company.onrc_status_label ? 'success' : 'neutral'
  const onrcValue = company.onrc_status_label || t('companies.onrcUnknown')

  // Stare (active / inactive taxpayer)
  let stareTone: Tone = 'neutral'
  let stareValue = t('companies.statusUnknown')
  if (company.is_active === true) {
    stareTone = 'success'
    stareValue = t('companies.taxpayerActive')
  } else if (company.is_active === false) {
    stareTone = 'warning'
    stareValue = t('companies.taxpayerInactive')
  }

  // Split TVA — "not applying" is the healthy default, so success when not applying.
  const splitApplies = company.split_vat === true
  const splitTone: Tone = splitApplies ? 'warning' : 'success'
  const splitValue = splitApplies
    ? t('companies.splitTvaApplies')
    : t('companies.splitTvaNotApplies')

  // Financials section state. Treat a non-empty array as ready regardless of flag.
  const financialsStatus: 'pending' | 'ready' | 'none' =
    financials.length > 0
      ? 'ready'
      : (company.financials_status ?? 'pending')

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

      {/* Fiscal status overview — demoanaf-style status tiles (2x2 on desktop). */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatusCard
          label={t('companies.cardTva')}
          value={tvaValue}
          tone={tvaTone}
        />
        <StatusCard
          label={t('companies.cardOnrcStatus')}
          value={onrcValue}
          tone={onrcTone}
        />
        <StatusCard
          label={t('companies.cardStare')}
          value={stareValue}
          tone={stareTone}
          hint={company.registration_state || undefined}
        />
        <StatusCard
          label={t('companies.cardSplitTva')}
          value={splitValue}
          tone={splitTone}
        />
      </div>

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
              {/* Trade-register number (ONRC J-/F-number). NOT company.reg_no —
                  for RO companies reg_no is the CUI (the (country, reg_no) dedup
                  key), so showing it here just duplicated the CUI field above. */}
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
              <Field
                label={t('companies.postalCode')}
                value={company.postal_code}
              />
              <Field
                label={t('companies.fiscalAuthority')}
                value={company.fiscal_authority}
              />

              {/* TVA la încasare (cash-basis VAT) yes/no pill. */}
              {company.cash_basis_vat != null && (
                <div>
                  <dt className="text-xs text-muted-foreground mb-1.5">
                    {t('companies.cashBasisVat')}
                  </dt>
                  <dd>
                    <StatePill
                      tone={company.cash_basis_vat ? 'success' : 'neutral'}
                    >
                      {company.cash_basis_vat ? t('detail.yes') : t('detail.no')}
                    </StatePill>
                  </dd>
                </div>
              )}
            </dl>
          </SectionCard>

          {/* Financials (multi-year) — state-driven: ready / none / pending. */}
          <SectionCard title={t('companies.financials')} flush>
            {financialsStatus === 'ready' ? (
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
                        <TableCell className="tabular-nums">
                          {f.year}
                          {f.caen_description && (
                            <span className="block text-xs font-normal text-muted-foreground">
                              {f.caen_description}
                            </span>
                          )}
                        </TableCell>
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
            ) : financialsStatus === 'none' ? (
              <div className="px-6 pb-6">
                <p className="text-sm font-medium">
                  {t('companies.noPublicBalance')}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('companies.noPublicBalanceDesc')}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-6 pb-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                <span>{t('companies.financialsLoading')}</span>
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
