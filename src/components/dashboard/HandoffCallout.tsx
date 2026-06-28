import { AlertTriangle } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useT } from '@/lib/i18n'

/**
 * Prominent callout shown on a lead that was handed off to a human
 * (needs_human). Explains, in plain language, that the bot is muted until a
 * consultant replies — so the admin knows this lead needs manual attention.
 */
export function HandoffCallout() {
  const { t } = useT()
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t('detail.handoffTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{t('detail.handoffDesc')}</p>
      </CardContent>
    </Card>
  )
}
