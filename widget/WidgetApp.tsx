import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useChat, type ChatImage, type ChatDocument } from '@/hooks/useChat'
import { getPrivacyUrl, type ChatIntent, type ChatVertical } from '@/lib/api'
import { detectLang, makeT, type Lang } from '@/lib/i18n'
import { renderMessage, type MarkdownStyles } from '@/lib/chat/markdown'
import { subscribeSeed, type WidgetSeed } from './openBridge'
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
  /** Accepted for API compatibility but ignored — the widget is light-only. */
  theme?: ThemePref
  /** Optional per-embed accent hex (host brand); overrides the default emerald. */
  accent?: string
  /** Foreground on accent surfaces (defaults to white). */
  accentText?: string
  /**
   * True while the panel is MINIMIZED. The widget keeps WidgetApp mounted (so the
   * transcript + SSE stream survive minimize) and merely hides it via CSS; this
   * flag lets the panel restore composer focus when it becomes visible again.
   */
  hidden?: boolean
  /** Minimize the panel (keeps the mounted instance + its state). */
  onClose: () => void
}

const CONV_KEY = 'angrosist_widget_conv_id'

/** Composer starting (single-line) height and the cap before it scrolls. */
const COMPOSER_MIN_HEIGHT = 38
const COMPOSER_MAX_HEIGHT = 120

/**
 * BUYER (Angrosist) product-list document types (contract A1.2(e)). Mirrors the
 * backend allow-list; the file input `accept` uses the same string.
 */
const DOC_ACCEPT = '.xlsx,.xls,.csv,.doc,.docx,.pdf'

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

interface StagedDoc {
  id: string
  file: File
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

/**
 * BUYER product-list bubble: a stacked list of attached document chips (filename
 * + per-file upload status), the document analog of {@link ImageGroup}.
 */
function DocumentGroup({
  documents,
  theme,
}: {
  documents: ChatDocument[]
  theme: WidgetTheme
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '78%' }}>
      {documents.map((d) => (
        <div
          key={d.id}
          title={d.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 10px',
            borderRadius: '14px 14px 4px 14px',
            background: theme.userBubbleBg,
            color: theme.userText,
            fontSize: '13px',
            maxWidth: '260px',
          }}
        >
          <span aria-hidden style={{ fontSize: '16px', flexShrink: 0 }}>
            📄
          </span>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {d.name}
          </span>
          <span
            aria-hidden
            style={{
              flexShrink: 0,
              fontSize: '12px',
              opacity: d.status === 'error' ? 1 : 0.85,
              color: d.status === 'error' ? '#fecaca' : 'inherit',
            }}
          >
            {d.status === 'uploading' ? '…' : d.status === 'done' ? '✓' : '!'}
          </span>
        </div>
      ))}
    </div>
  )
}

