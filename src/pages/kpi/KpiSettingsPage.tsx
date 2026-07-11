import { useMemo } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, ShieldAlert, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { PageShell } from '@/components/layout/PageShell'
import { QueryState } from '@/components/dashboard/QueryState'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { useAuth } from '@/auth/useAuth'
import { useKpiSettings } from '@/hooks/useDashboard'
import { putKpiSettings, type KpiSetting } from '@/lib/api'
import { useT } from '@/lib/i18n'
import type { TKey } from '@/lib/i18n/types'

// How each key is rendered/validated in the form. `ratio` wire values (0..1) are
// shown to the admin as a percent (0..100) and converted back on save.
type FieldKind = 'int' | 'number' | 'percent' | 'url'

interface FieldDef {
  key: string
  kind: FieldKind
  labelKey: TKey
}

const TARGET_FIELDS: FieldDef[] = [
  {
    key: 'qualified_monthly_target',
    kind: 'int',
    labelKey: 'kpiBoards.settings.qualifiedMonthlyTarget',
  },
  {
    key: 'active_buyers_target',
    kind: 'int',
    labelKey: 'kpiBoards.settings.activeBuyersTarget',
  },
  {
    key: 'vat_cap_ron',
    kind: 'number',
    labelKey: 'kpiBoards.settings.vatCapRon',
  },
  {
    key: 'margin_revenue_plan_ron',
    kind: 'number',
    labelKey: 'kpiBoards.settings.marginRevenuePlanRon',
  },
]

const ALERT_FIELDS: FieldDef[] = [
  {
    key: 'alert_min_anaf_success',
    kind: 'percent',
    labelKey: 'kpiBoards.settings.alertMinAnafSuccess',
  },
  {
    key: 'alert_min_extraction_completeness',
    kind: 'percent',
    labelKey: 'kpiBoards.settings.alertMinExtractionCompleteness',
  },
  {
    key: 'alert_max_escalation_rate',
    kind: 'percent',
    labelKey: 'kpiBoards.settings.alertMaxEscalationRate',
  },
  {
    key: 'alert_min_match_rate',
    kind: 'percent',
    labelKey: 'kpiBoards.settings.alertMinMatchRate',
  },
  {
    key: 'alert_drop_pct',
    kind: 'number',
    labelKey: 'kpiBoards.settings.alertDropPct',
  },
]

const OTHER_FIELDS: FieldDef[] = [
  {
    key: 'ga4_dashboard_url',
    kind: 'url',
    labelKey: 'kpiBoards.settings.ga4DashboardUrl',
  },
]

const ALL_FIELDS = [...TARGET_FIELDS, ...ALERT_FIELDS, ...OTHER_FIELDS]

type FormValues = Record<string, string>

/** Rounds a percent to at most 2 decimals so 0.9*100 renders as "90", not "90.00000001". */
function roundPercent(n: number): number {
  return Math.round(n * 10000) / 100
}

/** Converts a stored wire value into the string shown in the input. */
function toInput(kind: FieldKind, wire: string | null): string {
  if (wire == null || wire === '') return ''
  if (kind === 'percent') {
    const n = Number(wire)
    return Number.isFinite(n) ? String(roundPercent(n)) : ''
  }
  return wire
}

/** Converts an input string back to the wire value sent on save ("" clears it). */
function toWire(kind: FieldKind, input: string): string {
  const t = input.trim()
  if (t === '') return ''
  if (kind === 'percent') {
    const n = Number(t)
    return Number.isFinite(n) ? String(n / 100) : ''
  }
  return t
}

function isValidUrl(v: string): boolean {
  try {
    new URL(v)
    return true
  } catch {
    return false
  }
}

/**
 * "KPI settings" (admin-only). Lets the owner edit the KPI dashboard targets +
 * alert thresholds at runtime — values that used to be env-var only. Pre-filled
 * from `GET /api/kpis/settings` (the DB override, with the env default shown as
 * the placeholder); on save it PUTs ONLY the changed keys (empty → clears the
 * override) and invalidates the KPI board queries so target lines refresh.
 * Ratio settings are shown as a percent (0–100) and converted to 0..1 on save.
 */
