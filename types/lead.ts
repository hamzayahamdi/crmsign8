export type LeadStatus = "nouveau" | "a_recontacter" | "sans_reponse" | "non_interesse" | "converti" | "qualifie" | "refuse"
export type LeadSource = "magasin" | "site_web" | "facebook" | "instagram" | "tiktok" | "reference_client" | "autre"
export type LeadPriority = "haute" | "moyenne" | "basse"

export interface LeadNote {
  id: string
  leadId: string
  content: string
  author: string
  createdAt: string
}

export interface Lead {
  id: string
  nom: string
  telephone: string
  email?: string
  ville: string
  typeBien: string
  statut: LeadStatus
  statutDetaille: string
  message?: string
  assignePar: string
  derniereMaj: string
  source: LeadSource
  priorite: LeadPriority
  magasin?: string
  commercialMagasin?: string
  month?: string
  campaignName?: string
  uploadedAt?: string
  convertedAt?: string
  convertedToContactId?: string
  notes?: LeadNote[]
  createdBy?: string
  createdAt: string
  updatedAt: string
}
