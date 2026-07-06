import { useCallback, useEffect, useRef, useState } from 'react'
import {
  sendMessage,
  subscribeToConversation,
  uploadConversationPhoto,
  type ChatIntent,
  type ChatVertical,
  type ExtractedFields,
  type StreamMessage,
} from '@/lib/api'

/** Per-image upload state inside an outgoing image message. */
export type ChatImageStatus = 'uploading' | 'done' | 'error'

export interface ChatImage {
  id: string
  /** Object URL for the local preview (revoked on unmount). */
  previewUrl: string
  status: ChatImageStatus
}

export interface ChatMessage {
  /** Stable id for keying + targeted updates (e.g. per-image upload status). */
  id: string
  role: 'user' | 'assistant'
  content: string
  /** Present on user image messages — a group of attached photos. */
  images?: ChatImage[]
}

let idCounter = 0
function nextId(prefix: string): string {
  idCounter += 1
  return `${prefix}-${idCounter}-${Date.now()}`
}

interface UseChatOptions {
  /** sessionStorage key used to persist the conversation id across reloads. */
  convStorageKey: string
  /** The first assistant greeting bubble. */
  greeting: string
  /** Localized error shown when the POST fails or the SSE stream errors. */
  errorMessage?: string
  /**
   * Localized soft notice shown when the agent reply has not arrived over SSE
   * within {@link STREAM_TIMEOUT_MS}. Falls back to `errorMessage` when omitted.
   */
  timeoutMessage?: string
  /**
   * Localized notice shown when a RESTORED conversation turns out to be gone
   * server-side (deleted/erased) and we reset to a fresh one — prompts the user
   * to resend. Falls back to `errorMessage` when omitted.
   */
  resetMessage?: string
  /** Flow vertical — sent on the first message only. Defaults to angrosist. */
  vertical?: ChatVertical
  /** Flow intent — sent on the first message only. Defaults to buy. */
  intent?: ChatIntent
}

interface UseChatResult {
  messages: ChatMessage[]
  /** True while we're waiting on the agent (drives the typing indicator). */
  typing: boolean
  /** Latest extracted fields (from the most recent agent reply). */
  extracted: ExtractedFields
  send: (text: string) => void
  /**
   * Attach a group of images as a single user message and upload each to the
   * conversation. No-op until a conversation exists (see {@link canAttach}).
   */
  sendImages: (files: File[]) => void
  /** True once a conversation id exists, so photos can be uploaded/attached. */
  canAttach: boolean
  /** The active conversation id once the first message has been sent (else null). */
  conversationId: string | null
  /**
   * Per-conversation ownership token from the latest chat ack (null before the
   * first ack). The seller-photo control echoes it back on upload.
   */
  conversationToken: string | null
  /** Resolved vertical the UI can branch on (defaults to angrosist). */
  vertical: ChatVertical
  /** Resolved intent the UI can branch on (defaults to buy). */
  intent: ChatIntent
  /**
   * True only when a conversation id is stored AND that conversation is FINISHED
   * (lead submitted / bot muted). Tells the UI to offer a "continue vs start new"
   * choice on open instead of silently resuming. Cleared once the conversation is
   * live again or after {@link startNew}.
   */
  restoredEnded: boolean
  /**
   * Abandon the stored (finished) conversation and start fresh: clears the id +
   * token + finished flag, tears down the stream, and resets the message list to
   * the greeting. After this `restoredEnded` is false and the next send opens a
   * brand-new conversation.
   */
  startNew: () => void
}

/**
 * Shared chat engine for the standalone page and the embeddable widget.
 *
 * SSE is the SINGLE source of truth for assistant output. `POST /api/chat` is
 * asynchronous: it returns a `202` ack ({conversation_id, conversation_token,
 * status}) with NO reply. The reply + typing arrive only over the SSE stream
 * (`GET /api/stream`); the backend replays a reply published just before we
 * subscribe, so the first-turn reply is never lost as long as we open the
 * stream promptly after the ack.
 *
 * Flow per send:
 *  1. Optimistically append the user bubble and turn on the typing indicator.
 *  2. POST → receive {conversation_id, conversation_token}; persist both to
 *     sessionStorage (id + `${key}_token`).
 *  3. Ensure the SSE stream is open for this conversation (open it right after
 *     the ack, with `?token=`, if not already open).
 *  4. Render the reply ONLY from the SSE `message` event; `typing` is driven by
 *     SSE `typing`. Exactly one reply is rendered per turn (guarded by a
 *     per-turn id so a replayed buffer event can't double-render).
 *
 * Edge cases:
 *  - POST failure (4xx/5xx/network): show the localized error, clear typing.
 *  - SSE `error`: show the localized error, clear typing.
 *  - SSE silent stall: after {@link STREAM_TIMEOUT_MS} we clear typing and show
 *    a soft "still working / try again" notice (the stream stays open, so a late
 *    reply still renders if it eventually arrives).
 */
