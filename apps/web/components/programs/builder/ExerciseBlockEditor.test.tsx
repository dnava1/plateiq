import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ExerciseBlockEditor } from './ExerciseBlockEditor'
import type { ExerciseBlock } from '@/types/template'

vi.mock('@/hooks/usePreferredUnit', () => ({
  usePreferredUnit: () => 'lbs',
}))

vi.mock('./ExerciseLibraryField', () => ({
  ExerciseLibraryField: () => <div>Exercise library field</div>,
}))

function buildBlock(overrides: Partial<ExerciseBlock> = {}): ExerciseBlock {
  return {
    role: 'primary',
    exercise_id: 1,
    exercise_key: 'Bench Press',
    sets: [
      {
        sets: 1,
        reps: 5,
        intensity: 0.75,
        intensity_type: 'percentage_tm',
      },
    ],
    ...overrides,
  }
}

function ExerciseBlockEditorHarness({ initialBlock }: { initialBlock: ExerciseBlock }) {
  const [block, setBlock] = useState(initialBlock)

  return (
    <>
      <ExerciseBlockEditor
        block={block}
        index={0}
        usesTrainingMax
        onChange={setBlock}
        onRemove={vi.fn()}
      />
      <p data-testid="set-state">{JSON.stringify(block.sets[0])}</p>
    </>
  )
}

async function chooseSetType(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByLabelText('Set Type'))
  await user.click(await screen.findByRole('option', { name: label }))
}

describe('ExerciseBlockEditor', () => {
  it('lets users mark a set as AMRAP from set type', async () => {
    const user = userEvent.setup()

    render(<ExerciseBlockEditorHarness initialBlock={buildBlock()} />)

    await chooseSetType(user, 'AMRAP')

    expect(screen.getByTestId('set-state')).toHaveTextContent('"is_amrap":true')
    expect(screen.getByLabelText('Set Type')).toHaveTextContent('AMRAP')
  })

  it('still treats a trailing plus in reps as an AMRAP shortcut', async () => {
    const user = userEvent.setup()

    render(<ExerciseBlockEditorHarness initialBlock={buildBlock()} />)

    await user.clear(screen.getByLabelText('Reps'))
    await user.type(screen.getByLabelText('Reps'), '5+')

    expect(screen.getByLabelText('Reps')).toHaveValue('5')
    expect(screen.getByTestId('set-state')).toHaveTextContent('"reps":5')
    expect(screen.getByTestId('set-state')).toHaveTextContent('"is_amrap":true')
    expect(screen.getByLabelText('Set Type')).toHaveTextContent('AMRAP')
  })

  it('removes the legacy plus suffix when set type returns to standard', async () => {
    const user = userEvent.setup()

    render(
      <ExerciseBlockEditorHarness
        initialBlock={buildBlock({
          sets: [
            {
              sets: 1,
              reps: '5+',
              intensity: 0.75,
              intensity_type: 'percentage_tm',
              is_amrap: true,
            },
          ],
        })}
      />,
    )

    await chooseSetType(user, 'Standard')

    expect(screen.getByLabelText('Reps')).toHaveValue('5')
    expect(screen.getByTestId('set-state')).toHaveTextContent('"reps":5')
    expect(screen.getByTestId('set-state')).toHaveTextContent('"is_amrap":false')
  })

  it('maps warm-up and backoff AMRAP set types onto the existing prescription fields', async () => {
    const user = userEvent.setup()

    render(<ExerciseBlockEditorHarness initialBlock={buildBlock()} />)

    await chooseSetType(user, 'Warm-up')

    expect(screen.getByTestId('set-state')).toHaveTextContent('"purpose":"warmup"')
    expect(screen.getByTestId('set-state')).toHaveTextContent('"is_amrap":false')

    await chooseSetType(user, 'Backoff AMRAP')

    expect(screen.getByTestId('set-state')).not.toHaveTextContent('"purpose":"warmup"')
    expect(screen.getByTestId('set-state')).toHaveTextContent('"display_type":"backoff"')
    expect(screen.getByTestId('set-state')).toHaveTextContent('"is_amrap":true')
  })

  it('uses the shared rest duration dropdown for program prescriptions', async () => {
    const user = userEvent.setup()

    render(<ExerciseBlockEditorHarness initialBlock={buildBlock()} />)

    const restSelect = screen.getByLabelText('Rest')

    expect(restSelect).toHaveTextContent('0:00')

    await user.click(restSelect)

    expect(await screen.findByRole('option', { name: '5:00' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '5:01' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('option', { name: '2:45' }))

    expect(screen.getByTestId('set-state')).toHaveTextContent('"rest_seconds":165')
  })
})
