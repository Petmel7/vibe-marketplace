import { fetchCategoryTree } from '@/components/category/category.server'
import HeaderClient from '@/components/layout/HeaderClient'

export default async function Header() {
  const categories = await fetchCategoryTree()

  return <HeaderClient categories={categories} />
}
