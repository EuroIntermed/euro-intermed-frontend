import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createTransaction, type TransactionCreate } from '@/lib/api'
import { useT } from '@/lib/i18n'
import type { TKey } from '@/lib/i18n/types'

const VERTICALS: { value: 'angrosist' | 'palletclearance'; labelKey: TKey }[] = [
  { value: 'angrosist', labelKey: 'vertical.angrosist' },
  { value: 'palletclearance', labelKey: 'vertical.palletclearance' },
]

const STAGES: {
  value: 'offer' | 'order' | 'delivery' | 'paid'
  labelKey: TKey
}[] = [
  { value: 'offer', labelKey: 'kpiBoards.txn.stageOffer' },
  { value: 'order', labelKey: 'kpiBoards.txn.stageOrder' },
  { value: 'delivery', labelKey: 'kpiBoards.txn.stageDelivery' },
  { value: 'paid', labelKey: 'kpiBoards.txn.stagePaid' },
]

const MARGINS: { value: 'none' | 'intermediation' | 'resale'; labelKey: TKey }[] =
  [
    { value: 'none', labelKey: 'kpiBoards.txn.marginNone' },
    { value: 'intermediation', labelKey: 'kpiBoards.txn.marginIntermediation' },
    { value: 'resale', labelKey: 'kpiBoards.txn.marginResale' },
  ]

const DELIVERED: { value: 'unset' | 'yes' | 'no'; labelKey: TKey }[] = [
  { value: 'unset', labelKey: 'kpiBoards.txn.deliveredUnset' },
  { value: 'yes', labelKey: 'kpiBoards.txn.deliveredYes' },
  { value: 'no', labelKey: 'kpiBoards.txn.deliveredNo' },
]

interface FormValues {
  vertical: 'angrosist' | 'palletclearance'
  stage: 'offer' | 'order' | 'delivery' | 'paid'
  lead_id: string
  value_eur: string
  cost_eur: string
  margin_type: 'none' | 'intermediation' | 'resale'
  client_company_id: string
  is_recurring: boolean
  delivered_on_time: 'unset' | 'yes' | 'no'
}

/** Trims a numeric-string field to a number, or undefined when blank. */
function toNum(v: string): number | undefined {
  const t = v.trim()
  return t ? Number(t) : undefined
}

/**
 * Manual transaction entry (KPI_PLAN §B/§C). A shadcn dialog + react-hook-form +
 * zod form posting to `POST /api/transactions`. On success it invalidates the
 * KPI board queries so the funnel/month numbers refresh. Money fields are typed
 * as strings and coerced on submit (blank → omitted).
 */
export function TransactionDialog() {
  const { t } = useT()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const schema = useMemo(() => {
    const numStr = z
      .string()
      .trim()
      .refine(
        (v) => v === '' || Number.isFinite(Number(v)),
        t('kpiBoards.txn.numberInvalid'),
      )
    return z.object({
      vertical: z.enum(['angrosist', 'palletclearance']),
      stage: z.enum(['offer', 'order', 'delivery', 'paid']),
      lead_id: z.string().trim().max(200),
      value_eur: numStr,
      cost_eur: numStr,
      margin_type: z.enum(['none', 'intermediation', 'resale']),
      client_company_id: z.string().trim().max(200),
      is_recurring: z.boolean(),
      delivered_on_time: z.enum(['unset', 'yes', 'no']),
    })
  }, [t])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vertical: 'angrosist',
      stage: 'order',
      lead_id: '',
      value_eur: '',
      cost_eur: '',
      margin_type: 'none',
      client_company_id: '',
      is_recurring: false,
      delivered_on_time: 'unset',
    },
  })

  const mutation = useMutation({
    mutationFn: (body: TransactionCreate) => createTransaction(body),
    onSuccess: () => {
      toast.success(t('kpiBoards.txn.created'))
      // Manual commercial data feeds the funnel + month boards — refresh them.
      queryClient.invalidateQueries({ queryKey: ['kpi-month'] })
      queryClient.invalidateQueries({ queryKey: ['kpi-portfolio-clearance'] })
      queryClient.invalidateQueries({ queryKey: ['kpi-today-angrosist'] })
      queryClient.invalidateQueries({ queryKey: ['kpis'] })
      form.reset()
      setOpen(false)
    },
    onError: () => toast.error(t('kpiBoards.txn.createError')),
  })

  const busy = mutation.isPending

  function onSubmit(v: FormValues) {
    const body: TransactionCreate = {
      vertical: v.vertical,
      stage: v.stage,
      is_recurring: v.is_recurring,
    }
    if (v.lead_id.trim()) body.lead_id = v.lead_id.trim()
    const value = toNum(v.value_eur)
    if (value !== undefined) body.value_eur = value
    const cost = toNum(v.cost_eur)
    if (cost !== undefined) body.cost_eur = cost
    if (v.margin_type !== 'none') body.margin_type = v.margin_type
    if (v.client_company_id.trim())
      body.client_company_id = v.client_company_id.trim()
    if (v.delivered_on_time !== 'unset')
      body.delivered_on_time = v.delivered_on_time === 'yes'
    mutation.mutate(body)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" />
          {t('kpiBoards.txn.new')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('kpiBoards.txn.newTitle')}</DialogTitle>
          <DialogDescription>
            {t('kpiBoards.txn.newDescription')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="vertical"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('kpiBoards.txn.fieldVertical')}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={busy}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {VERTICALS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {t(o.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('kpiBoards.txn.fieldStage')}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={busy}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STAGES.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {t(o.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="value_eur"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('kpiBoards.txn.fieldValue')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min="0"
                        disabled={busy}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cost_eur"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('kpiBoards.txn.fieldCost')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min="0"
                        disabled={busy}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="margin_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('kpiBoards.txn.fieldMarginType')}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={busy}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MARGINS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {t(o.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="delivered_on_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('kpiBoards.txn.fieldDeliveredOnTime')}
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={busy}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DELIVERED.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {t(o.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lead_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('kpiBoards.txn.fieldLead')}</FormLabel>
                    <FormControl>
                      <Input disabled={busy} maxLength={200} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="client_company_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('kpiBoards.txn.fieldClientCompany')}
                    </FormLabel>
                    <FormControl>
                      <Input disabled={busy} maxLength={200} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="is_recurring"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">
                    {t('kpiBoards.txn.fieldRecurring')}
                  </FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={busy}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy ? t('kpiBoards.txn.creating') : t('kpiBoards.txn.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
