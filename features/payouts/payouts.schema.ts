import {
  PayoutMethod,
  PayoutStatus,
  SellerLedgerEntryStatus,
  SellerLedgerEntryType,
} from '@/app/generated/prisma/client'
import { optionalQueryParam } from '@/lib/validation/query'
import { z } from 'zod'

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const optionalDateSchema = z
  .string()
  .datetime({ offset: true })
  .optional()

export const sellerLedgerQuerySchema = paginationSchema.extend({
  storeId: z.uuid().optional(),
  status: optionalQueryParam(z.nativeEnum(SellerLedgerEntryStatus)),
  type: optionalQueryParam(z.nativeEnum(SellerLedgerEntryType)),
  dateFrom: optionalDateSchema,
  dateTo: optionalDateSchema,
})

export const sellerPayoutQuerySchema = paginationSchema.extend({
  storeId: z.uuid().optional(),
  status: optionalQueryParam(z.nativeEnum(PayoutStatus)),
  dateFrom: optionalDateSchema,
  dateTo: optionalDateSchema,
})

export const adminPayoutQuerySchema = paginationSchema.extend({
  status: optionalQueryParam(z.nativeEnum(PayoutStatus)),
  storeId: z.uuid().optional(),
  sellerId: z.uuid().optional(),
  dateFrom: optionalDateSchema,
  dateTo: optionalDateSchema,
})

export const adminSellerBalanceQuerySchema = paginationSchema.extend({
  storeId: z.uuid().optional(),
  sellerId: z.uuid().optional(),
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
