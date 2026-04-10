'use client'

import { useState } from 'react'
import { usePrograms } from '@/hooks/usePrograms'
import { ProgramConfigForm } from '@/components/programs/ProgramConfigForm'
import { ProgramCard } from '@/components/programs/ProgramCard'
import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'

export default function ProgramsPage() {
  const [formOpen, setFormOpen] = useState(false)
  const { data: programs, isLoading } = usePrograms()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Programs</h1>
        <Button onClick={() => setFormOpen(true)}>
          <PlusIcon />
          New Program
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading programs…
        </div>
      )}

      {!isLoading && (!programs || programs.length === 0) && (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-lg font-medium">No programs yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first strength program to get started.
          </p>
          <Button onClick={() => setFormOpen(true)} className="mt-4">
            <PlusIcon />
            New Program
          </Button>
        </div>
      )}

      {programs && programs.length > 0 && (
        <div className="space-y-3">
          {programs.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      )}

      <ProgramConfigForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
