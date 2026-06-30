import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

afterEach(cleanup)
import { useForm } from 'react-hook-form'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from '@/components/ui/form'
import { OtpInput } from '@/components/ui/otp-input'

// Mirrors LoginPage's exact wiring of the code field.
function Harness() {
  const form = useForm<{ code: string }>({ defaultValues: { code: '' } })
  const code = form.watch('code')
  return (
    <Form {...form}>
      <div data-testid="value">{code}</div>
      <FormField
        control={form.control}
        name="code"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <OtpInput
                length={6}
                value={field.value}
                name={field.name}
                onBlur={field.onBlur}
                ref={field.ref}
                onChange={(v: string) => field.onChange(v)}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </Form>
  )
}

describe('OtpInput controlled binding', () => {
  it('reflects a typed digit into form state and the input', () => {
    render(<Harness />)
    const input = screen.getByRole('textbox') as HTMLInputElement

    fireEvent.change(input, { target: { value: '5' } })
    expect(screen.getByTestId('value').textContent).toBe('5')
    expect(input.value).toBe('5')

    fireEvent.change(input, { target: { value: '512' } })
    expect(screen.getByTestId('value').textContent).toBe('512')
    expect(input.value).toBe('512')
  })

  it('accepts real keystrokes (full keydown/input path) and pasting', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByRole('textbox') as HTMLInputElement

    await user.click(input)
    await user.keyboard('123456')
    expect(input.value).toBe('123456')
    expect(screen.getByTestId('value').textContent).toBe('123456')

    await user.clear(input)
    await user.paste('987654')
    expect(input.value).toBe('987654')
    expect(screen.getByTestId('value').textContent).toBe('987654')
  })
})
