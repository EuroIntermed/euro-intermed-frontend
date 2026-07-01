import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Loader2, Merge, Settings2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { useCategories } from '@/hooks/useDashboard'
import { mergeCategories, ApiError, type Category } from '@/lib/api'
import { buildCategoryTree } from '@/lib/categoryTree'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * Admin-only "Manage categories" surface (opened from the inventory toolbar).
 * Lists the taxonomy — highlighting `status === 'unreviewed'` nodes as cleanup
 * candidates — and lets an admin repoint every reference from a `from` category
 * into an `into` category via {@link mergeCategories}. The from/into pickers can
 * never select the same id (guarded), the merge is gated behind a shadcn
 * AlertDialog confirm, and the returned `moved` count is surfaced in a toast. On
 * success both ['categories'] and ['listings'] are invalidated so the picker,
 * the grouped view and the table all refresh. Backend {@link ApiError}s
 * (403/400/404) degrade to a friendly toast.
 *
 * Rendered only for admins by the caller; the backend RBAC stays the real gate.
 */
export function ManageCategoriesDialog() {
  const { t } = useT()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [fromId, setFromId] = useState('')
  const [intoId, setIntoId] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data: categories, isLoading, error } = useCategories()
  // Stable reference so the memos below don't recompute on every render.
  const list = useMemo(() => categories ?? [], [categories])

  // Flat, tree-ordered options (root then its children) for the two pickers.
  const ordered = useMemo<Category[]>(() => {
    const out: Category[] = []
    for (const { node, children } of buildCategoryTree(list)) {
      out.push(node)
      out.push(...children)
    }
    return out
  }, [list])

  const byId = useMemo(() => new Map(list.map((c) => [c.id, c])), [list])
  const from = fromId ? byId.get(fromId) : undefined
  const into = intoId ? byId.get(intoId) : undefined
  const sameSelected = !!fromId && fromId === intoId
  const canMerge = !!fromId && !!intoId && !sameSelected

  const mutation = useMutation({
    mutationFn: () => mergeCategories(fromId, intoId),
    onSuccess: (res) => {
      toast.success(
        t('categories.merged', {
          n: res.moved,
          into: into?.name ?? '',
        }),
      )
      setFromId('')
      setIntoId('')
      setConfirmOpen(false)
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : t('categories.mergeError')
      toast.error(message)
      setConfirmOpen(false)
    },
  })

  const busy = mutation.isPending

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4" />
          {t('inventory.manageCategories')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('categories.manageTitle')}</DialogTitle>
          <DialogDescription>
            {t('categories.manageDescription')}
          </DialogDescription>
        </DialogHeader>

        {/* Merge form */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <div className="flex flex-col gap-1.5">
              <Label>{t('categories.fromLabel')}</Label>
              <Select value={fromId} onValueChange={setFromId} disabled={busy}>
                <SelectTrigger aria-label={t('categories.fromLabel')}>
                  <SelectValue placeholder={t('categories.fromPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {ordered.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {t('inventory.categoryCount', {
                        name: c.name,
                        n: c.count,
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ArrowRight className="mx-auto hidden h-4 w-4 shrink-0 text-muted-foreground sm:mb-2.5 sm:block" />

            <div className="flex flex-col gap-1.5">
              <Label>{t('categories.intoLabel')}</Label>
              <Select value={intoId} onValueChange={setIntoId} disabled={busy}>
                <SelectTrigger aria-label={t('categories.intoLabel')}>
                  <SelectValue placeholder={t('categories.intoPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {ordered.map((c) => (
                    <SelectItem
                      key={c.id}
                      value={c.id}
                      // Prevent picking the same category on both sides.
                      disabled={c.id === fromId}
                    >
                      {t('inventory.categoryCount', {
                        name: c.name,
                        n: c.count,
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {sameSelected && (
            <p className="text-xs text-destructive">
              {t('categories.sameError')}
            </p>
          )}

          <Button
            className="self-start"
            disabled={!canMerge || busy}
            onClick={() => setConfirmOpen(true)}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Merge className="h-4 w-4" />
            )}
            {busy ? t('categories.merging') : t('categories.merge')}
          </Button>
        </div>

        {/* Category list — unreviewed nodes flagged as cleanup candidates. */}
        <div className="flex flex-col gap-1.5">
          <Label>{t('categories.listLabel')}</Label>
          {error ? (
            <p className="text-sm text-muted-foreground">
              {t('categories.loadError')}
            </p>
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground">
              {t('common.loading')}
            </p>
          ) : ordered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('categories.empty')}
            </p>
          ) : (
            <ScrollArea className="h-48 rounded-md border">
              <ul className="divide-y">
                {ordered.map((c) => {
                  const unreviewed = c.status === 'unreviewed'
                  const isChild = !!c.parent_id && byId.has(c.parent_id)
                  return (
                    <li
                      key={c.id}
                      className={cn(
                        'flex items-center justify-between gap-2 px-3 py-2 text-sm',
                        isChild && 'pl-6',
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{c.name}</span>
                        {unreviewed && (
                          <Badge
                            variant="outline"
                            className="border-amber-500/40 text-amber-600 dark:text-amber-400"
                          >
                            {t('categories.unreviewed')}
                          </Badge>
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {t('categories.refCount', { n: c.count })}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </ScrollArea>
          )}
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('categories.confirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('categories.confirmBody', {
                  from: from?.name ?? '',
                  into: into?.name ?? '',
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={busy || !canMerge}
                onClick={(e) => {
                  // Keep the confirm open while the mutation runs; it closes on
                  // success/error via the mutation callbacks.
                  e.preventDefault()
                  mutation.mutate()
                }}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('categories.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
