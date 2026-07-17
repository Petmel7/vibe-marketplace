
import { apiClient }
    from '@/shared/api/api.client'

import type { ViewedProductDto }
    from '@/features/viewed/viewed.dto'
import type { ViewedRecordResultDto }
    from '@/features/viewed/viewed.dto'

interface ViewedProductsData {
    items: ViewedProductDto[]
}

const viewedProductListeners =
    new Set<() => void>()

function emitViewedProductsUpdated() {
    for (const listener of viewedProductListeners) {
        listener()
    }
}

export function subscribeToViewedProductsUpdated(
    listener: () => void,
) {
    viewedProductListeners.add(listener)

    return () => {
        viewedProductListeners.delete(listener)
    }
}

export function recordViewedProduct(
    productId: string,
    signal?: AbortSignal,
) {
    return apiClient.post<ViewedRecordResultDto>(
        '/api/viewed',
        { productId },
        { signal },
    ).then((result) => {
        emitViewedProductsUpdated()
        return result
    })
}

export function fetchViewedProducts(
    signal?: AbortSignal,
) {
    return apiClient.get<ViewedProductsData>(
        '/api/viewed',
        { signal },
    )
}
