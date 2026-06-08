import type { WebSiteSearchActionJsonLdDto } from '@/features/seo/seo.dto'
import JsonLd from './JsonLd'

export default function WebSiteJsonLd({ data }: { data: WebSiteSearchActionJsonLdDto }) {
  return <JsonLd id="website-jsonld" data={data} />
}