const STREAM_TIMEOUT_MS = 30_000

export function useChat({
  convStorageKey,
  greeting,
  errorMessage = 'A apărut o eroare. Vă rugăm încercați din nou.',
  timeoutMessage,
  resetMessage,
  vertical = 'angrosist',
  intent = 'buy',
}: UseChatOptions): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: nextId('a'), role: 'assistant', content: greeting },
  ])
  const [typing, setTyping] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedFields>({})
  // Live flow, seeded from the embed config but UPDATED from each agent reply so
  // a mid-conversation re-route (buyer→seller) flips the UI (e.g. reveals the
  // seller photo upload). The backend streams the conversation's current
  // vertical/intent on every message event.
  const [liveVertical, setLiveVertical] = useState<ChatVertical>(vertical)
  const [liveIntent, setLiveIntent] = useState<ChatIntent>(intent)
  // Mirrors convIdRef into render state so the upload control can target it.
  const [conversationId, setConversationId] = useState<string | null>(
    () => sessionStorage.getItem(convStorageKey),
  )
  // The per-conversation ownership token, mirrored to state so the seller-photo
  // control can read it. Persisted alongside the id so a reload that resumes the
  // conversation can still authorize continuing turns / SSE before the next reply.
  const tokenStorageKey = `${convStorageKey}_token`
  const [conversationToken, setConversationToken] = useState<string | null>(
    () => sessionStorage.getItem(tokenStorageKey),
  )
  // Persists whether the RESTORED conversation was FINISHED (lead submitted /
  // bot muted). Set from an assistant message with `ended === true`, cleared when
  // a non-ended message arrives (the conversation is live again). On init we only
  // treat it as ended if there IS a stored conversation to resume.
  const endedStorageKey = `${convStorageKey}_ended`
  const [restoredEnded, setRestoredEnded] = useState<boolean>(
    () =>
      sessionStorage.getItem(convStorageKey) != null &&
      sessionStorage.getItem(endedStorageKey) === '1',
  )

  const convIdRef = useRef<string | null>(sessionStorage.getItem(convStorageKey))
  const tokenRef = useRef<string | null>(sessionStorage.getItem(tokenStorageKey))
  const unsubscribeRef = useRef<(() => void) | null>(null)
  // True while the conversation was RESTORED from storage and has not yet proven
  // alive (no reply received). If the very next turn's stream fails, the stored
  // conversation was almost certainly deleted server-side (e.g. a GDPR erasure or
  // data reset) — so we drop it and let the next message start fresh instead of
  // looping on a dead conversation. Cleared the moment any reply arrives, so a
  // transient mid-chat blip never resets a healthy conversation.
  const restoredConvRef = useRef<boolean>(
    sessionStorage.getItem(convStorageKey) != null,
  )
  // Mirror of messages for unmount cleanup (revoke image preview object URLs).
  const messagesRef = useRef<ChatMessage[]>(messages)
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Per-turn guard: incremented on each send, so the SSE `message` handler
  // renders at most one reply for the in-flight turn (a replayed buffer event
  // for a turn we already rendered is ignored).
  const turnSeqRef = useRef(0)
  const awaitingReplyRef = useRef(false)
  // Soft-stall timer: fires if no `message` arrives in time. Cleared on reply,
  // error, the next send, and unmount.
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearStallTimer = useCallback(() => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current)
      stallTimerRef.current = null
    }
  }, [])

  const appendAssistant = useCallback(
    (msg: StreamMessage) => {
      setMessages((prev) => [
        ...prev,
        { id: nextId('a'), role: 'assistant', content: msg.reply },
      ])
      setExtracted(msg.extracted ?? {})
      // React to a mid-conversation re-route: the agent may have switched the
      // flow (e.g. buyer→seller), which must reveal/hide seller-only UI.
      if (msg.vertical === 'angrosist' || msg.vertical === 'palletclearance') {
        setLiveVertical(msg.vertical)
      }
      if (msg.intent === 'buy' || msg.intent === 'sell') {
        setLiveIntent(msg.intent)
      }
      setTyping(false)
      awaitingReplyRef.current = false
      // A reply arrived → the conversation is alive; stop treating it as a stale
      // restored candidate.
      restoredConvRef.current = false
      // Persist the finished flag so a returning visit knows to offer
      // "continue vs start new". A non-ended reply means the flow is active
      // again — clear it (a resumed-then-continued conversation is live).
      if (msg.ended === true) {
        sessionStorage.setItem(endedStorageKey, '1')
        setRestoredEnded(true)
      } else {
        sessionStorage.removeItem(endedStorageKey)
        setRestoredEnded(false)
      }
      clearStallTimer()
    },
    [clearStallTimer, endedStorageKey],
  )

  // Drop a conversation that the server no longer has (deleted/erased). Clears the
  // id + token from refs, render state and sessionStorage and tears down the dead
  // stream, so the user's NEXT message opens a brand-new conversation.
  const resetStaleConversation = useCallback(() => {
    restoredConvRef.current = false
    convIdRef.current = null
    tokenRef.current = null
    setConversationId(null)
    setConversationToken(null)
    setRestoredEnded(false)
    sessionStorage.removeItem(convStorageKey)
    sessionStorage.removeItem(tokenStorageKey)
    sessionStorage.removeItem(endedStorageKey)
    unsubscribeRef.current?.()
    unsubscribeRef.current = null
  }, [convStorageKey, tokenStorageKey, endedStorageKey])

  // Abandon the stored (finished) conversation and begin fresh: drop the id +
  // token + `_ended` flag from refs/state/storage, tear down any open stream,
  // and clear the rendered messages back to just the greeting. After this,
  // `restoredEnded` is false and the next send opens a brand-new conversation.
  const startNew = useCallback(() => {
    resetStaleConversation()
    // Cancel any in-flight turn so a late reply can't render into the fresh chat.
    awaitingReplyRef.current = false
    clearStallTimer()
    setTyping(false)
    setExtracted({})
    setLiveVertical(vertical)
    setLiveIntent(intent)
    // Revoke any staged image previews before wiping the message list.
    messagesRef.current.forEach((m) =>
      m.images?.forEach((im) => URL.revokeObjectURL(im.previewUrl)),
    )
    setMessages([{ id: nextId('a'), role: 'assistant', content: greeting }])
  }, [resetStaleConversation, clearStallTimer, greeting, vertical, intent])

  // Opens (or re-opens after a drop) the SSE stream for this conversation. The
  // stream is the only path that delivers replies/typing. EventSource auto-
  // reconnects; if our handler closes on a hard error we re-subscribe lazily on
  // the next send via this same idempotent call (it no-ops while one is open).
  const ensureSubscription = useCallback(
    (id: string) => {
      if (unsubscribeRef.current) return
      unsubscribeRef.current = subscribeToConversation(
        id,
        {
          onTyping: () => {
            if (awaitingReplyRef.current) setTyping(true)
          },
          onMessage: (msg) => {
            // Render exactly one reply per turn; ignore stray/replayed events
            // for a turn we already resolved.
            if (!awaitingReplyRef.current) return
            appendAssistant(msg)
          },
          onError: () => {
            if (!awaitingReplyRef.current) return
            awaitingReplyRef.current = false
            clearStallTimer()
            setTyping(false)
            // A stream failure on a RESTORED conversation that never replied means
            // the stored conversation is gone server-side — reset it so the next
            // message starts fresh, and tell the user to resend.
            const stale = restoredConvRef.current
            if (stale) {
              resetStaleConversation()
            } else {
              // Drop the dead subscription so the next send re-opens a fresh one
              // (the stream is idempotent + replay-buffered, so this is safe).
              unsubscribeRef.current?.()
              unsubscribeRef.current = null
            }
            setMessages((prev) => [
              ...prev,
              {
                id: nextId('a'),
                role: 'assistant',
                content: stale ? (resetMessage ?? errorMessage) : errorMessage,
              },
            ])
          },
        },
        {
          // Read fresh from the ref each (re)subscribe — the backend 403s the
          // stream without it (EventSource can't send headers).
          token: tokenRef.current,
        },
      )
    },
    [appendAssistant, clearStallTimer, errorMessage, resetMessage, resetStaleConversation],
  )

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim()
      if (!text || typing) return

      setMessages((prev) => [
        ...prev,
        { id: nextId('u'), role: 'user', content: text },
      ])
      setTyping(true)

      // Mark this turn as awaiting an SSE reply and (re)arm the stall timer.
      const turn = ++turnSeqRef.current
      awaitingReplyRef.current = true
      clearStallTimer()
      stallTimerRef.current = setTimeout(() => {
        // Only act if this is still the turn we armed for and it's unresolved.
        if (turn !== turnSeqRef.current || !awaitingReplyRef.current) return
        awaitingReplyRef.current = false
        setTyping(false)
        // A restored conversation that never replied is treated as stale (deleted
        // server-side): reset it so the next message starts fresh.
        const stale = restoredConvRef.current
        if (stale) resetStaleConversation()
        setMessages((prev) => [
          ...prev,
          {
            id: nextId('a'),
            role: 'assistant',
            content: stale
              ? (resetMessage ?? errorMessage)
              : (timeoutMessage ?? errorMessage),
          },
        ])
      }, STREAM_TIMEOUT_MS)

      void (async () => {
        try {
          // vertical/intent are only honored on the first message (no id yet).
          // The token (null on the first turn) authorizes continuing turns.
          const ack = await sendMessage(
            convIdRef.current,
            text,
            { vertical, intent },
            tokenRef.current,
          )
          convIdRef.current = ack.conversation_id
          setConversationId(ack.conversation_id)
          sessionStorage.setItem(convStorageKey, ack.conversation_id)

          // Capture the ownership token issued on EVERY turn. Read it back into
          // refs/state/storage BEFORE opening SSE so the stream gets `?token=`.
          if (ack.conversation_token) {
            tokenRef.current = ack.conversation_token
            setConversationToken(ack.conversation_token)
            sessionStorage.setItem(tokenStorageKey, ack.conversation_token)
          }

          // Open the reply stream right after the ack (idempotent; reused for
          // later turns). The reply + typing arrive ONLY here.
          ensureSubscription(ack.conversation_id)
        } catch {
          // POST failed (4xx/5xx/network) — nothing was enqueued, so abandon the
          // turn: clear typing + the stall timer and show the localized error.
          if (turn === turnSeqRef.current) {
            awaitingReplyRef.current = false
            clearStallTimer()
            setTyping(false)
            setMessages((prev) => [
              ...prev,
              { id: nextId('a'), role: 'assistant', content: errorMessage },
            ])
          }
        }
      })()
    },
    [
      typing,
      convStorageKey,
      tokenStorageKey,
      ensureSubscription,
      clearStallTimer,
      errorMessage,
      timeoutMessage,
      resetMessage,
      resetStaleConversation,
      vertical,
      intent,
    ],
  )

  // Flip a single image's upload status inside its message.
  const setImageStatus = useCallback(
    (messageId: string, imageId: string, status: ChatImageStatus) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.images
            ? {
                ...m,
                images: m.images.map((im) =>
                  im.id === imageId ? { ...im, status } : im,
                ),
              }
            : m,
        ),
      )
    },
    [],
  )

  // Attach picked images as ONE grouped user bubble, then upload each to the
  // conversation's photo endpoint. The bubble renders immediately (optimistic);
  // each tile shows its own uploading/done/error state. Photos go to a dedicated
  // endpoint (not the agent), so this does not post a chat turn or await SSE.
  const sendImages = useCallback(
    (files: File[]) => {
      const convId = convIdRef.current
      if (!convId) return
      const pairs = files
        .filter((f) => f.type.startsWith('image/'))
        .map((file) => ({
          file,
          image: {
            id: nextId('img'),
            previewUrl: URL.createObjectURL(file),
            status: 'uploading' as ChatImageStatus,
          },
        }))
      if (pairs.length === 0) return

      const messageId = nextId('u')
      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          role: 'user',
          content: '',
          images: pairs.map((p) => p.image),
        },
      ])

      pairs.forEach(({ file, image }) => {
        void (async () => {
          try {
            await uploadConversationPhoto(convId, file, tokenRef.current)
            setImageStatus(messageId, image.id, 'done')
          } catch {
            setImageStatus(messageId, image.id, 'error')
          }
        })()
      })
    },
    [setImageStatus],
  )

  // Close the EventSource, clear timers, and revoke image preview URLs on unmount.
  useEffect(() => {
    return () => {
      unsubscribeRef.current?.()
      unsubscribeRef.current = null
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current)
      messagesRef.current.forEach((m) =>
        m.images?.forEach((im) => URL.revokeObjectURL(im.previewUrl)),
      )
    }
  }, [])

  return {
    messages,
    typing,
    extracted,
    send,
    sendImages,
    canAttach: conversationId !== null,
    conversationId,
    conversationToken,
    vertical: liveVertical,
    intent: liveIntent,
    restoredEnded,
    startNew,
  }
}
