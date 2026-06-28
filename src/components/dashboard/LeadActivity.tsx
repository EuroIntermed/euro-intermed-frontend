import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useLeadActivity } from '@/hooks/useDashboard'
import { useT, formatDateTime } from '@/lib/i18n'

/**
 * Lead audit-log timeline (GET /api/leads/{id}/activity): each meaningful action
 * on the lead — created, verified, assigned, offer/status changes, handoff — with
 * its actor and timestamp, newest first. Read-only.
 */
export function LeadActivity({ leadId }: { leadId: string }) {
  const { t, lang } = useT()
  const { data, isLoading, error } = useLeadActivity(leadId)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {t('detail.activity')}
        </CardTitle>
        <CardDescription>{t('detail.activityDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground">
            {t('detail.activityError')}
          </p>
        ) : (data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('detail.activityEmpty')}
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {(data ?? []).map((e, i) => (
              <li key={`${e.at}-${i}`} className="flex flex-col gap-0.5">
                <span className="font-mono text-xs font-medium">{e.action}</span>
                <span className="text-xs text-muted-foreground">
                  {e.actor_type}
                  {' · '}
                  {formatDateTime(lang, e.at)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
