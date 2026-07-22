import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useT } from '@/lib/i18n'
import type { WorklistStatus } from '@/lib/api'

/**
 * The pending / handled / all status filter shared by the group-invite and
 * newsletter worklist pages. A keyboard-operable shadcn Tabs control with an
 * accessible group label; the value is owned by the page (kept in the URL) so
 * the filter is shareable and survives back/forward.
 */
export function WorklistFilter({
  value,
  onChange,
}: {
  value: WorklistStatus
  onChange: (status: WorklistStatus) => void
}) {
  const { t } = useT()
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as WorklistStatus)}>
      <TabsList aria-label={t('overview.filterAria')}>
        <TabsTrigger value="pending">{t('overview.filterPending')}</TabsTrigger>
        <TabsTrigger value="handled">{t('overview.filterHandled')}</TabsTrigger>
        <TabsTrigger value="all">{t('overview.filterAll')}</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
