'use client'

import { useCategoryTree } from '@/hooks/useCategoryTree'

export function useSellerCategories() {
  return useCategoryTree()
}
