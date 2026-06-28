import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { useAuth } from '@/auth/useAuth'
import { createUser, listUsers, type UserCreate } from '@/lib/api'
import { useT } from '@/lib/i18n'
import type { TKey } from '@/lib/i18n/types'

// P1 dashboard roles offered when creating a user (P2 portal roles are excluded).
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

interface FormValues {
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

  const form = useForm<FormValues>({
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

  function onSubmit(values: FormValues) {
    mutation.mutate({
      name: values.name.trim(),
      email: values.email.trim(),
      role: values.role,
      password: values.password,
    })
  }

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
            onSubmit={form.handleSubmit(onSubmit)}
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

/**
 * Admin → Users: list staff/admin accounts and create new ones. Admin-only — the
 * backend gates GET/POST /api/users on the admin role; the UI mirrors that and
 * shows a not-authorized notice to non-admins (the server is the real gate).
 */
export function UsersPage() {
  const { t } = useT()
  const { isAdmin } = useAuth()

  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
    enabled: isAdmin,
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
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('users.colName')}</TableHead>
                <TableHead>{t('users.colEmail')}</TableHead>
                <TableHead>{t('users.colRole')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.name || t('common.none')}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t(roleLabelKey(u.role))}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(data ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-sm text-muted-foreground"
                  >
                    {t('users.empty')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </PageShell>
  )
}
