import { useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2, ListTodo, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
import { NewTaskDialog } from '@/components/dashboard/NewTaskDialog'
import { useTasks, useUsers } from '@/hooks/useDashboard'
import { useAuth } from '@/auth/useAuth'
import { useT, formatDateTime } from '@/lib/i18n'
import { updateTask, type Task, type TaskFilters, type TaskStatus } from '@/lib/api'

const STATUS_VALUES: TaskStatus[] = ['open', 'done']

export function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { t, lang } = useT()
  const { user } = useAuth()
  const { data: users = [] } = useUsers()

  const statusParam = searchParams.get('status')
  const status: TaskStatus | undefined =
    statusParam && (STATUS_VALUES as string[]).includes(statusParam)
      ? (statusParam as TaskStatus)
      : undefined
  const mine = searchParams.get('mine') === '1'

  // Resolve assignee user ids → names for the table (admins see the full list).
  const userNames = useMemo(() => {
    const m = new Map<string, string>()
    for (const u of users) m.set(u.id, u.name || u.email)
    return m
  }, [users])

  const filters: TaskFilters = {
    status,
    assigned_to: mine && user ? user.id : undefined,
    lead_id: searchParams.get('lead_id') ?? undefined,
  }

  const { data: tasks, isLoading, error, refetch } = useTasks(filters)

  const setParam = useCallback(
    (key: string, value: string | null) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      })
    },
    [setSearchParams],
  )

  const mutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: TaskStatus }) =>
      updateTask(id, { status: next }),
    onSuccess: () => {
      toast.success(t('tasks.updated'))
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: () => toast.error(t('tasks.updateError')),
  })

  function toggleStatus(task: Task) {
    mutation.mutate({
      id: task.id,
      next: task.status === 'done' ? 'open' : 'done',
    })
  }

  const list = tasks ?? []

  return (
    <PageShell breadcrumbs={[{ label: t('nav.tasks') }]} title={t('nav.tasks')}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={status ?? 'all'}
            onValueChange={(v) => setParam('status', v === 'all' ? null : v)}
          >
            <SelectTrigger className="w-[160px]" aria-label={t('tasks.filterStatus')}>
              <SelectValue placeholder={t('tasks.filterStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('tasks.allStatuses')}</SelectItem>
              <SelectItem value="open">{t('tasks.statusOpen')}</SelectItem>
              <SelectItem value="done">{t('tasks.statusDone')}</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={mine ? 'default' : 'outline'}
            size="sm"
            aria-pressed={mine}
            onClick={() => setParam('mine', mine ? null : '1')}
          >
            {t('tasks.myTasks')}
          </Button>

          <div className="ml-auto">
            <NewTaskDialog />
          </div>
        </div>

        {isLoading && (
          <div className="rounded-lg border p-4 flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center gap-3 py-16">
            <p className="text-sm text-destructive">{t('tasks.loadError')}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t('common.retry')}
            </Button>
          </div>
        )}

        {tasks && !isLoading && !error && (
          <>
            {list.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-sm gap-3">
                <ListTodo className="h-8 w-8 opacity-50" />
                <span>{t('tasks.empty')}</span>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <Table className="min-w-[860px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('tasks.colTitle')}</TableHead>
                        <TableHead>{t('tasks.colLead')}</TableHead>
                        <TableHead>{t('tasks.colAssignee')}</TableHead>
                        <TableHead>{t('tasks.colDue')}</TableHead>
                        <TableHead>{t('tasks.colStatus')}</TableHead>
                        <TableHead className="text-right" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {list.map((task) => {
                        const done = task.status === 'done'
                        return (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium max-w-[320px]">
                              <span className="block truncate" title={task.title}>
                                {task.title}
                              </span>
                              {task.note && (
                                <span className="block truncate text-xs text-muted-foreground">
                                  {task.note}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {task.lead_id ? (
                                <Link
                                  to={`/dashboard/${task.lead_id}`}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                >
                                  {t('tasks.openLead')}
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">
                                  {t('common.none')}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {task.assigned_to
                                ? (userNames.get(task.assigned_to) ??
                                  task.assigned_to)
                                : t('tasks.unassigned')}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                              {task.due_at
                                ? formatDateTime(lang, task.due_at)
                                : t('tasks.noDue')}
                            </TableCell>
                            <TableCell>
                              <Badge variant={done ? 'secondary' : 'default'}>
                                {done
                                  ? t('tasks.statusDone')
                                  : t('tasks.statusOpen')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={mutation.isPending}
                                onClick={() => toggleStatus(task)}
                              >
                                {done ? (
                                  <>
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    {t('tasks.reopen')}
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    {t('tasks.markDone')}
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <span className="text-xs text-muted-foreground">
              {t(list.length === 1 ? 'tasks.countOne' : 'tasks.countOther', {
                n: list.length,
              })}
            </span>
          </>
        )}
      </div>
    </PageShell>
  )
}
