import { useTheme } from 'next-themes'
import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import type { TKey } from '@/lib/i18n/types'

const OPTIONS: { value: string; icon: typeof Sun; labelKey: TKey }[] = [
  { value: 'system', icon: Monitor, labelKey: 'nav.themeSystem' },
  { value: 'light', icon: Sun, labelKey: 'nav.themeLight' },
  { value: 'dark', icon: Moon, labelKey: 'nav.themeDark' },
]

/**
 * Theme switch — a compact three-option segmented control: System / Light / Dark.
 * "System" follows the OS preference (the app default). The choice is persisted
 * by next-themes (localStorage) and applied via the `.dark` class on <html>.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const { t } = useT()
  const active = theme ?? 'system'

  return (
    <div
      role="group"
      aria-label={t('nav.theme')}
      className={cn('inline-flex rounded-md border bg-muted p-0.5', className)}
    >
      {OPTIONS.map((o) => {
        const Icon = o.icon
        const on = active === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => setTheme(o.value)}
            aria-pressed={on}
            aria-label={t(o.labelKey)}
            title={t(o.labelKey)}
            className={cn(
              'rounded px-1.5 py-1 transition-colors',
              on
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        )
      })}
    </div>
  )
}
