import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useUiStore } from '@/store/uiStore'
import { useBuilderDraftStore } from '@/store/builderDraftStore'
import { ReviewStep } from './ReviewStep'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock('@/hooks/usePrograms', () => ({
  useCreateCustomProgram: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
}))

describe('ReviewStep', () => {
  beforeEach(() => {
    localStorage.clear()
    useUiStore.setState({ preferredUnit: 'lbs' })
    useBuilderDraftStore.getState().resetDraft()

    const draft = useBuilderDraftStore.getState().draft

    useBuilderDraftStore.setState({
      draft: {
        ...draft,
        name: 'Wave Builder',
        progression: {
          style: 'wave',
          deload_trigger: 'Two stalled weeks',
          deload_strategy: 'Reduce volume by 50% for one week',
        },
      },
    })
  })

  it('shows non-linear progression details in the review summary', () => {
    render(<ReviewStep />)

    expect(screen.getByText('Progression')).toBeInTheDocument()
    expect(screen.getByText('Style: Wave')).toBeInTheDocument()
    expect(screen.getByText('Deload trigger: Two stalled weeks')).toBeInTheDocument()
    expect(screen.getByText('Deload strategy: Reduce volume by 50% for one week')).toBeInTheDocument()
  })
})