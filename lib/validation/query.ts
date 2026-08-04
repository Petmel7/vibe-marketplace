import { z } from 'zod'

export function normalizeOptionalQueryValue(value: unknown) {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined
  }

  return value
}

function normalizeQueryBooleanValue(value: unknown) {
  const normalized = normalizeOptionalQueryValue(value)

  if (normalized === undefined || typeof normalized === 'boolean') {
    return normalized
  }

  if (typeof normalized === 'string') {
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }

  return normalized
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

export function optionalQueryUuid() {
  return optionalQueryParam(z.uuid())
}

export function optionalQueryDate() {
  return optionalQueryParam(z.string().date())
}

export function optionalQueryDateTime() {
  return optionalQueryParam(z.string().datetime({ offset: true }))
}

export function optionalQueryBoolean() {
  return z.preprocess(normalizeQueryBooleanValue, z.boolean().optional())
}

export function defaultedQueryBoolean(defaultValue: boolean) {
  return z.preprocess(normalizeQueryBooleanValue, z.boolean().default(defaultValue))
}

export function optionalQueryNumber(): ReturnType<typeof optionalQueryParam<z.ZodNumber>>
export function optionalQueryNumber<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
): ReturnType<typeof optionalQueryParam<TSchema>>
export function optionalQueryNumber(schema: z.ZodTypeAny = z.coerce.number()) {
  return optionalQueryParam(schema)
}

export function defaultedQueryNumber<
  TSchema extends z.ZodTypeAny,
  TDefault extends Exclude<z.output<TSchema>, undefined>,
>(
  schema: TSchema,
  defaultValue: TDefault,
) {
  return defaultedQueryParam(schema, defaultValue)
}

export function optionalQueryString(): ReturnType<typeof optionalQueryParam<z.ZodString>>
export function optionalQueryString<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
): ReturnType<typeof optionalQueryParam<TSchema>>
export function optionalQueryString(schema: z.ZodTypeAny = z.string().trim()) {
  return optionalQueryParam(schema)
}
