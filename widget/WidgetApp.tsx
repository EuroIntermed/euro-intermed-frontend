import { useEffect, useRef, useState } from 'react'
import { useChat, type ChatImage } from '@/hooks/useChat'
import { getPrivacyUrl, type ChatIntent, type ChatVertical } from '@/lib/api'
import { detectLang, makeT, type Lang } from '@/lib/i18n'
import { renderMessage, type MarkdownStyles } from '@/lib/chat/markdown'
import { useIsMobile, useWidgetTheme, type ThemePref, type WidgetTheme } from './theme'

// Inline list styles so markdown bullets stay tight inside the message bubble
// (the widget bundle has no Tailwind/global CSS).
const MD_STYLES: MarkdownStyles = {
  ul: { margin: '4px 0', paddingLeft: '20px' },
  ol: { margin: '4px 0', paddingLeft: '20px' },
  li: { margin: '2px 0' },
}

interface Props {
  apiUrl?: string
  vertical?: ChatVertical
  intent?: ChatIntent
  /**
   * UI language. The widget has no LanguageProvider; passed from the embed
   * config (widget-entry) or omitted on the dashboard test surface, where
   * detectLang() falls back to the persisted dashboard choice.
   */
  lang?: Lang
  /** Host theme preference: 'light' | 'dark' | 'auto' (default — follows host). */
  theme?: ThemePref
  onClose: () => void
}

const CONV_KEY = 'angrosist_widget_conv_id'

let pickCounter = 0
function nextPickId(): string {
  pickCounter += 1
  return `pick-${pickCounter}`
}

interface StagedImage {
  id: string
  file: File
  previewUrl: string
}

/** Keyframes the widget needs, injected once (no global stylesheet in the bundle). */
function WidgetKeyframes() {
  return (
    <style>{`
@keyframes ei-w-spin { to { transform: rotate(360deg); } }
@keyframes ei-w-bounce { 0%,80%,100% { transform: translateY(0); opacity: .4; } 40% { transform: translateY(-4px); opacity: 1; } }
`}</style>
  )
}

/** Small rotating spinner shown over a tile while its image uploads. */
function Spinner({ theme }: { theme: WidgetTheme }) {
  return (
    <span
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '18px',
        height: '18px',
        marginTop: '-9px',
        marginLeft: '-9px',
        borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.5)',
        borderTopColor: '#fff',
        animation: 'ei-w-spin 0.7s linear infinite',
        boxShadow: theme.scheme === 'dark' ? '0 0 0 1px rgba(0,0,0,0.2)' : 'none',
      }}
    />
  )
}

/**
 * WhatsApp/Messenger-style grouped image bubble: 1 image renders large; 2+ tile
 * into a 2-column grid, capped at 4 visible with a "+N" overlay on the last.
 */
function ImageGroup({ images, theme }: { images: ChatImage[]; theme: WidgetTheme }) {
  const n = images.length
  const MAX = 4
  const visible = images.slice(0, MAX)
  const extra = n - visible.length
  const single = n === 1
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: single ? '1fr' : '1fr 1fr',
        gap: '3px',
        width: single ? '200px' : '232px',
        maxWidth: '78%',
        borderRadius: '14px',
        overflow: 'hidden',
      }}
    >
      {visible.map((im, idx) => {
        const showMore = idx === MAX - 1 && extra > 0
        return (
          <div
            key={im.id}
            style={{
              position: 'relative',
              background: theme.tileBg,
              aspectRatio: single ? '4 / 3' : '1 / 1',
            }}
          >
            <img
              src={im.previewUrl}
              alt=""
              loading="lazy"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                opacity: im.status === 'uploading' ? 0.55 : 1,
                transition: 'opacity 0.2s ease',
              }}
            />
            {im.status === 'uploading' && <Spinner theme={theme} />}
            {im.status === 'error' && (
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(220,38,38,0.55)',
                  color: '#fff',
                  fontSize: '18px',
                  fontWeight: 700,
                }}
                title="!"
              >
                !
              </span>
            )}
            {showMore && (
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: theme.overlay,
                  color: '#fff',
                  fontSize: '20px',
                  fontWeight: 600,
                }}
              >
                +{extra}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// `widget-entry.tsx` already stashes `config.apiUrl` on
