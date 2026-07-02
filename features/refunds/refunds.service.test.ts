import { beforeEach, describe, expect, it, vi } from 'vitest'
import Decimal from 'decimal.js'
import {
  PaymentMethod,
  PaymentStatus,
  RefundRequestReason,
  RefundRequestStatus,
  UserRole,
} from '@/app/generated/prisma/client'
import type { SessionUser } from '@/features/auth/auth.dto'
import {
  DuplicateRefundRequestError,
  InvalidRefundTransitionError,
  RefundAmountExceededError,
  RefundRequestOwnershipError,
} from '@/lib/errors/refund'

vi.mock('./refunds.repository')
vi.mock('@/features/email/events/email.events', () => ({
  emitRefundApprovedEmailEvent: vi.fn(),
  emitRefundFailedEmailEvent: vi.fn(),
  emitRefundRejectedEmailEvent: vi.fn(),
  emitRefundRequestedEmailEvents: vi.fn(),
  emitRefundSucceededEmailEvents: vi.fn(),
}))
vi.mock('@/features/notifications/notifications.service')
vi.mock('@/features/payments/payment.repository')
vi.mock('@/features/payouts/payouts.repository')
vi.mock('@/features/risk/risk.service')
vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: vi.fn(),
  requireBuyer: vi.fn(),
  requireSeller: vi.fn(),
}))
vi.mock('@/utils/logger', () => ({ logError: vi.fn() }))
vi.mock('@/features/admin/audit/admin-audit', () => ({
  recordAdminAudit: vi.fn(),
}))

import * as refundRepository from './refunds.repository'
import * as refundEmailEvents from '@/features/email/events/email.events'
import * as notificationsService from '@/features/notifications/notifications.service'
import * as paymentRepository from '@/features/payments/payment.repository'
import * as payoutRepository from '@/features/payouts/payouts.repository'
import * as riskService from '@/features/risk/risk.service'
import { recordAdminAudit } from '@/features/admin/audit/admin-audit'
import {
  approveAdminRefundRequest,
  createRefundRequest,
  getSellerRefundRequestById,
  markAdminRefundRequestSucceeded,
  rejectAdminRefundRequest,
} from './refunds.service'

const mockRefundRepository = vi.mocked(refundRepository)
const mockRefundEmailEvents = vi.mocked(refundEmailEvents)
const mockNotificationsService = vi.mocked(notificationsService)
const mockPaymentRepository = vi.mocked(paymentRepository)
const mockPayoutRepository = vi.mocked(payoutRepository)
const mockRiskService = vi.mocked(riskService)
const mockRecordAdminAudit = vi.mocked(recordAdminAudit)

const buyerUser: SessionUser = {
  id: 'buyer-1',
  email: 'buyer@example.com',
  roles: [UserRole.BUYER],
}

const sellerUser: SessionUser = {
  id: 'seller-1',
  email: 'seller@example.com',
  roles: [UserRole.SELLER],
}

const otherSellerUser: SessionUser = {
  id: 'seller-2',
  email: 'seller2@example.com',
  roles: [UserRole.SELLER],
}

const adminUser: SessionUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  roles: [UserRole.ADMIN],
}

function makeRefundRequestRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'refund-request-1',
    orderId: 'order-1',
    orderItemId: 'order-item-1',
    paymentId: 'payment-1',
    requestedById: buyerUser.id,
    reason: RefundRequestReason.ITEM_NOT_AS_DESCRIBED,
    status: RefundRequestStatus.REQUESTED,
    amount: { toString: () => '90.00' },
    currency: 'UAH',
    description: 'The product differs from the listing.',
    adminNote: null,
    resolvedById: null,
    resolvedAt: null,
    createdAt: new Date('2026-06-04T10:00:00.000Z'),
    updatedAt: new Date('2026-06-04T10:00:00.000Z'),
    order: {
      id: 'order-1',
      userId: buyerUser.id,
      status: 'paid',
      totalAmount: { toString: () => '120.00' },
      orderPromotion: {
        id: 'order-promotion-1',
        ownerType: 'MARKETPLACE',
        storeId: null,
        discountAmount: { toString: () => '10.00' },
        promotionCode: 'SAVE10',
      },
      items: [
        {
          id: 'order-item-1',
          storeId: 'store-1',
          quantity: 1,
          productNameSnapshot: 'Summer Dress',
          storeNameSnapshot: 'Dress Store',
          unitPriceSnapshot: { toString: () => '100.00' },
          store: {
            id: 'store-1',
            name: 'Dress Store',
            ownerId: sellerUser.id,
          },
        },
        {
          id: 'order-item-2',
          storeId: 'store-2',
          quantity: 1,
          productNameSnapshot: 'Shoes',
          storeNameSnapshot: 'Shoe Store',
          unitPriceSnapshot: { toString: () => '20.00' },
          store: {
            id: 'store-2',
            name: 'Shoe Store',
            ownerId: 'seller-3',
          },
        },
      ],
    },
    orderItem: {
      id: 'order-item-1',
      orderId: 'order-1',
      storeId: 'store-1',
      quantity: 1,
      productNameSnapshot: 'Summer Dress',
      storeNameSnapshot: 'Dress Store',
      unitPriceSnapshot: { toString: () => '100.00' },
      store: {
        id: 'store-1',
        name: 'Dress Store',
        ownerId: sellerUser.id,
      },
      platformCommission: {
        id: 'commission-1',
        sellerId: sellerUser.id,
        storeId: 'store-1',
        currency: 'UAH',
        sellerNetAmount: { toString: () => '81.00' },
        grossAmount: { toString: () => '100.00' },
      },
    },
    payment: {
      id: 'payment-1',
      orderId: 'order-1',
      status: PaymentStatus.SUCCEEDED,
      method: PaymentMethod.CARD,
      amount: { toString: () => '120.00' },
      currency: 'UAH',
      refunds: [],
    },
    requestedBy: {
      id: buyerUser.id,
      email: buyerUser.email,
      name: 'Buyer Name',
      profile: { displayName: 'Buyer Display' },
    },
    resolvedBy: null,
    actions: [],
    refunds: [],
    ...overrides,
  }
}

function makeRefundCreationContext(overrides: Record<string, unknown> = {}) {
  return {
    order: {
      id: 'order-1',
      userId: buyerUser.id,
      status: 'paid',
      totalAmount: { toString: () => '120.00' },
      orderPromotion: {
        id: 'order-promotion-1',
        ownerType: 'MARKETPLACE',
        storeId: null,
        discountAmount: { toString: () => '10.00' },
        promotionCode: 'SAVE10',
      },
      items: [
        {
          id: 'order-item-1',
          orderId: 'order-1',
          storeId: 'store-1',
          quantity: 1,
          productNameSnapshot: 'Summer Dress',
          storeNameSnapshot: 'Dress Store',
          unitPriceSnapshot: { toString: () => '100.00' },
          store: {
            id: 'store-1',
            name: 'Dress Store',
            ownerId: sellerUser.id,
          },
          platformCommission: {
            id: 'commission-1',
            sellerId: sellerUser.id,
            storeId: 'store-1',
            currency: 'UAH',
            sellerNetAmount: { toString: () => '81.00' },
            grossAmount: { toString: () => '100.00' },
          },
        },
        {
          id: 'order-item-2',
          orderId: 'order-1',
          storeId: 'store-2',
          quantity: 1,
          productNameSnapshot: 'Shoes',
          storeNameSnapshot: 'Shoe Store',
          unitPriceSnapshot: { toString: () => '20.00' },
          store: {
            id: 'store-2',
            name: 'Shoe Store',
            ownerId: 'seller-3',
          },
          platformCommission: null,
        },
      ],
    },
    orderItem: {
      id: 'order-item-1',
      orderId: 'order-1',
      storeId: 'store-1',
      quantity: 1,
      productNameSnapshot: 'Summer Dress',
      storeNameSnapshot: 'Dress Store',
      unitPriceSnapshot: { toString: () => '100.00' },
      store: {
        id: 'store-1',
        name: 'Dress Store',
        ownerId: sellerUser.id,
      },
      platformCommission: {
        id: 'commission-1',
        sellerId: sellerUser.id,
        storeId: 'store-1',
        currency: 'UAH',
        sellerNetAmount: { toString: () => '81.00' },
        grossAmount: { toString: () => '100.00' },
      },
    },
    payment: {
      id: 'payment-1',
      status: PaymentStatus.SUCCEEDED,
      method: PaymentMethod.CARD,
      amount: { toString: () => '120.00' },
      currency: 'UAH',
      refunds: [],
    },
    ...overrides,
  }
}

