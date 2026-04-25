import { describe, expect, it } from 'vitest'
import {
  resolveExecutionTrainingMaxTargetScope,
  resolveExecutionTrainingMaxTargetScopeFromDays,
  resolveTrainingMaxTargetScope,
  resolveTrainingMaxTargetScopeFromDays,
} from './trainingMax'

describe('resolveTrainingMaxTargetScopeFromDays', () => {
  it('collects only unique primary lifts in encounter order', () => {
    expect(resolveTrainingMaxTargetScopeFromDays([
      {
        label: 'Day 1',
        exercise_blocks: [
          {
            role: 'primary',
            exercise_id: 1,
            exercise_key: 'Squat',
            sets: [{ sets: 3, reps: 5, intensity: 0.75, intensity_type: 'percentage_tm' }],
          },
          {
            role: 'variation',
            exercise_id: 2,
            exercise_key: 'Bench Press',
            sets: [{ sets: 3, reps: 8, intensity: 0.7, intensity_type: 'percentage_1rm' }],
          },
        ],
      },
      {
        label: 'Day 2',
        exercise_blocks: [
          {
            role: 'primary',
            exercise_id: 1,
            exercise_key: 'squat',
            sets: [{ sets: 5, reps: 3, intensity: 0.8, intensity_type: 'percentage_tm' }],
          },
          {
            role: 'primary',
            exercise_id: 3,
            exercise_key: 'Deadlift',
            sets: [{ sets: 1, reps: 5, intensity: 0.85, intensity_type: 'percentage_tm' }],
          },
        ],
      },
    ])).toEqual({
      exerciseIds: [1, 3],
      exerciseKeys: ['Squat', 'Deadlift'],
    })
  })
})

describe('resolveExecutionTrainingMaxTargetScopeFromDays', () => {
  it('collects every unique lift that still has TM-backed execution, even outside primary blocks', () => {
    expect(resolveExecutionTrainingMaxTargetScopeFromDays([
      {
        label: 'Day 1',
        exercise_blocks: [
          {
            role: 'primary',
            exercise_id: 1,
            exercise_key: 'Squat',
            sets: [{ sets: 3, reps: 5, intensity: 225, intensity_type: 'fixed_weight' }],
          },
          {
            role: 'variation',
            exercise_id: 2,
            exercise_key: 'Bench Press',
            sets: [{ sets: 3, reps: 8, intensity: 0.7, intensity_type: 'percentage_1rm' }],
          },
          {
            role: 'accessory',
            exercise_id: 3,
            exercise_key: 'Cable Row',
            sets: [{ sets: 3, reps: 12, intensity: 0, intensity_type: 'bodyweight' }],
          },
        ],
      },
      {
        label: 'Day 2',
        exercise_blocks: [
          {
            role: 'primary',
            exercise_id: 4,
            exercise_key: 'Deadlift',
            sets: [{ sets: 1, reps: 5, intensity: 0.85, intensity_type: 'percentage_tm' }],
          },
        ],
      },
    ])).toEqual({
      exerciseIds: [2, 4],
      exerciseKeys: ['Bench Press', 'Deadlift'],
    })
  })
})

describe('week-aware training max target scopes', () => {
  it('includes primary lifts that only appear in week overrides', () => {
    expect(resolveTrainingMaxTargetScope({
      cycle_length_weeks: 2,
      days: [
        {
          label: 'Week 1 Day 1',
          exercise_blocks: [
            {
              role: 'primary',
              exercise_id: 1,
              exercise_key: 'Squat',
              sets: [{ sets: 3, reps: 5, intensity: 225, intensity_type: 'fixed_weight' }],
            },
          ],
        },
      ],
      week_schemes: {
        2: {
          label: 'Week 2',
          days: [
            {
              label: 'Week 2 Day 1',
              exercise_blocks: [
                {
                  role: 'primary',
                  exercise_id: 2,
                  exercise_key: 'Bench Press',
                  sets: [{ sets: 3, reps: 5, intensity: 185, intensity_type: 'fixed_weight' }],
                },
              ],
            },
          ],
        },
      },
    })).toEqual({
      exerciseIds: [1, 2],
      exerciseKeys: ['Squat', 'Bench Press'],
    })
  })

  it('includes execution lifts that only appear in week overrides', () => {
    expect(resolveExecutionTrainingMaxTargetScope({
      cycle_length_weeks: 2,
      days: [
        {
          label: 'Week 1 Day 1',
          exercise_blocks: [
            {
              role: 'primary',
              exercise_id: 1,
              exercise_key: 'Squat',
              sets: [{ sets: 3, reps: 5, intensity: 225, intensity_type: 'fixed_weight' }],
            },
          ],
        },
      ],
      week_schemes: {
        2: {
          label: 'Week 2',
          days: [
            {
              label: 'Week 2 Day 1',
              exercise_blocks: [
                {
                  role: 'variation',
                  exercise_id: 2,
                  exercise_key: 'Bench Press',
                  sets: [{ sets: 3, reps: 5, intensity: 0.8, intensity_type: 'percentage_tm' }],
                },
              ],
            },
          ],
        },
      },
    })).toEqual({
      exerciseIds: [2],
      exerciseKeys: ['Bench Press'],
    })
  })
})