// `widget-entry.tsx` already stashes `config.apiUrl` on
// `window.__ANGROSIST_API_URL__` at module init (before this component renders),
// so getApiBase() resolves correctly on the first send. The effect below keeps
// the global in sync if the prop changes.
export function WidgetApp({
  apiUrl,
  vertical,
  intent,
  lang,
  theme: themePref,
  accent,
  accentText,
  hidden = false,
  onClose,
}: Props) {
  // Resolve the UI language ONCE: it drives both the localized copy (`t`) and the
  // `language` we forward to the backend so the agent replies in the same tongue.
  const uiLang = detectLang(lang)
  const t = makeT(uiLang)
  const theme = useWidgetTheme(themePref, { accent, accentText })
  const isMobile = useIsMobile()
  const privacyUrl = getPrivacyUrl()
  const {
    messages,
    typing,
    extracted: _extracted,
    send,
    sendImages,
    sendDocuments,
    canAttach,
    vertical: resolvedVertical,
    intent: resolvedIntent,
    restoredEnded,
    startNew,
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
    photosUploadedMessage: t('chat.photosUploaded'),
    productListUploadedMessage: t('chat.productListUploaded'),
    vertical,
    intent,
    language: uiLang,
  })
  const [input, setInput] = useState('')
  const [staged, setStaged] = useState<StagedImage[]>([])
  const [stagedDocs, setStagedDocs] = useState<StagedDoc[]>([])
  // Whether the user has answered the "continue vs start new" prompt for the
  // currently-stored finished conversation. Local + default false, so the card
  // shows once per open session; a NEW finished conversation flips `restoredEnded`
  // back on but we re-show only if the user hasn't chosen this session.
  const [resumeChosen, setResumeChosen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const stagedRef = useRef<StagedImage[]>(staged)
  useEffect(() => {
    stagedRef.current = staged
  }, [staged])

  // Bridge for the public `AngrosistChat.open({ message, autosend })` method:
  // the vanilla entry pushes a composer seed here. The handler is kept in a ref
  // (updated in an effect, never during render) so we can subscribe exactly once
  // while the ref always sees the latest `send`/`setInput`; on each seed we
  // either prefill the composer (default) or autosend the message as a turn.
  const seedHandlerRef = useRef<(seed: WidgetSeed) => void>(() => {})
  useEffect(() => {
    seedHandlerRef.current = (seed) => {
      if (!seed.message) return
      if (seed.autosend) {
        send(seed.message)
      } else {
        setInput(seed.message)
      }
    }
  }, [send])
  useEffect(() => subscribeSeed((seed) => seedHandlerRef.current(seed)), [])

  // The seller (PalletClearance) flow accepts photos; the buyer flow does not.
  const allowPhotos = resolvedIntent === 'sell'
  // The BUYER (Angrosist) flow accepts a product-list document (Excel/Word/CSV/
  // PDF, contract A1.2(e)); the seller flow does not. Gated to the concrete
  // angrosist/buy flow so the router (euro-intermed/triage) hides it until the
  // agent re-routes the conversation into the buyer flow.
  const allowProductList =
    resolvedVertical === 'angrosist' && resolvedIntent === 'buy'

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
  }, [messages, typing, staged, stagedDocs])

  // Auto-grow the composer textarea to fit its content (wraps + newlines) up to
  // a max, then it scrolls. Keyed on `input` so it also resizes when the value is
  // set programmatically (the openBridge prefill via setInput), not just on typing.
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT)}px`
  }, [input])

  // Revoke any still-staged preview URLs on unmount.
  useEffect(() => {
    return () => {
      stagedRef.current.forEach((s) => URL.revokeObjectURL(s.previewUrl))
    }
  }, [])

  // Restore composer focus when the panel is revealed (un-minimized). The panel
  // stays mounted while hidden, so this fires on each hidden→visible transition.
  useEffect(() => {
    if (hidden) return
    const id = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(id)
  }, [hidden])

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

  function pickDocs(files: FileList | null) {
    if (!files) return
    // Backend is the real gate on type/size; staging accepts what the OS picker
    // returned (the input `accept` already narrows it).
    const next = Array.from(files).map((file) => ({
      id: nextPickId(),
      file,
    }))
    if (next.length) setStagedDocs((prev) => [...prev, ...next])
  }

  function removeStagedDoc(id: string) {
    setStagedDocs((prev) => prev.filter((d) => d.id !== id))
  }

  function handleSend() {
    const text = input.trim()
    const hasImages = staged.length > 0
    const hasDocs = stagedDocs.length > 0
    if (!text && !hasImages && !hasDocs) return
    // Exactly one agent turn per action: if we dispatch the text turn, the
    // photos/documents upload WITHOUT firing their own turn (the text turn + the
    // backend's injected attachment count cover the reply). If there's no text
    // turn, the attachments fire the turn themselves so an attachment-only send
    // never goes silent — photos take precedence, else documents.
    const textSent = text !== '' && !typing
    if (textSent) {
      send(text)
      setInput('')
    }
    if (hasImages) {
      sendImages(staged.map((s) => s.file), { fireTurn: !textSent })
      staged.forEach((s) => URL.revokeObjectURL(s.previewUrl))
      setStaged([])
    }
    if (hasDocs) {
      sendDocuments(stagedDocs.map((d) => d.file), {
        fireTurn: !textSent && !hasImages,
      })
      setStagedDocs([])
    }
  }

  const canSend =
    (input.trim() !== '' && !typing) ||
    staged.length > 0 ||
    stagedDocs.length > 0

  // Show the "continue vs start new" card only when a FINISHED conversation is
  // stored and the user hasn't answered yet this open session.
  const showResumeChoice = restoredEnded && !resumeChosen

  function handleResumeContinue() {
    // Keep the stored conversation; just dismiss the card and show normal chat.
    setResumeChosen(true)
  }

  function handleResumeNew() {
    // Abandon the finished conversation and begin fresh, then dismiss the card.
    startNew()
    setResumeChosen(true)
  }

  // Always-available "new chat" affordance (header button). Unlike the resume
  // card — which only appears for a stored FINISHED conversation — this lets the
  // user abandon ANY conversation (live or ended) and start fresh at any time.
  // Dismiss the resume card too so it doesn't reappear over the fresh greeting.
  function handleNewChat() {
    startNew()
    setResumeChosen(true)
    // Return focus to the composer for the fresh conversation.
    setTimeout(() => inputRef.current?.focus(), 50)
  }

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
            background: 'rgba(255,255,255,0.18)',
            color: theme.headerText,
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
        {/* Always-available "start new conversation" control. */}
        <button
          type="button"
          onClick={handleNewChat}
          aria-label={t('chat.newChat')}
          title={t('chat.newChat')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(255,255,255,0.18)',
            border: 'none',
            borderRadius: '999px',
            color: theme.headerText,
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 600,
            lineHeight: 1,
            padding: '5px 9px',
            flexShrink: 0,
          }}
        >
          <span aria-hidden style={{ fontSize: '13px' }}>
            ↻
          </span>
          {t('chat.newChat')}
        </button>
        <button
          onClick={onClose}
          aria-label={t('chat.widgetMinimize')}
          title={t('chat.widgetMinimize')}
          style={{
            background: 'none',
            border: 'none',
            color: theme.headerSub,
            cursor: 'pointer',
            fontSize: '22px',
            lineHeight: 1,
            padding: '2px 4px',
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* Continue-previous-or-start-new choice card. Shown INSIDE the open panel,
          above the messages, only when a finished conversation is stored and the
          user hasn't chosen yet this session. */}
      {showResumeChoice && (
        <div
          role="group"
          aria-label={t('chat.resumePrompt')}
          style={{
            margin: '12px 12px 0',
            padding: '12px 14px',
            borderRadius: '12px',
            border: `1px solid ${theme.border}`,
            background: theme.assistantBubbleBg,
            color: theme.assistantText,
            flexShrink: 0,
          }}
        >
          <p style={{ margin: '0 0 10px', lineHeight: 1.4 }}>
            {t('chat.resumePrompt')}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleResumeContinue}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '10px',
                border: 'none',
                background: theme.accent,
                color: theme.accentText,
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {t('chat.resumeContinue')}
            </button>
            <button
              type="button"
              onClick={handleResumeNew}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '10px',
                border: `1px solid ${theme.inputBorder}`,
                background: theme.inputBg,
                color: theme.text,
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {t('chat.resumeNew')}
            </button>
          </div>
        </div>
      )}

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
          const hasDocs = !!m.documents?.length
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
              {hasDocs && (
                <DocumentGroup documents={m.documents!} theme={theme} />
              )}
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

        {/* Staged product-list document tray (buyer flow, before send) */}
        {stagedDocs.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
              padding: '10px 12px 0',
            }}
          >
            {stagedDocs.map((d) => (
              <div
                key={d.id}
                title={d.file.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  maxWidth: '190px',
                  padding: '6px 8px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`,
                  background: theme.tileBg,
                  fontSize: '12px',
                }}
              >
                <span aria-hidden style={{ flexShrink: 0 }}>
                  📄
                </span>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: theme.text,
                  }}
                >
                  {d.file.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeStagedDoc(d.id)}
                  aria-label={t('chat.removeProductList')}
                  title={t('chat.removeProductList')}
                  style={{
                    flexShrink: 0,
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(0,0,0,0.55)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '11px',
                    lineHeight: '14px',
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
          {allowProductList && (
            <>
              <input
                ref={docRef}
                type="file"
                accept={DOC_ACCEPT}
                multiple
                aria-label={t('chat.addProductList')}
                style={{ display: 'none' }}
                onChange={(e) => {
                  pickDocs(e.target.files)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => docRef.current?.click()}
                disabled={!canAttach}
                aria-label={t('chat.addProductList')}
                title={canAttach ? t('chat.addProductList') : t('chat.productListHint')}
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
                📎
              </button>
            </>
          )}
          <textarea
            ref={inputRef}
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends; Shift+Enter inserts a newline (default textarea behavior).
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={t('chat.widgetInputPlaceholder')}
            style={{
              flex: 1,
              minWidth: 0,
              height: `${COMPOSER_MIN_HEIGHT}px`,
              maxHeight: `${COMPOSER_MAX_HEIGHT}px`,
              padding: '8px 12px',
              borderRadius: '10px',
              border: `1px solid ${theme.inputBorder}`,
              background: theme.inputBg,
              color: theme.inputText,
              outline: 'none',
              // >=16px on mobile so iOS Safari does NOT auto-zoom the page when the
              // field is focused (that zoom is what made the layout jump/"zoom").
              fontSize: isMobile ? '16px' : '14px',
              fontFamily: 'inherit',
              lineHeight: 1.4,
              resize: 'none',
              overflowY: 'auto',
              boxSizing: 'border-box',
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
