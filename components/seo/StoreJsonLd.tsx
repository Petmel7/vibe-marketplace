import JsonLd from './JsonLd'

type StoreJsonLdData = {
  '@context': 'https://schema.org'
  '@type': 'Store'
  name: string
  url: string
  description?: string
  image?: string
}

export default function StoreJsonLd({ data }: { data: StoreJsonLdData }) {
  return <JsonLd id="store-jsonld" data={data} />
}
