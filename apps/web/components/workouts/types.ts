import type { ExecutionGroupMetadata, GeneratedSet } from '@/types/template'
import { estimateBenchmarkOneRepMax } from '@/lib/strength-benchmarks'

export const ESTIMATED_ONE_REP_MAX_PR_EPSILON_LBS = 0.5

export interface WorkoutDisplaySet extends Omit<GeneratedSet, 'rpe'> {
  exerciseId: number | null
  exerciseName: string
  loggedAt: string | null
  prescribedWeightLbs: number
  prescribedRpe: number | null
  repsActual: number | null
  rpe: number | null
  workoutId: number | null
}

export interface WorkoutDisplayBlock {
  blockId: string
  blockOrder: number
  completedCount: number
  executionGroup: ExecutionGroupMetadata | null
  exerciseId: number | null
  exerciseName: string
  nextPendingSet: WorkoutDisplaySet | null
  notes?: string
  role: WorkoutDisplaySet['block_role']
  sets: WorkoutDisplaySet[]
  totalCount: number
}

export interface WorkoutExecutionGroup {
  blocks: WorkoutDisplayBlock[]
  completedCount: number
  id: string
  kind: 'single' | NonNullable<ExecutionGroupMetadata['type']>
  label: string | null
  totalCount: number
}

export interface WorkoutExecutionSnapshot {
  blocks: WorkoutDisplayBlock[]
  completedBlocks: number
  completedSets: number
  groups: WorkoutExecutionGroup[]
  nextBlock: WorkoutDisplayBlock | null
  nextSet: WorkoutDisplaySet | null
  totalBlocks: number
  totalSets: number
}

export interface WorkoutExecutionCue {
  blockProgressLabel: string
  currentSetLabel: string
  followUpLabel: string | null
  groupProgressLabel: string | null
  roundLabel: string | null
  workoutProgressLabel: string
}

export function isSetLogged(set: Pick<WorkoutDisplaySet, 'repsActual'>) {
  return set.repsActual !== null
}

export function formatRepTarget(
  repsPrescribed: number,
  repsPrescribedMax?: number,
  isAmrap?: boolean,
) {
  if (isAmrap) {
    return `${repsPrescribed}+`
  }

  if (typeof repsPrescribedMax === 'number') {
    return `${repsPrescribed}-${repsPrescribedMax}`
  }

  return String(repsPrescribed)
}

export function isBackoffDisplayType(displayType: WorkoutDisplaySet['display_type'] | undefined) {
  return displayType === 'backoff'
}

export function formatSetTypeLabel(
  setType: WorkoutDisplaySet['set_type'],
  displayType?: WorkoutDisplaySet['display_type'],
) {
  if (isBackoffDisplayType(displayType)) {
    return 'Backoff'
  }

  switch (setType) {
    case 'main':
      return 'Main'
    case 'amrap':
      return 'AMRAP'
    case 'variation':
      return 'Variation'
    case 'accessory':
      return 'Accessory'
    case 'warmup':
      return 'Warmup'
    default:
      return 'Set'
  }
}

export function formatBlockRoleLabel(role: WorkoutDisplaySet['block_role']) {
  switch (role) {
    case 'primary':
      return 'Main work'
    case 'variation':
      return 'Variation'
    case 'accessory':
      return 'Accessory'
    default:
      return 'Block'
  }
}

export function formatExecutionGroupTypeLabel(type: NonNullable<ExecutionGroupMetadata['type']>) {
  return type === 'superset' ? 'Superset' : 'Circuit'
}

