import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'

const API_URL = import.meta.env.VITE_API_URL ?? window.location.origin
const WIDGET_URL = `${window.location.origin}/widget.js`

const embedCode = `<!-- Angrosist Chat Widget -->
<script src="${WIDGET_URL}"></script>
<script>
  AngrosistChat.init({ apiUrl: '${API_URL}' });
</script>`

// PalletClearance seller variant — vertical/intent default to angrosist/buy when
// omitted, so the default snippet keeps existing embeds working.
const sellerEmbedCode = `<!-- PalletClearance — flux vânzător (cu fotografii) -->
<script src="${WIDGET_URL}"></script>
<script>
  AngrosistChat.init({
    apiUrl: '${API_URL}',
    vertical: 'palletclearance',
    intent: 'sell'
  });
</script>`

type Variant = 'default' | 'seller'

/**
 * Inline embed-snippet panel: a segmented control to pick the vertical variant,
 * the copy-to-clipboard code block, and a short note. Lives directly on the
 * widget page (no dialog). The API/widget URLs come from VITE_API_URL / the
 * current origin — never hardcoded.
 */
export function EmbedCode() {
  const { t } = useT()
  const [variant, setVariant] = useState<Variant>('default')
  const [copied, setCopied] = useState(false)

  const code = variant === 'seller' ? sellerEmbedCode : embedCode

  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const segments: { key: Variant; label: string }[] = [
    { key: 'default', label: t('embed.segAngrosist') },
    { key: 'seller', label: t('embed.segSeller') },
  ]

  return (
    <div>
      {/* Segmented control: pick which embed to show */}
      <div
        role="tablist"
        aria-label={t('embed.title')}
        className="inline-flex w-full rounded-lg border bg-muted p-0.5"
      >
        {segments.map((s) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={variant === s.key}
            onClick={() => {
              setVariant(s.key)
              setCopied(false)
            }}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              variant === s.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="relative mt-3">
        <pre className="whitespace-pre-wrap break-all rounded-lg border bg-muted p-4 pr-10 font-mono text-xs leading-relaxed">
          {code}
        </pre>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-7 w-7"
          onClick={copy}
          aria-label={copied ? t('embed.copied') : t('embed.copy')}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-success" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {variant === 'seller' ? (
          <>
            <code>vertical</code> &amp; <code>intent</code>{' '}
            {t('embed.optionalNote')}
          </>
        ) : (
          t('embed.floatNote')
        )}
      </p>
    </div>
  )
}
