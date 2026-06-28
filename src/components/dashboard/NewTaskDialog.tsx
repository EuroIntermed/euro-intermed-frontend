import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { createTask, type TaskCreate } from '@/lib/api'
import { useT } from '@/lib/i18n'

interface FormValues {
  title: string
  note: string
  due_at: string
  lead_id: string
}

/**
 * "New task" dialog: react-hook-form + zod against shadcn form/dialog. Client
 * validation is UX only; the Go backend is the real gate. On success the dialog
 * closes, the form resets, and the ['tasks'] query is invalidated so the table
 * reflects the new row.
 */
export function NewTaskDialog() {
  const { t } = useT()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const schema = useMemo(
    () =>
      z.object({
        title: z.string().trim().min(1, t('tasks.titleRequired')).max(200),
        note: z.string().max(2000),
        due_at: z.string(),
        lead_id: z.string(),
      }),
    [t],
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', note: '', due_at: '', lead_id: '' },
  })

  const mutation = useMutation({
    mutationFn: (body: TaskCreate) => createTask(body),
    onSuccess: () => {
      toast.success(t('tasks.created'))
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      form.reset()
      setOpen(false)
    },
    onError: () => toast.error(t('tasks.createError')),
  })

  function onSubmit(values: FormValues) {
    const body: TaskCreate = { title: values.title.trim() }
    if (values.note.trim()) body.note = values.note.trim()
    if (values.lead_id.trim()) body.lead_id = values.lead_id.trim()
    // datetime-local yields "YYYY-MM-DDTHH:mm" (local); normalize to RFC3339.
    if (values.due_at) body.due_at = new Date(values.due_at).toISOString()
    mutation.mutate(body)
  }

  const busy = mutation.isPending

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          {t('tasks.new')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('tasks.newTitle')}</DialogTitle>
          <DialogDescription>{t('tasks.newDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('tasks.fieldTitle')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('tasks.fieldTitlePlaceholder')}
                      disabled={busy}
                      maxLength={200}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('tasks.fieldNote')}</FormLabel>
                  <FormControl>
                    <Textarea rows={3} maxLength={2000} disabled={busy} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="due_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('tasks.fieldDue')}</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" disabled={busy} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lead_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('tasks.fieldLead')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('tasks.fieldLeadPlaceholder')}
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
                {busy ? t('tasks.creating') : t('tasks.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
