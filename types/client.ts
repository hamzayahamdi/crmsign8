export type ProjectStatus = 
  | "qualifie"           // 1️⃣ Qualifié
  | "prise_de_besoin"   // 📝 Prise de besoin
  | "acompte_recu"       // 2️⃣ Acompte reçu
  | "conception"         // 3️⃣ Conception
  | "devis_negociation"  // 4️⃣ Devis / Négociation
  | "accepte"            // 5️⃣ Accepté
  | "refuse"             // 6️⃣ Refusé
  | "premier_depot"      // 7️⃣ 1er Dépôt
  | "projet_en_cours"    // 8️⃣ Projet en cours
  | "chantier"           // 9️⃣ Chantier
  | "facture_reglee"     // 🔟 Facture réglée
  | "livraison_termine"  // 🏁 Livraison & Terminé
  // Legacy statuses for backward compatibility
  | "nouveau" 
  | "acompte_verse" 
  | "en_conception" 
  | "en_validation"
  | "en_chantier" 
  | "livraison" 
  | "termine"
  | "annule"
  | "suspendu"
  | "perdu"              // Lost project/opportunity
export type ProjectType = "appartement" | "villa" | "magasin" | "bureau" | "riad" | "studio" | "autre"

export interface Opportunity {
  id: string
  titre: string
  type: ProjectType
  budget: number
  statutProjet: ProjectStatus
  architecteAssigne: string
  pipelineStage?: string
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: string
  contactId?: string // Original contact ID (for opportunity-based clients)
  opportunityId?: string // Original opportunity ID (for opportunity-based clients)
  nom: string
  nomProjet?: string // Project/Opportunity name (from opportunities table)
  telephone: string
  ville: string
  typeProjet: ProjectType
  architecteAssigne: string
  statutProjet: ProjectStatus
  derniereMaj: string
  createdAt: string
  updatedAt: string
  leadId?: string // Link back to original lead for traceability
  leadData?: any // Complete original lead data for restoration on deletion
  email?: string
  adresse?: string
  budget?: number
  notes?: string
  magasin?: string // Magasin assignment (Rabat, Casa, Tanger, etc.)
  commercialAttribue?: string // Commercial who created/owns this client
  opportunityCreatedBy?: string // Who created the opportunity (more specific than commercialAttribue)
  contactCreatedBy?: string // Who created the contact (if different from opportunity creator)
  historique?: ClientHistoryEntry[]
  documents?: ClientDocument[]
  stages?: ProjectStage[]
  rendezVous?: Appointment[]
  payments?: Payment[]
  devis?: Devis[] // Multiple quotes support
  isContact?: boolean // Flag to indicate if this is from contacts table
  opportunities?: Opportunity[] // Grouped opportunities for this client
  opportunitiesCount?: number // Number of opportunities
}

export interface Devis {
  id: string
  title: string
  montant: number
  date: string
  statut: "en_attente" | "accepte" | "refuse"
  facture_reglee: boolean
  description?: string
  fichier?: string
  createdBy: string
  createdAt: string
  validatedAt?: string
  notes?: string
}

export interface ClientHistoryEntry {
  id: string
  date: string
  type: "note" | "appel" | "whatsapp" | "modification" | "statut" | "document" | "rendez-vous" | "devis" | "validation" | "acompte" | "tache" | "projet" | "rdv"
  description: string
  auteur: string
  metadata?: Record<string, any>
  // Status change tracking
  previousStatus?: ProjectStatus
  newStatus?: ProjectStatus
  durationInHours?: number // Time spent in previous status
  timestampStart?: string
  timestampEnd?: string
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
  title: string
  dateStart: string
  dateEnd: string
  description?: string
  location?: string
  locationUrl?: string // Google Maps link
  status: "upcoming" | "completed" | "cancelled"
  clientId?: string
  clientName?: string
  architecteId?: string
  createdBy: string
  createdAt: string
  updatedAt?: string
  notes?: string
}

export interface Payment {
  id: string
  amount: number
  date: string
  method: "espece" | "virement" | "cheque"
  reference?: string
  notes?: string
  type?: "accompte" | "paiement" // Type of payment to distinguish acompte from regular payments
  createdBy: string
  createdAt: string
}