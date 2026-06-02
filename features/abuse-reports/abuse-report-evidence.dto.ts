export const ABUSE_REPORT_EVIDENCE_BUCKET = 'abuse-report-evidence' as const

export interface AbuseReportEvidenceDto {
  id: string
  url: string
  fileName: string
  fileType: string
  fileSize: number
  createdAt: string
}

export interface AbuseReportEvidenceListDto {
  items: AbuseReportEvidenceDto[]
}
