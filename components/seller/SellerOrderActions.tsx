'use client'

import { useSellerMutation } from '@/hooks/useSellerMutation'
import {
  canDeliverFulfillment,
  canProcessFulfillment,
  canShipFulfillment,
  type MarketplaceOrderStatus,
  type SellerFulfillmentStatus,
} from '@/types/seller'

export default function SellerOrderActions({
  itemId,
  orderStatus,
  fulfillmentStatus,
  disabled,
}: {
  itemId: string
  orderStatus: MarketplaceOrderStatus | string
  fulfillmentStatus: SellerFulfillmentStatus
  disabled?: boolean
}) {
  const { execute, isPending, errorMessage } = useSellerMutation()

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {canProcessFulfillment(fulfillmentStatus, orderStatus) ? (
          <button
            type="button"
            className="ui-secondary-button h-10 px-4 py-2 text-sm"
            disabled={disabled || isPending}
            onClick={() =>
              execute({
                url: `/api/seller/orders/${itemId}/process`,
                successMessage: 'Order item moved to processing.',
              })
            }
          >
            Process
          </button>
        ) : null}

        {canShipFulfillment(fulfillmentStatus) ? (
          <button
            type="button"
            className="ui-secondary-button h-10 px-4 py-2 text-sm"
            disabled={disabled || isPending}
            onClick={() =>
              execute({
                url: `/api/seller/orders/${itemId}/ship`,
                successMessage: 'Order item marked as shipped.',
              })
            }
          >
            Ship
          </button>
        ) : null}

        {canDeliverFulfillment(fulfillmentStatus) ? (
          <button
            type="button"
            className="ui-secondary-button h-10 px-4 py-2 text-sm"
            disabled={disabled || isPending}
            onClick={() =>
              execute({
                url: `/api/seller/orders/${itemId}/deliver`,
                successMessage: 'Order item marked as delivered.',
              })
            }
          >
            Deliver
          </button>
        ) : null}
      </div>
      {errorMessage ? <p className="text-sm text-brand-danger">{errorMessage}</p> : null}
    </div>
  )
}