export function formatDurationClock(totalSeconds: number) {
  const normalizedSeconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(normalizedSeconds / 60)
  const seconds = normalizedSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function getRecommendedRestSeconds(
  set: Pick<WorkoutDisplaySet, 'block_role' | 'rest_seconds'>,
) {
  return typeof set.rest_seconds === 'number' ? set.rest_seconds : null
}

export function isQuickLoggableSet(
  set: Pick<WorkoutDisplaySet, 'intensity_type' | 'is_amrap' | 'weight_lbs'>,
) {
  if (set.is_amrap) {
    return false
  }

  if (set.intensity_type === 'rpe') {
    return false
  }

  return set.weight_lbs > 0 || set.intensity_type === 'bodyweight'
}

export function getSetPositionInBlock(
  block: Pick<WorkoutDisplayBlock, 'sets'>,
  setOrder: number,
) {
  const index = block.sets.findIndex((set) => set.set_order === setOrder)
  return index >= 0 ? index + 1 : null
}

function buildWorkoutBlocks(sets: WorkoutDisplaySet[]) {
  const blocksById = new Map<string, WorkoutDisplayBlock>()

  for (const set of [...sets].sort((left, right) => left.set_order - right.set_order)) {
    const existingBlock = blocksById.get(set.block_id)

    if (!existingBlock) {
      blocksById.set(set.block_id, {
        blockId: set.block_id,
        blockOrder: set.block_order,
        completedCount: isSetLogged(set) ? 1 : 0,
        executionGroup: set.execution_group ?? null,
        exerciseId: set.exerciseId,
        exerciseName: set.exerciseName,
        nextPendingSet: isSetLogged(set) ? null : set,
        notes: set.notes,
        role: set.block_role,
        sets: [set],
        totalCount: 1,
      })
      continue
    }

    existingBlock.sets.push(set)
    existingBlock.totalCount += 1

    if (isSetLogged(set)) {
      existingBlock.completedCount += 1
    } else if (!existingBlock.nextPendingSet) {
      existingBlock.nextPendingSet = set
    }
  }

  return Array.from(blocksById.values()).sort((left, right) => {
    if (left.blockOrder !== right.blockOrder) {
      return left.blockOrder - right.blockOrder
    }

    return left.sets[0]!.set_order - right.sets[0]!.set_order
  })
}

function buildWorkoutGroups(blocks: WorkoutDisplayBlock[]) {
  const groups: WorkoutExecutionGroup[] = []
  const groupOccurrences = new Map<string, number>()

  for (const block of blocks) {
    const groupKey = block.executionGroup?.key?.trim()
    const previousGroup = groups.at(-1)

    if (
      groupKey
      && previousGroup
      && previousGroup.kind !== 'single'
      && previousGroup.blocks.at(-1)?.executionGroup?.key === groupKey
    ) {
      previousGroup.blocks.push(block)
      previousGroup.completedCount += block.completedCount
      previousGroup.totalCount += block.totalCount
      continue
    }

    if (groupKey && block.executionGroup) {
      const nextOccurrence = (groupOccurrences.get(groupKey) ?? 0) + 1
      groupOccurrences.set(groupKey, nextOccurrence)

      groups.push({
        blocks: [block],
        completedCount: block.completedCount,
        id: `${groupKey}:${nextOccurrence}`,
        kind: block.executionGroup.type,
        label: block.executionGroup.label?.trim() || formatExecutionGroupTypeLabel(block.executionGroup.type),
        totalCount: block.totalCount,
      })
      continue
    }

    groups.push({
      blocks: [block],
      completedCount: block.completedCount,
      id: block.blockId,
      kind: 'single',
      label: null,
      totalCount: block.totalCount,
    })
  }

  return groups
}

interface ExecutionOrderItem {
  block: WorkoutDisplayBlock
  group: WorkoutExecutionGroup
  roundCount: number | null
  roundNumber: number | null
  set: WorkoutDisplaySet
  stepNumber: number | null
  stepsInRound: number | null
}

function buildExecutionOrderItems(groups: WorkoutExecutionGroup[]) {
  const orderedItems: ExecutionOrderItem[] = []

  for (const group of groups) {
    if (group.kind === 'single') {
      const block = group.blocks[0]!

      for (const set of block.sets) {
        orderedItems.push({
          block,
          group,
          roundCount: null,
          roundNumber: null,
          set,
          stepNumber: null,
          stepsInRound: null,
        })
      }

      continue
    }

    const roundCount = group.blocks.reduce(
      (maxRounds, block) => Math.max(maxRounds, block.sets.length),
      0,
    )

    for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
      const setsInRound = group.blocks
        .map((block) => ({ block, set: block.sets[roundIndex] }))
        .filter((entry): entry is { block: WorkoutDisplayBlock; set: WorkoutDisplaySet } => Boolean(entry.set))

      setsInRound.forEach((entry, stepIndex) => {
        orderedItems.push({
          block: entry.block,
          group,
          roundCount,
          roundNumber: roundIndex + 1,
          set: entry.set,
          stepNumber: stepIndex + 1,
          stepsInRound: setsInRound.length,
        })
      })
    }
  }

  return orderedItems
}

