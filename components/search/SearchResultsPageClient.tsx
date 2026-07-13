'use client'

import Link from 'next/link'
import { Filter } from 'lucide-react'
import { useMemo, useState } from 'react'
import ProductCardGrid from '@/components/product/ProductCardGrid'
import { type ProductListItem } from '@/components/product/productListItem'
import { useSearchFilters } from '@/hooks/useSearchFilters'
import type { SearchPageViewModel, SearchSortOption } from '@/types/search'
import ActiveFilters from './ActiveFilters'
import MobileFilterDrawer from './MobileFilterDrawer'
import SearchFilterSidebar from './SearchFilterSidebar'
import SearchPagination from './SearchPagination'
import SearchSortSelect from './SearchSortSelect'

const SEARCH_SORT_OPTIONS: SearchSortOption[] = [
  { value: 'relevance', label: 'За релевантністю' },
  { value: 'newest', label: 'Спочатку нові' },
  { value: 'price_asc', label: 'Спочатку дешевші' },
  { value: 'price_desc', label: 'Спочатку дорожчі' },
  { value: 'rating', label: 'За рейтингом' },
  { value: 'popular', label: 'За популярністю' },
]

const BADGE_LABELS: Record<string, string> = {
  NEW: 'Новинка',
  HIT: 'Хіт',
  FEATURED: 'Рекомендуємо',
}

type SearchResultsPageClientProps = SearchPageViewModel

