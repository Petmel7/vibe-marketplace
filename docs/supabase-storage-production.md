# Supabase Storage Production Checklist

This marketplace uses four Supabase Storage buckets.

## Bucket inventory

1. `product-images`
- visibility: public
- upload actors: server-side seller product flows via admin client
- read actors: public product pages and product cards
- signed URLs: no

2. `store-assets`
- visibility: public
- upload actors: server-side storefront/store settings flows via admin client
- read actors: public storefront and marketplace surfaces
- signed URLs: no

3. `abuse-report-evidence`
- visibility: private
- upload actors: server-side abuse report evidence flows
- read actors: report owner and admins
- signed URLs: yes

4. `dispute-evidence`
- visibility: private
- upload actors: server-side dispute evidence flows
- read actors: dispute participants and admins
- signed URLs: yes

## Required production policy posture

1. Public media buckets
- `product-images` must be intentionally public
- `store-assets` must be intentionally public
- direct object reads are expected for these buckets

2. Private evidence buckets
- `abuse-report-evidence` must not be publicly readable
- `dispute-evidence` must not be publicly readable
- these buckets should be private/authenticated buckets only
- evidence access in the app must continue to rely on signed URLs

## Implementation mapping

- public media uploads: [C:\vibe-marketplace\features\media\media.repository.ts](C:/vibe-marketplace/features/media/media.repository.ts)
- abuse evidence uploads + signed access: [C:\vibe-marketplace\features\abuse-reports\abuse-report-evidence-storage.repository.ts](C:/vibe-marketplace/features/abuse-reports/abuse-report-evidence-storage.repository.ts)
- dispute evidence uploads + signed access: [C:\vibe-marketplace\features\disputes\disputes.storage.repository.ts](C:/vibe-marketplace/features/disputes/disputes.storage.repository.ts)
- static bucket diagnostics: [C:\vibe-marketplace\features\media\storage.config.ts](C:/vibe-marketplace/features/media/storage.config.ts)

## Security findings

Verified in code:

- evidence buckets are not exposed through `getPublicUrl()`
- abuse/dispute evidence uses `createSignedUrl(...)`
- product/store media behavior is intentionally public
- uploads happen through the server-side admin client, not browser-held service credentials

Operational checks still required in Supabase:

- confirm all four buckets exist
- confirm `product-images` and `store-assets` are public
- confirm `abuse-report-evidence` and `dispute-evidence` are private
- confirm no broad public read policy exists on the evidence buckets

## Production checklist

1. Create the buckets:
- `product-images`
- `store-assets`
- `abuse-report-evidence`
- `dispute-evidence`

2. Set visibility:
- public: `product-images`, `store-assets`
- private: `abuse-report-evidence`, `dispute-evidence`

3. Verify app flows:
- seller product image upload
- seller storefront logo/banner upload
- abuse evidence upload and owner/admin download through signed URL
- dispute evidence upload and participant/admin download through signed URL

4. Check deep health:
- `GET /api/health/deep`
- confirm `storage.ok` is true
- confirm bucket inventory matches expectations

5. Re-check that no private evidence URL is directly public:
- private evidence URLs should resolve only through signed links
