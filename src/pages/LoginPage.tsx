import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

import { useAuth } from '@/auth/useAuth'
import { ApiError } from '@/lib/api'
import { useT } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { LanguageToggle } from '@/components/layout/LanguageToggle'

interface EmailFormValues {
  email: string
}

interface CodeFormValues {
  code: string
}

interface LocationState {
  from?: string
}

const RESEND_COOLDOWN_SECONDS = 30

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token, requestCode, verifyCode } = useAuth()
  const { t } = useT()

  // Two-step state: 'email' collects the address, 'code' verifies the OTP.
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  // Schemas rebuilt per locale so zod messages localize (UX only; the Go backend
  // is the real gate).
  const emailSchema = useMemo(
    () => z.object({ email: z.string().email(t('auth.emailInvalid')) }),
    [t],
  )
  const codeSchema = useMemo(
    () =>
      z.object({
        code: z
          .string()
          .trim()
          .regex(/^\d{6}$/, t('auth.codeRequired')),
      }),
    [t],
  )

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })
  const codeForm = useForm<CodeFormValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  })

  // Resend cooldown ticker.
  useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => window.clearTimeout(id)
  }, [cooldown])

  // Autofocus the code field when we advance to step 2.
  const codeInputRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (step === 'code') codeInputRef.current?.focus()
  }, [step])

  const mapError = useCallback(
    (err: unknown): string => {
      if (err instanceof ApiError && err.status === 429)
        return t('auth.tooManyAttempts')
      if (err instanceof ApiError && err.status === 401)
        return t('auth.codeInvalid')
      if (err instanceof ApiError) return err.message
      return t('common.error')
    },
    [t],
  )

  // Already authenticated → skip the login screen.
  if (token) {
    const from = (location.state as LocationState | null)?.from
    return (
      <Navigate
        to={from && from.startsWith('/dashboard') ? from : '/dashboard'}
        replace
      />
    )
  }

  async function onRequestCode(values: EmailFormValues) {
    setServerError(null)
    try {
      await requestCode(values.email)
      // The backend is neutral (always 202); advance regardless of account
      // existence so we never leak whether the email is registered.
      setEmail(values.email)
      setStep('code')
      setCooldown(RESEND_COOLDOWN_SECONDS)
      codeForm.reset({ code: '' })
    } catch (err) {
      setServerError(mapError(err))
    }
  }

  async function onVerifyCode(values: CodeFormValues) {
    setServerError(null)
    try {
      await verifyCode(email, values.code.trim())
      const from = (location.state as LocationState | null)?.from
      navigate(from && from.startsWith('/dashboard') ? from : '/dashboard', {
        replace: true,
      })
    } catch (err) {
      setServerError(mapError(err))
    }
  }

  async function onResend() {
    if (cooldown > 0) return
    setServerError(null)
    try {
      await requestCode(email)
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setServerError(mapError(err))
    }
  }

  function onChangeEmail() {
    setServerError(null)
    setStep('email')
    setCooldown(0)
    codeForm.reset({ code: '' })
    emailForm.reset({ email })
  }

  const requestingCode = emailForm.formState.isSubmitting
  const verifying = codeForm.formState.isSubmitting

  return (
    <div className="relative flex min-h-dvh flex-1 items-center justify-center bg-muted/30 px-4 py-12">
      <div className="absolute right-4 top-4 flex items-center gap-1">
        <ThemeToggle />
        <LanguageToggle />
      </div>
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-semibold">
            EI
          </span>
        </div>
        <Card className="w-full">
          {step === 'email' ? (
            <>
              <CardHeader>
                <CardTitle>{t('auth.emailStepTitle')}</CardTitle>
                <CardDescription>{t('auth.emailStepSubtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...emailForm}>
                  <form
                    onSubmit={emailForm.handleSubmit(onRequestCode)}
                    className="flex flex-col gap-4"
                  >
                    <FormField
                      control={emailForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('auth.email')}</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              autoComplete="email"
                              autoFocus
                              inputMode="email"
                              placeholder={t('auth.emailPlaceholder')}
                              disabled={requestingCode}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {serverError && (
                      <p className="text-sm text-destructive" role="alert">
                        {serverError}
                      </p>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={requestingCode}
                    >
                      {requestingCode && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {requestingCode
                        ? t('auth.sendingCode')
                        : t('auth.sendCode')}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle>{t('auth.codeStepTitle')}</CardTitle>
                <CardDescription>
                  {t('auth.codeStepSubtitle', { email })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...codeForm}>
                  <form
                    onSubmit={codeForm.handleSubmit(onVerifyCode)}
                    className="flex flex-col gap-4"
                  >
                    <FormField
                      control={codeForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('auth.codeLabel')}</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              maxLength={6}
                              placeholder="••••••"
                              disabled={verifying}
                              {...field}
                              ref={(el) => {
                                field.ref(el)
                                codeInputRef.current = el
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {serverError && (
                      <p className="text-sm text-destructive" role="alert">
                        {serverError}
                      </p>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={verifying}
                    >
                      {verifying && <Loader2 className="h-4 w-4 animate-spin" />}
                      {verifying ? t('auth.signingIn') : t('auth.verify')}
                    </Button>

                    <div className="flex items-center justify-between text-sm">
                      <button
                        type="button"
                        onClick={onChangeEmail}
                        disabled={verifying}
                        className="text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
                      >
                        {t('auth.changeEmail')}
                      </button>
                      <button
                        type="button"
                        onClick={onResend}
                        disabled={verifying || cooldown > 0}
                        className="text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
                      >
                        {cooldown > 0
                          ? t('auth.resendIn', { n: cooldown })
                          : t('auth.resend')}
                      </button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
