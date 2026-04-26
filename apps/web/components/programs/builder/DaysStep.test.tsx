import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialBuilderDraft, useBuilderDraftStore } from '@/store/builderDraftStore'
import { DaysStep } from './DaysStep'

describe('DaysStep', () => {
  beforeEach(() => {
    useBuilderDraftStore.getState().resetDraft()
  })

  it('lets scratch programs enable week-by-week overrides for multi-week cycles', async () => {
    const user = userEvent.setup()

    useBuilderDraftStore.setState({
      step: 'days',
      draft: {
        ...createInitialBuilderDraft({
          name: 'Wave Builder',
          cycle_length_weeks: 2,
          days_per_week: 1,
          days: [
            {
              label: 'Day A',
              exercise_blocks: [],
            },
          ],
        }),
      },
    })

    render(<DaysStep />)

    await user.click(screen.getByRole('button', { name: 'Customize Weeks' }))

    expect(screen.getByText('Week 2')).toBeInTheDocument()
    expect(useBuilderDraftStore.getState().draft.week_schemes?.['2']?.days?.[0]?.label).toBe('Day A')

    const weekTwoLabel = screen.getAllByLabelText('Week Label')[1]
    fireEvent.change(weekTwoLabel, { target: { value: 'Week 2 - Intensification' } })

    expect(useBuilderDraftStore.getState().draft.week_schemes?.['2']?.label).toBe('Week 2 - Intensification')
  })

  it('lets builders turn weekly overrides back off and reuse a shared layout', async () => {
    const user = userEvent.setup()

    useBuilderDraftStore.setState({
      step: 'days',
      draft: {
        ...createInitialBuilderDraft({
          name: 'Wave Builder',
          cycle_length_weeks: 3,
          days_per_week: 1,
          days: [
            {
              label: 'Day A',
              exercise_blocks: [],
            },
          ],
        }),
      },
    })

    render(<DaysStep />)

    await user.click(screen.getByRole('button', { name: 'Customize Weeks' }))
    await user.click(screen.getByRole('button', { name: 'Use Shared Week Layout' }))

    expect(screen.queryByText('Weekly overrides are on')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Customize Weeks' })).toBeInTheDocument()
    expect(useBuilderDraftStore.getState().draft.days[0]?.label).toBe('Day A')
    expect(useBuilderDraftStore.getState().draft.week_schemes?.['2']?.days).toBeUndefined()
  })
})
