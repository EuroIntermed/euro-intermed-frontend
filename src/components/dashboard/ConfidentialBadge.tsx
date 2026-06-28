import { Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useT } from '@/lib/i18n'

/**
 * "Confidential" badge with an explanatory tooltip. A confidential listing means
 * the seller asked for company anonymity in buyer-facing views — admins still see
 * the full company name; the badge just makes the flag (and its meaning) explicit.
 */
export function ConfidentialBadge() {
  const { t } = useT()
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="cursor-help gap-1 whitespace-nowrap">
            <Lock className="h-3 w-3" />
            {t('inventory.confidential')}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-[220px]">
          {t('inventory.confidentialTooltip')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
