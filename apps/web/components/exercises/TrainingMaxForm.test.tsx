import { describe, expect, it } from 'vitest'
import { displayToLbs } from '@/lib/utils'
import { resolveTrainingMaxWeightLbs } from './TrainingMaxForm'

describe('TrainingMaxForm', () => {
  it('rounds direct training max entries down before saving in kg mode', async () => {
    expect(resolveTrainingMaxWeightLbs({
      currentTm: undefined,
      initialDisplayWeight: 0,
      inputType: 'tm',
      submittedDisplayWeight: 101,
      submittedWeightLbs: displayToLbs(101, 'kg'),
      tmPercentage: 0.9,
      weightRoundingLbs: 5.51156,
    })).toBe(220.462)
  })

  it('rounds estimated 1RM derived training maxes down before saving', () => {
    expect(resolveTrainingMaxWeightLbs({
      currentTm: undefined,
      initialDisplayWeight: 0,
      inputType: '1rm',
      submittedDisplayWeight: 271,
      submittedWeightLbs: 271,
      tmPercentage: 0.9,
      weightRoundingLbs: 5,
    })).toBe(240)
  })
})