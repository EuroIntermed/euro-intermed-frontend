import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, MoreHorizontal, Plus, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { useAuth } from '@/auth/useAuth'
import {
  createUser,
  listUsers,
  updateUser,
  requestErasure,
  type PublicUser,
  type UserCreate,
} from '@/lib/api'
import { useT } from '@/lib/i18n'
import type { TKey } from '@/lib/i18n/types'

// P1 dashboard roles assignable from the admin screen (P2 portal roles excluded).
type CreateRole = 'staff' | 'admin' | 'admin_global'

const ROLE_OPTIONS: { value: CreateRole; labelKey: TKey }[] = [
  { value: 'staff', labelKey: 'users.roleStaff' },
  { value: 'admin', labelKey: 'users.roleAdmin' },
  { value: 'admin_global', labelKey: 'users.roleAdminGlobal' },
]

function roleLabelKey(role: string): TKey {
  const hit = ROLE_OPTIONS.find((r) => r.value === role)
  return hit ? hit.labelKey : 'users.roleStaff'
}

// ---- create ---------------------------------------------------------------

interface CreateForm {
  name: string
  email: string
  role: CreateRole
  password: string
}

function NewUserDialog() {
  const { t } = useT()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, t('users.nameRequired')).max(200),
        email: z.string().trim().email(t('users.emailInvalid')),
        role: z.enum(['staff', 'admin', 'admin_global']),
        password: z.string().min(8, t('users.passwordMin')).max(200),
      }),
    [t],
  )

  const form = useForm<CreateForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', role: 'staff', password: '' },
  })

  const mutation = useMutation({
    mutationFn: (body: UserCreate) => createUser(body),
    onSuccess: () => {
      toast.success(t('users.created'))
      queryClient.invalidateQueries({ queryKey: ['users'] })
      form.reset()
      setOpen(false)
    },
    onError: () => toast.error(t('users.createError')),
  })

  const busy = mutation.isPending

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          {t('users.new')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('users.newTitle')}</DialogTitle>
          <DialogDescription>{t('users.newDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) =>
              mutation.mutate({
                name: v.name.trim(),
                email: v.email.trim(),
                role: v.role,
                password: v.password,
              }),
            )}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('users.fieldName')}</FormLabel>
                  <FormControl>
                    <Input disabled={busy} maxLength={200} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('users.fieldEmail')}</FormLabel>
                  <FormControl>
                    <Input type="email" disabled={busy} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('users.fieldRole')}</FormLabel>
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
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {t(r.labelKey)}
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
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('users.fieldPassword')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
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
                {busy ? t('users.creating') : t('users.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ---- edit (role) ----------------------------------------------------------

function EditUserDialog({
  user,
  onClose,
}: {
  user: PublicUser | null
  onClose: () => void
}) {
  const { t } = useT()
  const queryClient = useQueryClient()
  // Seeded from the user prop; the parent remounts this dialog via `key` when a
  // different user is selected, so the initializer re-runs with the new role.
  const [role, setRole] = useState<CreateRole>(
    () => (user?.role as CreateRole) ?? 'staff',
  )

  const mutation = useMutation({
    mutationFn: (next: CreateRole) =>
      updateUser(user!.id, { role: next }),
    onSuccess: () => {
      toast.success(t('users.updated'))
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
    onError: () => toast.error(t('users.updateError')),
  })

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('users.editTitle')}</DialogTitle>
          <DialogDescription>
            {user?.email} · {t('users.editDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">{t('users.fieldRole')}</label>
          <Select
            value={role}
            onValueChange={(v) => setRole(v as CreateRole)}
            disabled={mutation.isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {t(r.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => mutation.mutate(role)}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- GDPR erasure ---------------------------------------------------------

function GdprErasureCard() {
  const { t } = useT()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const mutation = useMutation({
    mutationFn: () => requestErasure({ email: email.trim() }),
    onSuccess: (report) => {
      toast.success(
        t('gdpr.reportSummary', {
          leads: report.leads_deleted,
          messages: report.messages_deleted,
          docs: report.documents_deleted,
          audit: report.audit_rows_redacted,
        }),
      )
      // The erased subject's leads/companies may now be gone — refresh views.
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      setConfirmOpen(false)
      setEmail('')
    },
    onError: () => toast.error(t('gdpr.error')),
  })

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          {t('gdpr.title')}
        </CardTitle>
        <CardDescription>{t('gdpr.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">
              {t('gdpr.email')}
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nume@exemplu.ro"
            />
          </div>
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={!email.trim() || mutation.isPending}
              >
                {t('gdpr.run')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('gdpr.confirmTitle')}</DialogTitle>
                <DialogDescription>
                  {t('gdpr.confirmBody', { email: email.trim() })}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setConfirmOpen(false)}
                  disabled={mutation.isPending}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {t('gdpr.confirm')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}

// ---- page -----------------------------------------------------------------

export function UsersPage() {
  const { t } = useT()
  const { isAdmin, user: me } = useAuth()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<PublicUser | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
    enabled: isAdmin,
  })

  const toggleActive = useMutation({
    mutationFn: (u: PublicUser) => updateUser(u.id, { active: !u.active }),
    onSuccess: () => {
      toast.success(t('users.updated'))
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toast.error(t('users.updateError')),
  })

  return (
    <PageShell
      breadcrumbs={[{ label: t('nav.users') }]}
      title={t('users.title')}
      description={t('users.subtitle')}
      actions={isAdmin ? <NewUserDialog /> : undefined}
    >
      {!isAdmin ? (
        <p className="text-sm text-muted-foreground">{t('users.notAdmin')}</p>
      ) : isLoading ? (
        <Skeleton className="h-48 w-full rounded-lg" />
      ) : error ? (
        <p className="text-sm text-destructive">{t('users.loadError')}</p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('users.colName')}</TableHead>
                  <TableHead>{t('users.colEmail')}</TableHead>
                  <TableHead>{t('users.colRole')}</TableHead>
                  <TableHead>{t('users.colActive')}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((u) => {
                  const isSelf = u.id === me?.id
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.name || t('common.none')}
                        {isSelf && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            ({t('users.you')})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {t(roleLabelKey(u.role))}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.active ? 'default' : 'outline'}>
                          {u.active ? t('users.active') : t('users.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={isSelf}
                              aria-label={t('users.actions')}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditing(u)}>
                              {t('users.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toggleActive.mutate(u)}
                            >
                              {u.active
                                ? t('users.deactivate')
                                : t('users.activate')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {(data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-sm text-muted-foreground"
                    >
                      {t('users.empty')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <GdprErasureCard />
        </div>
      )}

      <EditUserDialog
        key={editing?.id ?? 'none'}
        user={editing}
        onClose={() => setEditing(null)}
      />
    </PageShell>
  )
}
