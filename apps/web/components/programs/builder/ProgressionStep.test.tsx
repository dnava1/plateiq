import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useUiStore } from '@/store/uiStore'
import { useBuilderDraftStore } from '@/store/builderDraftStore'
import { ProgressionStep } from './ProgressionStep'

describe('ProgressionStep', () => {
  beforeEach(() => {
    localStorage.clear()
    useUiStore.setState({ preferredUnit: 'lbs' })
    useBuilderDraftStore.getState().resetDraft()
  })

  it('preserves custom linear increments when switching to a non-linear style and back', async () => {
    const user = userEvent.setup()

    render(<ProgressionStep />)

    const upperInput = screen.getByLabelText('Upper Body')
    const lowerInput = screen.getByLabelText('Lower Body')

    await user.clear(upperInput)
    await user.type(upperInput, '7.5')
    await user.clear(lowerInput)
    await user.type(lowerInput, '15')

    await user.click(screen.getByRole('radio', { name: /Wave Loading/i }))
    expect(screen.queryByLabelText('Upper Body')).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /Linear per Week/i }))

    await waitFor(() => {
      expect(screen.getByLabelText('Upper Body')).toHaveDisplayValue('7.5')
      expect(screen.getByLabelText('Lower Body')).toHaveDisplayValue('15')
    })
  })
})