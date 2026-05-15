
'use client'

import StateView, {
  WISHLIST_ERROR_STATE,
  WISHLIST_EMPTY_STATE,
} from '@/components/ui/StateView'
import Loading from '@/app/wishlist/loading'
import { PageContainer } from '@/components/layout/PageContainer'
import WishlistItemRow from '@/components/wishlist/WishlistItemRow'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { useWishlistPage } from './hooks/useWishlistPage'
import { PageTitle } from '@/components/ui/PageTitle'
import { pluralizeItems } from '@/utils/pluralize'

function WishlistError() {
  return (
    <StateView {...WISHLIST_ERROR_STATE} />
  )
}

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
    return <WishlistError />
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

      <PageTitle
        title="Обране"
        count={state.items.length}
        countLabel={pluralizeItems(state.items.length)}
      />

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