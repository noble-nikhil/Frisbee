import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Field, type FieldProps } from './field'

type FieldBits = Pick<FieldProps, 'label' | 'hint' | 'error' | 'required'>

export const controlClass = (invalid?: boolean) =>
  cn(
    'w-full rounded-sm border bg-surface px-3 text-[16px] text-ink md:text-body',
    'placeholder:text-ink-4 transition-[border-color,box-shadow] duration-150',
    'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
    'disabled:bg-canvas disabled:text-ink-3',
    invalid ? 'border-danger' : 'border-line-strong',
  )

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldBits {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, required, className, ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {(id, describedBy) => (
        <input
          ref={ref}
          id={id}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className={cn(controlClass(!!error), 'h-11 md:h-10')}
          {...rest}
        />
      )}
    </Field>
  )
})

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldBits {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, required, className, rows = 3, ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {(id, describedBy) => (
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className={cn(controlClass(!!error), 'max-h-40 resize-y py-2.5 leading-[22px]')}
          {...rest}
        />
      )}
    </Field>
  )
})

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldBits {
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, required, className, placeholder, children, ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {(id, describedBy) => (
        <div className="relative">
          <select
            ref={ref}
            id={id}
            aria-invalid={!!error || undefined}
            aria-describedby={describedBy}
            className={cn(controlClass(!!error), 'h-11 appearance-none pr-9 md:h-10')}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {children}
          </select>
          <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-3" />
        </div>
      )}
    </Field>
  )
})
