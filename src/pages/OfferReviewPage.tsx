import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  Lock,
  MessageSquareText,
  PackageOpen,
  Pencil,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageShell } from '@/components/layout/PageShell'
import { SectionCard } from '@/components/dashboard/SectionCard'
import { QueryState } from '@/components/dashboard/QueryState'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { StatePill } from '@/components/dashboard/StatePill'
import {
  useOfferBatch,
  useUpdateOfferItem,
  useUpdateOfferBatch,
  useOfferWhatsApp,
} from '@/hooks/useDashboard'
import {
  ApiError,
  type OfferBatch,
  type OfferItem,
  type OfferItemInput,
  type OfferItemStatus,
} from '@/lib/api'
import {
  BATCH_STATUS,
  ITEM_STATUS,
  confidenceTone,
} from '@/lib/offerStatus'
import { useT, useEnums, formatDateTime } from '@/lib/i18n'
import type { TKey } from '@/lib/i18n/types'

// --- helpers ----------------------------------------------------------------

/** Builds the full-replace body from a row, overriding only the given fields. */
function toInput(item: OfferItem, patch: Partial<OfferItemInput>): OfferItemInput {
  return {
    product_name: item.product_name,
    quantity: item.quantity,
    unit: item.unit,
    price: item.price,
    currency: item.currency,
    category_id: item.category_id,
    category_text: item.category_text,
    supplier: item.supplier,
    status: item.status,
    ...patch,
  }
}

const ITEM_STATUS_OPTIONS: { value: OfferItemStatus; labelKey: TKey }[] = [
  { value: 'draft', labelKey: 'offers.itemDraft' },
  { value: 'approved', labelKey: 'offers.itemApproved' },
  { value: 'rejected', labelKey: 'offers.itemRejected' },
]

// --- edit item dialog -------------------------------------------------------

interface ItemForm {
  product_name: string
  quantity: string
  unit: string
  price: string
  currency: string
  category_text: string
  supplier: string
  status: OfferItemStatus
}

