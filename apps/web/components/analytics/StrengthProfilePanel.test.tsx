import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createEmptyStrengthProfile } from '@/lib/strength-profile'
import type { StrengthProfileData } from '@/types/analytics'
import { StrengthProfilePanel } from './StrengthProfilePanel'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('@/hooks/usePreferredUnit', () => ({
  usePreferredUnit: () => 'lbs',
}))

const readyStrengthProfile: StrengthProfileData = {
  availableCategoryCount: 3,
  availableLiftCount: 3,
  categories: [
    { categoryKey: 'squat', categoryLabel: 'Squat', liftSlug: 'back_squat', liftName: 'Back Squat', score: 105, strengthLabel: 'Exceptional' },
    { categoryKey: 'floorPull', categoryLabel: 'Floor Pull', liftSlug: 'deadlift', liftName: 'Deadlift', score: 100, strengthLabel: 'Exceptional' },
    { categoryKey: 'horizontalPress', categoryLabel: 'Horizontal Press', liftSlug: 'bench_press', liftName: 'Bench Press', score: 95, strengthLabel: 'Advanced' },
  ],
  lifts: [
    {
      actualRepMaxes: [{ reps: 1, weightLbs: 475.8 }],
      benchmarkOneRepMaxLbs: 475.8,
      benchmarkRepMaxes: [{ reps: 1, weightLbs: 475.8 }],
      bestDate: '2026-04-10',
      bestExternalWeightLbs: 475.8,
      bestOneRepMaxLbs: 475.8,
      bestReps: 5,
      bestTotalLoadLbs: 475.8,
      categoryKey: 'squat',
      categoryLabel: 'Squat',
      expectedOneRepMaxLbs: 453.1,
      expectedRepMaxes: [{ reps: 1, weightLbs: 453.1 }],
      deviationFromTotalPct: 5,
      displayName: 'Back Squat',
      expectedAtTotalScoreLbs: 453.1,
      liftSlug: 'back_squat',
      muscleWeights: {},
      score: 105,
      sourceExerciseId: 1,
      sourceExerciseName: 'Squat',
      strengthLabel: 'Exceptional',
    },
    {
      actualRepMaxes: [{ reps: 1, weightLbs: 520.8 }],
      benchmarkOneRepMaxLbs: 520.8,
      benchmarkRepMaxes: [{ reps: 1, weightLbs: 520.8 }],
      bestDate: '2026-04-08',
      bestExternalWeightLbs: 520.8,
      bestOneRepMaxLbs: 520.8,
      bestReps: 3,
      bestTotalLoadLbs: 520.8,
      categoryKey: 'floorPull',
      categoryLabel: 'Floor Pull',
      deviationFromTotalPct: 0,
      displayName: 'Deadlift',
      expectedAtTotalScoreLbs: 520.8,
      expectedOneRepMaxLbs: 520.8,
      expectedRepMaxes: [{ reps: 1, weightLbs: 520.8 }],
      liftSlug: 'deadlift',
      muscleWeights: {},
      score: 100,
      sourceExerciseId: 2,
      sourceExerciseName: 'Deadlift',
      strengthLabel: 'Exceptional',
    },
    {
      actualRepMaxes: [{ reps: 1, weightLbs: 321.6 }],
      benchmarkOneRepMaxLbs: 321.6,
      benchmarkRepMaxes: [{ reps: 1, weightLbs: 321.6 }],
      bestDate: '2026-04-07',
      bestExternalWeightLbs: 321.6,
      bestOneRepMaxLbs: 321.6,
      bestReps: 4,
      bestTotalLoadLbs: 321.6,
      categoryKey: 'horizontalPress',
      categoryLabel: 'Horizontal Press',
      deviationFromTotalPct: -5,
      displayName: 'Bench Press',
      expectedAtTotalScoreLbs: 338.6,
      expectedOneRepMaxLbs: 338.6,
      expectedRepMaxes: [{ reps: 1, weightLbs: 338.6 }],
      liftSlug: 'bench_press',
      muscleWeights: {},
      score: 95,
      sourceExerciseId: 3,
      sourceExerciseName: 'Bench Press',
      strengthLabel: 'Advanced',
    },
  ],
  minimumCategoryCount: 2,
  minimumLiftCount: 3,
  missingFields: [],
  muscleGroups: [
    { muscleKey: 'quads', title: 'Quads', score: 103.4, strengthLabel: 'Exceptional' },
    { muscleKey: 'upperChest', title: 'Pecs (Clavicular Head)', score: 95, strengthLabel: 'Advanced' },
  ],
  profile: { ageYears: 32, bodyweightLbs: 181, sex: 'male' },
  status: 'ready',
  strongestLift: {
    actualOneRepMaxLbs: 475.8,
    deviationFromTotalPct: 5,
    displayName: 'Back Squat',
    expectedOneRepMaxLbs: 453.1,
    liftSlug: 'back_squat',
  },
  symmetryScore: 83.3,
  totalLabel: 'Exceptional',
  totalScore: 100,
  weakestLift: {
    actualOneRepMaxLbs: 321.6,
    deviationFromTotalPct: -5,
    displayName: 'Bench Press',
    expectedOneRepMaxLbs: 338.6,
    liftSlug: 'bench_press',
  },
}

const partialStrengthProfile: StrengthProfileData = {
  ...readyStrengthProfile,
  availableCategoryCount: 2,
  availableLiftCount: 2,
  lifts: readyStrengthProfile.lifts.slice(0, 2).map((lift) => ({
    ...lift,
    deviationFromTotalPct: null,
    expectedAtTotalScoreLbs: null,
  })),
  minimumCategoryCount: 3,
  status: 'insufficient_data',
  strongestLift: null,
  symmetryScore: null,
  totalLabel: null,
  totalScore: null,
  weakestLift: null,
}

