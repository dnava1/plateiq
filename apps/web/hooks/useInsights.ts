'use client'

import { useMutation } from '@tanstack/react-query'
import { generateInsightRequestSchema, trainingInsightSchema } from '@/lib/validations/insights'
import type { GenerateInsightInput, TrainingInsight } from '@/types/insights'

async function generateInsight(input: GenerateInsightInput): Promise<TrainingInsight> {
  const request = generateInsightRequestSchema.parse(input)
  const response = await fetch('/api/insights/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(
      payload && typeof payload.error === 'string'
        ? payload.error
        : 'Unable to generate an insight right now.',
    ) as Error & { status?: number }

    error.status = response.status
    throw error
  }

  return trainingInsightSchema.parse(payload)
}

export function useInsights() {
  return useMutation({
    mutationKey: ['insights', 'generate'],
    mutationFn: generateInsight,
  })
}