function EditItemDialog({
  item,
  batchId,
  open,
  onOpenChange,
}: {
  item: OfferItem
  batchId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useT()
  const update = useUpdateOfferItem(batchId)

  const schema = useMemo(
    () =>
      z.object({
        product_name: z.string().trim().min(1, t('offers.productRequired')),
        // Optional numeric fields travel as strings; empty = null.
        quantity: z
          .string()
          .refine(
            (v) => v.trim() === '' || Number.isFinite(Number(v)),
            t('offers.numberInvalid'),
          ),
        unit: z.string().trim().max(40),
        price: z
          .string()
          .refine(
            (v) => v.trim() === '' || Number.isFinite(Number(v)),
            t('offers.numberInvalid'),
          ),
        currency: z.string().trim().max(8),
        category_text: z.string().trim().max(200),
        supplier: z.string().trim().max(200),
        status: z.enum(['draft', 'approved', 'rejected']),
      }),
    [t],
  )

  const form = useForm<ItemForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      product_name: item.product_name,
      quantity: item.quantity == null ? '' : String(item.quantity),
      unit: item.unit,
      price: item.price == null ? '' : String(item.price),
      currency: item.currency,
      category_text: item.category_text,
      supplier: item.supplier,
      status: item.status,
    },
  })

  const busy = update.isPending

  function onSubmit(v: ItemForm) {
    const body: OfferItemInput = {
      product_name: v.product_name.trim(),
      quantity: v.quantity.trim() === '' ? null : Number(v.quantity),
      unit: v.unit.trim(),
      price: v.price.trim() === '' ? null : Number(v.price),
      currency: v.currency.trim(),
      // category_id is a passthrough — the resolver owns it; we edit the text.
      category_id: item.category_id,
      category_text: v.category_text.trim(),
      supplier: v.supplier.trim(),
      status: v.status,
    }
    update.mutate(
      { id: item.id, body },
      {
        onSuccess: () => {
          toast.success(t('offers.itemUpdated'))
          onOpenChange(false)
        },
        onError: () => toast.error(t('offers.itemUpdateError')),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('offers.editItemTitle')}</DialogTitle>
          <DialogDescription>
            {t('offers.editItemDescription')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="product_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('offers.fProduct')}</FormLabel>
                  <FormControl>
                    <Input disabled={busy} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('offers.fQuantity')}</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" disabled={busy} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('offers.fUnit')}</FormLabel>
                    <FormControl>
                      <Input maxLength={40} disabled={busy} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('offers.fPrice')}</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" disabled={busy} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('offers.fCurrency')}</FormLabel>
                    <FormControl>
                      <Input maxLength={8} disabled={busy} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="category_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('offers.fCategory')}</FormLabel>
                  <FormControl>
                    <Input maxLength={200} disabled={busy} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('offers.fSupplier')}</FormLabel>
                  <FormControl>
                    <Input maxLength={200} disabled={busy} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('offers.fStatus')}</FormLabel>
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
                      {ITEM_STATUS_OPTIONS.map((o) => (
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
            <DialogFooter>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy ? t('offers.saving') : t('offers.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// --- WhatsApp preview dialog -------------------------------------------------

function WhatsAppDialog({ batch }: { batch: OfferBatch }) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const { data, isLoading, error, refetch } = useOfferWhatsApp(batch.id, open)

  async function copy() {
    if (!data || data.confidential) return
    try {
      await navigator.clipboard.writeText(data.preview.text)
      toast.success(t('offers.copied'))
    } catch {
      toast.error(t('offers.copyError'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <MessageSquareText className="h-4 w-4" />
          {t('offers.whatsapp')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('offers.whatsappTitle')}</DialogTitle>
          <DialogDescription>
            {t('offers.whatsappDescription')}
          </DialogDescription>
        </DialogHeader>

        <QueryState
          isLoading={isLoading}
          error={error}
          errorMessage={t('offers.whatsappLoadError')}
          onRetry={refetch}
          skeleton={<Skeleton className="h-40 w-full" />}
        >
          {data?.confidential ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center">
              <div className="flex size-11 items-center justify-center rounded-xl bg-info-soft text-info">
                <Lock className="size-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {t('offers.confidentialTitle')}
              </p>
              <p className="max-w-xs text-sm text-muted-foreground">
                {t('offers.confidentialBody')}
              </p>
            </div>
          ) : data ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {data.preview.suggested_group && (
                  <span>
                    {t('offers.suggestedGroup')}:{' '}
                    <span className="font-medium text-foreground">
                      {data.preview.suggested_group}
                    </span>
                  </span>
                )}
                <span>
                  {t('offers.itemCount')}:{' '}
                  <span className="font-medium text-foreground tabular-nums">
                    {data.preview.item_count}
                  </span>
                </span>
              </div>
              {/* Plain-text render — user/AI content is never treated as markup. */}
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
                {data.preview.text || t('offers.whatsappEmpty')}
              </pre>
              {data.preview.hint && (
                <p className="text-xs text-muted-foreground">
                  {data.preview.hint}
                </p>
              )}
            </div>
          ) : null}
        </QueryState>

        <DialogFooter>
          {data && !data.confidential && (
            <Button
              onClick={copy}
              disabled={!data.preview.text}
              aria-label={t('offers.copy')}
            >
              <Copy className="h-4 w-4" />
              {t('offers.copy')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- item row ---------------------------------------------------------------

function ItemRow({ item, batchId }: { item: OfferItem; batchId: string }) {
  const { t } = useT()
  const update = useUpdateOfferItem(batchId)
  const [editing, setEditing] = useState(false)

  const s = ITEM_STATUS[item.status] ?? ITEM_STATUS.draft
  const busy = update.isPending

  function setStatus(status: OfferItemStatus) {
    if (item.status === status) return
    update.mutate(
      { id: item.id, body: toInput(item, { status }) },
      {
        onSuccess: () => toast.success(t('offers.itemUpdated')),
        onError: () => toast.error(t('offers.itemUpdateError')),
      },
    )
  }

  return (
    <TableRow>
      <TableCell className="max-w-[240px]">
        <span className="line-clamp-2 font-medium">{item.product_name}</span>
      </TableCell>
      <TableCell className="tabular-nums">
        {item.quantity ?? t('common.none')}
      </TableCell>
      <TableCell>{item.unit || t('common.none')}</TableCell>
      <TableCell className="tabular-nums">
        {item.price ?? t('common.none')}
      </TableCell>
      <TableCell>{item.currency || t('common.none')}</TableCell>
      <TableCell className="max-w-[160px]">
        <span className="line-clamp-1">
          {item.category_text || t('common.none')}
        </span>
      </TableCell>
      <TableCell className="max-w-[140px]">
        <span className="line-clamp-1">
          {item.supplier || t('common.none')}
        </span>
      </TableCell>
      <TableCell>
        <StatePill tone={confidenceTone(item.confidence)} dot={false}>
          {item.confidence == null
            ? t('offers.confidenceUnknown')
            : `${Math.round(item.confidence * 100)}%`}
        </StatePill>
      </TableCell>
      <TableCell>
        <StatePill tone={s.tone}>{t(s.labelKey)}</StatePill>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={busy || item.status === 'approved'}
            aria-label={t('offers.approve')}
            title={t('offers.approve')}
            onClick={() => setStatus('approved')}
          >
            <Check className="h-4 w-4 text-success" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={busy || item.status === 'rejected'}
            aria-label={t('offers.reject')}
            title={t('offers.reject')}
            onClick={() => setStatus('rejected')}
          >
            <X className="h-4 w-4 text-destructive" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={t('offers.edit')}
            title={t('offers.edit')}
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
      {editing && (
        <EditItemDialog
          key={item.updated_at}
          item={item}
          batchId={batchId}
          open={editing}
          onOpenChange={setEditing}
        />
      )}
    </TableRow>
  )
}

// --- page -------------------------------------------------------------------

export function OfferReviewPage() {
  const { batchId = '' } = useParams()
  const { t, lang } = useT()
  const { verticalLabel } = useEnums()
  const { data, isLoading, error, refetch } = useOfferBatch(batchId)

  const updateBatch = useUpdateOfferBatch(batchId)
  const [notes, setNotes] = useState<string | null>(null)

  const batch = data?.batch
  // Seed the notes editor from the loaded batch (once, without an effect).
  const notesValue = notes ?? batch?.notes ?? ''

  // Least-confident first: unknown (null) confidence floats to the very top so a
  // reviewer sees the parser's weakest guesses before anything else.
  const items = useMemo(() => {
    const list = [...(data?.items ?? [])]
    list.sort((a, b) => {
      const ca = a.confidence ?? -1
      const cb = b.confidence ?? -1
      return ca - cb
    })
    return list
  }, [data?.items])

  const notFound = error instanceof ApiError && error.status === 404

  function saveNotes() {
    updateBatch.mutate(
      { notes: notesValue },
      {
        onSuccess: () => toast.success(t('offers.notesSaved')),
        onError: () => toast.error(t('offers.notesError')),
      },
    )
  }

  function markReviewed() {
    updateBatch.mutate(
      { status: 'reviewed', notes: notesValue },
      {
        onSuccess: () => toast.success(t('offers.markedReviewed')),
        onError: () => toast.error(t('offers.markReviewedError')),
      },
    )
  }

  const crumbSubject = batch?.subject || batch?.supplier_name || t('nav.offers')
  const statusMeta = batch ? BATCH_STATUS[batch.status] : undefined
  const isReviewed = batch?.status === 'reviewed' || batch?.status === 'sent'

  return (
    <PageShell
      breadcrumbs={[
        { label: t('nav.offers'), to: '/dashboard/offers' },
        { label: crumbSubject },
      ]}
      title={t('offers.title')}
      description={t('offers.reviewSubtitle')}
      actions={
        batch ? (
          <div className="flex flex-wrap items-center gap-2">
            <WhatsAppDialog batch={batch} />
            <Button
              variant="outline"
              size="sm"
              disabled={updateBatch.isPending || isReviewed}
              onClick={markReviewed}
            >
              {updateBatch.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {isReviewed ? t('offers.alreadyReviewed') : t('offers.markReviewed')}
            </Button>
          </div>
        ) : undefined
      }
    >
      {notFound ? (
        <EmptyState
          icon={PackageOpen}
          title={t('offers.notFoundTitle')}
          description={t('offers.notFound')}
        />
      ) : (
        <QueryState
          isLoading={isLoading}
          error={error}
          errorMessage={t('offers.loadError')}
          onRetry={refetch}
          skeletonRows={8}
        >
          {batch && (
            <div className="flex flex-col gap-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <SectionCard
                  title={t('offers.supplier')}
                  className="lg:col-span-2"
                >
                  <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                    <div>
                      {/* supplier_email is personal data — staff-only, never logged. */}
                      <dt className="text-muted-foreground">
                        {t('offers.supplier')}
                      </dt>
                      <dd className="font-medium">
                        {batch.supplier_name || batch.supplier_email}
                      </dd>
                      {batch.supplier_name && (
                        <dd className="text-xs text-muted-foreground">
                          {batch.supplier_email}
                        </dd>
                      )}
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        {t('offers.subject')}
                      </dt>
                      <dd className="font-medium">
                        {batch.subject || t('offers.noSubject')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        {t('offers.vertical')}
                      </dt>
                      <dd>
                        <StatePill
                          tone={
                            batch.vertical === 'palletclearance'
                              ? 'info'
                              : 'brand'
                          }
                          dot={false}
                        >
                          {verticalLabel(batch.vertical)}
                        </StatePill>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        {t('offers.status')}
                      </dt>
                      <dd className="flex flex-wrap items-center gap-2">
                        {statusMeta && (
                          <StatePill tone={statusMeta.tone}>
                            {t(statusMeta.labelKey)}
                          </StatePill>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(lang, batch.received_at)}
                        </span>
                      </dd>
                    </div>
                    {batch.status === 'error' && batch.error && (
                      <div className="sm:col-span-2">
                        <dt className="flex items-center gap-1 text-destructive">
                          <AlertTriangle className="size-3.5" />
                          {t('offers.parseError')}
                        </dt>
                        <dd className="text-sm text-muted-foreground">
                          {batch.error}
                        </dd>
                      </div>
                    )}
                  </dl>
                </SectionCard>

                <SectionCard title={t('offers.notesLabel')}>
                  <div className="flex flex-col gap-3">
                    <Textarea
                      rows={4}
                      value={notesValue}
                      maxLength={2000}
                      placeholder={t('offers.notesPlaceholder')}
                      aria-label={t('offers.notesLabel')}
                      disabled={updateBatch.isPending}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="self-end"
                      disabled={updateBatch.isPending}
                      onClick={saveNotes}
                    >
                      {updateBatch.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {t('offers.saveNotes')}
                    </Button>
                  </div>
                </SectionCard>
              </div>

              <SectionCard
                title={t('offers.itemsTitle')}
                description={t('offers.itemsSubtitle')}
                icon={PackageOpen}
                flush
              >
                {items.length === 0 ? (
                  <EmptyState
                    compact
                    icon={PackageOpen}
                    title={t('offers.itemsEmptyTitle')}
                    description={t('offers.itemsEmpty')}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="min-w-[900px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('offers.colProduct')}</TableHead>
                          <TableHead>{t('offers.colQty')}</TableHead>
                          <TableHead>{t('offers.colUnit')}</TableHead>
                          <TableHead>{t('offers.colPrice')}</TableHead>
                          <TableHead>{t('offers.colCurrency')}</TableHead>
                          <TableHead>{t('offers.colCategory')}</TableHead>
                          <TableHead>{t('offers.colItemSupplier')}</TableHead>
                          <TableHead>{t('offers.colConfidence')}</TableHead>
                          <TableHead>{t('offers.colItemStatus')}</TableHead>
                          <TableHead className="text-right">
                            {t('offers.colActions')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <ItemRow
                            key={item.id}
                            item={item}
                            batchId={batchId}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </SectionCard>
            </div>
          )}
        </QueryState>
      )}
    </PageShell>
  )
}