function buildExecutionOrderedSets(groups: WorkoutExecutionGroup[]) {
  return buildExecutionOrderItems(groups).map((item) => item.set)
}

function findNextUnfinishedExecutionItemAfter(
  orderedItems: ExecutionOrderItem[],
  currentIndex: number,
) {
  return orderedItems
    .slice(currentIndex + 1)
    .find((item) => !isSetLogged(item.set)) ?? null
}

export function buildWorkoutExecutionSnapshot(sets: WorkoutDisplaySet[]): WorkoutExecutionSnapshot {
  const orderedSets = [...sets].sort((left, right) => left.set_order - right.set_order)
  const blocks = buildWorkoutBlocks(orderedSets)
  const groups = buildWorkoutGroups(blocks)
  const executionOrderedSets = buildExecutionOrderedSets(groups)
  const nextSet = executionOrderedSets.find((set) => !isSetLogged(set)) ?? null
  const nextBlock = nextSet
    ? blocks.find((block) => block.blockId === nextSet.block_id) ?? null
    : null

  return {
    blocks,
    completedBlocks: blocks.filter((block) => block.completedCount === block.totalCount).length,
    completedSets: orderedSets.filter((set) => isSetLogged(set)).length,
    groups,
    nextBlock,
    nextSet,
    totalBlocks: blocks.length,
    totalSets: orderedSets.length,
  }
}

export function shouldAutoStartRestTimer(snapshot: WorkoutExecutionSnapshot, setOrder: number) {
  const orderedItems = buildExecutionOrderItems(snapshot.groups)
  const currentIndex = orderedItems.findIndex((item) => item.set.set_order === setOrder)

  if (currentIndex < 0) {
    return true
  }

  const currentItem = orderedItems[currentIndex]!
  const nextPendingItem = findNextUnfinishedExecutionItemAfter(orderedItems, currentIndex)

  if (!nextPendingItem) {
    return false
  }

  if (currentItem.group.kind === 'single') {
    return true
  }

  if (currentItem.group.id !== nextPendingItem.group.id) {
    return true
  }

  if (currentItem.roundNumber !== null && nextPendingItem.roundNumber !== null) {
    return currentItem.roundNumber !== nextPendingItem.roundNumber
  }

  return false
}

export function hasRemainingPendingWork(snapshot: WorkoutExecutionSnapshot, setOrder: number) {
  const orderedItems = buildExecutionOrderItems(snapshot.groups)
  const currentIndex = orderedItems.findIndex((item) => item.set.set_order === setOrder)

  if (currentIndex < 0) {
    return orderedItems.some((item) => !isSetLogged(item.set))
  }

  return findNextUnfinishedExecutionItemAfter(orderedItems, currentIndex) !== null
}

function buildFollowUpLabel(
  currentItem: ExecutionOrderItem | null,
  followingItem: ExecutionOrderItem | null,
) {
  if (!followingItem) {
    return null
  }

  const followingSetPosition = getSetPositionInBlock(followingItem.block, followingItem.set.set_order)

  if (currentItem && currentItem.group.id === followingItem.group.id && followingItem.group.kind !== 'single') {
    if (
      currentItem.roundNumber !== null
      && followingItem.roundNumber !== null
      && currentItem.roundNumber !== followingItem.roundNumber
    ) {
      return `After this, go back to ${followingItem.set.exerciseName} for round ${followingItem.roundNumber}.`
    }

    return `After this, move to ${followingItem.set.exerciseName} in ${followingItem.group.label ?? formatExecutionGroupTypeLabel(followingItem.group.kind)}.`
  }

  if (currentItem && currentItem.block.blockId === followingItem.block.blockId && followingSetPosition !== null) {
    return `After this, stay with ${followingItem.set.exerciseName} for set ${followingSetPosition}.`
  }

  if (followingSetPosition !== null) {
    return `After this, move to ${followingItem.set.exerciseName} set ${followingSetPosition}.`
  }

  return `After this, move to ${followingItem.set.exerciseName}.`
}

