import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

const LANGS: Lang[] = ['ro', 'en']

/**
 * Compact RO/EN language switch — a tiny two-button segmented control. Switching
 * updates the i18n context (persisted to localStorage) with no reload. Used in
 * the login corner and inside the dashboard user menu.
 */
export function LanguageToggle() {
  const { lang, setLang, t } = useT()

  return (
    <div
      role="group"
      aria-label={t('lang.label')}
      className="inline-flex rounded-md border bg-muted p-0.5"
    >
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            'rounded px-2 py-0.5 text-xs font-medium uppercase transition-colors',
            lang === l
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
