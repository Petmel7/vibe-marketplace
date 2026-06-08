import type { BreadcrumbJsonLdDto } from '@/features/seo/seo.dto'
import JsonLd from './JsonLd'

export default function BreadcrumbJsonLd({ data }: { data: BreadcrumbJsonLdDto }) {
  return <JsonLd id="breadcrumb-jsonld" data={data} />
}
