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

vi.mock('@/hooks/useExercises', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useExercises')>('@/hooks/useExercises')
  return {
    ...actual,
    useExercises: () => useExercisesMock(),
  }
})

vi.mock('@/components/exercises/CreateExerciseForm', () => ({
  CreateExerciseForm: ({ open, onOpenChange, onCreated, onUpdated, initialValues, existingExercise }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    existingExercise?: {
      id: number
      name: string
      category: string
      is_main_lift: boolean
      movement_pattern: string
      created_by_user_id: string | null
      progression_increment_lbs: number | null
      created_at: string | null
    } | null
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
    onUpdated?: (exercise: {
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
        <p>{existingExercise ? 'Edit exercise dialog' : 'Create exercise dialog'}</p>
        <button
          type="button"
          onClick={() => {
            if (existingExercise) {
              const updatedExercise = {
                ...existingExercise,
                name: `${existingExercise.name} Updated`,
              }

              exerciseLibrary = exerciseLibrary.map((exercise) =>
                exercise.id === updatedExercise.id ? updatedExercise : exercise,
              )

              onUpdated?.(updatedExercise)
              onOpenChange(false)
              return
            }

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
          {existingExercise ? 'Finish edit' : 'Finish create'}
        </button>
      </div>
    ) : null
  ),
}))

function ExerciseLibraryFieldHarness({
  initialSelection,
}: {
  initialSelection?: { id?: number; name?: string }
}) {
  const [selection, setSelection] = useState<{ id?: number; name?: string }>(initialSelection ?? {})

  return (
    <>
      <ExerciseLibraryField
        selectedExerciseId={selection.id}
        value={selection.name}
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
        movement_pattern: 'horizontal_push',
        created_by_user_id: null,
        progression_increment_lbs: 5,
        created_at: null,
      },
      {
        id: 2,
        name: 'Barbell Row',
        category: 'accessory',
        is_main_lift: false,
        movement_pattern: 'horizontal_pull',
        created_by_user_id: 'user-1',
        progression_increment_lbs: null,
        created_at: null,
      },
      {
        id: 3,
        name: 'Bench Press',
        category: 'accessory',
        is_main_lift: false,
        movement_pattern: 'horizontal_push',
        created_by_user_id: 'user-1',
        progression_increment_lbs: null,
        created_at: null,
      },
      {
        id: 4,
        name: 'Overhead Press',
        category: 'main',
        is_main_lift: true,
        movement_pattern: 'vertical_push',
        created_by_user_id: null,
        progression_increment_lbs: 5,
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

    render(<ExerciseLibraryFieldHarness />)

    await user.type(screen.getByLabelText('Exercise'), 'bench')
    await user.click(screen.getAllByRole('button', { name: /Choose Bench Press/i })[0])

    expect(screen.getByDisplayValue('Bench Press')).toBeInTheDocument()
    expect(screen.queryByText('Selected')).not.toBeInTheDocument()
    expect(screen.getByTestId('selection-state')).toHaveTextContent('1:Bench Press')
  })

  it('clears the selected exercise when the selected pill is clicked again', async () => {
    const user = userEvent.setup()

    render(<ExerciseLibraryFieldHarness />)

    await user.type(screen.getByLabelText('Exercise'), 'bench')
    await user.click(screen.getAllByRole('button', { name: /Choose Bench Press/i })[0])
    await user.click(screen.getByRole('button', { name: /Unselect Bench Press system exercise Horizontal push/i }))

    expect(screen.getByLabelText('Exercise')).toHaveValue('')
    expect(screen.queryByText('Selected')).not.toBeInTheDocument()
    expect(screen.getByTestId('selection-state')).toHaveTextContent('none:none')
  })

  it('creates and selects a custom exercise inline', async () => {
    const user = userEvent.setup()

    render(<ExerciseLibraryFieldHarness />)

    await user.type(screen.getByLabelText('Exercise'), 'Cable Row')
    await user.click(screen.getByRole('button', { name: 'Create Exercise' }))

    expect(screen.getByText('Create exercise dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Finish create' }))

    expect(screen.getByDisplayValue('Cable Row')).toBeInTheDocument()
    expect(screen.queryByText('Selected')).not.toBeInTheDocument()
    expect(screen.getByTestId('selection-state')).toHaveTextContent('999:Cable Row')
  })

  it('tracks selection by exercise id when duplicate names exist', async () => {
    const user = userEvent.setup()

    render(<ExerciseLibraryFieldHarness />)

    await user.type(screen.getByLabelText('Exercise'), 'bench')
    const [libraryBench, customBench] = screen.getAllByRole('button', { name: /Choose Bench Press/i })

    expect(libraryBench).toHaveAccessibleName(/Bench Press/i)
    expect(customBench).toHaveAccessibleName(/Bench Press/i)

    await user.click(customBench)

    expect(screen.getByTestId('selection-state')).toHaveTextContent('3:Bench Press')
    expect(customBench).toHaveAttribute('aria-pressed', 'true')
    expect(libraryBench).toHaveAttribute('aria-pressed', 'false')
  })

  it('resolves template shorthand selections to seeded exercise names', async () => {
    render(<ExerciseLibraryFieldHarness initialSelection={{ name: 'ohp' }} />)

    expect(await screen.findByDisplayValue('Overhead Press')).toBeInTheDocument()
    expect(screen.getByTestId('selection-state')).toHaveTextContent('4:Overhead Press')
  })

  it('does not auto-bind an id when exact-name matches are ambiguous', () => {
    render(<ExerciseLibraryFieldHarness initialSelection={{ name: 'Bench Press' }} />)

    expect(screen.getByDisplayValue('Bench Press')).toBeInTheDocument()
    expect(screen.getByTestId('selection-state')).toHaveTextContent('none:Bench Press')

    const [libraryBench, customBench] = screen.getAllByRole('button', { name: /Choose Bench Press/i })

    expect(libraryBench).toHaveAttribute('aria-pressed', 'false')
    expect(customBench).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows all filtered results without truncating the library list', () => {
    exerciseLibrary = Array.from({ length: 10 }, (_, index) => ({
      id: index + 1,
      name: `Exercise ${index + 1}`,
      category: 'accessory',
      is_main_lift: false,
      movement_pattern: 'other',
      created_by_user_id: index % 2 === 0 ? 'user-1' : null,
      progression_increment_lbs: null,
      created_at: null,
    }))

    render(<ExerciseLibraryFieldHarness />)

    expect(screen.getAllByRole('button', { name: /^Choose /i })).toHaveLength(10)
  })

  it('shows edit actions only for custom exercises and updates them inline', async () => {
    const user = userEvent.setup()

    render(<ExerciseLibraryFieldHarness />)

    expect(screen.queryByRole('button', { name: 'Edit Overhead Press' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit Barbell Row' }))

    expect(screen.getByText('Edit exercise dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Finish edit' }))

    expect(screen.getByDisplayValue('Barbell Row Updated')).toBeInTheDocument()
    expect(screen.getByTestId('selection-state')).toHaveTextContent('2:Barbell Row Updated')
  })
})
