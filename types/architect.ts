export type ArchitectStatus = "actif" | "inactif" | "conge"
export type ArchitectSpecialty = "residentiel" | "commercial" | "industriel" | "renovation" | "luxe" | "mixte"

export interface Architect {
  id: string
  nom: string
  prenom: string
  email: string
  telephone: string
  ville: string
  specialite: ArchitectSpecialty
  statut: ArchitectStatus
  photo?: string
  bio?: string
  dateEmbauche: string
  createdAt: string
  updatedAt: string
  
  // Statistics (computed from clients, contacts, and opportunities)
  totalDossiers?: number
  dossiersEnCours?: number
  dossiersTermines?: number
  dossiersEnAttente?: number
  isDisponible?: boolean // Available if less than 10 active dossiers
  // Breakdown by source
  clientsCount?: number
  contactsCount?: number
  opportunitiesCount?: number
}

export interface ArchitectPerformance {
  architectId: string
  totalClients: number
  activeProjects: number
  completedProjects: number
  pendingProjects: number
  totalRevenue: number
  averageProjectDuration: number
  clientSatisfaction?: number
}

export type NotificationType = "dossier_assigned" | "dossier_updated" | "dossier_completed" | "message" | "document_added"

export interface ArchitectNotification {
  id: string
  architectId: string
  type: NotificationType
  title: string
  message: string
  clientId?: string
  clientName?: string
  isRead: boolean
  createdAt: string
}
