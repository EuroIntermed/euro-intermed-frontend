import { useRef, useState, useCallback } from 'react'
import { FileUp, FileText, Loader2, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { uploadConversationDocument, ApiError } from '@/lib/api'
import { useT } from '@/lib/i18n'

/**
 * Buyer product-list upload affordance for the Angrosist/buy chat flow — the
 * document sibling of {@link SellerPhotoUpload} (contract A1.2(e): the buyer
 * attaches an Excel/Word/CSV/PDF product list during qualification).
 *
 * Rendered ONLY in the buyer/Angrosist flow (never the PalletClearance seller
 * flow, which uses photos). It is disabled until a conversation id exists (the
 * upload endpoint targets a specific conversation) and once the per-conversation
 * cap of {@link DOC_CAP} documents is reached. Each picked file is uploaded
 * independently via `uploadConversationDocument`; per-file state + a running
 * count are shown, and server errors (409 `DOCUMENT_LIMIT_REACHED` / 413
 * oversize / 403 token) surface via sonner with the backend's exact message.
 *
 * Once a batch settles with ≥1 success it calls {@link Props.onUploaded} so the
 * host can fire the single "product list uploaded" agent turn (see useChat's
 * `productListUploadedMessage`); the upload endpoint itself does not run the agent.
 */

/** Allowed product-list document types (mirrors the backend allow-list + input accept). */
const DOC_ACCEPT = '.xlsx,.xls,.csv,.doc,.docx,.pdf'
const ALLOWED_EXT = ['xlsx', 'xls', 'csv', 'doc', 'docx', 'pdf']
/** Per-conversation document cap enforced by the backend (409 DOCUMENT_LIMIT_REACHED). */
const DOC_CAP = 5

type ItemStatus = 'uploading' | 'done' | 'error'

interface DocItem {
  /** Stable local key for React. */
  localId: string
  name: string
  status: ItemStatus
  /** Remote URL once uploaded (kept for parity; not displayed). */
  remoteUrl?: string
}

interface Props {
  conversationId: string | null
  /** Per-conversation ownership token; echoed on upload or the backend 403s. */
  conversationToken: string | null
  /** Localized label for the trigger button. */
  label?: string
  /**
   * Fired once after a batch of uploads settles with ≥1 success, so the host can
   * dispatch the single "product list uploaded" agent turn (useChat's
   * `productListUploadedMessage`). No-op when omitted.
   */
  onUploaded?: () => void
}

let counter = 0
function nextId(): string {
  counter += 1
  return `doc-${counter}-${Date.now()}`
}

export function ProductListUpload({
  conversationId,
  conversationToken,
  label,
  onUploaded,
}: Props) {
  const { t } = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<DocItem[]>([])
  const buttonLabel = label ?? t('chat.addProductList')

  const doneCount = items.filter((i) => i.status === 'done').length
  const busy = items.some((i) => i.status === 'uploading')
  const atCap = doneCount >= DOC_CAP
  const disabled = !conversationId || atCap

  const updateItem = useCallback((localId: string, patch: Partial<DocItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.localId === localId ? { ...it, ...patch } : it)),
    )
  }, [])

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || !conversationId) return

      const uploads: Promise<boolean>[] = []
      Array.from(files).forEach((file) => {
        // Client-side guard mirrors the server (it is the real gate): docs only.
        const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
        if (!ALLOWED_EXT.includes(ext)) {
          toast.error(t('chat.productListInvalidType'))
          return
        }

        const localId = nextId()
        setItems((prev) => [
          ...prev,
          { localId, name: file.name, status: 'uploading' },
        ])

        uploads.push(
          (async () => {
            try {
              const res = await uploadConversationDocument(
                conversationId,
                file,
                conversationToken,
              )
              updateItem(localId, { status: 'done', remoteUrl: res.url })
              return true
            } catch (err) {
              const message =
                err instanceof ApiError ? err.message : t('chat.uploadFailed')
              updateItem(localId, { status: 'error' })
              toast.error(message)
              return false
            }
          })(),
        )
      })

      // Fire the single agent turn once the batch settles with ≥1 success.
      if (uploads.length > 0 && onUploaded) {
        void Promise.all(uploads).then((results) => {
          if (results.some(Boolean)) onUploaded()
        })
      }
    },
    [conversationId, conversationToken, updateItem, onUploaded, t],
  )

  return (
    <div className="flex flex-col gap-2 px-4 pt-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <FileUp className="h-4 w-4 mr-1.5" />
          )}
          {buttonLabel}
        </Button>

        {doneCount > 0 && (
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {doneCount === 1
              ? t('chat.productListCountOne')
              : t('chat.productListCountOther', { n: doneCount })}
          </span>
        )}

        {!conversationId && (
          <span className="text-xs text-muted-foreground">
            {t('chat.productListHint')}
          </span>
        )}

        {atCap && (
          <span className="text-xs text-muted-foreground">
            {t('chat.productListCap', { n: DOC_CAP })}
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={DOC_ACCEPT}
        multiple
        className="hidden"
        aria-label={buttonLabel}
        onChange={(e) => {
          handleFiles(e.target.files)
          // Reset so picking the same file again re-triggers change.
          e.target.value = ''
        }}
      />

      {items.length > 0 && (
        <ul className="flex flex-col gap-1.5 list-none p-0 m-0">
          {items.map((it) => (
            <li
              key={it.localId}
              className="flex items-center gap-2 rounded-md border bg-muted/50 px-2.5 py-1.5 text-sm"
              title={it.name}
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 min-w-0 truncate">{it.name}</span>
              {it.status === 'uploading' && (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
              )}
              {it.status === 'done' && (
                <Check className="h-4 w-4 shrink-0 text-green-600" />
              )}
              {it.status === 'error' && (
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
