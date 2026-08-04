import {
  PayoutMethod,
  PayoutStatus,
  SellerLedgerEntryStatus,
  SellerLedgerEntryType,
} from '@/app/generated/prisma/client'
import {
  optionalQueryDateTime,
  optionalQueryParam,
  optionalQueryUuid,
  paginationQuerySchema,
} from '@/lib/validation/query'
import { z } from 'zod'

const paginationSchema = paginationQuerySchema()

const optionalDateSchema = optionalQueryDateTime()

export const sellerLedgerQuerySchema = paginationSchema.extend({
  storeId: optionalQueryUuid(),
  status: optionalQueryParam(z.nativeEnum(SellerLedgerEntryStatus)),
  type: optionalQueryParam(z.nativeEnum(SellerLedgerEntryType)),
  dateFrom: optionalDateSchema,
  dateTo: optionalDateSchema,
})

export const sellerPayoutQuerySchema = paginationSchema.extend({
  storeId: optionalQueryUuid(),
  status: optionalQueryParam(z.nativeEnum(PayoutStatus)),
  dateFrom: optionalDateSchema,
  dateTo: optionalDateSchema,
})

export const adminPayoutQuerySchema = paginationSchema.extend({
  status: optionalQueryParam(z.nativeEnum(PayoutStatus)),
  storeId: optionalQueryUuid(),
  sellerId: optionalQueryUuid(),
  dateFrom: optionalDateSchema,
  dateTo: optionalDateSchema,
})

export const adminSellerBalanceQuerySchema = paginationSchema.extend({
  storeId: optionalQueryUuid(),
  sellerId: optionalQueryUuid(),
})

const moneyStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid monetary amount')

export const createAdminPayoutSchema = z.object({
  storeId: z.uuid(),
  amount: moneyStringSchema,
  method: z.enum([PayoutMethod.MANUAL, PayoutMethod.BANK_TRANSFER]),
  reference: z.string().trim().max(255).optional(),
  adminNote: z.string().trim().max(2000).optional(),
})

export const updatePayoutStatusSchema = z.object({
  status: z.nativeEnum(PayoutStatus),
  reference: z.string().trim().max(255).optional(),
  adminNote: z.string().trim().max(2000).optional(),
})

export const recalculateSellerBalancesSchema = z.object({
  sellerId: z.uuid().optional(),
  storeId: z.uuid().optional(),
  releaseEligible: z.boolean().optional(),
})
