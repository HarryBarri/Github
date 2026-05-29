export type ScoreBand = 'HOT' | 'WARM' | 'COLD'

export interface QualificationFields {
  name?: string
  phone?: string
  email?: string
  budgetMin?: number
  budgetMax?: number
  location?: string
  propertyType?: string
  timeline?: string
  readyToBuy?: boolean
}

export interface QualificationResult {
  reply: string
  extracted: QualificationFields | null
  score: ScoreBand
  scoreReason: string
}

export interface LeadDTO {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  budgetMin: number | null
  budgetMax: number | null
  location: string | null
  propertyType: string | null
  timeline: string | null
  status: string
  score: string | null
  scoreReason: string | null
  agentId: string | null
  createdAt: string
  updatedAt: string
}

export interface DashboardStats {
  total: number
  hot: number
  warm: number
  cold: number
  unscored: number
  byStatus: Record<string, number>
  recentLeads: LeadDTO[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
