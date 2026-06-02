import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DisputePriority,
  DisputeReason,
  DisputeStatus,
  UserRole,
} from '@/app/generated/prisma/client'
import type { SessionUser } from '@/features/auth/auth.dto'
import {
  DisputeOwnershipError,
  DuplicateDisputeError,
} from '@/lib/errors/dispute'
import * as notificationsService from '@/features/notifications/notifications.service'
import * as disputeRepository from './disputes.repository'
import * as disputeStorageRepository from './disputes.storage.repository'
import {
  addDisputeMessage,
  createDispute,
  getDisputeById,
  updateAdminDisputeStatus,
  uploadDisputeEvidence,
} from './disputes.service'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('./disputes.repository')
vi.mock('./disputes.storage.repository')
vi.mock('@/features/notifications/notifications.service')
vi.mock('@/utils/logger', () => ({ logError: vi.fn() }))

const mockRepository = vi.mocked(disputeRepository)
const mockStorage = vi.mocked(disputeStorageRepository)
const mockNotifications = vi.mocked(notificationsService)

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

function makeDisputeRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'dispute-1',
    orderId: 'order-1',
    orderItemId: 'order-item-1',
    openedById: buyerUser.id,
    respondentId: sellerUser.id,
    storeId: 'store-1',
    reason: DisputeReason.ITEM_NOT_AS_DESCRIBED,
    status: DisputeStatus.OPEN,
    priority: DisputePriority.NORMAL,
    description: 'Item looks different from the listing photos.',
    resolutionNote: null,
    resolvedById: null,
    resolvedAt: null,
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    updatedAt: new Date('2026-06-02T10:00:00.000Z'),
    order: {
      id: 'order-1',
      userId: buyerUser.id,
      status: 'paid',
      totalAmount: { toString: () => '1500.00' },
      payments: [{ status: 'SUCCEEDED', method: 'CARD' }],
      items: [
        {
          id: 'order-item-1',
          storeId: 'store-1',
          productNameSnapshot: 'Summer Dress',
          storeNameSnapshot: 'Dress Store',
          variantSnapshot: 'M / Blue',
          quantity: 1,
          unitPriceSnapshot: { toString: () => '1500.00' },
          store: {
            id: 'store-1',
            name: 'Dress Store',
            ownerId: sellerUser.id,
          },
        },
      ],
    },
    orderItem: {
      id: 'order-item-1',
      productNameSnapshot: 'Summer Dress',
      storeNameSnapshot: 'Dress Store',
      variantSnapshot: 'M / Blue',
      quantity: 1,
      unitPriceSnapshot: { toString: () => '1500.00' },
      storeId: 'store-1',
      store: {
        id: 'store-1',
        name: 'Dress Store',
        ownerId: sellerUser.id,
      },
    },
    store: {
      id: 'store-1',
      name: 'Dress Store',
      ownerId: sellerUser.id,
    },
    openedBy: {
      id: buyerUser.id,
      email: buyerUser.email,
      name: 'Buyer Name',
      profile: { displayName: 'Buyer Display' },
    },
    respondent: {
      id: sellerUser.id,
      email: sellerUser.email,
      name: 'Seller Name',
      profile: { displayName: 'Seller Display' },
    },
    resolvedBy: null,
    messages: [
      {
        id: 'message-visible',
        senderId: buyerUser.id,
        message: 'Visible message',
        isInternal: false,
        createdAt: new Date('2026-06-02T10:05:00.000Z'),
        sender: {
          id: buyerUser.id,
          email: buyerUser.email,
          name: 'Buyer Name',
          profile: { displayName: 'Buyer Display' },
        },
      },
      {
        id: 'message-internal',
        senderId: adminUser.id,
        message: 'Internal note',
        isInternal: true,
        createdAt: new Date('2026-06-02T10:06:00.000Z'),
        sender: {
          id: adminUser.id,
          email: adminUser.email,
          name: 'Admin Name',
          profile: { displayName: 'Admin Display' },
        },
      },
    ],
    evidence: [
      {
        id: 'evidence-1',
        storagePath: 'disputes/dispute-1/evidence-1-proof.pdf',
        fileName: 'proof.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        createdAt: new Date('2026-06-02T10:07:00.000Z'),
        uploadedById: buyerUser.id,
      },
    ],
    ...overrides,
  }
}