export function KpiSettingsPage() {
  const { t } = useT()
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useKpiSettings()

  // key → setting, for placeholders (default), effective hints and typing.
  const byKey = useMemo(() => {
    const m = new Map<string, KpiSetting>()
    for (const s of data ?? []) m.set(s.key, s)
    return m
  }, [data])

  // Loaded form values (the current DB override rendered as an input string).
  // Used both to seed the form and as the baseline for the changed-keys diff.
  const loaded = useMemo<FormValues>(() => {
    const v: FormValues = {}
    for (const f of ALL_FIELDS) {
      v[f.key] = toInput(f.kind, byKey.get(f.key)?.value ?? null)
    }
    return v
  }, [byKey])

  const schema = useMemo(() => {
    const fieldSchema = (kind: FieldKind) =>
      z
        .string()
        .trim()
        .superRefine((v, ctx) => {
          if (v === '') return // blank clears the override — always valid
          if (kind === 'url') {
            if (!isValidUrl(v))
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: t('kpiBoards.settings.urlInvalid'),
              })
            return
          }
          const n = Number(v)
          if (!Number.isFinite(n)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('kpiBoards.settings.numberInvalid'),
            })
            return
          }
          if (n < 0)
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('kpiBoards.settings.numberNegative'),
            })
          if (kind === 'int' && !Number.isInteger(n))
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('kpiBoards.settings.intInvalid'),
            })
          if (kind === 'percent' && n > 100)
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('kpiBoards.settings.percentRange'),
            })
        })

    const shape: Record<string, z.ZodTypeAny> = {}
    for (const f of ALL_FIELDS) shape[f.key] = fieldSchema(f.kind)
    return z.object(shape)
  }, [t])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    // Seed empty so inputs stay controlled before the query resolves; `values`
    // syncs the real loaded data in (and resets after a successful save).
    defaultValues: Object.fromEntries(ALL_FIELDS.map((f) => [f.key, ''])),
    values: loaded,
  })

  const mutation = useMutation({
    mutationFn: (partial: Record<string, string>) => putKpiSettings(partial),
    onSuccess: (settings) => {
      toast.success(t('kpiBoards.settings.saved'))
      // Reflect the saved state immediately as the new baseline, then refresh
      // every KPI board so target lines / alert thresholds pick up the change.
      queryClient.setQueryData(['kpi-settings'], settings)
      queryClient.invalidateQueries({ queryKey: ['kpis'] })
      queryClient.invalidateQueries({ queryKey: ['kpi-month'] })
      queryClient.invalidateQueries({ queryKey: ['kpi-portfolio-clearance'] })
      queryClient.invalidateQueries({ queryKey: ['kpi-today-angrosist'] })
      queryClient.invalidateQueries({ queryKey: ['kpi-platform-health'] })
    },
    onError: () => toast.error(t('kpiBoards.settings.saveError')),
  })

  const busy = mutation.isPending

  function onSubmit(v: FormValues) {
    // PUT only the keys whose input changed vs. what was loaded; convert each to
    // its wire value ("" for a cleared override).
    const partial: Record<string, string> = {}
    for (const f of ALL_FIELDS) {
      const current = (v[f.key] ?? '').trim()
      const base = (loaded[f.key] ?? '').trim()
      if (current !== base) partial[f.key] = toWire(f.kind, v[f.key] ?? '')
    }
    if (Object.keys(partial).length === 0) {
      toast.info(t('kpiBoards.settings.noChanges'))
      return
    }
    mutation.mutate(partial)
  }

  function renderField(f: FieldDef) {
    const setting = byKey.get(f.key)
    const placeholder = toInput(f.kind, setting?.default ?? null)
    const effective = toInput(f.kind, setting?.effective ?? null)
    return (
      <FormField
        key={f.key}
        control={form.control}
        name={f.key}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t(f.labelKey)}</FormLabel>
            <FormControl>
              <Input
                type={f.kind === 'url' ? 'url' : 'number'}
                inputMode={f.kind === 'url' ? undefined : 'decimal'}
                step={f.kind === 'int' ? '1' : 'any'}
                min={f.kind === 'url' ? undefined : '0'}
                placeholder={placeholder || t('kpiBoards.settings.defaultNone')}
                disabled={busy}
                {...field}
              />
            </FormControl>
            {effective && (
              <FormDescription>
                {t('kpiBoards.settings.effectiveNow', { v: effective })}
              </FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    )
  }

  return (
    <PageShell
      breadcrumbs={[{ label: t('nav.kpiSettings') }]}
      title={t('kpiBoards.settings.title')}
      description={t('kpiBoards.settings.subtitle')}
    >
      {!isAdmin ? (
        <EmptyState
          icon={ShieldAlert}
          title={t('kpiBoards.settings.notAdmin')}
        />
      ) : (
        <QueryState
          isLoading={isLoading}
          error={error}
          skeletonRows={8}
          errorMessage={t('kpiBoards.settings.loadError')}
        >
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                    {t('kpiBoards.settings.targetsTitle')}
                  </CardTitle>
                  <CardDescription>
                    {t('kpiBoards.settings.targetsDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {TARGET_FIELDS.map(renderField)}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t('kpiBoards.settings.alertsTitle')}
                  </CardTitle>
                  <CardDescription>
                    {t('kpiBoards.settings.alertsDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {ALERT_FIELDS.map(renderField)}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t('kpiBoards.settings.otherTitle')}
                  </CardTitle>
                  <CardDescription>
                    {t('kpiBoards.settings.otherDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4">
                  {OTHER_FIELDS.map(renderField)}
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {busy
                    ? t('kpiBoards.settings.saving')
                    : t('kpiBoards.settings.save')}
                </Button>
              </div>
            </form>
          </Form>
        </QueryState>
      )}
    </PageShell>
  )
}
