
'use client'

import Link from 'next/link'
import StateView, {
  WISHLIST_EMPTY_STATE,
} from '@/components/ui/StateView'
import Loading from '@/app/wishlist/loading'
import { PageContainer } from '@/components/layout/PageContainer'
import WishlistItemRow from '@/components/wishlist/WishlistItemRow'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { useWishlistPage } from './hooks/useWishlistPage'

function WishlistEmpty() {
  return (
    <StateView {...WISHLIST_EMPTY_STATE} />
  )
}

export default function WishlistPageClient() {
  const {
    state,
    removingIds,
    handleRemove,
  } = useWishlistPage()

  if (state.status === 'loading') {
    return <Loading />
  }

  if (state.status === 'error') {
    return (
      <main className="ui-page-shell flex flex-col items-center justify-center gap-4">
        <p className="ui-body-muted text-xl">
          Не вдалося завантажити обране
        </p>

        <Link
          href="/"
          className="text-brand hover:underline"
        >
          На головну
        </Link>
      </main>
    )
  }

  if (state.items.length === 0) {
    return <WishlistEmpty />
  }

  return (
    <PageContainer>
      <Breadcrumbs
        items={[
          {
            label: 'Головна',
            href: '/',
          },
          {
            label: 'Обране',
          },
        ]}
      />

      <div className="mb-6 flex items-center gap-3">
        <h1 className="ui-heading-page">
          Обране
        </h1>

        <span className="ui-body-muted">
          {state.items.length} товарів
        </span>
      </div>

      <div>
        {state.items.map((item) => (
          <WishlistItemRow
            key={item.id}
            item={item}
            isRemoving={removingIds.has(
              item.productId,
            )}
            onRemove={handleRemove}
          />
        ))}
      </div>
    </PageContainer>
  )
}