import * as React from 'react'

import { cn } from '@/lib/utils'

export interface OtpInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'type'
  > {
  /** Number of digits in the code. */
  length?: number
  /** Controlled value (the code typed so far). */
  value: string
  /** Fires with the cleaned code string on every change. */
  onChange: (value: string) => void
  /** Fires once the code reaches `length` digits. */
  onComplete?: (value: string) => void
}

/**
 * OtpInput is a single native text field styled for one-time codes. It is one
 * real `<input>` in normal document flow — no overlay, no per-digit boxes — so
 * tapping, typing, pasting, and browser/SMS autofill behave like any ordinary
 * input. A decorative row of segment bars underneath visualises progress
 * without ever intercepting pointer events.
 *
 * Belt-and-suspenders for finicky mobile browsers (notably Safari): a
 * pointer-down on the field wrapper explicitly focuses the input, so a tap
 * anywhere in the control reliably opens the keyboard even if a stray layer
 * would otherwise swallow the native focus.
 *
 * Extra props (id, aria-*, name, onBlur, …) — including those injected by
 * shadcn's <FormControl> — are forwarded to the real input so label
 * association and validation wiring work.
 */
export const OtpInput = React.forwardRef<HTMLInputElement, OtpInputProps>(
  function OtpInput(
    {
      length = 6,
      value,
      onChange,
      onComplete,
      disabled = false,
      className,
      ...inputProps
    },
    ref,
  ) {
    const innerRef = React.useRef<HTMLInputElement | null>(null)
    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      },
      [ref],
    )

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const cleaned = e.target.value.replace(/\D/g, '').slice(0, length)
      onChange(cleaned)
      if (cleaned.length === length) onComplete?.(cleaned)
    }

    // Any pointer-down inside the field focuses the real input. This is what
    // makes the control bulletproof on Safari/iOS regardless of what is painted
    // around it.
    const focusInput = (e: React.PointerEvent) => {
      if (disabled) return
      const el = innerRef.current
      if (!el || e.target === el) return
      e.preventDefault()
      el.focus()
    }

    const filled = value.length

    return (
      <div
        className="flex w-full flex-col items-center gap-3"
        onPointerDown={focusInput}
      >
        <input
          {...inputProps}
          ref={setRefs}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d*"
          maxLength={length}
          value={value}
          disabled={disabled}
          onChange={handleChange}
          onFocus={(e) => e.target.select()}
          placeholder={'•'.repeat(length)}
          className={cn(
            'h-16 w-full max-w-[17rem] rounded-xl border border-input bg-background',
            'text-center font-mono text-3xl font-semibold tabular-nums tracking-[0.4em]',
            'shadow-xs outline-none transition-all',
            // Defeat the iOS/Safari WebKit bug where an inherited
            // -webkit-user-select:none makes a native input unfocusable by tap.
            'cursor-text touch-manipulation select-text',
            'placeholder:tracking-[0.3em] placeholder:text-muted-foreground/30',
            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'dark:bg-input/30',
            className,
          )}
        />
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {Array.from({ length }, (_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all duration-200',
                i < filled
                  ? 'w-6 bg-primary'
                  : i === filled && !disabled
                    ? 'w-6 bg-primary/40'
                    : 'w-3 bg-muted-foreground/20',
              )}
            />
          ))}
        </div>
      </div>
    )
  },
)
