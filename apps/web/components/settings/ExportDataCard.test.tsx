import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ExportDataCard } from './ExportDataCard'

const mocks = vi.hoisted(() => ({
  downloadAccountExport: vi.fn(),
}))

vi.mock('@/lib/export/account-export-client', () => ({
  downloadAccountExport: () => mocks.downloadAccountExport(),
}))

function renderExportDataCard() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <ExportDataCard />
    </QueryClientProvider>,
  )
}

describe('ExportDataCard', () => {
  beforeEach(() => {
    mocks.downloadAccountExport.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the export card copy', () => {
    renderExportDataCard()

    expect(screen.getByText('Export Data')).toBeInTheDocument()
    expect(screen.getByText(/programs, cycles, workouts, logged sets, and referenced exercises/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download Export' })).toBeInTheDocument()
  })

  it('reports success after the download starts', async () => {
    const user = userEvent.setup()

    mocks.downloadAccountExport.mockResolvedValue({
      filename: 'plateiq-export-20260512T143000Z.zip',
    })

    renderExportDataCard()

    await user.click(screen.getByRole('button', { name: 'Download Export' }))

    await waitFor(() => {
      expect(mocks.downloadAccountExport).toHaveBeenCalledTimes(1)
    })

    expect(screen.getByText(/Your export download has started: plateiq-export-20260512T143000Z.zip/i)).toBeInTheDocument()
  })

  it('shows the request error and lets the user retry', async () => {
    const user = userEvent.setup()

    mocks.downloadAccountExport.mockRejectedValue(new Error('Unable to prepare your export right now.'))

    renderExportDataCard()

    await user.click(screen.getByRole('button', { name: 'Download Export' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Unable to prepare your export right now.')
    })

    expect(screen.getByRole('button', { name: 'Download Export' })).toBeEnabled()
  })
})