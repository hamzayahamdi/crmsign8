export type ProjectStatus = "en_conception" | "en_travaux" | "termine"
export type ProjectType = "appartement" | "villa" | "magasin" | "bureau" | "riad" | "studio" | "autre"

export interface Client {
  id: string
  nom: string
  telephone: string
  ville: string
  typeProjet: ProjectType
  architecteAssigne: string
  statutProjet: ProjectStatus
  derniereMaj: string
  createdAt: string
  updatedAt: string
  email?: string
  adresse?: string
  budget?: number
  notes?: string
  historique?: ClientHistoryEntry[]
}

export interface ClientHistoryEntry {
  id: string
  date: string
  type: "note" | "appel" | "whatsapp" | "modification" | "statut"
  description: string
  auteur: string
}
