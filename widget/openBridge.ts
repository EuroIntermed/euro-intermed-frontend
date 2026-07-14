/**
 * Vanilla → React bridge for the widget's public `AngrosistChat.open()` method.
 *
 * The widget is mounted from a plain-JS entry (`widget-entry.tsx`) but the
 * composer state (`input` / send) lives inside the React `WidgetApp`. When a host
 * page calls `AngrosistChat.open({ message, autosend })`, the entry can flip the
 * panel open (it owns the render closure) but it has no handle on the composer.
 *
 * This tiny module carries the "seed" (a message to prefill or autosend) across
 * that boundary with a subscribe/emit pair. It intentionally holds NO secrets or
 * URLs — only the caller-supplied message + flags.
 *
 * Timing: `open()` calls `render(true)` and then pushes a seed, but React mounts
 * `WidgetApp` asynchronously, so its subscriber may not exist yet. When there are
 * no listeners we retain the latest seed as `pending`; the first subscriber to
 * attach drains it. When the widget is already open (subscriber present) the seed
 * is delivered synchronously.
 */

/** A composer seed emitted by `AngrosistChat.open()`. */
export interface WidgetSeed {
  /** Monotonic id so repeated open() calls are always distinct events. */
  seq: number
  /** Text to prefill into (or autosend from) the composer. */
  message: string
  /** When true, send the message as a turn immediately instead of prefilling. */
  autosend: boolean
}

type Listener = (seed: WidgetSeed) => void

let seq = 0
let pending: WidgetSeed | null = null
const listeners = new Set<Listener>()

/**
 * Push a composer seed toward the mounted {@link WidgetApp}. Delivered
 * synchronously if a subscriber is attached, otherwise retained as `pending` for
 * the next subscriber (covers the just-mounted, not-yet-subscribed window).
 */
export function pushSeed(seed: Omit<WidgetSeed, 'seq'>): void {
  const full: WidgetSeed = { ...seed, seq: (seq += 1) }
  if (listeners.size > 0) {
    listeners.forEach((l) => l(full))
  } else {
    pending = full
  }
}

/**
 * Subscribe to composer seeds. Called once by {@link WidgetApp} on mount; it
 * immediately drains any `pending` seed queued before it attached. Returns an
 * unsubscribe cleanup.
 */
export function subscribeSeed(listener: Listener): () => void {
  listeners.add(listener)
  if (pending) {
    const drained = pending
    pending = null
    listener(drained)
  }
  return () => {
    listeners.delete(listener)
  }
}