describe('disputes.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNotifications.createAdminNotification.mockResolvedValue([] as never)
    mockNotifications.notifyUser.mockResolvedValue({} as never)
    mockStorage.createSignedDisputeEvidenceUrl.mockResolvedValue('https://signed.example/evidence')
  })

  it('lets a buyer open a dispute for their own order item and enqueues admin notifications', async () => {
    mockRepository.findOrderDisputeAccessContext.mockResolvedValue({
      orderId: 'order-1',
      orderItemId: 'order-item-1',
      buyerUserId: buyerUser.id,
      storeId: 'store-1',
      storeOwnerId: sellerUser.id,
      orderStatus: 'paid',
      paymentStatus: 'SUCCEEDED',
    })
    mockRepository.findActiveDisputeForCreation.mockResolvedValue(null)
    mockRepository.createDisputeRecord.mockResolvedValue(makeDisputeRecord() as never)

    const result = await createDispute(buyerUser, {
      orderId: 'order-1',
      orderItemId: 'order-item-1',
      reason: DisputeReason.ITEM_NOT_AS_DESCRIBED,
      priority: DisputePriority.NORMAL,
      description: 'The received item does not match the published photos.',
    })

    expect(mockRepository.createDisputeRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        orderItemId: 'order-item-1',
        openedById: buyerUser.id,
        respondentId: sellerUser.id,
        storeId: 'store-1',
      }),
    )
    expect(mockNotifications.createAdminNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          disputeId: 'dispute-1',
          orderId: 'order-1',
        }),
      }),
    )
    expect(result.id).toBe('dispute-1')
  })

  it('blocks duplicate active disputes for the same order issue', async () => {
    mockRepository.findOrderDisputeAccessContext.mockResolvedValue({
      orderId: 'order-1',
      orderItemId: 'order-item-1',
      buyerUserId: buyerUser.id,
      storeId: 'store-1',
      storeOwnerId: sellerUser.id,
      orderStatus: 'paid',
      paymentStatus: 'SUCCEEDED',
    })
    mockRepository.findActiveDisputeForCreation.mockResolvedValue(makeDisputeRecord() as never)

    await expect(
      createDispute(buyerUser, {
        orderId: 'order-1',
        orderItemId: 'order-item-1',
        reason: DisputeReason.ITEM_NOT_RECEIVED,
        priority: DisputePriority.NORMAL,
        description: 'The order item has not been delivered.',
      }),
    ).rejects.toThrow(DuplicateDisputeError)
  })

  it('allows a seller to access their own store dispute', async () => {
    mockRepository.findDisputeById.mockResolvedValue(makeDisputeRecord() as never)

    const result = await getDisputeById(sellerUser, 'dispute-1')

    expect(result.id).toBe('dispute-1')
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0]?.message).toBe('Visible message')
  })

  it('blocks a seller from accessing another store dispute', async () => {
    mockRepository.findDisputeById.mockResolvedValue(makeDisputeRecord() as never)

    await expect(getDisputeById(otherSellerUser, 'dispute-1')).rejects.toThrow(
      DisputeOwnershipError,
    )
  })

  it('allows admins to move a dispute through valid status transitions and notifies participants', async () => {
    mockRepository.findDisputeById.mockResolvedValueOnce(
      makeDisputeRecord({ status: DisputeStatus.OPEN }) as never,
    )
    mockRepository.updateDisputeStatusRecord.mockResolvedValue(
      makeDisputeRecord({
        status: DisputeStatus.UNDER_REVIEW,
        updatedAt: new Date('2026-06-02T11:00:00.000Z'),
      }) as never,
    )

    const result = await updateAdminDisputeStatus(adminUser, 'dispute-1', {
      status: DisputeStatus.UNDER_REVIEW,
    })

    expect(mockRepository.updateDisputeStatusRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'dispute-1',
        status: DisputeStatus.UNDER_REVIEW,
      }),
    )
    expect(mockNotifications.notifyUser).toHaveBeenCalled()
    expect(result.status).toBe(DisputeStatus.UNDER_REVIEW)
  })

  it('hides internal notes from buyers and sellers but keeps them visible for admins', async () => {
    mockRepository.findDisputeById.mockResolvedValue(makeDisputeRecord() as never)

    const buyerResult = await getDisputeById(buyerUser, 'dispute-1')
    const adminResult = await getDisputeById(adminUser, 'dispute-1')

    expect(buyerResult.messages).toHaveLength(1)
    expect(adminResult.messages).toHaveLength(2)
    expect(adminResult.messages.some((message) => message.isInternal)).toBe(true)
  })

  it('stores dispute evidence metadata and returns a signed evidence URL', async () => {
    mockRepository.findDisputeById.mockResolvedValue(makeDisputeRecord({ evidence: [] }) as never)
    mockRepository.countEvidenceByDisputeId.mockResolvedValue(0)
    mockStorage.uploadDisputeEvidenceAsset.mockResolvedValue({
      url: 'https://storage.example/evidence',
      storagePath: 'disputes/dispute-1/evidence-2-proof.jpg',
    })
    mockRepository.createDisputeEvidenceRecord.mockResolvedValue({
      id: 'evidence-2',
      disputeId: 'dispute-1',
      uploadedById: buyerUser.id,
      storagePath: 'disputes/dispute-1/evidence-2-proof.jpg',
      fileName: 'proof.jpg',
      fileType: 'image/jpeg',
      fileSize: 2048,
      createdAt: new Date('2026-06-02T11:05:00.000Z'),
    } as never)
    mockStorage.createSignedDisputeEvidenceUrl.mockResolvedValue('https://signed.example/evidence-2')

    const file = new File([new Uint8Array([1, 2, 3])], 'proof.jpg', { type: 'image/jpeg' })
    const result = await uploadDisputeEvidence(buyerUser, 'dispute-1', file)

    expect(mockStorage.uploadDisputeEvidenceAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        storagePath: expect.stringMatching(/^disputes\/dispute-1\/.+-proof\.jpg$/),
        contentType: 'image/jpeg',
      }),
    )
    expect(result).toEqual({
      id: 'evidence-2',
      url: 'https://signed.example/evidence-2',
      fileName: 'proof.jpg',
      fileType: 'image/jpeg',
      fileSize: 2048,
      createdAt: '2026-06-02T11:05:00.000Z',
    })
  })

  it('enqueues visible message notifications without exposing internal notes', async () => {
    mockRepository.findDisputeById.mockResolvedValue(makeDisputeRecord() as never)
    mockRepository.createDisputeMessageRecord.mockResolvedValue({
      id: 'message-new',
      senderId: sellerUser.id,
      message: 'We are reviewing your request.',
      isInternal: false,
      createdAt: new Date('2026-06-02T11:10:00.000Z'),
      sender: {
        id: sellerUser.id,
        email: sellerUser.email,
        name: 'Seller Name',
        profile: { displayName: 'Seller Display' },
      },
    } as never)

    const result = await addDisputeMessage(sellerUser, 'dispute-1', {
      message: 'We are reviewing your request.',
      isInternal: false,
    })

    expect(result.message).toBe('We are reviewing your request.')
    expect(mockNotifications.notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: buyerUser.id,
        type: 'ADMIN_ALERT',
      }),
    )
  })
})
