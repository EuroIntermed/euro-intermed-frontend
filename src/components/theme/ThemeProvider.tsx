import { ThemeProvider as NextThemeProvider } from 'next-themes'

/**
 * App-wide theme provider. Toggles the `.dark` class on <html> (see the .dark
 * token set in index.css). Defaults to the OS preference; the user's manual
 * choice is persisted by next-themes (localStorage) and survives reloads.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemeProvider>
  )
}