export default function SearchResultsPageClient({
  title,
  subtitle,
  pathname,
  results,
  state,
  categoryTree,
  flatCategories,
  lockedCategory,
}: SearchResultsPageClientProps) {
  const {
    isPending,
    setFilter,
    setBooleanFilter,
    setFilters,
    clearFilter,
    clearAllFilters,
    resetSearch,
    goToPage,
  } = useSearchFilters()
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)

  const visibleProducts = results.items as ProductListItem[]

  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string }> = []

    if (state.category && !lockedCategory) {
      const categoryLabel =
        flatCategories.find((category) => category.slug === state.category)?.name ??
        state.category

      filters.push({ key: 'category', label: categoryLabel })
    }

    if (state.minPrice) {
      filters.push({ key: 'minPrice', label: `Від ${state.minPrice} грн` })
    }

    if (state.maxPrice) {
      filters.push({ key: 'maxPrice', label: `До ${state.maxPrice} грн` })
    }

    if (state.inStock) {
      filters.push({ key: 'inStock', label: 'В наявності' })
    }

    if (state.rating) {
      filters.push({ key: 'rating', label: `${state.rating}★ і вище` })
    }

    if (state.badge) {
      filters.push({
        key: 'badge',
        label: BADGE_LABELS[state.badge] ?? state.badge,
      })
    }

    if (state.store) {
      const storeLabel =
        results.facets.stores.find(
          (store) => store.slug === state.store || store.id === state.store,
        )?.name ?? state.store

      filters.push({ key: 'store', label: storeLabel })
    }

    return filters
  }, [
    flatCategories,
    lockedCategory,
    results.facets.stores,
    state.badge,
    state.category,
    state.inStock,
    state.maxPrice,
    state.minPrice,
    state.rating,
    state.store,
  ])

  const hasAnyFilters = activeFilters.length > 0
  const hasSearchQuery = Boolean(state.q)

  return (
    <main>
      <section className="space-y-6">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <h1 className="ui-heading-page">{title}</h1>
              {subtitle ? <p className="ui-body-muted">{subtitle}</p> : null}
              {lockedCategory ? (
                <p className="text-sm text-copy-muted">
                  Категорія: {lockedCategory.name}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <form
                key={state.q}
                className="flex gap-2"
                role="search"
                onSubmit={(event) => {
                  event.preventDefault()
                  const formData = new FormData(event.currentTarget)
                  const nextQuery = String(formData.get('q') ?? '').trim()
                  setFilter('q', nextQuery || null)
                }}
              >
                <input
                  type="search"
                  name="q"
                  defaultValue={state.q}
                  placeholder="Пошук товарів"
                  className="ui-surface-input min-w-0 sm:min-w-72"
                  aria-label="Пошуковий запит"
                />
                <button type="submit" className="ui-secondary-button h-12 px-5 text-sm">
                  Знайти
                </button>
              </form>

              <SearchSortSelect
                value={state.sort}
                options={SEARCH_SORT_OPTIONS}
                onChange={(value) => setFilter('sort', value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="ui-body-secondary">
              Знайдено {results.pagination.total} товарів
              {state.q ? ` за запитом "${state.q}"` : ''}
            </p>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-panelBorder px-4 py-2 text-sm text-copy-primary transition hover:border-white/20 hover:text-white lg:hidden"
              onClick={() => setIsMobileFiltersOpen(true)}
            >
              <Filter size={16} aria-hidden="true" />
              Фільтри
            </button>
          </div>

          <ActiveFilters
            filters={activeFilters}
            onRemove={(key) => clearFilter(key as Parameters<typeof clearFilter>[0])}
            onClearAll={clearAllFilters}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <SearchFilterSidebar
              selectedCategory={state.category}
              minPrice={state.minPrice}
              maxPrice={state.maxPrice}
              inStock={state.inStock}
              rating={state.rating}
              badge={state.badge}
              store={state.store}
              facets={results.facets}
              categoryTree={categoryTree}
              hideCategoryFilter={Boolean(lockedCategory)}
              onCategoryChange={(value) => setFilter('category', value)}
              onPriceApply={(values) => setFilters(values)}
              onInStockChange={(value) => setBooleanFilter('inStock', value)}
              onRatingChange={(value) => setFilter('rating', value)}
              onBadgeChange={(value) => setFilter('badge', value)}
              onStoreChange={(value) => setFilter('store', value)}
            />
          </aside>

          <div className="space-y-5">
            {isPending ? (
              <div
                className="rounded-2xl border border-panelBorder bg-panel px-4 py-3 text-sm text-copy-muted"
                aria-live="polite"
              >
                Оновлюємо результати…
              </div>
            ) : null}

            {visibleProducts.length > 0 ? (
              <>
                <ProductCardGrid products={visibleProducts} />
                <SearchPagination
                  page={results.pagination.page}
                  totalPages={results.pagination.totalPages}
                  onPageChange={goToPage}
                />
              </>
            ) : (
              <div className="rounded-[28px] border border-dashed border-panelBorder bg-panel p-8 text-center">
                <h2 className="text-lg font-semibold text-copy-strong">
                  Нічого не знайдено
                </h2>
                <p className="mt-2 ui-body-muted">
                  Спробуйте змінити запит або послабити фільтри.
                </p>
                {hasAnyFilters || hasSearchQuery ? (
                  <button
                    type="button"
                    onClick={resetSearch}
                    className="mt-4 ui-secondary-button h-11 px-5 text-sm"
                  >
                    Скинути пошук
                  </button>
                ) : (
                  <Link href={pathname} className="mt-4 inline-flex ui-secondary-button h-11 px-5 text-sm">
                    {lockedCategory ? 'Оновити категорію' : 'Повернутися до каталогу'}
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <MobileFilterDrawer
        isOpen={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
      >
        <SearchFilterSidebar
          selectedCategory={state.category}
          minPrice={state.minPrice}
          maxPrice={state.maxPrice}
          inStock={state.inStock}
          rating={state.rating}
          badge={state.badge}
          store={state.store}
          facets={results.facets}
          categoryTree={categoryTree}
          hideCategoryFilter={Boolean(lockedCategory)}
          onCategoryChange={(value) => {
            setFilter('category', value)
            setIsMobileFiltersOpen(false)
          }}
          onPriceApply={(values) => {
            setFilters(values)
            setIsMobileFiltersOpen(false)
          }}
          onInStockChange={(value) => setBooleanFilter('inStock', value)}
          onRatingChange={(value) => setFilter('rating', value)}
          onBadgeChange={(value) => setFilter('badge', value)}
          onStoreChange={(value) => setFilter('store', value)}
        />
      </MobileFilterDrawer>
    </main>
  )
}
