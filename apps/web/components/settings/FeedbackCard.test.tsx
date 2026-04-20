import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FeedbackCard } from './FeedbackCard'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

function renderFeedbackCard() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <FeedbackCard />
    </QueryClientProvider>,
  )
}

describe('FeedbackCard', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('validates required fields before submitting', async () => {
    const user = userEvent.setup()

    renderFeedbackCard()

    await user.click(screen.getByRole('button', { name: 'Send Feedback' }))

    expect(screen.getByText('Choose a feedback type.')).toBeInTheDocument()
    expect(screen.getByText('Add at least 10 characters so we have enough context.')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('submits feedback and resets the form on success', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.mocked(fetch)

    fetchMock.mockResolvedValue(new Response(
      JSON.stringify({
        submissionId: 17,
        createdAt: '2026-04-20T12:45:00.000Z',
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    ))

    renderFeedbackCard()

    await user.click(screen.getByRole('combobox', { name: 'Feedback type' }))
    await user.click(await screen.findByText('Bug report'))
    await user.type(
      screen.getByLabelText('What should we know?'),
      'The feedback card should preserve the selected category after a failed retry.',
    )
    await user.click(screen.getByRole('button', { name: 'Send Feedback' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: 'bug',
          message: 'The feedback card should preserve the selected category after a failed retry.',
          sourcePath: '/settings',
        }),
      })
    })

    expect(screen.getByText('Thanks. Your feedback was saved for review.')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Feedback type' })).toHaveTextContent('Choose a category')
    expect(screen.getByLabelText('What should we know?')).toHaveValue('')
  })

  it('preserves the draft and shows the API error when submission fails', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.mocked(fetch)

    fetchMock.mockResolvedValue(new Response(
      JSON.stringify({ error: 'Unable to save feedback right now.' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    ))

    renderFeedbackCard()

    await user.click(screen.getByRole('combobox', { name: 'Feedback type' }))
    await user.click(await screen.findByText('Feature request'))
    await user.type(
      screen.getByLabelText('What should we know?'),
      'Please add a clearer success state after finishing the current workout.',
    )
    await user.click(screen.getByRole('button', { name: 'Send Feedback' }))

    await waitFor(() => {
      expect(screen.getByText('Unable to save feedback right now.')).toBeInTheDocument()
    })

    expect(screen.getByRole('combobox', { name: 'Feedback type' })).toHaveTextContent('Feature request')
    expect(screen.getByLabelText('What should we know?')).toHaveValue(
      'Please add a clearer success state after finishing the current workout.',
    )
  })
})