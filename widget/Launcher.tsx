import { useWidgetTheme, type ThemePref } from './theme'

/**
 * Floating launcher button shown when the widget panel is closed. Themed so it
 * matches the host's light/dark mode (and the embed's `theme` override).
 */
export function Launcher({
  onClick,
  label,
  themePref,
  accent,
  accentText,
}: {
  onClick: () => void
  label: string
  themePref?: ThemePref
  /** Optional per-embed accent hex (host brand); falls back to the default. */
  accent?: string
  /** Foreground on the accent (defaults to the theme's accentText). */
  accentText?: string
}) {
  const theme = useWidgetTheme(themePref, { accent, accentText })
  return (
    <button
      onClick={onClick}
      style={{
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: theme.accent,
        color: theme.accentText,
        border: 'none',
        cursor: 'pointer',
        fontSize: '24px',
        boxShadow: theme.shadow,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      title={label}
      aria-label={label}
    >
      💬
    </button>
  )
}
