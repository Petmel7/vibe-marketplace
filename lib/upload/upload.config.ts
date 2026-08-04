import { ABUSE_REPORT_EVIDENCE_BUCKET } from '@/features/abuse-reports/abuse-report-evidence.dto'
import { DISPUTE_EVIDENCE_BUCKET } from '@/features/disputes/disputes.dto'
import {
  CATEGORY_IMAGE_BUCKET,
  HERO_BANNER_BUCKET,
  PRODUCT_IMAGE_BUCKET,
  STORE_ASSET_BUCKET,
} from '@/features/media/media.dto'

export const UPLOAD_BUCKETS = {
  abuseReportEvidence: ABUSE_REPORT_EVIDENCE_BUCKET,
  categoryImages: CATEGORY_IMAGE_BUCKET,
  disputeEvidence: DISPUTE_EVIDENCE_BUCKET,
  heroBanners: HERO_BANNER_BUCKET,
  productImages: PRODUCT_IMAGE_BUCKET,
  storeAssets: STORE_ASSET_BUCKET,
} as const

export type UploadBucket = (typeof UPLOAD_BUCKETS)[keyof typeof UPLOAD_BUCKETS]
