import { z } from 'zod'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const DEFAULT_OFFSET = 0
const DEFAULT_MAX_LIMIT = 100

/**
 * Normalizes optional GET query values before Zod validation.
 *
 * HTML GET forms submit empty controls as `field=`. Use this for query params
 * where an empty or whitespace-only value should mean "not provided".
 */
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

/**
 * Wraps any query schema so empty strings are treated as omitted values.
 * Useful for optional enum/literal/custom query validators.
 */
export function optionalQueryParam<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  return z.preprocess(normalizeOptionalQueryValue, schema.optional())
}

/**
 * Wraps any query schema with a default after empty-string normalization.
 * Use for GET params where `field=` should fall back to the same default as an omitted field.
 */
export function defaultedQueryParam<
  TSchema extends z.ZodTypeAny,
  TDefault extends Exclude<z.output<TSchema>, undefined>,
>(
  schema: TSchema,
  defaultValue: TDefault,
) {
  return z.preprocess(normalizeOptionalQueryValue, schema.default(defaultValue))
}

/**
 * Optional UUID query parameter. Empty values become `undefined`; invalid non-empty values fail.
 */
export function optionalQueryUuid() {
  return optionalQueryParam(z.uuid())
}

/**
 * Optional YYYY-MM-DD date query parameter. Empty values become `undefined`.
 */
export function optionalQueryDate() {
  return optionalQueryParam(z.string().date())
}

/**
 * Optional ISO datetime query parameter with timezone offset. Empty values become `undefined`.
 */
export function optionalQueryDateTime() {
  return optionalQueryParam(z.string().datetime({ offset: true }))
}

/**
 * Optional boolean query parameter. Accepts only `true`/`false` strings or booleans.
 * Empty values become `undefined`, not `false`.
 */
export function optionalQueryBoolean() {
  return z.preprocess(normalizeQueryBooleanValue, z.boolean().optional())
}

/**
 * Defaulted boolean query parameter. Empty values use the provided default.
 */
export function defaultedQueryBoolean(defaultValue: boolean) {
  return z.preprocess(normalizeQueryBooleanValue, z.boolean().default(defaultValue))
}

/**
 * Optional numeric query parameter. Pass a constrained number schema for min/max/int rules.
 */
export function optionalQueryNumber(): ReturnType<typeof optionalQueryParam<z.ZodNumber>>
export function optionalQueryNumber<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
): ReturnType<typeof optionalQueryParam<TSchema>>
export function optionalQueryNumber(schema: z.ZodTypeAny = z.coerce.number()) {
  return optionalQueryParam(schema)
}

/**
 * Defaulted numeric query parameter. Empty values use the provided default.
 */
export function defaultedQueryNumber<
  TSchema extends z.ZodTypeAny,
  TDefault extends Exclude<z.output<TSchema>, undefined>,
>(
  schema: TSchema,
  defaultValue: TDefault,
) {
  return defaultedQueryParam(schema, defaultValue)
}

/**
 * Optional trimmed string query parameter. Pass a constrained string schema for min/max rules.
 */
export function optionalQueryString(): ReturnType<typeof optionalQueryParam<z.ZodString>>
export function optionalQueryString<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
): ReturnType<typeof optionalQueryParam<TSchema>>
export function optionalQueryString(schema: z.ZodTypeAny = z.string().trim()) {
  return optionalQueryParam(schema)
}

/**
 * Defaulted one-based page query parameter.
 */
export function queryPageParam(defaultValue = DEFAULT_PAGE) {
  return defaultedQueryNumber(z.coerce.number().int().min(1), defaultValue)
}

/**
 * Defaulted page-size query parameter with a configurable maximum.
 */
export function queryLimitParam(defaultValue = DEFAULT_LIMIT, max = DEFAULT_MAX_LIMIT) {
  return defaultedQueryNumber(z.coerce.number().int().min(1).max(max), defaultValue)
}

/**
 * Defaulted zero-based offset query parameter.
 */
export function queryOffsetParam(defaultValue = DEFAULT_OFFSET) {
  return defaultedQueryNumber(z.coerce.number().int().min(0), defaultValue)
}

/**
 * Shared page/limit schema for list GET endpoints.
 */
export function paginationQuerySchema(options: { defaultLimit?: number; maxLimit?: number } = {}) {
  return z.object({
    page: queryPageParam(),
    limit: queryLimitParam(options.defaultLimit ?? DEFAULT_LIMIT, options.maxLimit ?? DEFAULT_MAX_LIMIT),
  })
}
