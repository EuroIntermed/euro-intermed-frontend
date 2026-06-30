import * as React from 'react'

import { cn } from '@/lib/utils'

export interface OtpInputProps {
  /** Number of digits in the code. */
  length?: number
  /** Controlled value (the code typed so far). */
  value: string
  /** Fires with the cleaned code string on every change. */
  onChange: (value: string) => void
  /** Fires once the code reaches `length` digits. */
  onComplete?: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
  autoFocus?: boolean
  name?: string
  'aria-label'?: string
}

/**
 * OtpInput is a single native text field styled for one-time codes. It is one
 * real `<input>` in normal document flow — no overlay, no per-digit boxes — so
 * tapping, typing, pasting, and browser/SMS autofill behave exactly like any
 * ordinary input. A decorative row of segment bars underneath visualises
 * progress without ever intercepting pointer events.
 *
 * The ref forwards to the input so react-hook-form can focus it on error.
 */
export const OtpInput = React.forwardRef<HTMLInputElement, OtpInputProps>(
  function OtpInput(
    {
      length = 6,
      value,
      onChange,
      onComplete,
      onBlur,
      disabled = false,
      autoFocus = false,
      name,
      'aria-label': ariaLabel,
    },
    ref,
  ) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const cleaned = e.target.value.replace(/\D/g, '').slice(0, length)
      onChange(cleaned)
      if (cleaned.length === length) onComplete?.(cleaned)
    }

    const filled = value.length

    return (
      <div className="flex w-full flex-col items-center gap-3">
        <input
          ref={ref}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d*"
          maxLength={length}
          value={value}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={handleChange}
          onBlur={onBlur}
          onFocus={(e) => e.target.select()}
          aria-label={ariaLabel}
          placeholder={'•'.repeat(length)}
          className={cn(
            'h-16 w-full max-w-[17rem] rounded-xl border border-input bg-background',
            'text-center font-mono text-3xl font-semibold tabular-nums',
            // Wide tracking spreads the digits like segments; the trailing
            // indent re-centres the line so it does not drift right.
            'tracking-[0.6em] indent-[0.6em]',
            'shadow-xs outline-none transition-all',
            'placeholder:text-muted-foreground/30 placeholder:tracking-[0.4em] placeholder:indent-[0.4em]',
            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'dark:bg-input/30',
          )}
        />
        <div
          className="flex items-center gap-1.5"
          aria-hidden="true"
        >
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
