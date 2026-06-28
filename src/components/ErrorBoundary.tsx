import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { detectLang, makeT } from '@/lib/i18n'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * App-level error boundary. Catches render-time errors anywhere in the tree and
 * shows a friendly fallback instead of a blank white screen. Network/data errors
 * from TanStack Query are handled at the query/page level; this is the last
 * line of defense for unexpected render failures.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // TODO(M5): forward to Sentry once observability is wired.
    console.error('Unhandled UI error:', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // This boundary is the outermost wrapper (above <LanguageProvider>), so the
      // i18n context isn't available here — resolve the language directly.
      const t = makeT(detectLang())
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-lg font-semibold">{t('errors.boundaryTitle')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('errors.boundaryBody')}
          </p>
          <Button onClick={this.handleReload}>{t('errors.reload')}</Button>
        </div>
      )
    }
    return this.props.children
  }
}
