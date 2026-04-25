'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller, type FieldErrors, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createProgramSchema, type CreateProgramInput } from '@/lib/validations/program'
import { useCreateProgram } from '@/hooks/usePrograms'
import { getTemplate } from '@/lib/constants/templates'
import { formatDaysPerWeek, formatWeekCycle } from '@/lib/utils'
import { TemplatePicker } from './TemplatePicker'
import { VariationSelector } from './VariationSelector'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  variation_key: undefined,
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
  const router = useRouter()
  const createProgram = useCreateProgram()
  const selectedTemplateRef = useRef<HTMLDivElement | null>(null)
  const shouldFocusSelectedTemplateRef = useRef(false)

  const {
    register,
    handleSubmit,
    control,
    getValues,
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

  useEffect(() => {
    if (!open || !template || !shouldFocusSelectedTemplateRef.current) {
      return
    }

    shouldFocusSelectedTemplateRef.current = false
    selectedTemplateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

    window.requestAnimationFrame(() => {
      setFocus('name')
    })
  }, [open, setFocus, template])

  const handleTemplateSelect = (key: string) => {
    const tpl = getTemplate(key)
    shouldFocusSelectedTemplateRef.current = true
    setValue('template_key', key, { shouldDirty: true, shouldValidate: true })
    setValue('name', tpl?.name ?? '', { shouldDirty: true })
    setValue('variation_key', undefined, { shouldDirty: true })

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
    const firstField = (['name', 'tm_percentage'] as const).find((field) => formErrors[field])

    if (firstField) {
      setFocus(firstField)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset(DEFAULT_VALUES)
    }

    onOpenChange(nextOpen)
  }

  const handleCustomizeInBuilder = () => {
    if (!template || !templateKey) {
      return
    }

    const {
      variation_key: selectedVariationKey,
      name: selectedName,
      tm_percentage: selectedTmPercentage,
    } = getValues()

    const params = new URLSearchParams({
      template: templateKey,
      name: selectedName?.trim() || template.name,
    })

    if (selectedVariationKey) {
      params.set('variation', selectedVariationKey)
    }

    if (template.uses_training_max) {
      params.set('tm', String(selectedTmPercentage ?? template.default_tm_percentage ?? DEFAULT_VALUES.tm_percentage))
    }

    handleOpenChange(false)
    router.push(`/programs/builder?${params.toString()}`)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="gap-2 pr-8">
          <div className="flex flex-col gap-1.5">
            <DialogTitle>Start a Program</DialogTitle>
            <DialogDescription>
              Pick a template and adjust its setup, or open the builder once and choose training-max behavior inside the flow only if the program actually needs it.
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
            {errors.template_key ? (
              <p role="alert" className="text-sm text-destructive">{errors.template_key.message}</p>
            ) : null}
          </div>

          {template ? (
            <div
              ref={selectedTemplateRef}
              className="flex flex-col gap-4 rounded-[24px] border border-border/70 bg-card/70 p-5"
            >
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Selected template</Badge>
                  <p className="text-sm font-medium text-foreground">{template.name}</p>
                  <Badge variant="outline" className="text-xs">{formatDaysPerWeek(template.days_per_week)}</Badge>
                  <Badge variant="outline" className="text-xs">{formatWeekCycle(template.cycle_length_weeks)}</Badge>
                  {template.uses_training_max ? (
                    <Badge variant="outline" className="text-xs">
                      TM default {Math.round((template.default_tm_percentage ?? 0.9) * 100)}%
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  The template card already carries the lift list. Use the info button there for weekly structure and variation context, then finish setup here.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                {template.variation_options && template.variation_options.length > 0 ? (
                  <Controller
                    name="variation_key"
                    control={control}
                    render={({ field }) => (
                      <VariationSelector
                        options={template.variation_options!}
                        selectedKey={field.value ?? null}
                        onSelect={(key) => field.onChange(key ?? undefined)}
                      />
                    )}
                  />
                ) : null}

                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Program Name</Label>
                  <Input
                    id="name"
                    placeholder={template.name}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'program-name-error' : undefined}
                    {...register('name')}
                  />
                  {errors.name ? (
                    <p id="program-name-error" className="text-sm text-destructive">{errors.name.message}</p>
                  ) : null}
                </div>

                {template.uses_training_max ? (
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
                            className="h-9 w-full"
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
                    {errors.tm_percentage ? (
                      <p id="tm-percentage-error" className="text-sm text-destructive">{errors.tm_percentage.message}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCustomizeInBuilder}
              disabled={!templateKey}
              className="flex-1"
            >
              Customize in Builder
            </Button>
            <Button
              type="submit"
              disabled={!templateKey || createProgram.isPending}
              className="flex-1"
            >
              {createProgram.isPending ? 'Creating...' : 'Create Program'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
