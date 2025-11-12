"use client"

import { motion } from "framer-motion"
import { 
  Upload, FileText, Send, CheckCircle, XCircle, Calendar,
  Image as ImageIcon, MessageSquare, DollarSign, Clock,
  TrendingUp, Star, Package, NotebookPen, ArrowRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProjectStatus, Client } from "@/types/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface ProjectStageContentProps {
  status: ProjectStatus
  client: Client
  onAction?: (action: string, data?: any) => void
}

interface StageAction {
  key: string
  label: string
  icon?: React.ReactNode
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"
  className?: string
  data?: any
}

interface StageSection {
  icon: React.ReactNode
  title: string
  content: string
  actions?: StageAction[]
}

interface StageStat {
  icon: React.ReactNode
  label: string
  value: string
}

interface StageContent {
  title: string
  description: string
  badge: string
  badgeClass: string
  progress?: number
  sections: StageSection[]
  stats?: StageStat[]
}

export function ProjectStageContent({ status, client, onAction }: ProjectStageContentProps) {
  const stageContent = getStageContent(status, client)

  return (
    <motion.div
      key={status}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Stage Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold text-white mb-2">{stageContent.title}</h3>
          <p className="text-sm text-white/60">{stageContent.description}</p>
        </div>
        <Badge className={cn("text-xs font-semibold", stageContent.badgeClass)}>
          {stageContent.badge}
        </Badge>
      </div>

      {/* Progress Indicator (if applicable) */}
      {stageContent.progress !== undefined && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Avancement</span>
            <span className="text-white font-semibold">{stageContent.progress}%</span>
          </div>
          <Progress value={stageContent.progress} className="h-2" />
        </div>
      )}

      {/* Stage-specific Content */}
      <div className="grid gap-4">
        {stageContent.sections.map((section: StageSection, index: number) => (
          <div
            key={index}
            className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-colors"
          >
            <div className="flex items-center gap-3 mb-3">
              {section.icon}
              <h4 className="text-sm font-semibold text-white">{section.title}</h4>
            </div>
            <p className="text-sm text-white/60 mb-4">{section.content}</p>
            
            {/* Action Buttons */}
            {section.actions && section.actions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {section.actions.map((action: StageAction, actionIndex: number) => (
                  <Button
                    key={actionIndex}
                    onClick={() => onAction?.(action.key, action.data)}
                    size="sm"
                    variant={action.variant || "secondary"}
                    className={cn(
                      "text-xs",
                      action.className
                    )}
                  >
                    {action.icon && <span className="mr-1.5">{action.icon}</span>}
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Stats (if applicable) */}
      {stageContent.stats && stageContent.stats.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {stageContent.stats.map((stat: StageStat, index: number) => (
            <div
              key={index}
              className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                {stat.icon}
                <span className="text-xs text-white/50">{stat.label}</span>
              </div>
              <div className="text-lg font-bold text-white">{stat.value}</div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// Helper function to get stage-specific content
function getStageContent(status: ProjectStatus, client: Client): StageContent {
  const totalPayments = client.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
  const budget = client.budget || 0
  const paymentProgress = budget > 0 ? Math.round((totalPayments / budget) * 100) : 0

  const contentMap: Record<string, any> = {
    qualifie: {
      title: "👤 Qualifié",
      description: "Le client a été qualifié et le projet est en phase initiale",
      badge: "En qualification",
      badgeClass: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      progress: 10,
      sections: [
        {
          icon: <FileText className="w-4 h-4 text-blue-400" />,
          title: "Informations client",
          content: "Vérifiez et complétez les informations du client pour avancer le projet.",
          actions: [
            { key: "edit_client", label: "Modifier infos", icon: <FileText className="w-3 h-3" /> },
            { key: "add_note", label: "Ajouter note", icon: <MessageSquare className="w-3 h-3" /> }
          ]
        },
        {
          icon: <Calendar className="w-4 h-4 text-blue-400" />,
          title: "Prochaines étapes",
          content: "Planifiez un rendez-vous initial pour discuter des besoins et du budget.",
          actions: [
            { key: "schedule_meeting", label: "Planifier RDV", icon: <Calendar className="w-3 h-3" />, variant: "default", className: "bg-blue-600 hover:bg-blue-700" }
          ]
        }
      ]
    },
    prise_de_besoin: {
      title: "📝 Prise de besoin",
      description: "Collecte détaillée des besoins et cadrage du projet",
      badge: "En découverte",
      badgeClass: "bg-sky-500/20 text-sky-300 border-sky-500/30",
      progress: 20,
      sections: [
        {
          icon: <Calendar className="w-4 h-4 text-sky-400" />,
          title: "Atelier de découverte",
          content: "Organisez un temps d'échange pour cadrer les attentes, contraintes et budget.",
          actions: [
            { key: "schedule_discovery", label: "Programmer atelier", icon: <Calendar className="w-3 h-3" />, variant: "default", className: "bg-sky-600 hover:bg-sky-700" }
          ]
        },
        {
          icon: <NotebookPen className="w-4 h-4 text-sky-400" />,
          title: "Synthèse des besoins",
          content: "Consignez les besoins clés, priorités et éléments techniques du client.",
          actions: [
            { key: "capture_brief", label: "Ajouter une note", icon: <MessageSquare className="w-3 h-3" /> },
            { key: "upload_brief", label: "Télécharger brief", icon: <Upload className="w-3 h-3" /> }
          ]
        },
        {
          icon: <ArrowRight className="w-4 h-4 text-sky-400" />,
          title: "Valider la prise de besoin",
          content: "Confirmez que la découverte est terminée pour lancer les démarches financières.",
          actions: [
            { key: "move_to_deposit", label: "Passer à l'acompte", icon: <CheckCircle className="w-3 h-3" />, variant: "secondary" }
          ]
        }
      ]
    },
    acompte_recu: {
      title: "💰 Acompte reçu",
      description: "L'acompte initial a été versé par le client",
      badge: "Acompte confirmé",
      badgeClass: "bg-green-500/20 text-green-300 border-green-500/30",
      progress: 30,
      sections: [
        {
          icon: <DollarSign className="w-4 h-4 text-green-400" />,
          title: "Paiements reçus",
          content: `Montant total reçu: ${totalPayments.toLocaleString()} MAD${budget > 0 ? ` sur ${budget.toLocaleString()} MAD` : ''}`,
          actions: [
            { key: "add_payment", label: "Ajouter paiement", icon: <DollarSign className="w-3 h-3" /> },
            { key: "view_payments", label: "Voir historique", icon: <FileText className="w-3 h-3" /> }
          ]
        },
        {
          icon: <TrendingUp className="w-4 h-4 text-green-400" />,
          title: "Lancer la conception",
          content: "L'acompte est reçu. Vous pouvez maintenant démarrer la phase de conception.",
          actions: [
            { key: "start_conception", label: "Démarrer conception", icon: <CheckCircle className="w-3 h-3" />, variant: "default", className: "bg-green-600 hover:bg-green-700" }
          ]
        }
      ],
      stats: [
        { icon: <DollarSign className="w-4 h-4 text-green-400" />, label: "Montant reçu", value: `${totalPayments.toLocaleString()} MAD` },
        { icon: <TrendingUp className="w-4 h-4 text-blue-400" />, label: "Progression", value: `${paymentProgress}%` }
      ]
    },
    conception: {
      title: "🧩 Conception",
      description: "Phase de conception et création des plans",
      badge: "En conception",
      badgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      progress: 45,
      sections: [
        {
          icon: <Upload className="w-4 h-4 text-purple-400" />,
          title: "Plans et maquettes",
          content: "Téléchargez les plans de conception, maquettes 3D et documents de design.",
          actions: [
            { key: "upload_design", label: "Télécharger fichiers", icon: <Upload className="w-3 h-3" /> },
            { key: "view_documents", label: "Voir documents", icon: <FileText className="w-3 h-3" /> }
          ]
        },
        {
          icon: <Send className="w-4 h-4 text-purple-400" />,
          title: "Partage avec client",
          content: "Partagez les concepts avec le client pour validation.",
          actions: [
            { key: "share_client", label: "Partager avec client", icon: <Send className="w-3 h-3" />, variant: "default", className: "bg-purple-600 hover:bg-purple-700" }
          ]
        }
      ]
    },
    devis_negociation: {
      title: "📑 Devis / Négociation",
      description: "Envoi du devis et négociation avec le client",
      badge: "En négociation",
      badgeClass: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      progress: 55,
      sections: [
        {
          icon: <FileText className="w-4 h-4 text-yellow-400" />,
          title: "Devis",
          content: "Créez et envoyez le devis détaillé au client.",
          actions: [
            { key: "create_quote", label: "Créer devis", icon: <FileText className="w-3 h-3" /> },
            { key: "send_quote", label: "Envoyer devis", icon: <Send className="w-3 h-3" />, variant: "default", className: "bg-yellow-600 hover:bg-yellow-700" }
          ]
        },
        {
          icon: <MessageSquare className="w-4 h-4 text-yellow-400" />,
          title: "Statut de validation",
          content: "En attente de la réponse du client sur le devis proposé.",
          actions: [
            { key: "mark_accepted", label: "Marquer accepté", icon: <CheckCircle className="w-3 h-3" />, className: "bg-green-600 hover:bg-green-700 text-white" },
            { key: "mark_refused", label: "Marquer refusé", icon: <XCircle className="w-3 h-3" />, className: "bg-red-600 hover:bg-red-700 text-white" }
          ]
        }
      ]
    },
    accepte: {
      title: "✅ Accepté",
      description: "Le devis a été accepté par le client",
      badge: "Devis accepté",
      badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      progress: 65,
      sections: [
        {
          icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
          title: "Validation confirmée",
          content: "Le client a accepté le devis. Préparez le premier dépôt.",
          actions: [
            { key: "prepare_deposit", label: "Préparer 1er dépôt", icon: <DollarSign className="w-3 h-3" />, variant: "default", className: "bg-emerald-600 hover:bg-emerald-700" }
          ]
        },
        {
          icon: <FileText className="w-4 h-4 text-emerald-400" />,
          title: "Contrat",
          content: "Générez et faites signer le contrat officiel.",
          actions: [
            { key: "generate_contract", label: "Générer contrat", icon: <FileText className="w-3 h-3" /> },
            { key: "upload_signed", label: "Télécharger signé", icon: <Upload className="w-3 h-3" /> }
          ]
        }
      ]
    },
    refuse: {
      title: "❌ Refusé",
      description: "Le devis a été refusé par le client",
      badge: "Devis refusé",
      badgeClass: "bg-red-500/20 text-red-300 border-red-500/30",
      progress: 0,
      sections: [
        {
          icon: <XCircle className="w-4 h-4 text-red-400" />,
          title: "Projet refusé",
          content: "Le client a refusé le devis. Analysez les raisons et ajoutez des notes.",
          actions: [
            { key: "add_note", label: "Ajouter note", icon: <MessageSquare className="w-3 h-3" /> },
            { key: "archive", label: "Archiver projet", icon: <Package className="w-3 h-3" />, className: "bg-slate-600 hover:bg-slate-700 text-white" }
          ]
        },
        {
          icon: <TrendingUp className="w-4 h-4 text-red-400" />,
          title: "Relance possible",
          content: "Vous pouvez relancer le client avec une nouvelle proposition.",
          actions: [
            { key: "new_proposal", label: "Nouvelle proposition", icon: <FileText className="w-3 h-3" /> }
          ]
        }
      ]
    },
    premier_depot: {
      title: "💸 1er Dépôt",
      description: "Premier dépôt reçu, projet validé",
      badge: "Dépôt reçu",
      badgeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      progress: 75,
      sections: [
        {
          icon: <DollarSign className="w-4 h-4 text-cyan-400" />,
          title: "Paiement confirmé",
          content: "Le premier dépôt a été reçu. Le projet peut démarrer.",
          actions: [
            { key: "view_payments", label: "Voir paiements", icon: <DollarSign className="w-3 h-3" /> }
          ]
        },
        {
          icon: <TrendingUp className="w-4 h-4 text-cyan-400" />,
          title: "Démarrer le projet",
          content: "Lancez officiellement le projet et planifiez les étapes.",
          actions: [
            { key: "start_project", label: "Démarrer projet", icon: <CheckCircle className="w-3 h-3" />, variant: "default", className: "bg-cyan-600 hover:bg-cyan-700" }
          ]
        }
      ],
      stats: [
        { icon: <DollarSign className="w-4 h-4 text-cyan-400" />, label: "Total reçu", value: `${totalPayments.toLocaleString()} MAD` },
        { icon: <TrendingUp className="w-4 h-4 text-blue-400" />, label: "Paiement", value: `${paymentProgress}%` }
      ]
    },
    projet_en_cours: {
      title: "🏗️ Projet en cours",
      description: "Le projet est en cours de réalisation",
      badge: "En cours",
      badgeClass: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      progress: 85,
      sections: [
        {
          icon: <Clock className="w-4 h-4 text-indigo-400" />,
          title: "Suivi du projet",
          content: "Suivez l'avancement des tâches et jalons du projet.",
          actions: [
            { key: "view_timeline", label: "Voir planning", icon: <Calendar className="w-3 h-3" /> },
            { key: "add_task", label: "Ajouter tâche", icon: <CheckCircle className="w-3 h-3" /> }
          ]
        },
        {
          icon: <ImageIcon className="w-4 h-4 text-indigo-400" />,
          title: "Photos et documents",
          content: "Téléchargez les photos d'avancement et documents du projet.",
          actions: [
            { key: "upload_photos", label: "Télécharger photos", icon: <Upload className="w-3 h-3" /> },
            { key: "view_documents", label: "Voir documents", icon: <FileText className="w-3 h-3" /> }
          ]
        }
      ]
    },
    chantier: {
      title: "🛠️ Travaux (héritage)",
      description: "Ce statut est désormais fusionné avec \"Projet en cours\". Pensez à mettre à jour le projet.",
      badge: "Statut hérité",
      badgeClass: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      progress: 85,
      sections: [
        {
          icon: <ArrowRight className="w-4 h-4 text-indigo-400" />,
          title: "Mettre à jour le statut",
          content: "Basculez vers \"Projet en cours\" pour suivre les travaux avec la nouvelle expérience.",
          actions: [
            { key: "move_to_projet_en_cours", label: "Passer à Projet en cours", icon: <CheckCircle className="w-3 h-3" />, variant: "default", className: "bg-indigo-600 hover:bg-indigo-700" }
          ]
        },
        {
          icon: <ImageIcon className="w-4 h-4 text-indigo-400" />,
          title: "Suivi des travaux",
          content: "Continuez à documenter les avancées et à partager les livrables depuis la phase Projet en cours.",
          actions: [
            { key: "upload_progress", label: "Documenter avancement", icon: <Upload className="w-3 h-3" /> },
            { key: "view_documents", label: "Voir documents", icon: <FileText className="w-3 h-3" /> }
          ]
        }
      ]
    },
    facture_reglee: {
      title: "🧾 Facture réglée",
      description: "La facture finale a été réglée",
      badge: "Facture payée",
      badgeClass: "bg-green-500/20 text-green-300 border-green-500/30",
      progress: 95,
      sections: [
        {
          icon: <DollarSign className="w-4 h-4 text-green-400" />,
          title: "Paiement final",
          content: "La facture finale a été réglée. Préparez la livraison.",
          actions: [
            { key: "view_invoice", label: "Voir facture", icon: <FileText className="w-3 h-3" /> },
            { key: "upload_proof", label: "Preuve de paiement", icon: <Upload className="w-3 h-3" /> }
          ]
        },
        {
          icon: <Package className="w-4 h-4 text-green-400" />,
          title: "Préparer livraison",
          content: "Organisez la livraison finale et la remise des clés.",
          actions: [
            { key: "schedule_delivery", label: "Planifier livraison", icon: <Calendar className="w-3 h-3" />, variant: "default", className: "bg-green-600 hover:bg-green-700" }
          ]
        }
      ],
      stats: [
        { icon: <DollarSign className="w-4 h-4 text-green-400" />, label: "Total payé", value: `${totalPayments.toLocaleString()} MAD` },
        { icon: <CheckCircle className="w-4 h-4 text-green-400" />, label: "Paiement", value: "100%" }
      ]
    },
    livraison_termine: {
      title: "🚚 Livraison & Terminé",
      description: "Projet livré et terminé avec succès",
      badge: "Terminé",
      badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      progress: 100,
      sections: [
        {
          icon: <CheckCircle className="w-4 h-4 text-amber-400" />,
          title: "Projet terminé",
          content: "Le projet a été livré avec succès. Félicitations!",
          actions: [
            { key: "view_summary", label: "Voir récapitulatif", icon: <FileText className="w-3 h-3" /> }
          ]
        },
        {
          icon: <Star className="w-4 h-4 text-amber-400" />,
          title: "Satisfaction client",
          content: "Recueillez les retours et évaluations du client.",
          actions: [
            { key: "add_review", label: "Ajouter avis", icon: <Star className="w-3 h-3" /> },
            { key: "request_testimonial", label: "Demander témoignage", icon: <MessageSquare className="w-3 h-3" /> }
          ]
        }
      ],
      stats: [
        { icon: <CheckCircle className="w-4 h-4 text-green-400" />, label: "Statut", value: "Terminé" },
        { icon: <DollarSign className="w-4 h-4 text-amber-400" />, label: "Budget", value: `${totalPayments.toLocaleString()} MAD` }
      ]
    }
  }

  return contentMap[status] || contentMap.qualifie
}