export function buildWorkoutExecutionCue(snapshot: WorkoutExecutionSnapshot): WorkoutExecutionCue | null {
  const { nextBlock, nextSet } = snapshot

  if (!nextBlock || !nextSet) {
    return null
  }

  const orderedItems = buildExecutionOrderItems(snapshot.groups)
  const currentIndex = orderedItems.findIndex((item) => item.set.set_order === nextSet.set_order)
  const currentItem = currentIndex >= 0 ? orderedItems[currentIndex] ?? null : null
  const followingItem = currentIndex >= 0
    ? findNextUnfinishedExecutionItemAfter(orderedItems, currentIndex)
    : null
  const nextSetPosition = getSetPositionInBlock(nextBlock, nextSet.set_order)
  const remainingSets = Math.max(0, snapshot.totalSets - snapshot.completedSets)
  const workoutProgressLabel = `Workout ${snapshot.completedSets} of ${snapshot.totalSets} sets logged. ${remainingSets} ${remainingSets === 1 ? 'set' : 'sets'} left.`
  const blockProgressLabel = `Set ${nextSetPosition ?? '?'} of ${nextBlock.totalCount} in this block. ${nextBlock.completedCount} logged so far.`

  if (!currentItem || currentItem.group.kind === 'single') {
    return {
      blockProgressLabel,
      currentSetLabel: `${nextSet.exerciseName} set ${nextSetPosition ?? '?'} of ${nextBlock.totalCount}`,
      followUpLabel: buildFollowUpLabel(currentItem, followingItem),
      groupProgressLabel: null,
      roundLabel: null,
      workoutProgressLabel,
    }
  }

  const roundLabel = currentItem.roundNumber !== null && currentItem.roundCount !== null
    ? `Round ${currentItem.roundNumber} of ${currentItem.roundCount}`
    : null
  const groupTypeLabel = formatExecutionGroupTypeLabel(currentItem.group.kind)
  const groupName = currentItem.group.label ?? groupTypeLabel

  return {
    blockProgressLabel,
    currentSetLabel: roundLabel
      ? `${nextSet.exerciseName} ${roundLabel.toLowerCase()}`
      : nextSet.exerciseName,
    followUpLabel: buildFollowUpLabel(currentItem, followingItem),
    groupProgressLabel: `${groupTypeLabel} step ${currentItem.stepNumber ?? '?'} of ${currentItem.stepsInRound ?? currentItem.group.blocks.length} in ${groupName}. ${currentItem.group.completedCount} of ${currentItem.group.totalCount} grouped sets logged.`,
    roundLabel,
    workoutProgressLabel,
  }
}

export function estimateOneRepMax(weightLbs: number, reps: number) {
  return estimateBenchmarkOneRepMax(weightLbs, reps) ?? weightLbs
}

export function isEstimatedOneRepMaxPr(
  nextEstimateLbs: number,
  historicalEstimatesLbs: number[],
  epsilonLbs: number = ESTIMATED_ONE_REP_MAX_PR_EPSILON_LBS,
) {
  const bestHistoricalEstimate = historicalEstimatesLbs.reduce(
    (best, current) => (Number.isFinite(current) ? Math.max(best, current) : best),
    Number.NEGATIVE_INFINITY,
  )

  if (!Number.isFinite(bestHistoricalEstimate)) {
    return Number.isFinite(nextEstimateLbs)
  }

  return nextEstimateLbs > bestHistoricalEstimate + epsilonLbs
}