'use client'

import { type FormEvent, useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { MessageSquareText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  feedbackCategoryOptions,
  feedbackSubmissionSchema,
  type FeedbackCategory,
  type FeedbackSubmissionPayload,
} from '@/lib/validations/feedback'

type FeedbackFormValues = {
  category: FeedbackCategory | ''
  message: string
}

type FeedbackFormErrors = {
  category?: string
  message?: string
}

type SubmissionState = {
  tone: 'error' | 'status'
  message: string
} | null

const INITIAL_VALUES: FeedbackFormValues = {
  category: '',
  message: '',
}

function focusElementById(id: string) {
  if (typeof document === 'undefined') {
    return
  }

  const element = document.getElementById(id)

  if (element instanceof HTMLElement) {
    element.focus()
  }
}

export function FeedbackCard() {
  const [values, setValues] = useState<FeedbackFormValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<FeedbackFormErrors>({})
  const [submissionState, setSubmissionState] = useState<SubmissionState>(null)
  const selectedCategoryLabel = feedbackCategoryOptions.find((option) => option.value === values.category)?.label

  const submitFeedback = useMutation({
    mutationFn: async (payload: FeedbackSubmissionPayload) => {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      let responseBody: { error?: string } | { submissionId: number; createdAt: string } | null = null

      try {
        responseBody = await response.json() as { error?: string } | { submissionId: number; createdAt: string }
      } catch {
        responseBody = null
      }

      if (!response.ok) {
        throw new Error(
          responseBody && 'error' in responseBody && typeof responseBody.error === 'string'
            ? responseBody.error
            : 'Unable to send feedback right now.',
        )
      }

      return responseBody
    },
    onSuccess: () => {
      setValues(INITIAL_VALUES)
      setErrors({})
      setSubmissionState({
        tone: 'status',
        message: 'Thanks. Your feedback was saved for review.',
      })
    },
    onError: (error: Error) => {
      setSubmissionState({
        tone: 'error',
        message: error.message || 'Unable to send feedback right now.',
      })
    },
  })

  useEffect(() => {
    if (!submissionState) {
      return
    }

    focusElementById('settings-feedback-status')
  }, [submissionState])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmissionState(null)

    const parsed = feedbackSubmissionSchema.safeParse({
      category: values.category,
      message: values.message,
      sourcePath: '/settings',
    })

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      const nextErrors = {
        category: fieldErrors.category?.[0],
        message: fieldErrors.message?.[0],
      } satisfies FeedbackFormErrors

      setErrors(nextErrors)

      if (nextErrors.category) {
        focusElementById('settings-feedback-category')
        return
      }

      if (nextErrors.message) {
        focusElementById('settings-feedback-message')
      }

      return
    }

    setErrors({})
    submitFeedback.mutate(parsed.data)
  }

  const messageHelpId = errors.message ? 'settings-feedback-message-error' : 'settings-feedback-message-help'
  const categoryHelpId = errors.category ? 'settings-feedback-category-error' : undefined

  return (
    <Card className="surface-panel">
      <CardHeader>
        <CardTitle>Feedback</CardTitle>
        <CardDescription>
          Report a bug, request a feature, or flag guidance that feels unclear.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="settings-feedback-category">Feedback type</Label>
            <Select
              value={values.category}
              onValueChange={(value) => {
                setValues((current) => ({
                  ...current,
                  category: value as FeedbackCategory,
                }))

                setErrors((current) => ({
                  ...current,
                  category: undefined,
                }))
                setSubmissionState(null)
              }}
            >
              <SelectTrigger
                id="settings-feedback-category"
                className="w-full"
                aria-invalid={errors.category ? 'true' : 'false'}
                aria-describedby={categoryHelpId}
              >
                <SelectValue placeholder="Choose a category">{selectedCategoryLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {feedbackCategoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {errors.category && (
              <p id="settings-feedback-category-error" className="text-sm text-destructive">{errors.category}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="settings-feedback-message">What should we know?</Label>
            <Textarea
              id="settings-feedback-message"
              value={values.message}
              onChange={(event) => {
                setValues((current) => ({
                  ...current,
                  message: event.target.value,
                }))

                setErrors((current) => ({
                  ...current,
                  message: undefined,
                }))
                setSubmissionState(null)
              }}
              aria-invalid={errors.message ? 'true' : 'false'}
              aria-describedby={messageHelpId}
              placeholder="What happened, where you saw it, and what you expected instead."
            />
            {errors.message ? (
              <p id="settings-feedback-message-error" className="text-sm text-destructive">{errors.message}</p>
            ) : (
              <p id="settings-feedback-message-help" className="text-sm text-muted-foreground">
                Do not include sensitive details.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="submit" size="lg" disabled={submitFeedback.isPending} className="sm:w-auto">
              <MessageSquareText data-icon="inline-start" />
              {submitFeedback.isPending ? 'Sending Feedback…' : 'Send Feedback'}
            </Button>
          </div>

          {submissionState && (
            <p
              id="settings-feedback-status"
              tabIndex={-1}
              role={submissionState.tone === 'error' ? 'alert' : 'status'}
              aria-live={submissionState.tone === 'error' ? 'assertive' : 'polite'}
              className={submissionState.tone === 'error'
                ? 'rounded-2xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive'
                : 'rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground'}
            >
              {submissionState.message}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}