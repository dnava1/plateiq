import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExerciseLibraryField } from './ExerciseLibraryField'

const useExercisesMock = vi.fn()
let exerciseLibrary: Array<{
  id: number
  name: string
  category: string
  is_main_lift: boolean
  movement_pattern: string
  created_by_user_id: string | null
  progression_increment_lbs: number | null
  created_at: string | null
}> = []

vi.mock('@/hooks/useExercises', () => ({
  useExercises: () => useExercisesMock(),
}))

vi.mock('@/components/exercises/CreateExerciseForm', () => ({
  CreateExerciseForm: ({ open, onOpenChange, onCreated, initialValues }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCreated?: (exercise: {
      id: number
      name: string
      category: string
      is_main_lift: boolean
      movement_pattern: string
      created_by_user_id: string | null
      progression_increment_lbs: number | null
      created_at: string | null
    }) => void
    initialValues?: {
      name?: string
      category?: string
    }
  }) => (
    open ? (
      <div>
        <p>Create exercise dialog</p>
        <button
          type="button"
          onClick={() => {
            const createdExercise = {
              id: 999,
              name: initialValues?.name ?? 'Cable Row',
              category: initialValues?.category ?? 'accessory',
              is_main_lift: initialValues?.category === 'main',
              movement_pattern: 'other',
              created_by_user_id: 'user-1',
              progression_increment_lbs: null,
              created_at: null,
            }

            exerciseLibrary = [...exerciseLibrary, createdExercise]
            onCreated?.(createdExercise)
            onOpenChange(false)
          }}
        >
          Finish create
        </button>
      </div>
    ) : null
  ),
}))

function ExerciseLibraryFieldHarness({ defaultCategory = 'accessory' }: { defaultCategory?: 'main' | 'accessory' }) {
  const [selection, setSelection] = useState<{ id?: number; name?: string }>({})

  return (
    <>
      <ExerciseLibraryField
        selectedExerciseId={selection.id}
        value={selection.name}
        defaultCategory={defaultCategory}
        onSelect={({ exerciseId, exerciseName }) => setSelection({ id: exerciseId, name: exerciseName })}
      />
      <p data-testid="selection-state">{selection.id ?? 'none'}:{selection.name ?? 'none'}</p>
    </>
  )
}

describe('ExerciseLibraryField', () => {
  beforeEach(() => {
    exerciseLibrary = [
      {
        id: 1,
        name: 'Bench Press',
        category: 'main',
        is_main_lift: true,
        movement_pattern: 'push',
        created_by_user_id: null,
        progression_increment_lbs: 5,
        created_at: null,
      },
      {
        id: 2,
        name: 'Barbell Row',
        category: 'accessory',
        is_main_lift: false,
        movement_pattern: 'pull',
        created_by_user_id: 'user-1',
        progression_increment_lbs: null,
        created_at: null,
      },
      {
        id: 3,
        name: 'Bench Press',
        category: 'accessory',
        is_main_lift: false,
        movement_pattern: 'push',
        created_by_user_id: 'user-1',
        progression_increment_lbs: null,
        created_at: null,
      },
    ]

    useExercisesMock.mockImplementation(() => ({
      data: exerciseLibrary,
      isLoading: false,
    }))
  })

  it('filters the library and selects an existing exercise', async () => {
    const user = userEvent.setup()

    render(<ExerciseLibraryFieldHarness defaultCategory="main" />)

    await user.type(screen.getByLabelText('Exercise'), 'bench')
    await user.click(screen.getAllByRole('option', { name: /Bench Press/i })[0])

    expect(screen.getByDisplayValue('Bench Press')).toBeInTheDocument()
    expect(screen.getByText('Selected')).toBeInTheDocument()
    expect(screen.getByTestId('selection-state')).toHaveTextContent('1:Bench Press')
  })

  it('creates and selects a custom exercise inline', async () => {
    const user = userEvent.setup()

    render(<ExerciseLibraryFieldHarness />)

    await user.type(screen.getByLabelText('Exercise'), 'Cable Row')
    await user.click(screen.getByRole('button', { name: 'Create Exercise' }))

    expect(screen.getByText('Create exercise dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Finish create' }))

    expect(screen.getByDisplayValue('Cable Row')).toBeInTheDocument()
    expect(screen.getByText('Selected')).toBeInTheDocument()
    expect(screen.getByTestId('selection-state')).toHaveTextContent('999:Cable Row')
  })

  it('tracks selection by exercise id when duplicate names exist', async () => {
    const user = userEvent.setup()

    render(<ExerciseLibraryFieldHarness />)

    await user.type(screen.getByLabelText('Exercise'), 'bench')
    const [libraryBench, customBench] = screen.getAllByRole('option', { name: /Bench Press/i })

    expect(libraryBench).toHaveAccessibleName(/Bench Press/i)
    expect(customBench).toHaveAccessibleName(/Bench Press/i)

    await user.click(customBench)

    expect(screen.getByTestId('selection-state')).toHaveTextContent('3:Bench Press')
    expect(customBench).toHaveAttribute('aria-selected', 'true')
    expect(libraryBench).toHaveAttribute('aria-selected', 'false')
  })
})