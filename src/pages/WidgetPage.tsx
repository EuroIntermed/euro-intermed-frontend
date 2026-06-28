import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmbedCode } from '@/components/dashboard/EmbedCode'
import { PageShell } from '@/components/layout/PageShell'
import { useT } from '@/lib/i18n'
import { WidgetApp } from '../../widget/WidgetApp'

/**
 * Widget hub — everything related to the embeddable chat widget in one place:
 * grab the production embed snippet (per vertical) and exercise the real
 * `WidgetApp` against the configured API (resolved via getApiBase() /
 * VITE_API_URL — no hardcoded URL). The floating button + panel mirror
 * `widget/widget-entry.tsx` so what the operator sees matches a third-party embed.
 */
export function WidgetPage() {
  const { t } = useT()
  const [open, setOpen] = useState(false)

  return (
    <PageShell
      breadcrumbs={[{ label: t('nav.widget') }]}
      title={t('nav.widget')}
    >
      <div className="flex flex-col gap-6">
        {/* Embed snippet */}
        <Card>
          <CardHeader>
            <CardTitle>{t('widget.embedHeading')}</CardTitle>
            <CardDescription>{t('widget.intro')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {t('widget.embedNote')}
            </p>
            <EmbedCode />
          </CardContent>
        </Card>

        {/* Live test */}
        <Card>
          <CardHeader>
            <CardTitle>{t('widget.testHeading')}</CardTitle>
            <CardDescription>{t('widget.testNote')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setOpen(true)} disabled={open}>
              <MessageCircle className="mr-1.5 h-4 w-4" />
              {t('widget.open')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Floating chat — mirrors the embedded widget's button/panel pattern.
          When closed we show the 💬 launcher; when open we mount the real
          WidgetApp, which talks to the API via getApiBase(). */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {open ? (
          <WidgetApp onClose={() => setOpen(false)} />
        ) : (
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
            onClick={() => setOpen(true)}
            aria-label={t('widget.open')}
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        )}
      </div>
    </PageShell>
  )
}
