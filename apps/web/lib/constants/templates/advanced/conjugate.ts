import type { ProgramTemplate } from '@/types/template'

export const conjugate: ProgramTemplate = {
  key: 'conjugate',
  name: 'Conjugate (Westside)',
  level: 'advanced',
  description:
    'Westside Barbell\'s Conjugate method by Louie Simmons. 4 days per week: Max Effort Upper, Max Effort Lower, Dynamic Effort Upper, Dynamic Effort Lower. ME days build maximal strength through heavy singles/triples; DE days develop explosive speed strength with submaximal weight.',
  days_per_week: 4,
  cycle_length_weeks: 3,
  uses_training_max: false,
  required_exercises: ['squat', 'bench', 'ohp', 'deadlift', 'row', 'good_morning', 'box_squat', 'board_press'],
  days: [
    {
      label: 'Max Effort Upper',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'board_press',
          sets: [
            { sets: 1, reps: 5, intensity: 6.0, intensity_type: 'rpe' },
            { sets: 1, reps: 3, intensity: 8.0, intensity_type: 'rpe' },
            { sets: 1, reps: 2, intensity: 9.0, intensity_type: 'rpe' },
            { sets: 1, reps: '1-3', intensity: 10.0, intensity_type: 'rpe' },
          ],
          notes: 'Max Effort — work to 1-3RM on rotating ME exercise (board press, floor press, close-grip, Slingshot, etc.). Rotate every 2-3 weeks.',
        },
        {
          role: 'variation',
          exercise_key: 'row',
          sets: [{ sets: 4, reps: '8-12', intensity: 7.5, intensity_type: 'rpe' }],
          notes: 'Secondary upper back work — DB rows, cable rows, or face pulls',
        },
        {
          role: 'accessory',
          exercise_key: 'tricep_extension',
          sets: [{ sets: 4, reps: '10-15', intensity: 7.0, intensity_type: 'rpe' }],
          notes: 'Tricep accessory — JM press, extensions, pushdowns',
        },
        {
          role: 'accessory',
          exercise_key: 'delt_raise',
          sets: [{ sets: 3, reps: '15-20', intensity: 6.5, intensity_type: 'rpe' }],
          notes: 'Shoulder health work — raises, face pulls',
        },
      ],
    },
    {
      label: 'Max Effort Lower',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'good_morning',
          sets: [
            { sets: 1, reps: 5, intensity: 6.0, intensity_type: 'rpe' },
            { sets: 1, reps: 3, intensity: 8.0, intensity_type: 'rpe' },
            { sets: 1, reps: 2, intensity: 9.0, intensity_type: 'rpe' },
            { sets: 1, reps: '1-3', intensity: 10.0, intensity_type: 'rpe' },
          ],
          notes: 'Max Effort lower — rotate between SSB squat, box squat, good mornings, deadlift variations, trap bar DL. Work to a 1-3RM.',
        },
        {
          role: 'variation',
          exercise_key: 'rdl',
          sets: [{ sets: 4, reps: '6-10', intensity: 7.5, intensity_type: 'rpe' }],
          notes: 'Posterior chain accessory — RDLs, GHR, hyperextensions',
        },
        {
          role: 'accessory',
          exercise_key: 'ab_work',
          sets: [{ sets: 4, reps: '10-15', intensity: 7.0, intensity_type: 'rpe' }],
          notes: 'Core work — ab wheel, leg raises, reverse hypers',
        },
      ],
    },
    {
      label: 'Dynamic Effort Upper',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'bench',
          sets: [{ sets: 9, reps: 3, intensity: 0.55, intensity_type: 'percentage_1rm' }],
          notes: 'DE Bench — 9×3 @ 50-60% + optional accommodating resistance (bands/chains). Move bar explosively. 3-week wave: 50→55→60%.',
        },
        {
          role: 'variation',
          exercise_key: 'ohp',
          sets: [{ sets: 4, reps: '8-10', intensity: 7.0, intensity_type: 'rpe' }],
          notes: 'Overhead pressing accessory',
        },
        {
          role: 'accessory',
          exercise_key: 'row',
          sets: [{ sets: 5, reps: '10-15', intensity: 7.0, intensity_type: 'rpe' }],
          notes: 'Upper back volume — lat work, rows',
        },
        {
          role: 'accessory',
          exercise_key: 'tricep_extension',
          sets: [{ sets: 4, reps: '10-15', intensity: 7.0, intensity_type: 'rpe' }],
          notes: 'Tricep volume work',
        },
      ],
    },
    {
      label: 'Dynamic Effort Lower',
      exercise_blocks: [
        {
          role: 'primary',
          exercise_key: 'box_squat',
          sets: [{ sets: 10, reps: 2, intensity: 0.55, intensity_type: 'percentage_1rm' }],
          notes: 'DE Box Squat — 10-12×2 @ 50-60% + accommodating resistance. 3-week wave: 50→55→60%. Sit back onto box.',
        },
        {
          role: 'variation',
          exercise_key: 'deadlift',
          sets: [{ sets: 6, reps: 1, intensity: 0.60, intensity_type: 'percentage_1rm' }],
          notes: 'DE Deadlifts — 6-10 singles from floor or elevated (rack pulls, blocks)',
        },
        {
          role: 'accessory',
          exercise_key: 'rdl',
          sets: [{ sets: 4, reps: '6-8', intensity: 7.5, intensity_type: 'rpe' }],
          notes: 'Posterior chain volume — RDL, GHR, or reverse hyper',
        },
        {
          role: 'accessory',
          exercise_key: 'ab_work',
          sets: [{ sets: 4, reps: '10-15', intensity: 7.0, intensity_type: 'rpe' }],
          notes: 'Core strength work',
        },
      ],
    },
  ],
  progression: {
    style: 'wave',
    deload_trigger: 'Programmed — rotate ME exercises every 2-3 weeks',
    deload_strategy: '3-week wave on DE: 50→55→60%, then reset. ME: change exercise.',
  },
  source_url: 'https://www.westside-barbell.com',
}
