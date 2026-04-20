'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LegalBackButton() {
  const router = useRouter()

  return (
    <Button
      type="button"
      variant="outline"
      size="default"
      className="w-fit rounded-full border-border/70 bg-background px-4 text-foreground shadow-sm hover:bg-muted"
      onClick={() => {
        if (window.history.length > 1) {
          router.back()
          return
        }

        router.push('/continue')
      }}
    >
      <ArrowLeft data-icon="inline-start" />
      Back
    </Button>
  )
}