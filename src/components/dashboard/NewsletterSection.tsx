import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Copy, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  useNewsletterOptIns,
  useMarkNewsletterExported,
} from '@/hooks/useDashboard'
import { useEnums, useT, formatDateTime } from '@/lib/i18n'
import type { NewsletterOptIn, WorklistStatus } from '@/lib/api'

/**
 * One buyer who opted into the email newsletter and still needs to be exported
 * to the mailing tool. Shows who they are, their vertical, and — prominently —
 * the email address (the export destination the admin copies out), plus a copy
 * affordance, the opt-in date, a lead deep-link, and a primary "Exported"
 * action that marks them done (the row then drops off the pending worklist via
 * query invalidation). Newsletter opt-ins carry no interests, so unlike the
 * group-invite row there are no preference badges — email + company + vertical
 * are the key facts.
 */
function NewsletterRow({ req }: { req: NewsletterOptIn }) {
  const { t, lang } = useT()
  const { verticalLabel } = useEnums()
  const mark = useMarkNewsletterExported()
  const [copied, setCopied] = useState(false)

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(req.email)
      setCopied(true)
      toast.success(t('common.copied'))
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error(t('common.error'))
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{req.contact_name}</span>
            <span className="text-sm text-muted-foreground">
              {req.company_name}
            </span>
            {req.vertical && (
              <Badge variant="secondary">{verticalLabel(req.vertical)}</Badge>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Mail className="size-4 shrink-0 text-brand" />
            <a
              href={`mailto:${req.email}`}
              className="select-all break-all font-medium text-brand hover:underline"
            >
              {req.email}
            </a>
            <Button
              variant="ghost"
              size="icon"
              onClick={copyEmail}
              aria-label={t('common.copy')}
              className="size-7 shrink-0"
            >
              {copied ? (
                <Check className="size-3.5 text-success" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </Button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{formatDateTime(lang, req.asked_at)}</span>
            {req.lead_id && (
              <Link
                to={`/dashboard/${req.lead_id}`}
                className="inline-flex items-center gap-1 text-brand hover:underline"
              >
                {t('overview.newsletterViewLead')}
                <ArrowRight className="size-3" />
              </Link>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          {req.status === 'pending' ? (
            <Button
              size="sm"
              onClick={() => mark.mutate(req.contact_id)}
              disabled={mark.isPending}
              aria-label={t('overview.newsletterExportedLabel')}
            >
              <Check className="size-4" />
              {t('overview.newsletterExported')}
            </Button>
          ) : (
            <>
              <Badge variant="outline" className="gap-1">
                <Check className="size-3" />
                {t('overview.statusExported')}
              </Badge>
              {req.exported_at && (
                <span className="text-xs text-muted-foreground">
                  {t('overview.handledOn', {
                    date: formatDateTime(lang, req.exported_at),
                  })}
                </span>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Overview worklist of buyers who opted (via the agent) into the email
 * newsletter and still need to be exported into the mailing tool. Renders one
 * card per person with the email surfaced for easy copy/select, so an admin can
 * move it into the mailing tool and mark it exported. Loading shows skeletons; a
 * real error (or 403 → empty list) hides gracefully. The block carries a subtle
 * brand highlight and a pending count so it stands out on the overview.
 */
export function NewsletterSection() {
  const { t } = useT()
  const [status, setStatus] = useState<WorklistStatus>('pending')
  const query = useNewsletterOptIns(status)

  // First load (no cached slice yet): skeletons. On a filter switch the previous
  // slice stays visible via `placeholderData`, so the control never flashes out.
  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-[96px] w-full rounded-xl" />
        ))}
      </div>
    )
  }

  // A genuine failure shouldn't take down the overview.
  if (query.isError) return null

  const requests = query.data ?? []

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border p-3',
        'border-brand/40 bg-brand-soft/30',
      )}
    >
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="flex size-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Mail className="size-4" />
        </span>
        <Badge variant="secondary" className="tabular-nums">
          {status === 'pending'
            ? t('overview.newsletterCount', { n: requests.length })
            : t('overview.worklistCount', { n: requests.length })}
        </Badge>
        <Tabs
          value={status}
          onValueChange={(v) => setStatus(v as WorklistStatus)}
          className="ml-auto"
        >
          <TabsList aria-label={t('overview.filterAria')}>
            <TabsTrigger value="pending">
              {t('overview.filterPending')}
            </TabsTrigger>
            <TabsTrigger value="handled">
              {t('overview.filterHandled')}
            </TabsTrigger>
            <TabsTrigger value="all">{t('overview.filterAll')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            {status === 'pending'
              ? t('overview.newsletterEmpty')
              : t('overview.worklistEmpty')}
          </CardContent>
        </Card>
      ) : (
        requests.map((req) => (
          <NewsletterRow key={req.contact_id} req={req} />
        ))
      )}
    </div>
  )
}
