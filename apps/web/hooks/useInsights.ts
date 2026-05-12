'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { generateInsightRequestSchema, trainingInsightResultSchema } from '@/lib/validations/insights'
import type { GenerateInsightInput, TrainingInsightResult } from '@/types/insights'

export const insightQueryKeys = {
  all: () => ['insights'] as const,
  last: (input: GenerateInsightInput) => [
    'insights',
    input.exerciseId ?? 'all',
    input.dateFrom,
    input.dateTo,
  ] as const,
}

function normalizeInsightInput(input: GenerateInsightInput) {
  return generateInsightRequestSchema.parse(input)
}

async function readJsonPayload(response: Response) {
  return response.json().catch(() => null)
}

function toInsightError(response: Response, payload: unknown, fallbackMessage: string) {
  const error = new Error(
    payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : fallbackMessage,
  ) as Error & { status?: number }

  error.status = response.status
  return error
}

async function fetchLastInsight(
  input: GenerateInsightInput,
  signal?: AbortSignal,
): Promise<TrainingInsightResult | null> {
  const request = normalizeInsightInput(input)
  const params = new URLSearchParams({
    dateFrom: request.dateFrom,
    dateTo: request.dateTo,
  })

  if (request.exerciseId !== null) {
    params.set('exerciseId', String(request.exerciseId))
  }

  const response = await fetch(`/api/insights/last?${params.toString()}`, { signal })

  if (response.status === 204) {
    return null
  }

  const payload = await readJsonPayload(response)

  if (!response.ok) {
    throw toInsightError(response, payload, 'Unable to load the last saved insight right now.')
  }

  return trainingInsightResultSchema.parse(payload)
}

async function generateInsight(input: GenerateInsightInput): Promise<TrainingInsightResult> {
  const request = normalizeInsightInput(input)
  const response = await fetch('/api/insights/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  const payload = await readJsonPayload(response)

  if (!response.ok) {
    throw toInsightError(response, payload, 'Unable to generate an insight right now.')
  }

  return trainingInsightResultSchema.parse(payload)
}

export function useInsights(input: GenerateInsightInput) {
  const queryClient = useQueryClient()
  const normalizedInput = normalizeInsightInput(input)
  const queryKey = insightQueryKeys.last(normalizedInput)

  const lastInsightQuery = useQuery({
    queryKey,
    queryFn: async ({ signal }) => fetchLastInsight(normalizedInput, signal),
    refetchOnMount: 'always',
    staleTime: 60 * 1000,
  })

  const generateInsightMutation = useMutation({
    mutationKey: [...queryKey, 'generate'],
    mutationFn: async () => generateInsight(normalizedInput),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })
    },
    onSuccess: (nextInsight) => {
      queryClient.setQueryData<TrainingInsightResult | null>(queryKey, nextInsight)
    },
  })

  return {
    insight: lastInsightQuery.data ?? null,
    error: generateInsightMutation.error ?? (lastInsightQuery.data ? null : lastInsightQuery.error ?? null),
    isPending: generateInsightMutation.isPending,
    isLoading: lastInsightQuery.isLoading,
    generate: () => {
      generateInsightMutation.reset()
      generateInsightMutation.mutate()
    },
    reset: generateInsightMutation.reset,
  }
}