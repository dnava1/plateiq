'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createProgramSchema, type CreateProgramInput } from '@/lib/validations/program'
import { useCreateProgram } from '@/hooks/usePrograms'
import { getTemplate } from '@/lib/constants/templates'
import { TemplatePicker } from './TemplatePicker'
import { SupplementSelector } from './SupplementSelector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { toast } from 'sonner'

type Step = 'pick' | 'supplement' | 'configure'

interface ProgramConfigFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProgramConfigForm({ open, onOpenChange }: ProgramConfigFormProps) {
  const [step, setStep] = useState<Step>('pick')
  const createProgram = useCreateProgram()

  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateProgramInput>({
    resolver: zodResolver(createProgramSchema),
    defaultValues: {
      template_key: '',
      name: '',
      supplement_key: undefined,
      rounding: 5,
      tm_percentage: 0.9,
    },
  })

  const templateKey = watch('template_key')
  const template = templateKey ? getTemplate(templateKey) : null
  const hasSupplements = (template?.supplement_options?.length ?? 0) > 0

  const handleTemplateSelect = (key: string) => {
    const tpl = getTemplate(key)
    setValue('template_key', key)
    setValue('name', tpl?.name ?? '')
    setValue('supplement_key', undefined)
    if (tpl?.default_tm_percentage) {
      setValue('tm_percentage', tpl.default_tm_percentage)
    }
  }

  const handleNext = () => {
    if (!templateKey) {
      toast.error('Select a template first')
      return
    }
    if (step === 'pick') {
      if (hasSupplements) {
        setStep('supplement')
      } else {
        setStep('configure')
      }
    } else if (step === 'supplement') {
      setStep('configure')
    }
  }

  const handleBack = () => {
    if (step === 'configure') {
      setStep(hasSupplements ? 'supplement' : 'pick')
    } else if (step === 'supplement') {
      setStep('pick')
    }
  }

  const onSubmit = (data: CreateProgramInput) => {
    createProgram.mutate(data, {
      onSuccess: () => {
        toast.success(`Program "${data.name}" created!`)
        reset()
        setStep('pick')
        onOpenChange(false)
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset()
      setStep('pick')
    }
    onOpenChange(open)
  }

  const stepLabel = step === 'pick' ? 'Choose Program' : step === 'supplement' ? 'Choose Supplement' : 'Configure'
  const totalSteps = hasSupplements ? 3 : 2
  const currentStep = step === 'pick' ? 1 : step === 'supplement' ? 2 : totalSteps

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>New Program</SheetTitle>
          <SheetDescription>
            Step {currentStep} of {totalSteps} — {stepLabel}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          {step === 'pick' && (
            <TemplatePicker
              selectedKey={templateKey || null}
              onSelect={handleTemplateSelect}
            />
          )}

          {step === 'supplement' && template?.supplement_options && (
            <Controller
              name="supplement_key"
              control={control}
              render={({ field }) => (
                <SupplementSelector
                  options={template.supplement_options!}
                  selectedKey={field.value ?? null}
                  onSelect={(key) => field.onChange(key ?? undefined)}
                />
              )}
            />
          )}

          {step === 'configure' && template && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="font-medium">{template.name}</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {template.days_per_week} days/week · {template.cycle_length_weeks}-week cycle
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Program Name</Label>
                <Input
                  id="name"
                  placeholder={template.name}
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              {template.uses_training_max && (
                <div className="space-y-2">
                  <Label htmlFor="tm_percentage">
                    TM Percentage{' '}
                    <span className="text-muted-foreground font-normal">
                      (default {Math.round((template.default_tm_percentage ?? 0.9) * 100)}%)
                    </span>
                  </Label>
                  <Controller
                    name="tm_percentage"
                    control={control}
                    render={({ field }) => (
                      <select
                        id="tm_percentage"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      >
                        <option value={0.85}>85%</option>
                        <option value={0.875}>87.5%</option>
                        <option value={0.9}>90%</option>
                        <option value={0.925}>92.5%</option>
                        <option value={0.95}>95%</option>
                      </select>
                    )}
                  />
                  {errors.tm_percentage && (
                    <p className="text-sm text-destructive">{errors.tm_percentage.message}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="rounding">Weight Rounding (lbs)</Label>
                <Controller
                  name="rounding"
                  control={control}
                  render={({ field }) => (
                    <select
                      id="rounding"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    >
                      <option value={2.5}>2.5 lbs</option>
                      <option value={5}>5 lbs</option>
                      <option value={10}>10 lbs</option>
                    </select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date (optional)</Label>
                <Input
                  id="start_date"
                  type="date"
                  {...register('start_date')}
                />
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-2 pt-2">
            {step !== 'pick' && (
              <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
            )}
            {step !== 'configure' ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!templateKey}
                className="flex-1"
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={createProgram.isPending}
                className="flex-1"
              >
                {createProgram.isPending ? 'Creating…' : 'Create Program'}
              </Button>
            )}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
