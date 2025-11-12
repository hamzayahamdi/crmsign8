import type { ProjectStatus } from '@/types/client'
import { 
  User, ClipboardList, DollarSign, Palette, FileText, CheckCircle, XCircle, 
  Wallet, Briefcase, HardHat, Receipt, Truck 
} from 'lucide-react'

export interface StatusConfig {
  value: ProjectStatus
  label: string
  color: string
  bgColor: string
  textColor: string
  borderColor: string
  gradient: string
  icon: any
  progress: number
  description: string
  nextActions: string[]
}

export const STATUS_CONFIG: Record<ProjectStatus, StatusConfig> = {
  qualifie: {
    value: 'qualifie',
    label: 'Qualifié',
    color: 'blue',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-300',
    borderColor: 'border-blue-500/30',
    gradient: 'from-blue-400 to-blue-500',
    icon: User,
    progress: 10,
    description: 'Le client est qualifié et le projet est en phase initiale',
    nextActions: [
      'Vérifier les informations client',
      'Planifier RDV initial',
      'Préparer présentation'
    ]
  },
  prise_de_besoin: {
    value: 'prise_de_besoin',
    label: 'Prise de besoin',
    color: 'sky',
    bgColor: 'bg-sky-500/20',
    textColor: 'text-sky-300',
    borderColor: 'border-sky-500/30',
    gradient: 'from-sky-400 to-sky-500',
    icon: ClipboardList,
    progress: 20,
    description: 'Prise détaillée des besoins du client et qualification avancée',
    nextActions: [
      'Organiser un atelier découverte',
      'Documenter les besoins et contraintes',
      'Préparer les éléments du devis'
    ]
  },
  acompte_recu: {
    value: 'acompte_recu',
    label: 'Acompte reçu',
    color: 'green',
    bgColor: 'bg-green-500/20',
    textColor: 'text-green-300',
    borderColor: 'border-green-500/30',
    gradient: 'from-green-400 to-green-500',
    icon: DollarSign,
    progress: 30,
    description: 'Acompte initial reçu, prêt à démarrer la conception',
    nextActions: [
      'Démarrer la conception',
      'Planifier réunion de brief',
      'Collecter les besoins'
    ]
  },
  conception: {
    value: 'conception',
    label: 'Conception',
    color: 'purple',
    bgColor: 'bg-purple-500/20',
    textColor: 'text-purple-300',
    borderColor: 'border-purple-500/30',
    gradient: 'from-purple-400 to-purple-500',
    icon: Palette,
    progress: 45,
    description: 'Phase de conception et design en cours',
    nextActions: [
      'Finaliser les plans',
      'Partager avec le client',
      'Obtenir validation'
    ]
  },
  devis_negociation: {
    value: 'devis_negociation',
    label: 'Devis/Négociation',
    color: 'yellow',
    bgColor: 'bg-yellow-500/20',
    textColor: 'text-yellow-300',
    borderColor: 'border-yellow-500/30',
    gradient: 'from-yellow-400 to-yellow-500',
    icon: FileText,
    progress: 55,
    description: 'Devis envoyé, en attente de validation',
    nextActions: [
      'Envoyer le devis',
      'Suivre avec le client',
      'Négocier si nécessaire'
    ]
  },
  accepte: {
    value: 'accepte',
    label: 'Accepté',
    color: 'emerald',
    bgColor: 'bg-emerald-500/20',
    textColor: 'text-emerald-300',
    borderColor: 'border-emerald-500/30',
    gradient: 'from-emerald-400 to-emerald-500',
    icon: CheckCircle,
    progress: 65,
    description: 'Devis accepté par le client',
    nextActions: [
      'Préparer le contrat',
      'Organiser le 1er dépôt',
      'Planifier le démarrage'
    ]
  },
  refuse: {
    value: 'refuse',
    label: 'Refusé',
    color: 'red',
    bgColor: 'bg-red-500/20',
    textColor: 'text-red-300',
    borderColor: 'border-red-500/30',
    gradient: 'from-red-400 to-red-500',
    icon: XCircle,
    progress: 0,
    description: 'Devis refusé - projet terminé',
    nextActions: [
      'Demander feedback',
      'Archiver le projet',
      'Rester en contact'
    ]
  },
  premier_depot: {
    value: 'premier_depot',
    label: '1er Dépôt',
    color: 'cyan',
    bgColor: 'bg-cyan-500/20',
    textColor: 'text-cyan-300',
    borderColor: 'border-cyan-500/30',
    gradient: 'from-cyan-400 to-cyan-500',
    icon: Wallet,
    progress: 75,
    description: 'Premier dépôt reçu, projet lancé',
    nextActions: [
      'Lancer le projet',
      'Planifier les étapes',
      'Commander les matériaux'
    ]
  },
  projet_en_cours: {
    value: 'projet_en_cours',
    label: 'Projet en cours',
    color: 'indigo',
    bgColor: 'bg-indigo-500/20',
    textColor: 'text-indigo-300',
    borderColor: 'border-indigo-500/30',
    gradient: 'from-indigo-400 to-indigo-500',
    icon: Briefcase,
    progress: 85,
    description: 'Projet activement en cours de réalisation',
    nextActions: [
      'Suivre l\'avancement',
      'Mettre à jour le planning',
      'Communiquer avec le client'
    ]
  },
  chantier: {
    value: 'chantier',
    label: 'Travaux (héritage)',
    color: 'indigo',
    bgColor: 'bg-indigo-500/20',
    textColor: 'text-indigo-300',
    borderColor: 'border-indigo-500/30',
    gradient: 'from-indigo-400 to-indigo-500',
    icon: HardHat,
    progress: 85,
    description: 'Statut hérité. Mettez à jour le projet vers "Projet en cours" pour profiter du nouveau suivi.',
    nextActions: [
      'Basculer vers Projet en cours',
      'Documenter l\'avancement dans Projet en cours'
    ]
  },
  facture_reglee: {
    value: 'facture_reglee',
    label: 'Facture réglée',
    color: 'green',
    bgColor: 'bg-green-600/20',
    textColor: 'text-green-300',
    borderColor: 'border-green-600/30',
    gradient: 'from-green-500 to-green-600',
    icon: Receipt,
    progress: 95,
    description: 'Facture finale réglée',
    nextActions: [
      'Planifier la livraison',
      'Préparer la remise des clés',
      'Finaliser les documents'
    ]
  },
  livraison_termine: {
    value: 'livraison_termine',
    label: 'Livraison & Terminé',
    color: 'amber',
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-300',
    borderColor: 'border-amber-500/30',
    gradient: 'from-amber-400 to-amber-500',
    icon: Truck,
    progress: 100,
    description: 'Projet livré et terminé avec succès',
    nextActions: [
      'Recueillir les retours',
      'Demander un témoignage',
      'Archiver le projet'
    ]
  },
  // Legacy statuses for backward compatibility
  nouveau: {
    value: 'nouveau',
    label: 'Nouveau',
    color: 'blue',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-300',
    borderColor: 'border-blue-500/30',
    gradient: 'from-blue-400 to-blue-500',
    icon: User,
    progress: 10,
    description: 'Nouveau projet',
    nextActions: ['Qualifier le projet']
  },
  acompte_verse: {
    value: 'acompte_verse',
    label: 'Acompte versé',
    color: 'green',
    bgColor: 'bg-green-500/20',
    textColor: 'text-green-300',
    borderColor: 'border-green-500/30',
    gradient: 'from-green-400 to-green-500',
    icon: DollarSign,
    progress: 20,
    description: 'Acompte versé',
    nextActions: ['Démarrer la conception']
  },
  en_conception: {
    value: 'en_conception',
    label: 'En conception',
    color: 'purple',
    bgColor: 'bg-purple-500/20',
    textColor: 'text-purple-300',
    borderColor: 'border-purple-500/30',
    gradient: 'from-purple-400 to-purple-500',
    icon: Palette,
    progress: 35,
    description: 'En conception',
    nextActions: ['Finaliser les plans']
  },
  en_validation: {
    value: 'en_validation',
    label: 'En validation',
    color: 'yellow',
    bgColor: 'bg-yellow-500/20',
    textColor: 'text-yellow-300',
    borderColor: 'border-yellow-500/30',
    gradient: 'from-yellow-400 to-yellow-500',
    icon: FileText,
    progress: 45,
    description: 'En validation',
    nextActions: ['Obtenir validation']
  },
  en_chantier: {
    value: 'en_chantier',
    label: 'En chantier',
    color: 'blue',
    bgColor: 'bg-blue-600/20',
    textColor: 'text-blue-300',
    borderColor: 'border-blue-600/30',
    gradient: 'from-blue-500 to-blue-600',
    icon: HardHat,
    progress: 85,
    description: 'En chantier',
    nextActions: ['Suivre le chantier']
  },
  livraison: {
    value: 'livraison',
    label: 'Livraison',
    color: 'amber',
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-300',
    borderColor: 'border-amber-500/30',
    gradient: 'from-amber-400 to-amber-500',
    icon: Truck,
    progress: 95,
    description: 'Livraison',
    nextActions: ['Livrer le projet']
  },
  termine: {
    value: 'termine',
    label: 'Terminé',
    color: 'gray',
    bgColor: 'bg-gray-500/20',
    textColor: 'text-gray-300',
    borderColor: 'border-gray-500/30',
    gradient: 'from-gray-400 to-gray-500',
    icon: CheckCircle,
    progress: 100,
    description: 'Terminé',
    nextActions: ['Archiver']
  },
  annule: {
    value: 'annule',
    label: 'Annulé',
    color: 'red',
    bgColor: 'bg-red-500/20',
    textColor: 'text-red-300',
    borderColor: 'border-red-500/30',
    gradient: 'from-red-400 to-red-500',
    icon: XCircle,
    progress: 0,
    description: 'Annulé',
    nextActions: ['Archiver']
  },
  suspendu: {
    value: 'suspendu',
    label: 'Suspendu',
    color: 'gray',
    bgColor: 'bg-gray-500/20',
    textColor: 'text-gray-300',
    borderColor: 'border-gray-500/30',
    gradient: 'from-gray-400 to-gray-500',
    icon: XCircle,
    progress: 0,
    description: 'Suspendu',
    nextActions: ['Réactiver ou archiver']
  }
}

// Helper functions
export function getStatusConfig(status: ProjectStatus): StatusConfig {
  return STATUS_CONFIG[status] || STATUS_CONFIG.qualifie
}

export function getStatusProgress(status: ProjectStatus): number {
  return getStatusConfig(status).progress
}

export function getStatusColor(status: ProjectStatus): string {
  return getStatusConfig(status).color
}

export function getStatusLabel(status: ProjectStatus): string {
  return getStatusConfig(status).label
}

export function getNextActions(status: ProjectStatus): string[] {
  return getStatusConfig(status).nextActions
}

// Get all active statuses (excluding legacy and terminal states)
export const ACTIVE_STATUSES: ProjectStatus[] = [
  'qualifie',
  'acompte_recu',
  'conception',
  'devis_negociation',
  'accepte',
  'premier_depot',
  'projet_en_cours',
  'chantier',
  'facture_reglee',
  'livraison_termine'
]

// Get terminal statuses
export const TERMINAL_STATUSES: ProjectStatus[] = [
  'refuse',
  'livraison_termine',
  'annule'
]