const bodyweightStrengthProfile: StrengthProfileData = {
  ...readyStrengthProfile,
  availableCategoryCount: 2,
  availableLiftCount: 2,
  categories: [
    { categoryKey: 'pull', categoryLabel: 'Pull', liftSlug: 'chin_up', liftName: 'Chin-Up', score: 94, strengthLabel: 'Advanced' },
    { categoryKey: 'horizontalPress', categoryLabel: 'Horizontal Press', liftSlug: 'dip', liftName: 'Dip', score: 98, strengthLabel: 'Advanced' },
  ],
  lifts: [
    {
      actualRepMaxes: [{ reps: 1, weightLbs: 250 }],
      benchmarkOneRepMaxLbs: 285,
      benchmarkRepMaxes: [{ reps: 1, weightLbs: 285 }],
      bestDate: '2026-04-08',
      bestExternalWeightLbs: 0,
      bestOneRepMaxLbs: 250,
      bestReps: 10,
      bestTotalLoadLbs: 180,
      categoryKey: 'pull',
      categoryLabel: 'Pull',
      deviationFromTotalPct: -2,
      displayName: 'Chin-Up',
      expectedAtTotalScoreLbs: 255,
      expectedOneRepMaxLbs: 255,
      expectedRepMaxes: [{ reps: 1, weightLbs: 255 }],
      liftSlug: 'chin_up',
      muscleWeights: {},
      score: 94,
      sourceExerciseId: 3,
      sourceExerciseName: 'Chin-Up',
      strengthLabel: 'Advanced',
    },
    {
      actualRepMaxes: [{ reps: 1, weightLbs: 280 }],
      benchmarkOneRepMaxLbs: 290,
      benchmarkRepMaxes: [{ reps: 1, weightLbs: 290 }],
      bestDate: '2026-04-07',
      bestExternalWeightLbs: 55,
      bestOneRepMaxLbs: 280,
      bestReps: 5,
      bestTotalLoadLbs: 235,
      categoryKey: 'horizontalPress',
      categoryLabel: 'Horizontal Press',
      deviationFromTotalPct: 2,
      displayName: 'Dip',
      expectedAtTotalScoreLbs: 275,
      expectedOneRepMaxLbs: 275,
      expectedRepMaxes: [{ reps: 1, weightLbs: 275 }],
      liftSlug: 'dip',
      muscleWeights: {},
      score: 98,
      sourceExerciseId: 4,
      sourceExerciseName: 'Dip',
      strengthLabel: 'Advanced',
    },
  ],
  minimumCategoryCount: 2,
  minimumLiftCount: 2,
  muscleGroups: [],
  profile: { ageYears: 32, bodyweightLbs: 180, sex: 'male' },
  status: 'ready',
  strongestLift: {
    actualOneRepMaxLbs: 280,
    deviationFromTotalPct: 2,
    displayName: 'Dip',
    expectedOneRepMaxLbs: 275,
    liftSlug: 'dip',
  },
  symmetryScore: 92,
  totalLabel: 'Advanced',
  totalScore: 96,
  weakestLift: {
    actualOneRepMaxLbs: 250,
    deviationFromTotalPct: -2,
    displayName: 'Chin-Up',
    expectedOneRepMaxLbs: 255,
    liftSlug: 'chin_up',
  },
}

describe('StrengthProfilePanel', () => {
  it('renders summary metrics and lift standards for a ready profile', () => {
    render(<StrengthProfilePanel strengthProfile={readyStrengthProfile} />)

    expect(screen.getByText('Strength Profile')).toBeInTheDocument()
    expect(screen.getAllByText('100.0').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Back Squat').length).toBeGreaterThan(0)
    expect(screen.getByText('Muscle-Group Profile')).toBeInTheDocument()
    expect(screen.getByText('475 lbs')).toBeInTheDocument()
    expect(screen.getAllByText('Your Estimated 1RM').length).toBeGreaterThan(0)
    expect(screen.queryByText('Expected 1RM At Your Score')).not.toBeInTheDocument()
    expect(screen.getByText('1RM estimate from that set: 475 lbs')).toBeInTheDocument()
  })

  it('renders a setup call to action when athlete profile data is missing', () => {
    render(<StrengthProfilePanel strengthProfile={createEmptyStrengthProfile()} />)

    expect(screen.getByText(/Add athlete sex, age, and bodyweight/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Complete Strength Profile' })).toHaveAttribute('href', '/settings')
  })

  it('describes bodyweight-only and weighted benchmark lifts with the right load language', () => {
    render(<StrengthProfilePanel strengthProfile={bodyweightStrengthProfile} />)

    expect(screen.getByText('Best logged set: Bodyweight x 10')).toBeInTheDocument()
    expect(screen.getByText('1RM equivalent: 250 lbs total (+70 lbs added)')).toBeInTheDocument()
    expect(screen.getByText('Best logged set: +55 lbs added / 235 lbs total x 5')).toBeInTheDocument()
    expect(screen.getByText('1RM equivalent: 280 lbs total (+100 lbs added)')).toBeInTheDocument()
  })

  it('keeps summary metrics provisional while the profile is incomplete', () => {
    render(<StrengthProfilePanel strengthProfile={partialStrengthProfile} />)

    expect(screen.getByText(/Summary metrics stay provisional until then/i)).toBeInTheDocument()
    expect(screen.getByText('Complete the minimum lift coverage to unlock your final profile totals.')).toBeInTheDocument()
    expect(screen.getByText('Available once your profile covers enough scored categories.')).toBeInTheDocument()
    expect(screen.getAllByText('Waiting for a complete profile snapshot').length).toBe(2)
  })
})