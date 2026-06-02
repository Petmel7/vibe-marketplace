'use client'

import type { CategoryTreeNode } from '@/components/category/category.data'
import type { ProductSearchFacetsDto } from '@/features/products/product.dto'
import AvailabilityFilter from './AvailabilityFilter'
import BadgeFilter from './BadgeFilter'
import CategoryFilter from './CategoryFilter'
import PriceRangeFilter from './PriceRangeFilter'
import RatingFilter from './RatingFilter'
import StoreFilter from './StoreFilter'

interface SearchFilterSidebarProps {
  selectedCategory: string | null
  minPrice: string
  maxPrice: string
  inStock: boolean
  rating: string | null
  badge: string | null
  store: string | null
  facets: ProductSearchFacetsDto
  categoryTree: CategoryTreeNode[]
  hideCategoryFilter?: boolean
  onCategoryChange: (value: string | null) => void
  onPriceApply: (values: { minPrice: string | null; maxPrice: string | null }) => void
  onInStockChange: (value: boolean) => void
  onRatingChange: (value: string | null) => void
  onBadgeChange: (value: string | null) => void
  onStoreChange: (value: string | null) => void
}

export default function SearchFilterSidebar({
  selectedCategory,
  minPrice,
  maxPrice,
  inStock,
  rating,
  badge,
  store,
  facets,
  categoryTree,
  hideCategoryFilter,
  onCategoryChange,
  onPriceApply,
  onInStockChange,
  onRatingChange,
  onBadgeChange,
  onStoreChange,
}: SearchFilterSidebarProps) {
  return (
    <div className="space-y-6 rounded-[28px] border border-panelBorder bg-panel p-5">
      {!hideCategoryFilter ? (
        <CategoryFilter
          value={selectedCategory}
          categories={categoryTree}
          facets={facets.categories}
          onChange={onCategoryChange}
        />
      ) : null}

      <PriceRangeFilter
        minValue={minPrice}
        maxValue={maxPrice}
        facetMin={facets.priceRange.min}
        facetMax={facets.priceRange.max}
        onApply={onPriceApply}
      />

      <AvailabilityFilter
        checked={inStock}
        inStockCount={facets.availability.inStock}
        outOfStockCount={facets.availability.outOfStock}
        onChange={onInStockChange}
      />

      <RatingFilter
        value={rating}
        options={facets.ratings}
        onChange={onRatingChange}
      />

      <BadgeFilter
        value={badge}
        options={facets.badges}
        onChange={onBadgeChange}
      />

      <StoreFilter
        value={store}
        options={facets.stores}
        onChange={onStoreChange}
      />
    </div>
  )
}
