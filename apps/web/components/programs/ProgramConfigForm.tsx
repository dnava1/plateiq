'use client'

import { useForm, Controller, type FieldErrors, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createProgramSchema, type CreateProgramInput } from '@/lib/validations/program'
import { usePreferredUnit } from '@/hooks/usePreferredUnit'
import { useCreateProgram } from '@/hooks/usePrograms'
import { getTemplate } from '@/lib/constants/templates'
import { formatExerciseKey, formatUnit, getRoundingOptions } from '@/lib/utils'
import { TemplatePicker } from './TemplatePicker'
import { SupplementSelector } from './SupplementSelector'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface ProgramConfigFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DEFAULT_VALUES: CreateProgramInput = {
  template_key: '',
  name: '',
  supplement_key: undefined,
  rounding: 5,
  tm_percentage: 0.9,
}

const TM_PERCENTAGE_OPTIONS = [
  { value: '0.85', label: '85%' },
  { value: '0.875', label: '87.5%' },
  { value: '0.9', label: '90%' },
  { value: '0.925', label: '92.5%' },
  { value: '0.95', label: '95%' },
]

export function ProgramConfigForm({ open, onOpenChange }: ProgramConfigFormProps) {
  const preferredUnit = usePreferredUnit()
  const createProgram = useCreateProgram()

  const {
    register,
    handleSubmit,
    control,
    reset,
    setFocus,
    setValue,
    formState: { errors },
  } = useForm<CreateProgramInput>({
    resolver: zodResolver(createProgramSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const templateKey = useWatch({ control, name: 'template_key' })
  const template = templateKey ? getTemplate(templateKey) : null
  const hasSupplements = (template?.supplement_options?.length ?? 0) > 0
  const requiredLifts = template?.required_exercises.map(formatExerciseKey).join(', ') ?? ''

  const handleTemplateSelect = (key: string) => {
    const tpl = getTemplate(key)
    setValue('template_key', key, { shouldDirty: true, shouldValidate: true })
    setValue('name', tpl?.name ?? '', { shouldDirty: true })
    setValue('supplement_key', undefined, { shouldDirty: true })
    if (tpl?.default_tm_percentage) {
      setValue('tm_percentage', tpl.default_tm_percentage, { shouldDirty: true })
    }
  }

  const onSubmit = (data: CreateProgramInput) => {
    createProgram.mutate(data, {
      onSuccess: () => {
        toast.success(`Program "${data.name}" created!`)
        reset(DEFAULT_VALUES)
        onOpenChange(false)
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })
  }

  const handleInvalidSubmit = (formErrors: FieldErrors<CreateProgramInput>) => {
    const firstField = (['name', 'tm_percentage', 'rounding'] as const).find((field) => formErrors[field])
    if (firstField) {
      setFocus(firstField)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset(DEFAULT_VALUES)
    }
    onOpenChange(open)
  }

  const roundingOptions = getRoundingOptions(preferredUnit)
  const roundingSelectItems = roundingOptions.map((option) => ({
    value: String(option.value),
    label: option.label,
  }))

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="gap-2 pr-8">
          <div className="flex flex-col gap-1.5">
            <DialogTitle>Start a Program</DialogTitle>
            <DialogDescription>
              Pick a template, inspect the full approach, and tune the setup details without bouncing through a fake stepper.
            </DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit, handleInvalidSubmit)} className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <TemplatePicker
              selectedKey={templateKey || null}
              onSelect={handleTemplateSelect}
              onOpenChange={handleOpenChange}
            />
            {errors.template_key && (
              <p role="alert" className="text-sm text-destructive">{errors.template_key.message}</p>
            )}
          </div>

          {template && (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <Card className="border-border/70 bg-card/70">
                <CardContent className="flex h-full flex-col gap-4 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium text-foreground">Template details</p>
                      <p className="text-xs leading-5 text-muted-foreground">
                        A quick breakdown of the required lifts and weekly flow before you create the program.
                      </p>
                    </div>
                    {template.uses_training_max && (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                        Training max default {Math.round((template.default_tm_percentage ?? 0.9) * 100)}%
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 text-sm">
                    <p className="font-medium text-foreground">Required lifts</p>
                    <p className="leading-6 text-muted-foreground">{requiredLifts}</p>
                  </div>

                  <div className="flex flex-col gap-2 text-sm">
                    <p className="font-medium text-foreground">Weekly structure</p>
                    <div className="flex flex-wrap gap-2">
                      {template.days.map((day, index) => (
                        <span key={`${template.key}-${day.label}-${index}`} className="rounded-full bg-background px-2.5 py-1 text-xs text-muted-foreground">
                          {day.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {hasSupplements && (
                    <div className="flex flex-col gap-2 text-sm">
                      <p className="font-medium text-foreground">Available variations</p>
                      <div className="flex flex-wrap gap-2">
                        {template.supplement_options?.map((option) => (
                          <span key={option.key} className="rounded-full bg-background px-2.5 py-1 text-xs text-muted-foreground">
                            {option.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex flex-col gap-4">
                {template.supplement_options && template.supplement_options.length > 0 && (
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

                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Program Name</Label>
                  <Input
                    id="name"
                    placeholder={template.name}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'program-name-error' : undefined}
                    {...register('name')}
                  />
                  {errors.name && (
                    <p id="program-name-error" className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                {template.uses_training_max && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="tm_percentage">
                      Training Max Percentage{' '}
                      <span className="font-normal text-muted-foreground">
                        (default {Math.round((template.default_tm_percentage ?? 0.9) * 100)}%)
                      </span>
                    </Label>
                    <Controller
                      name="tm_percentage"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={String(field.value)}
                          onValueChange={(value) => field.onChange(Number(value))}
                          items={TM_PERCENTAGE_OPTIONS}
                        >
                          <SelectTrigger
                            id="tm_percentage"
                            className="w-full h-9"
                            aria-invalid={!!errors.tm_percentage}
                            aria-describedby={errors.tm_percentage ? 'tm-percentage-error' : undefined}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {TM_PERCENTAGE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
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
                      <Select
                        value={String(field.value)}
                        onValueChange={(value) => field.onChange(Number(value))}
                        items={roundingSelectItems}
                      >
                        <SelectTrigger
                          id="rounding"
                          className="w-full h-9"
                          aria-invalid={!!errors.rounding}
                          aria-describedby={errors.rounding ? 'rounding-error' : undefined}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {roundingSelectItems.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.rounding && (
                    <p id="rounding-error" className="text-sm text-destructive">{errors.rounding.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!templateKey || createProgram.isPending}
              className="flex-1"
            >
              {createProgram.isPending ? 'Creating…' : 'Create Program'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
