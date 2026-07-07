
import { apiClient }
    from '@/shared/api/api.client'

import type { ViewedProductDto }
    from '@/features/viewed/viewed.dto'
import type { ViewedRecordResultDto }
    from '@/features/viewed/viewed.dto'

interface ViewedProductsData {
    items: ViewedProductDto[]
}

export function recordViewedProduct(
    productId: string,
    signal?: AbortSignal,
) {
    return apiClient.post<ViewedRecordResultDto>(
        '/api/viewed',
        { productId },
        { signal },
    )
}

export function fetchViewedProducts(
    signal?: AbortSignal,
) {
    return apiClient.get<ViewedProductsData>(
        '/api/viewed',
        { signal },
    )
}
