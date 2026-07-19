import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, MoreHorizontal, Plus, Truck } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Form,
  FormControl,
  FormDescription,
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
import { QueryState } from '@/components/dashboard/QueryState'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { StatePill } from '@/components/dashboard/StatePill'
import {
  useOfferSenders,
  useCreateOfferSender,
  useUpdateOfferSender,
  useDeleteOfferSender,
} from '@/hooks/useDashboard'
import {
  ApiError,
  type OfferSenderVertical,
  type SupplierSender,
  type SupplierSenderInput,
} from '@/lib/api'
import { useT } from '@/lib/i18n'
import type { TKey } from '@/lib/i18n/types'

// The "any/unset" vertical travels as an empty string on the wire; the Select
// needs a non-empty sentinel value, so we map between them.
const ANY_VERTICAL = '__any__'

const VERTICAL_OPTIONS: { value: string; labelKey: TKey }[] = [
  { value: ANY_VERTICAL, labelKey: 'suppliers.verticalAny' },
  { value: 'angrosist', labelKey: 'suppliers.verticalAngrosist' },
  { value: 'palletclearance', labelKey: 'suppliers.verticalPallet' },
]

function verticalLabelKey(v: string): TKey {
  if (v === 'angrosist') return 'suppliers.verticalAngrosist'
  if (v === 'palletclearance') return 'suppliers.verticalPallet'
  return 'suppliers.verticalAny'
}

/** Comma-separated string → trimmed, de-duplicated, non-empty tag array. */
function parseTags(raw: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(',')) {
    const tag = part.trim()
    if (tag && !seen.has(tag.toLowerCase())) {
      seen.add(tag.toLowerCase())
      out.push(tag)
    }
  }
  return out
}

interface SenderForm {
  email: string
  name: string
  tags: string
  vertical: string
  active: boolean
  notes: string
}

// ---- add / edit form dialog ------------------------------------------------

