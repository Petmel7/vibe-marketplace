import { z } from 'zod'

export function normalizeOptionalQueryValue(value: unknown) {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined
  }

  return value
}

export function optionalQueryParam<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  return z.preprocess(normalizeOptionalQueryValue, schema.optional())
}

export function defaultedQueryParam<
  TSchema extends z.ZodTypeAny,
  TDefault extends Exclude<z.output<TSchema>, undefined>,
>(
  schema: TSchema,
  defaultValue: TDefault,
) {
  return z.preprocess(normalizeOptionalQueryValue, schema.default(defaultValue))
}
