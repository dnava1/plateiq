'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createProgramSchema, type CreateProgramInput } from '@/lib/validations/program'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { useCreateProgram } from '@/hooks/usePrograms'
import { getTemplate } from '@/lib/constants/templates'
import { formatUnit, getRoundingOptions } from '@/lib/utils'
import { TemplatePicker } from './TemplatePicker'
import { SupplementSelector } from './SupplementSelector'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

type Step = 'pick' | 'supplement' | 'configure'

interface ProgramConfigFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProgramConfigForm({ open, onOpenChange }: ProgramConfigFormProps) {
  const [step, setStep] = useState<Step>('pick')
  const preferredUnit = usePreferredUnit()
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
      toast.error('Choose a template to continue.')
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

  const stepLabel = step === 'pick' ? 'Choose Template' : step === 'supplement' ? 'Choose Variation' : 'Set Details'
  const totalSteps = hasSupplements ? 3 : 2
  const currentStep = step === 'pick' ? 1 : step === 'supplement' ? 2 : totalSteps
  const roundingOptions = getRoundingOptions(preferredUnit)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader className="gap-4">
          <div className="flex flex-col gap-1.5 pr-8">
            <DialogTitle>Start a Program</DialogTitle>
            <DialogDescription>
              Step {currentStep} of {totalSteps} — {stepLabel}
            </DialogDescription>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          {step === 'pick' && (
            <TemplatePicker
              selectedKey={templateKey || null}
              onSelect={handleTemplateSelect}
              onOpenChange={handleOpenChange}
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
            <div className="flex flex-col gap-4">
              <Card className="border-border/70 bg-card/70">
                <CardContent className="flex flex-col gap-2 pt-4 text-sm">
                  <p className="font-medium text-foreground">{template.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {template.days_per_week} days/week · {template.cycle_length_weeks}-week cycle
                  </p>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-2">
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
                <div className="flex flex-col gap-2">
                  <Label htmlFor="tm_percentage">
                    TM Percentage{' '}
                    <span className="font-normal text-muted-foreground">
                      (default {Math.round((template.default_tm_percentage ?? 0.9) * 100)}%)
                    </span>
                  </Label>
                  <Controller
                    name="tm_percentage"
                    control={control}
                    render={({ field }) => (
                      <NativeSelect
                        id="tm_percentage"
                        className="h-9"
                        aria-invalid={!!errors.tm_percentage}
                        aria-describedby={errors.tm_percentage ? 'tm-percentage-error' : undefined}
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      >
                        <option value={0.85}>85%</option>
                        <option value={0.875}>87.5%</option>
                        <option value={0.9}>90%</option>
                        <option value={0.925}>92.5%</option>
                        <option value={0.95}>95%</option>
                      </NativeSelect>
                    )}
                  />
                  {errors.tm_percentage && (
                    <p id="tm-percentage-error" className="text-sm text-destructive">{errors.tm_percentage.message}</p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="rounding">Weight Rounding ({formatUnit(preferredUnit)})</Label>
                <Controller
                  name="rounding"
                  control={control}
                  render={({ field }) => (
                    <NativeSelect
                      id="rounding"
                      className="h-9"
                      aria-invalid={!!errors.rounding}
                      aria-describedby={errors.rounding ? 'rounding-error' : undefined}
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    >
                      {roundingOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </NativeSelect>
                  )}
                />
                {errors.rounding && (
                  <p id="rounding-error" className="text-sm text-destructive">{errors.rounding.message}</p>
                )}
              </div>
            </div>
          )}

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
      </DialogContent>
    </Dialog>
  )
}
