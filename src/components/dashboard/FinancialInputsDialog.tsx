import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Wallet } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { putFinancialInputs, type FinancialInputs } from '@/lib/api'
import { useT } from '@/lib/i18n'
import type { TKey } from '@/lib/i18n/types'

/** Current month as `"YYYY-MM"` for the default period + native month input. */
function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// The optional money fields (all share the same numeric-string validation).
const MONEY_FIELDS: { name: keyof MoneyValues; labelKey: TKey }[] = [
  { name: 'gross_turnover', labelKey: 'kpiBoards.finInputs.fieldGrossTurnover' },
  { name: 'margin_revenue', labelKey: 'kpiBoards.finInputs.fieldMarginRevenue' },
  { name: 'cash_in', labelKey: 'kpiBoards.finInputs.fieldCashIn' },
  { name: 'cash_out', labelKey: 'kpiBoards.finInputs.fieldCashOut' },
  {
    name: 'marketing_spend',
    labelKey: 'kpiBoards.finInputs.fieldMarketingSpend',
  },
  {
    name: 'maintenance_cost',
    labelKey: 'kpiBoards.finInputs.fieldMaintenanceCost',
  },
  { name: 'opex', labelKey: 'kpiBoards.finInputs.fieldOpex' },
]

interface MoneyValues {
  gross_turnover: string
  margin_revenue: string
  cash_in: string
  cash_out: string
  marketing_spend: string
  maintenance_cost: string
  opex: string
}

interface FormValues extends MoneyValues {
  period_month: string
}

function toNum(v: string): number | undefined {
  const t = v.trim()
  return t ? Number(t) : undefined
}

/**
 * Monthly financial-input entry (KPI_PLAN §C.2). A shadcn dialog + react-hook-form
 * + zod form doing `PUT /api/financial-inputs` (upsert keyed by month). On success
 * it invalidates the month board so turnover/margin refresh. Money fields are
 * strings, coerced on submit (blank → omitted).
 */
export function FinancialInputsDialog() {
  const { t } = useT()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const schema = useMemo(() => {
    const numStr = z
      .string()
      .trim()
      .refine(
        (v) => v === '' || Number.isFinite(Number(v)),
        t('kpiBoards.finInputs.numberInvalid'),
      )
    return z.object({
      period_month: z
        .string()
        .trim()
        .regex(/^\d{4}-\d{2}$/, t('kpiBoards.finInputs.monthRequired')),
      gross_turnover: numStr,
      margin_revenue: numStr,
      cash_in: numStr,
      cash_out: numStr,
      marketing_spend: numStr,
      maintenance_cost: numStr,
      opex: numStr,
    })
  }, [t])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      period_month: currentMonth(),
      gross_turnover: '',
      margin_revenue: '',
      cash_in: '',
      cash_out: '',
      marketing_spend: '',
      maintenance_cost: '',
      opex: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (body: FinancialInputs) => putFinancialInputs(body),
    onSuccess: () => {
      toast.success(t('kpiBoards.finInputs.saved'))
      queryClient.invalidateQueries({ queryKey: ['kpi-month'] })
      form.reset()
      setOpen(false)
    },
    onError: () => toast.error(t('kpiBoards.finInputs.saveError')),
  })

  const busy = mutation.isPending

  function onSubmit(v: FormValues) {
    const body: FinancialInputs = { period_month: v.period_month }
    for (const f of MONEY_FIELDS) {
      const n = toNum(v[f.name])
      if (n !== undefined) body[f.name] = n
    }
    mutation.mutate(body)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Wallet className="h-4 w-4" />
          {t('kpiBoards.finInputs.edit')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('kpiBoards.finInputs.title')}</DialogTitle>
          <DialogDescription>
            {t('kpiBoards.finInputs.description')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="period_month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('kpiBoards.finInputs.fieldMonth')}</FormLabel>
                  <FormControl>
                    <Input type="month" disabled={busy} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {MONEY_FIELDS.map((f) => (
                <FormField
                  key={f.name}
                  control={form.control}
                  name={f.name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t(f.labelKey)}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          disabled={busy}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy
                  ? t('kpiBoards.finInputs.saving')
                  : t('kpiBoards.finInputs.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
