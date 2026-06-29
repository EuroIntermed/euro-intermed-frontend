import {
  Activity,
  CheckCircle2,
  CircleDot,
  FileText,
  Pencil,
  Send,
  Sparkles,
  TriangleAlert,
  UserPlus,
  type LucideProps,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionCard } from '@/components/dashboard/SectionCard'
import { Timeline, type TimelineItem } from '@/components/dashboard/Timeline'
import type { Tone } from '@/components/dashboard/StatePill'
import { useLeadActivity } from '@/hooks/useDashboard'
import { useT, formatDateTime } from '@/lib/i18n'

/**
 * Visual treatment per audit action. Substring matching keeps it resilient to
 * the exact backend action codes (e.g. `lead.created`, `offer.sent`). Unknown
 * actions fall back to a neutral dot.
 */
const ACTION_STYLE: {
  match: string
  tone: Tone
  icon: ComponentType<LucideProps>
}[] = [
  { match: 'verif', tone: 'success', icon: CheckCircle2 },
  { match: 'handoff', tone: 'danger', icon: TriangleAlert },
  { match: 'human', tone: 'danger', icon: TriangleAlert },
  { match: 'assign', tone: 'info', icon: UserPlus },
  { match: 'offer', tone: 'warning', icon: Send },
  { match: 'won', tone: 'success', icon: CheckCircle2 },
  { match: 'qualif', tone: 'info', icon: Sparkles },
  { match: 'creat', tone: 'brand', icon: FileText },
  { match: 'status', tone: 'info', icon: CircleDot },
  { match: 'follow', tone: 'info', icon: Pencil },
]

function styleFor(action: string): { tone: Tone; icon: ComponentType<LucideProps> } {
  const a = action.toLowerCase()
  const hit = ACTION_STYLE.find((s) => a.includes(s.match))
  return hit ?? { tone: 'neutral', icon: CircleDot }
}

/**
 * Lead audit-log timeline (GET /api/leads/{id}/activity): each meaningful action
 * on the lead — created, verified, assigned, offer/status changes, handoff — with
 * its actor and timestamp, newest first. Read-only.
 */
export function LeadActivity({ leadId }: { leadId: string }) {
  const { t, lang } = useT()
  const { data, isLoading, error } = useLeadActivity(leadId)

  const items: TimelineItem[] = (data ?? []).map((e) => {
    const { tone, icon } = styleFor(e.action)
    return {
      title: <span className="font-mono text-xs">{e.action}</span>,
      meta: `${e.actor_type} · ${formatDateTime(lang, e.at)}`,
      tone,
      icon,
    }
  })

  return (
    <SectionCard
      icon={Activity}
      title={t('detail.activity')}
      description={t('detail.activityDesc')}
    >
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
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('detail.activityEmpty')}
        </p>
      ) : (
        <Timeline items={items} />
      )}
    </SectionCard>
  )
}
