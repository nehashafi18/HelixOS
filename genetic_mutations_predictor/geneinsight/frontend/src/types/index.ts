export type UserRole = 'researcher' | 'admin'
export type ReportStatus = 'processing' | 'completed' | 'failed'
export type ReviewStatus = 'pending' | 'reviewed' | 'flagged'

export interface User {
  id: number
  email: string
  name: string
  role: UserRole
  created_at: string
}

export interface AuthToken {
  access_token: string
  token_type: string
  user: User
}

export interface Report {
  id: number
  user_id: number
  filename: string
  upload_date: string
  status: ReportStatus
  total_variants: number
  pathogenic_count: number
  benign_count: number
}

export interface Variant {
  id: number
  report_id: number
  gene: string | null
  name: string | null
  original_aa: string | null
  new_aa: string | null
  position: number | null
  variant_type: string | null
  origin: string | null
  prediction: string | null
  confidence: number | null
  shap_values: Record<string, number> | null
  features: Record<string, number | string> | null
  clinical_significance: string | null
  review_status: ReviewStatus
  explanation: string | null
}

export interface VariantListItem {
  id: number
  report_id: number
  gene: string | null
  name: string | null
  original_aa: string | null
  new_aa: string | null
  position: number | null
  prediction: string | null
  confidence: number | null
  clinical_significance: string | null
  review_status: ReviewStatus
}

export interface PaginatedVariants {
  items: VariantListItem[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface OverviewStats {
  total_reports: number
  total_variants: number
  pathogenic_count: number
  benign_count: number
  avg_confidence: number
  high_risk_count: number
}

export interface GeneStats {
  gene: string
  total: number
  pathogenic: number
  benign: number
}

export interface ConfidenceBucket {
  range: string
  count: number
}

export interface FeatureImportance {
  feature: string
  importance: number
}

export interface ChatMessage {
  message: string
  report_id?: number
  variant_id?: number
}

export interface ChatResponse {
  response: string
  context_used: boolean
}

export interface SampleFile {
  name: string
  variants: number
  url: string
}
