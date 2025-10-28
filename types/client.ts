export type ProjectStatus = 
  | "prospection" 
  | "nouveau" 
  | "acompte_verse" 
  | "en_conception" 
  | "en_validation"
  | "en_chantier" 
  | "livraison" 
  | "termine"
  | "annule"
  | "suspendu"
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
  leadId?: string // Link back to original lead for traceability
  email?: string
  adresse?: string
  budget?: number
  notes?: string
  historique?: ClientHistoryEntry[]
  documents?: ClientDocument[]
  stages?: ProjectStage[]
  rendezVous?: Appointment[]
  payments?: Payment[]
}

export interface ClientHistoryEntry {
  id: string
  date: string
  type: "note" | "appel" | "whatsapp" | "modification" | "statut" | "document" | "rendez-vous" | "devis" | "validation" | "acompte" | "tache" | "projet"
  description: string
  auteur: string
  metadata?: Record<string, any>
}

export interface ClientDocument {
  id: string
  name: string
  type: "pdf" | "image" | "dwg" | "other"
  size: number
  uploadedAt: string
  uploadedBy: string
  url?: string
  category?: "devis" | "plan" | "photo" | "contrat" | "autre"
}

export interface ProjectStage {
  id: string
  name: string
  status: "completed" | "in_progress" | "pending"
  completedAt?: string
  description?: string
  order: number
}

export interface Appointment {
  id: string
  date: string
  title: string
  description?: string
  location?: string
  status: "scheduled" | "completed" | "cancelled"
  createdAt: string
}

export interface Payment {
  id: string
  amount: number
  date: string
  method: "espece" | "virement" | "cheque"
  reference?: string
  notes?: string
  createdBy: string
  createdAt: string
}