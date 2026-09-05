import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type FieldValues, type Resolver, type UseFormProps } from 'react-hook-form'
import type { z } from 'zod'

/**
 * react-hook-form + zod with the input/output split handled once: fields are
 * typed as what the user types (z.input), handleSubmit receives the parsed
 * result (z.output) — so `.default()` and `z.coerce` in schemas just work.
 */
export function useZodForm<In extends FieldValues, Out>(
  schema: z.ZodType<Out, In>,
  options?: Omit<UseFormProps<In, unknown, Out>, 'resolver'>,
) {
  const resolver = zodResolver(schema) as Resolver<In, unknown, Out>
  return useForm<In, unknown, Out>({ resolver, ...options })
}
