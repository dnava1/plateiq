'use client'

import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { downloadAccountExport } from '@/lib/export/account-export-client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type ExportStatus = {
  message: string
  tone: 'error' | 'status'
} | null

const SUCCESS_STATE_DISMISS_MS = 5000

function focusElementById(id: string) {
  if (typeof document === 'undefined') {
    return
  }

  const element = document.getElementById(id)

  if (element instanceof HTMLElement) {
    element.focus()
  }
}

export function ExportDataCard() {
  const [status, setStatus] = useState<ExportStatus>(null)
  const exportAccountData = useMutation({
    mutationFn: async () => downloadAccountExport(),
    onSuccess: ({ filename }) => {
      setStatus({
        tone: 'status',
        message: `Your export download has started: ${filename}`,
      })
    },
    onError: (error: Error) => {
      setStatus({
        tone: 'error',
        message: error.message,
      })
    },
  })

  useEffect(() => {
    if (!status) {
      return
    }

    focusElementById('settings-export-status')
  }, [status])

  useEffect(() => {
    if (status?.tone !== 'status') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setStatus((current) => (current?.tone === 'status' ? null : current))
    }, SUCCESS_STATE_DISMISS_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [status])

  return (
    <Card className="surface-panel">
      <CardHeader>
        <CardTitle>Export Data</CardTitle>
        <CardDescription>
          Download your programs, cycles, workouts, logged sets, and referenced exercises.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            size="lg"
            disabled={exportAccountData.isPending}
            className="sm:w-auto"
            onClick={() => {
              setStatus(null)
              exportAccountData.mutate()
            }}
          >
            <Download data-icon="inline-start" />
            {exportAccountData.isPending ? 'Preparing Export…' : 'Export Data'}
          </Button>
        </div>

        {status && (
          <p
            id="settings-export-status"
            role={status.tone === 'error' ? 'alert' : 'status'}
            tabIndex={-1}
            className={status.tone === 'error' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}
          >
            {status.message}
          </p>
        )}
      </CardContent>
    </Card>
  )
}