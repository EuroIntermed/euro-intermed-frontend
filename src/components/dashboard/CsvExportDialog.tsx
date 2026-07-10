import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { exportKpiCsv, type ExportType } from '@/lib/api'
import { useT } from '@/lib/i18n'

/** Local YYYY-MM-DD for a date (avoids UTC drift from toISOString). */
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

function startOfMonth(): string {
  const d = new Date()
  return isoDate(new Date(d.getFullYear(), d.getMonth(), 1))
}

/**
 * CSV export control (KPI_PLAN §E.3). A shadcn dialog with a type select + a
 * from/to date range that hits `GET /api/kpis/export` and triggers a browser
 * download of the returned CSV. The blob download happens client-side via an
 * object URL; the fetch (with the staff Bearer token) is centralized in
 * {@link exportKpiCsv}.
 */
export function CsvExportDialog() {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<ExportType>('leads')
  const [from, setFrom] = useState(startOfMonth)
  const [to, setTo] = useState(() => isoDate(new Date()))

  const mutation = useMutation({
    mutationFn: () => exportKpiCsv(type, from, to),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kpi-${type}-${from}_${to}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setOpen(false)
    },
    onError: () => toast.error(t('kpiBoards.csv.error')),
  })

  const busy = mutation.isPending
  const rangeInvalid = !from || !to || from > to

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Download className="h-4 w-4" />
          {t('kpiBoards.csv.export')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('kpiBoards.csv.title')}</DialogTitle>
          <DialogDescription>{t('kpiBoards.csv.description')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="csv-type">{t('kpiBoards.csv.fieldType')}</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as ExportType)}
              disabled={busy}
            >
              <SelectTrigger id="csv-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leads">
                  {t('kpiBoards.csv.typeLeads')}
                </SelectItem>
                <SelectItem value="events">
                  {t('kpiBoards.csv.typeEvents')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="csv-from">{t('kpiBoards.csv.fieldFrom')}</Label>
              <Input
                id="csv-from"
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="csv-to">{t('kpiBoards.csv.fieldTo')}</Label>
              <Input
                id="csv-to"
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                disabled={busy}
              />
            </div>
          </div>
          {rangeInvalid && (
            <p className="text-sm text-destructive">
              {t('kpiBoards.csv.rangeInvalid')}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={busy || rangeInvalid}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? t('kpiBoards.csv.downloading') : t('kpiBoards.csv.download')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