describe('refunds.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNotificationsService.createAdminNotification.mockResolvedValue([] as never)
    mockNotificationsService.notifyUser.mockResolvedValue({} as never)
    mockRefundEmailEvents.emitRefundApprovedEmailEvent.mockResolvedValue(null)
    mockRefundEmailEvents.emitRefundFailedEmailEvent.mockResolvedValue(null)
    mockRefundEmailEvents.emitRefundRejectedEmailEvent.mockResolvedValue(null)
    mockRefundEmailEvents.emitRefundRequestedEmailEvents.mockResolvedValue([] as never)
    mockRefundEmailEvents.emitRefundSucceededEmailEvents.mockResolvedValue([] as never)
    mockPaymentRepository.applyRefundOutcome.mockResolvedValue({} as never)
    mockPayoutRepository.findStoreFinanceContextById.mockResolvedValue({
      id: 'store-1',
      name: 'Dress Store',
      ownerId: sellerUser.id,
      owner: {
        id: sellerUser.id,
        email: sellerUser.email,
        name: 'Seller Name',
        profile: { displayName: 'Seller Display' },
      },
    } as never)
    mockPayoutRepository.getLedgerBalanceTotalsByStoreId.mockResolvedValue({
      pendingAmount: new Decimal(0),
      availableAmount: new Decimal(-10),
      paidOutAmount: new Decimal(81),
    } as never)
    mockPayoutRepository.upsertSellerBalance.mockResolvedValue({
      storeId: 'store-1',
      sellerId: sellerUser.id,
      currency: 'UAH',
      pendingAmount: { toString: () => '0.00' },
      availableAmount: { toString: () => '-10.00' },
      paidOutAmount: { toString: () => '81.00' },
      updatedAt: new Date(),
      store: {
        id: 'store-1',
        name: 'Dress Store',
        ownerId: sellerUser.id,
        owner: {
          id: sellerUser.id,
          email: sellerUser.email,
          name: 'Seller Name',
          profile: { displayName: 'Seller Display' },
        },
      },
    } as never)
    mockRiskService.recordRefundIssuedRiskSignals.mockResolvedValue([] as never)
  })

  it('lets a buyer create a refund request for their own paid order item', async () => {
    mockRefundRepository.findRefundRequestCreationContext.mockResolvedValue(
      makeRefundCreationContext() as never,
    )
    mockRefundRepository.findActiveRefundRequestForOrderItem.mockResolvedValue(null)
    mockRefundRepository.sumSucceededRefundRequestAmountsForOrderItem.mockResolvedValue(null)
    mockRefundRepository.createRefundRequestRecord.mockResolvedValue(
      makeRefundRequestRecord() as never,
    )

    const result = await createRefundRequest(buyerUser, {
      orderId: 'order-1',
      orderItemId: 'order-item-1',
      amount: '90.00',
      reason: RefundRequestReason.ITEM_NOT_AS_DESCRIBED,
      description: 'The item is not as described.',
    })

    expect(mockRefundRepository.createRefundRequestRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        orderItemId: 'order-item-1',
        paymentId: 'payment-1',
        requestedById: buyerUser.id,
        currency: 'UAH',
      }),
    )
    expect(mockNotificationsService.createAdminNotification).toHaveBeenCalled()
    expect(mockNotificationsService.notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: sellerUser.id,
      }),
    )
    expect(mockRefundEmailEvents.emitRefundRequestedEmailEvents).toHaveBeenCalledWith({
      refundRequestId: 'refund-request-1',
    })
    expect(mockRecordAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: buyerUser.id,
        actorEmail: buyerUser.email,
        actorRole: UserRole.BUYER,
        domain: 'refunds',
        action: 'request',
        targetType: 'refund-request',
        targetId: 'refund-request-1',
        metadata: {
          orderId: 'order-1',
          amount: '90.00',
          reason: RefundRequestReason.ITEM_NOT_AS_DESCRIBED,
        },
      }),
    )
    expect(result.status).toBe(RefundRequestStatus.REQUESTED)
  })

  it('blocks a buyer from refunding another user order', async () => {
    mockRefundRepository.findRefundRequestCreationContext.mockResolvedValue(null)

    await expect(
      createRefundRequest(buyerUser, {
        orderId: 'order-1',
        orderItemId: 'order-item-1',
        amount: '20.00',
        reason: RefundRequestReason.ITEM_NOT_RECEIVED,
      }),
    ).rejects.toThrow(RefundRequestOwnershipError)
  })

  it('blocks duplicate active refund requests for the same order item', async () => {
    mockRefundRepository.findRefundRequestCreationContext.mockResolvedValue(
      makeRefundCreationContext() as never,
    )
    mockRefundRepository.findActiveRefundRequestForOrderItem.mockResolvedValue(
      makeRefundRequestRecord() as never,
    )

    await expect(
      createRefundRequest(buyerUser, {
        orderId: 'order-1',
        orderItemId: 'order-item-1',
        amount: '20.00',
        reason: RefundRequestReason.ITEM_NOT_RECEIVED,
      }),
    ).rejects.toThrow(DuplicateRefundRequestError)
  })

  it('rejects refund amounts above the eligible item net paid amount', async () => {
    mockRefundRepository.findRefundRequestCreationContext.mockResolvedValue(
      makeRefundCreationContext() as never,
    )
    mockRefundRepository.findActiveRefundRequestForOrderItem.mockResolvedValue(null)
    mockRefundRepository.sumSucceededRefundRequestAmountsForOrderItem.mockResolvedValue(null)

    await expect(
      createRefundRequest(buyerUser, {
        orderId: 'order-1',
        orderItemId: 'order-item-1',
        amount: '95.00',
        reason: RefundRequestReason.ITEM_NOT_AS_DESCRIBED,
      }),
    ).rejects.toThrow(RefundAmountExceededError)
  })

  it('requires description when refund reason is OTHER', async () => {
    await expect(
      createRefundRequest(buyerUser, {
        orderId: 'order-1',
        orderItemId: 'order-item-1',
        amount: '10.00',
        reason: RefundRequestReason.OTHER,
      }),
    ).rejects.toThrow('Description is required when reason is OTHER')
  })

  it('allows admins to approve refund requests and creates a manual refund record snapshot', async () => {
    mockRefundRepository.findRefundRequestById.mockResolvedValue(
      makeRefundRequestRecord({ status: RefundRequestStatus.REQUESTED }) as never,
    )
    mockRefundRepository.transitionRefundRequestRecord.mockResolvedValue(
      makeRefundRequestRecord({
        status: RefundRequestStatus.APPROVED,
        adminNote: 'Approved for manual processing',
      }) as never,
    )
    mockRefundRepository.upsertRefundRecordForRequest.mockResolvedValue({
      id: 'refund-1',
    } as never)
    mockRefundRepository.sumSucceededRefundRequestAmountsForOrderItem.mockResolvedValue(null)

    const result = await approveAdminRefundRequest(adminUser, 'refund-request-1', {
      adminNote: 'Approved for manual processing',
    })

    expect(mockRefundRepository.upsertRefundRecordForRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        refundRequestId: 'refund-request-1',
        status: 'PENDING',
      }),
    )
    expect(mockRefundEmailEvents.emitRefundApprovedEmailEvent).toHaveBeenCalledWith({
      refundRequestId: 'refund-request-1',
    })
    expect(result.status).toBe(RefundRequestStatus.APPROVED)
  })

  it('rejects invalid admin refund transitions', async () => {
    mockRefundRepository.findRefundRequestById.mockResolvedValue(
      makeRefundRequestRecord({ status: RefundRequestStatus.REQUESTED }) as never,
    )

    await expect(
      markAdminRefundRequestSucceeded(adminUser, 'refund-request-1'),
    ).rejects.toThrow(InvalidRefundTransitionError)
  })

  it('marks a refund succeeded, creates a refund record, and writes a seller ledger reversal once', async () => {
    mockRefundRepository.findRefundRequestById
      .mockResolvedValueOnce(
        makeRefundRequestRecord({
          status: RefundRequestStatus.PROCESSING,
          payment: {
            id: 'payment-1',
            orderId: 'order-1',
            status: PaymentStatus.SUCCEEDED,
            method: PaymentMethod.CARD,
            amount: { toString: () => '120.00' },
            currency: 'UAH',
            refunds: [],
          },
          refunds: [],
        }) as never,
      )
      .mockResolvedValueOnce(
        makeRefundRequestRecord({
          status: RefundRequestStatus.SUCCEEDED,
          refunds: [
            {
              id: 'refund-1',
              paymentId: 'payment-1',
              orderItemId: 'order-item-1',
              providerRefundId: null,
              status: 'SUCCEEDED',
              amount: { toString: () => '90.00' },
              createdAt: new Date('2026-06-04T10:10:00.000Z'),
              updatedAt: new Date('2026-06-04T10:10:00.000Z'),
            },
          ],
          payment: {
            id: 'payment-1',
            orderId: 'order-1',
            status: PaymentStatus.SUCCEEDED,
            method: PaymentMethod.CARD,
            amount: { toString: () => '120.00' },
            currency: 'UAH',
            refunds: [],
          },
        }) as never,
      )
    mockRefundRepository.transitionRefundRequestRecord.mockResolvedValue(
      makeRefundRequestRecord({
        status: RefundRequestStatus.SUCCEEDED,
        refunds: [
          {
            id: 'refund-1',
            paymentId: 'payment-1',
            orderItemId: 'order-item-1',
            providerRefundId: null,
            status: 'SUCCEEDED',
            amount: { toString: () => '90.00' },
            createdAt: new Date('2026-06-04T10:10:00.000Z'),
            updatedAt: new Date('2026-06-04T10:10:00.000Z'),
          },
        ],
        payment: {
          id: 'payment-1',
          orderId: 'order-1',
          status: PaymentStatus.SUCCEEDED,
          method: PaymentMethod.CARD,
          amount: { toString: () => '120.00' },
          currency: 'UAH',
          refunds: [],
        },
      }) as never,
    )
    mockRefundRepository.upsertRefundRecordForRequest.mockResolvedValue({ id: 'refund-1' } as never)
    mockRefundRepository.findSellerLedgerRefundReversalByDescription.mockResolvedValue(null)
    mockRefundRepository.createSellerLedgerRefundReversal.mockResolvedValue({ id: 'ledger-1' } as never)
    mockRefundRepository.sumSucceededRefundRequestAmountsForOrderItem.mockResolvedValueOnce(null).mockResolvedValueOnce({ toString: () => '90.00' } as never)

    const result = await markAdminRefundRequestSucceeded(adminUser, 'refund-request-1', {
      adminNote: 'Manually refunded',
    })

    expect(mockRefundRepository.upsertRefundRecordForRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        refundRequestId: 'refund-request-1',
        status: 'SUCCEEDED',
      }),
    )
    expect(mockPaymentRepository.applyRefundOutcome).toHaveBeenCalledWith({
      paymentId: 'payment-1',
      amount: expect.anything(),
      fullAmount: false,
    })
    expect(mockRefundRepository.createSellerLedgerRefundReversal).toHaveBeenCalledWith(
      expect.objectContaining({
        orderItemId: 'order-item-1',
        storeId: 'store-1',
        sellerId: sellerUser.id,
      }),
    )
    expect(mockPayoutRepository.upsertSellerBalance).toHaveBeenCalled()
    expect(mockRiskService.recordRefundIssuedRiskSignals).toHaveBeenCalled()
    expect(mockRefundEmailEvents.emitRefundSucceededEmailEvents).toHaveBeenCalledWith({
      refundRequestId: 'refund-request-1',
    })
    expect(result.status).toBe(RefundRequestStatus.SUCCEEDED)
  })

  it('does not duplicate seller ledger reversal when mark-succeeded is called again', async () => {
    mockRefundRepository.findRefundRequestById.mockResolvedValue(
      makeRefundRequestRecord({ status: RefundRequestStatus.SUCCEEDED }) as never,
    )

    const result = await markAdminRefundRequestSucceeded(adminUser, 'refund-request-1')

    expect(mockRefundRepository.transitionRefundRequestRecord).not.toHaveBeenCalled()
    expect(mockRefundRepository.createSellerLedgerRefundReversal).not.toHaveBeenCalled()
    expect(result.status).toBe(RefundRequestStatus.SUCCEEDED)
  })

  it('lets sellers view only their own store refund requests', async () => {
    mockRefundRepository.findRefundRequestById.mockResolvedValue(
      makeRefundRequestRecord() as never,
    )

    const result = await getSellerRefundRequestById(sellerUser, 'refund-request-1')
    expect(result.id).toBe('refund-request-1')

    await expect(
      getSellerRefundRequestById(otherSellerUser, 'refund-request-1'),
    ).rejects.toThrow(RefundRequestOwnershipError)
  })

  it('does not fail refund creation when notifications cannot be enqueued', async () => {
    mockRefundRepository.findRefundRequestCreationContext.mockResolvedValue(
      makeRefundCreationContext() as never,
    )
    mockRefundRepository.findActiveRefundRequestForOrderItem.mockResolvedValue(null)
    mockRefundRepository.sumSucceededRefundRequestAmountsForOrderItem.mockResolvedValue(null)
    mockRefundRepository.createRefundRequestRecord.mockResolvedValue(
      makeRefundRequestRecord() as never,
    )
    mockNotificationsService.createAdminNotification.mockRejectedValueOnce(new Error('admin notify down'))
    mockNotificationsService.notifyUser.mockRejectedValueOnce(new Error('seller notify down'))

    const result = await createRefundRequest(buyerUser, {
      orderId: 'order-1',
      orderItemId: 'order-item-1',
      amount: '90.00',
      reason: RefundRequestReason.ITEM_NOT_AS_DESCRIBED,
      description: 'The item is not as described.',
    })

    expect(result.id).toBe('refund-request-1')
  })

  it('does not fail refund transition when refund lifecycle email enqueue fails', async () => {
    mockRefundRepository.findRefundRequestById.mockResolvedValue(
      makeRefundRequestRecord({ status: RefundRequestStatus.REQUESTED }) as never,
    )
    mockRefundRepository.transitionRefundRequestRecord.mockResolvedValue(
      makeRefundRequestRecord({
        status: RefundRequestStatus.REJECTED,
        adminNote: 'Manual review rejected this request',
      }) as never,
    )
    mockRefundEmailEvents.emitRefundRejectedEmailEvent.mockRejectedValueOnce(
      new Error('email queue down'),
    )

    const result = await rejectAdminRefundRequest(adminUser, 'refund-request-1', {
      adminNote: 'Manual review rejected this request',
    })

    expect(result.status).toBe(RefundRequestStatus.REJECTED)
  })
})