// `window.__ANGROSIST_API_URL__` at module init (before this component renders),
// so getApiBase() resolves correctly on the first send. The effect below keeps
// the global in sync if the prop changes.
export function WidgetApp({ apiUrl, vertical, intent, lang, theme: themePref, onClose }: Props) {
  const t = makeT(detectLang(lang))
  const theme = useWidgetTheme(themePref)
  const isMobile = useIsMobile()
  const privacyUrl = getPrivacyUrl()
  const {
    messages,
    typing,
    extracted: _extracted,
    send,
    sendImages,
    canAttach,
    intent: resolvedIntent,
  } = useChat({
    // Per-flow storage so a buyer and a seller session don't collide on the host.
    convStorageKey: `${CONV_KEY}_${vertical ?? 'angrosist'}_${intent ?? 'buy'}`,
    greeting:
      intent === 'sell'
        ? t('chat.greetingPallet')
        : t('chat.greetingAngrosist'),
    errorMessage: t('chat.networkError'),
    timeoutMessage: t('chat.streamTimeout'),
    resetMessage: t('chat.sessionReset'),
    vertical,
    intent,
  })
  const [input, setInput] = useState('')
  const [staged, setStaged] = useState<StagedImage[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const stagedRef = useRef<StagedImage[]>(staged)
  useEffect(() => {
    stagedRef.current = staged
  }, [staged])

  // The seller (PalletClearance) flow accepts photos; the buyer flow does not.
  const allowPhotos = resolvedIntent === 'sell'

  // Keep the global override in sync with the prop (side effect, out of render).
  useEffect(() => {
    if (apiUrl) {
      ;(window as unknown as Record<string, unknown>).__ANGROSIST_API_URL__ = apiUrl
    }
  }, [apiUrl])

  // Auto-scroll on new messages / typing changes.
  useEffect(() => {
    const id = setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }),
      50,
    )
    return () => clearTimeout(id)
  }, [messages, typing, staged])

  // Revoke any still-staged preview URLs on unmount.
  useEffect(() => {
    return () => {
      stagedRef.current.forEach((s) => URL.revokeObjectURL(s.previewUrl))
    }
  }, [])

  function pickFiles(files: FileList | null) {
    if (!files) return
    const next = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        id: nextPickId(),
        file,
        previewUrl: URL.createObjectURL(file),
      }))
    if (next.length) setStaged((prev) => [...prev, ...next])
  }

  function removeStaged(id: string) {
    setStaged((prev) => {
      const hit = prev.find((s) => s.id === id)
      if (hit) URL.revokeObjectURL(hit.previewUrl)
      return prev.filter((s) => s.id !== id)
    })
  }

  function handleSend() {
    const text = input.trim()
    const hasImages = staged.length > 0
    if (!text && !hasImages) return
    if (text && !typing) {
      send(text)
      setInput('')
    }
    if (hasImages) {
      sendImages(staged.map((s) => s.file))
      staged.forEach((s) => URL.revokeObjectURL(s.previewUrl))
      setStaged([])
    }
  }

  const canSend = (input.trim() !== '' && !typing) || staged.length > 0

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        borderRadius: 0,
        border: 'none',
      }
    : {
        width: '400px',
        height: '640px',
        maxHeight: 'calc(100dvh - 48px)',
        borderRadius: '18px',
        border: `1px solid ${theme.border}`,
      }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: theme.panelBg,
        color: theme.text,
        colorScheme: theme.scheme,
        boxShadow: theme.shadow,
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        fontSize: '14px',
        overflow: 'hidden',
        ...panelStyle,
      }}
    >
      <WidgetKeyframes />

      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          background: theme.headerBg,
          color: theme.headerText,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexShrink: 0,
        }}
      >
        <span
          aria-hidden
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            background: theme.accent,
            color: theme.accentText,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px',
            flexShrink: 0,
          }}
        >
          💬
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 600 }}>{t('chat.widgetTitle')}</span>
          <span style={{ fontSize: '11px', color: theme.headerSub }}>
            {typing ? '…' : 'online'}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label={t('chat.widgetClose')}
          title={t('chat.widgetClose')}
          style={{
            background: 'none',
            border: 'none',
            color: theme.headerSub,
            cursor: 'pointer',
            fontSize: '22px',
            lineHeight: 1,
            padding: '2px 4px',
          }}
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          background: theme.panelBg,
        }}
      >
        {messages.map((m) => {
          const isUser = m.role === 'user'
          const hasImages = !!m.images?.length
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                gap: '4px',
              }}
            >
              {m.content && (
                <div
                  style={{
                    maxWidth: '82%',
                    padding: '9px 12px',
                    borderRadius: isUser
                      ? '16px 16px 4px 16px'
                      : '16px 16px 16px 4px',
                    background: isUser ? theme.userBubbleBg : theme.assistantBubbleBg,
                    color: isUser ? theme.userText : theme.assistantText,
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}
                >
                  {m.role === 'assistant'
                    ? renderMessage(m.content, MD_STYLES)
                    : m.content}
                </div>
              )}
              {hasImages && <ImageGroup images={m.images!} theme={theme} />}
            </div>
          )
        })}
        {typing && (
          <div style={{ display: 'flex', gap: '4px', padding: '6px 4px' }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: theme.muted,
                  animation: 'ei-w-bounce 1s infinite',
                  animationDelay: `${i * 150}ms`,
                }}
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div style={{ borderTop: `1px solid ${theme.border}`, flexShrink: 0, background: theme.panelBg }}>
        {/* Staged-image tray (before send) */}
        {staged.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
              padding: '10px 12px 0',
            }}
          >
            {staged.map((s) => (
              <div
                key={s.id}
                style={{
                  position: 'relative',
                  width: '52px',
                  height: '52px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: `1px solid ${theme.border}`,
                  background: theme.tileBg,
                }}
              >
                <img
                  src={s.previewUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <button
                  type="button"
                  onClick={() => removeStaged(s.id)}
                  aria-label={t('chat.removePhoto')}
                  title={t('chat.removePhoto')}
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '12px',
                    lineHeight: '16px',
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
          {allowPhotos && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                aria-label={t('chat.addPhotos')}
                style={{ display: 'none' }}
                onChange={(e) => {
                  pickFiles(e.target.files)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={!canAttach}
                aria-label={t('chat.addPhotos')}
                title={canAttach ? t('chat.addPhotos') : t('chat.photoHint')}
                style={{
                  flexShrink: 0,
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  border: `1px solid ${theme.inputBorder}`,
                  background: theme.inputBg,
                  color: theme.text,
                  cursor: canAttach ? 'pointer' : 'not-allowed',
                  opacity: canAttach ? 1 : 0.45,
                  fontSize: '17px',
                }}
              >
                📷
              </button>
            </>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={t('chat.widgetInputPlaceholder')}
            style={{
              flex: 1,
              minWidth: 0,
              height: '38px',
              padding: '8px 12px',
              borderRadius: '10px',
              border: `1px solid ${theme.inputBorder}`,
              background: theme.inputBg,
              color: theme.inputText,
              outline: 'none',
              fontSize: '14px',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            aria-label={t('chat.send')}
            style={{
              flexShrink: 0,
              width: '38px',
              height: '38px',
              background: theme.accent,
              color: theme.accentText,
              border: 'none',
              borderRadius: '10px',
              cursor: canSend ? 'pointer' : 'not-allowed',
              opacity: canSend ? 1 : 0.5,
              fontSize: '18px',
              lineHeight: 1,
            }}
          >
            ›
          </button>
        </div>

        {/* GDPR implicit-notice consent line. Non-blocking: sending the first
            message implies agreement (the backend records consent on creation). */}
        <p style={{ margin: 0, padding: '0 12px 10px', fontSize: '11px', lineHeight: 1.4, color: theme.muted }}>
          {t('chat.consentNotice')}{' '}
          <a
            href={privacyUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: theme.muted, textDecoration: 'underline' }}
          >
            {t('chat.consentPrivacyLink')}
          </a>
        </p>
      </div>
    </div>
  )
}
