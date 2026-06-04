'use client'

import { useAdminMutation } from '@/hooks/useAdminMutation'
import {
  getAdminRefundApproveRoute,
  getAdminRefundMarkFailedRoute,
  getAdminRefundMarkProcessingRoute,
  getAdminRefundMarkSucceededRoute,
  getAdminRefundRejectRoute,
  getAdminRefundStatusRoute,
} from '@/lib/constants/apiRoutes'
import type { AdminRefundRequest, RefundRequestStatus } from '@/types/refunds'

export function useAdminRefunds() {
  const mutation = useAdminMutation()

  async function ensureResult(
    task: Promise<AdminRefundRequest | null>,
    fallbackMessage: string,
  ) {
    const result = await task
    if (!result) {
      throw new Error(mutation.errorMessage ?? fallbackMessage)
    }

    return result
  }

  return {
    ...mutation,
    updateStatus: (refundId: string, body: { status: RefundRequestStatus; adminNote?: string }) =>
      ensureResult(
        mutation.execute<AdminRefundRequest>({
          url: getAdminRefundStatusRoute(refundId),
          method: 'PATCH',
          body,
          successMessage: 'Статус повернення оновлено.',
          fallbackErrorMessage: 'Не вдалося оновити статус повернення.',
        }),
        'Не вдалося оновити статус повернення.',
      ),
    approve: (refundId: string, adminNote?: string) =>
      ensureResult(
        mutation.execute<AdminRefundRequest>({
          url: getAdminRefundApproveRoute(refundId),
          method: 'POST',
          body: adminNote ? { adminNote } : undefined,
          successMessage: 'Запит на повернення схвалено.',
          fallbackErrorMessage: 'Не вдалося схвалити запит на повернення.',
        }),
        'Не вдалося схвалити запит на повернення.',
      ),
    reject: (refundId: string, adminNote?: string) =>
      ensureResult(
        mutation.execute<AdminRefundRequest>({
          url: getAdminRefundRejectRoute(refundId),
          method: 'POST',
          body: adminNote ? { adminNote } : undefined,
          successMessage: 'Запит на повернення відхилено.',
          fallbackErrorMessage: 'Не вдалося відхилити запит на повернення.',
        }),
        'Не вдалося відхилити запит на повернення.',
      ),
    markProcessing: (refundId: string, adminNote?: string) =>
      ensureResult(
        mutation.execute<AdminRefundRequest>({
          url: getAdminRefundMarkProcessingRoute(refundId),
          method: 'POST',
          body: adminNote ? { adminNote } : undefined,
          successMessage: 'Повернення переведено в обробку.',
          fallbackErrorMessage: 'Не вдалося оновити стан повернення.',
        }),
        'Не вдалося оновити стан повернення.',
      ),
    markSucceeded: (refundId: string, adminNote?: string) =>
      ensureResult(
        mutation.execute<AdminRefundRequest>({
          url: getAdminRefundMarkSucceededRoute(refundId),
          method: 'POST',
          body: adminNote ? { adminNote } : undefined,
          successMessage: 'Повернення позначено як успішне.',
          fallbackErrorMessage: 'Не вдалося підтвердити повернення.',
        }),
        'Не вдалося підтвердити повернення.',
      ),
    markFailed: (refundId: string, adminNote?: string) =>
      ensureResult(
        mutation.execute<AdminRefundRequest>({
          url: getAdminRefundMarkFailedRoute(refundId),
          method: 'POST',
          body: adminNote ? { adminNote } : undefined,
          successMessage: 'Повернення позначено як невдале.',
          fallbackErrorMessage: 'Не вдалося позначити повернення як невдале.',
        }),
        'Не вдалося позначити повернення як невдале.',
      ),
  }
}
