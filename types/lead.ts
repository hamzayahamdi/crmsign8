export type LeadStatus = "nouveau" | "a_recontacter" | "en_cours" | "signe" | "perdu"
export type LeadSource = "magasin" | "recommandation" | "site_web" | "reseaux_sociaux"
export type LeadPriority = "haute" | "moyenne" | "basse"

export interface Lead {
  id: string
  nom: string
  telephone: string
  ville: string
  typeBien: string
  statut: LeadStatus
  statutDetaille: string
  message?: string
  assignePar: string
  derniereMaj: string
  source: LeadSource
  priorite: LeadPriority
  createdAt: string
  updatedAt: string
}