function SenderFormDialog({
  sender,
  open,
  onOpenChange,
  trigger,
}: {
  /** Editing an existing row, or null/undefined to create a new one. */
  sender?: SupplierSender | null
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger?: React.ReactNode
}) {
  const { t } = useT()
  const isEdit = !!sender
  const create = useCreateOfferSender()
  const update = useUpdateOfferSender()

  const schema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .trim()
          .min(1, t('suppliers.emailRequired'))
          .email(t('suppliers.emailInvalid')),
        name: z.string().trim().max(200),
        tags: z.string(),
        vertical: z.string(),
        active: z.boolean(),
        notes: z.string().max(2000),
      }),
    [t],
  )

  const form = useForm<SenderForm>({
    resolver: zodResolver(schema),
    // Seeded from the sender prop; the parent remounts via `key` when the
    // selected row changes, so the defaults re-run for the new row.
    defaultValues: {
      email: sender?.email ?? '',
      name: sender?.name ?? '',
      tags: (sender?.tags ?? []).join(', '),
      vertical: sender?.vertical ? sender.vertical : ANY_VERTICAL,
      active: sender?.active ?? true,
      notes: sender?.notes ?? '',
    },
  })

  const busy = create.isPending || update.isPending

  function onSubmit(v: SenderForm) {
    const body: SupplierSenderInput = {
      email: v.email.trim(),
      name: v.name.trim(),
      tags: parseTags(v.tags),
      // Map the "any" sentinel back to the empty-string wire value.
      vertical: (v.vertical === ANY_VERTICAL
        ? ''
        : v.vertical) as OfferSenderVertical,
      // Full replace: the current `active` value is always submitted.
      active: v.active,
      notes: v.notes.trim(),
    }

    if (isEdit) {
      update.mutate(
        { id: sender!.id, body },
        {
          onSuccess: () => {
            toast.success(t('suppliers.updated'))
            onOpenChange(false)
          },
          onError: () => toast.error(t('suppliers.updateError')),
        },
      )
    } else {
      create.mutate(body, {
        onSuccess: () => {
          toast.success(t('suppliers.created'))
          form.reset()
          onOpenChange(false)
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            toast.error(t('suppliers.duplicateError'))
          } else {
            toast.error(t('suppliers.createError'))
          }
        },
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('suppliers.editTitle') : t('suppliers.addTitle')}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t('suppliers.editDescription')
              : t('suppliers.addDescription')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('suppliers.email')}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="off"
                      placeholder={t('suppliers.emailPlaceholder')}
                      // Email is the identity key — kept immutable on edit
                      // (PATCH replaces the editable fields, not the email).
                      disabled={busy || isEdit}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('suppliers.name')}</FormLabel>
                  <FormControl>
                    <Input
                      maxLength={200}
                      placeholder={t('suppliers.namePlaceholder')}
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
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('suppliers.tags')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('suppliers.tagsPlaceholder')}
                      disabled={busy}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t('suppliers.tagsHint')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vertical"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('suppliers.vertical')}</FormLabel>
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
                      {VERTICAL_OPTIONS.map((o) => (
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
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>{t('suppliers.active')}</FormLabel>
                    <FormDescription>
                      {t('suppliers.activeHint')}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={busy}
                      aria-label={t('suppliers.active')}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('suppliers.notes')}</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      maxLength={2000}
                      placeholder={t('suppliers.notesPlaceholder')}
                      disabled={busy}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit
                  ? busy
                    ? t('suppliers.saving')
                    : t('suppliers.save')
                  : busy
                    ? t('suppliers.creating')
                    : t('suppliers.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ---- page ------------------------------------------------------------------

export function SuppliersPage() {
  const { t } = useT()
  const { data, isLoading, error } = useOfferSenders()
  const update = useUpdateOfferSender()
  const remove = useDeleteOfferSender()

  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<SupplierSender | null>(null)
  const [deleting, setDeleting] = useState<SupplierSender | null>(null)

  // Toggling active does a FULL replace — the whole row (incl. the flipped
  // active) is submitted, matching the PATCH-is-replace contract.
  function toggleActive(s: SupplierSender) {
    update.mutate(
      {
        id: s.id,
        body: {
          email: s.email,
          name: s.name,
          tags: s.tags,
          vertical: s.vertical,
          active: !s.active,
          notes: s.notes,
        },
      },
      {
        onSuccess: () => toast.success(t('suppliers.updated')),
        onError: () => toast.error(t('suppliers.updateError')),
      },
    )
  }

  function confirmDelete() {
    if (!deleting) return
    remove.mutate(deleting.id, {
      onSuccess: () => {
        toast.success(t('suppliers.deleted'))
        setDeleting(null)
      },
      onError: () => toast.error(t('suppliers.deleteError')),
    })
  }

  const rows = data ?? []

  return (
    <PageShell
      breadcrumbs={[{ label: t('nav.suppliers') }]}
      title={t('suppliers.title')}
      description={t('suppliers.subtitle')}
      actions={
        <SenderFormDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          trigger={
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" />
                {t('suppliers.add')}
              </Button>
            </DialogTrigger>
          }
        />
      }
    >
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={rows.length === 0}
        skeletonRows={6}
        errorMessage={t('suppliers.loadError')}
        empty={
          <EmptyState
            icon={Truck}
            title={t('suppliers.emptyTitle')}
            description={t('suppliers.empty')}
            action={
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                {t('suppliers.add')}
              </Button>
            }
          />
        }
      >
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('suppliers.colEmail')}</TableHead>
                <TableHead>{t('suppliers.colName')}</TableHead>
                <TableHead>{t('suppliers.colTags')}</TableHead>
                <TableHead>{t('suppliers.colVertical')}</TableHead>
                <TableHead>{t('suppliers.colActive')}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.email}</TableCell>
                  <TableCell>{s.name || t('common.none')}</TableCell>
                  <TableCell>
                    {s.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {s.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {t('suppliers.noTags')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatePill
                      tone={s.vertical === 'palletclearance' ? 'info' : 'brand'}
                      dot={false}
                    >
                      {t(verticalLabelKey(s.vertical))}
                    </StatePill>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={s.active}
                      onCheckedChange={() => toggleActive(s)}
                      disabled={update.isPending}
                      aria-label={t('suppliers.toggleActive', {
                        email: s.email,
                      })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={t('suppliers.actions')}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing(s)}>
                          {t('suppliers.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleting(s)}
                        >
                          {t('suppliers.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </QueryState>

      {/* Edit dialog — remounts per selected row via `key` so the form reseeds. */}
      {editing && (
        <SenderFormDialog
          key={editing.id}
          sender={editing}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('suppliers.deleteConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('suppliers.deleteConfirmBody', {
                email: deleting?.email ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Keep the dialog controlled — run the mutation, close on success.
                e.preventDefault()
                confirmDelete()
              }}
              disabled={remove.isPending}
            >
              {remove.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {t('suppliers.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  )
}
