import * as React from 'react'

import { cn } from '@/lib/utils'

export interface OtpInputProps {
  /** Number of digit boxes. */
  length?: number
  /** Controlled value (the full code so far). */
  value: string
  /** Fires with the full code string on every change. */
  onChange: (value: string) => void
  /** Fires once the code reaches `length` digits. */
  onComplete?: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
  autoFocus?: boolean
  name?: string
  className?: string
  'aria-label'?: string
}

/**
 * OtpInput is a self-contained one-time-code field rendered as N real
 * `<input>` boxes — one per digit. Unlike overlay-based OTP widgets, every box
 * is a genuine focusable input, so tapping, typing, pasting, and browser/SMS
 * autofill work natively on every browser.
 *
 * The ref is forwarded to the first box so react-hook-form can focus it on
 * validation error.
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
      className,
      'aria-label': ariaLabel,
    },
    ref,
  ) {
    const inputsRef = React.useRef<Array<HTMLInputElement | null>>([])

    // Expose the first box to the parent ref (react-hook-form focuses it on error).
    React.useImperativeHandle(ref, () => inputsRef.current[0] as HTMLInputElement, [])

    const digits = React.useMemo(() => {
      const chars = value.split('').slice(0, length)
      return Array.from({ length }, (_, i) => chars[i] ?? '')
    }, [value, length])

    const focusBox = (index: number) => {
      const el = inputsRef.current[Math.max(0, Math.min(index, length - 1))]
      el?.focus()
      el?.select()
    }

    const emit = (next: string) => {
      const cleaned = next.replace(/\D/g, '').slice(0, length)
      onChange(cleaned)
      if (cleaned.length === length) onComplete?.(cleaned)
    }

    const handleChange = (
      index: number,
      e: React.ChangeEvent<HTMLInputElement>,
    ) => {
      const raw = e.target.value.replace(/\D/g, '')
      if (!raw) {
        // Cleared this box.
        const arr = digits.slice()
        arr[index] = ''
        emit(arr.join(''))
        return
      }
      // Typed (or autofilled) one or more digits starting at this box.
      const arr = digits.slice()
      let cursor = index
      for (const ch of raw) {
        if (cursor >= length) break
        arr[cursor] = ch
        cursor += 1
      }
      emit(arr.join(''))
      focusBox(cursor)
    }

    const handleKeyDown = (
      index: number,
      e: React.KeyboardEvent<HTMLInputElement>,
    ) => {
      if (e.key === 'Backspace') {
        e.preventDefault()
        const arr = digits.slice()
        if (arr[index]) {
          arr[index] = ''
          emit(arr.join(''))
        } else if (index > 0) {
          arr[index - 1] = ''
          emit(arr.join(''))
          focusBox(index - 1)
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        focusBox(index - 1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        focusBox(index + 1)
      }
    }

    const handlePaste = (
      index: number,
      e: React.ClipboardEvent<HTMLInputElement>,
    ) => {
      e.preventDefault()
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '')
      if (!pasted) return
      const arr = digits.slice()
      let cursor = index
      for (const ch of pasted) {
        if (cursor >= length) break
        arr[cursor] = ch
        cursor += 1
      }
      emit(arr.join(''))
      focusBox(cursor)
    }

    return (
      <div
        className={cn('flex items-center justify-center gap-2', className)}
        role="group"
        aria-label={ariaLabel}
      >
        {Array.from({ length }, (_, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el
            }}
            // Only the first box carries the autofill/name semantics so browser
            // one-time-code autofill targets the start of the sequence.
            name={i === 0 ? name : undefined}
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            inputMode="numeric"
            pattern="\d*"
            maxLength={1}
            value={digits[i]}
            disabled={disabled}
            autoFocus={autoFocus && i === 0}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={(e) => handlePaste(i, e)}
            onFocus={(e) => e.target.select()}
            onBlur={onBlur}
            className={cn(
              'h-10 w-10 rounded-md border border-input bg-transparent text-center text-base shadow-xs outline-none transition-all',
              'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'dark:bg-input/30',
            )}
          />
        ))}
      </div>
    )
  },
)
