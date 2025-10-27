import type { Client } from "@/types/client"

export function buildIssamTesterClient(): Client {
  const now = new Date().toISOString()
  return {
    id: "client-issam-tester-2025",
    nom: "issam tester",
    telephone: "0663352336",
    ville: "Rabat",
    typeProjet: "villa",
    architecteAssigne: "Tazi",
    statutProjet: "en_conception",
    email: "issam.tester@example.com",
    adresse: "Avenue Mohammed V, Quartier Hassan, Rabat",
    budget: 2_500_000,
    notes:
      "Client VIP - Projet de villa moderne avec piscine et jardin paysager. Budget flexible. Préfère les matériaux écologiques et durables.",
    createdAt: "2024-09-15T10:00:00.000Z",
    updatedAt: now,
    derniereMaj: now,

    stages: [
      { id: "stage-1", name: "Première consultation", status: "completed", completedAt: "2024-09-15T10:00:00.000Z", description: "Rencontre initiale et discussion des besoins", order: 1 },
      { id: "stage-2", name: "Étude de faisabilité", status: "completed", completedAt: "2024-09-22T14:30:00.000Z", description: "Analyse du terrain et contraintes techniques", order: 2 },
      { id: "stage-3", name: "Esquisse du projet", status: "completed", completedAt: "2024-10-05T11:00:00.000Z", description: "Premiers dessins et concepts architecturaux", order: 3 },
      { id: "stage-4", name: "Avant-projet sommaire (APS)", status: "completed", completedAt: "2024-10-20T16:00:00.000Z", description: "Plans détaillés et premières estimations", order: 4 },
      { id: "stage-5", name: "Avant-projet détaillé (APD)", status: "in_progress", description: "Finalisation des plans et spécifications techniques", order: 5 },
      { id: "stage-6", name: "Dossier de permis de construire", status: "pending", description: "Préparation et dépôt du dossier administratif", order: 6 },
      { id: "stage-7", name: "Plans d'exécution", status: "pending", description: "Plans détaillés pour les entreprises", order: 7 },
      { id: "stage-8", name: "Consultation des entreprises", status: "pending", description: "Appel d'offres et sélection des entreprises", order: 8 },
      { id: "stage-9", name: "Suivi de chantier", status: "pending", description: "Supervision et coordination des travaux", order: 9 },
      { id: "stage-10", name: "Réception des travaux", status: "pending", description: "Vérification finale et livraison", order: 10 },
    ],

    documents: [
      { id: "doc-1", name: "Plan_Masse_Villa_Rabat_v3.pdf", type: "pdf", size: 2_458_624, uploadedAt: "2024-09-22T09:15:00.000Z", uploadedBy: "Tazi", category: "plan" },
      { id: "doc-2", name: "Devis_Estimatif_Initial.pdf", type: "pdf", size: 1_024_000, uploadedAt: "2024-09-25T14:30:00.000Z", uploadedBy: "Tazi", category: "devis" },
      { id: "doc-3", name: "Facade_Principale_3D.jpg", type: "image", size: 3_145_728, uploadedAt: "2024-10-05T11:20:00.000Z", uploadedBy: "Tazi", category: "photo" },
      { id: "doc-4", name: "Plans_Etage_RDC.dwg", type: "dwg", size: 5_242_880, uploadedAt: "2024-10-10T16:45:00.000Z", uploadedBy: "Tazi", category: "plan" },
      { id: "doc-5", name: "Specifications_Techniques.pdf", type: "pdf", size: 1_536_000, uploadedAt: "2024-10-15T10:00:00.000Z", uploadedBy: "Tazi", category: "autre" },
      { id: "doc-6", name: "Contrat_Architecture.pdf", type: "pdf", size: 512_000, uploadedAt: "2024-09-16T13:00:00.000Z", uploadedBy: "Tazi", category: "contrat" },
      { id: "doc-7", name: "Jardin_Paysager_Concept.jpg", type: "image", size: 2_097_152, uploadedAt: "2024-10-18T15:30:00.000Z", uploadedBy: "Tazi", category: "photo" },
      { id: "doc-8", name: "Devis_Piscine_Detaille.pdf", type: "pdf", size: 768_000, uploadedAt: "2024-10-22T11:15:00.000Z", uploadedBy: "Tazi", category: "devis" },
    ],

    rendezVous: [
      { id: "appt-1", date: "2024-11-05T10:00:00.000Z", title: "Présentation APD finalisé", description: "Présentation des plans détaillés et validation finale avant permis", location: "Bureau Signature8, Rabat", status: "scheduled", createdAt: "2024-10-25T09:00:00.000Z" },
      { id: "appt-2", date: "2024-10-20T14:00:00.000Z", title: "Visite du terrain", description: "Visite sur site pour validation des implantations", location: "Terrain client, Avenue Mohammed V", status: "completed", createdAt: "2024-10-15T10:00:00.000Z" },
      { id: "appt-3", date: "2024-09-15T10:00:00.000Z", title: "Première rencontre", description: "Discussion initiale du projet et des attentes", location: "Bureau Signature8", status: "completed", createdAt: "2024-09-10T15:00:00.000Z" },
      { id: "appt-4", date: "2024-11-15T15:00:00.000Z", title: "Rendez-vous mairie - Permis", description: "Dépôt du dossier de permis de construire", location: "Mairie de Rabat", status: "scheduled", createdAt: "2024-10-26T11:00:00.000Z" },
    ],

    historique: [
      { id: "hist-1", date: "2024-09-15T10:00:00.000Z", type: "note", description: "Premier contact établi. Client très motivé, budget confortable de 2.5M MAD", auteur: "Tazi" },
      { id: "hist-2", date: "2024-09-15T10:30:00.000Z", type: "statut", description: "Statut passé à En conception", auteur: "Tazi" },
      { id: "hist-3", date: "2024-09-16T13:00:00.000Z", type: "document", description: "Contrat d'architecture signé", auteur: "Tazi" },
      { id: "hist-4", date: "2024-09-18T11:00:00.000Z", type: "appel", description: "Appel téléphonique - Discussion sur les préférences de style architectural", auteur: "Tazi" },
      { id: "hist-5", date: "2024-09-20T16:00:00.000Z", type: "whatsapp", description: "Envoi de références visuelles de villas modernes", auteur: "Tazi" },
      { id: "hist-6", date: "2024-09-22T09:15:00.000Z", type: "document", description: "Plan de masse version 3 téléchargé", auteur: "Tazi" },
      { id: "hist-7", date: "2024-09-22T14:30:00.000Z", type: "note", description: "Étude de faisabilité terminée. Terrain bien orienté, excellent potentiel", auteur: "Tazi" },
      { id: "hist-8", date: "2024-09-25T14:30:00.000Z", type: "devis", description: "Architecte a ajouté un devis estimatif initial", auteur: "Tazi" },
      { id: "hist-9", date: "2024-09-28T10:00:00.000Z", type: "appel", description: "Validation du budget par le client", auteur: "Tazi" },
      { id: "hist-10", date: "2024-10-02T15:00:00.000Z", type: "note", description: "Client souhaite intégrer des panneaux solaires et système de récupération d'eau de pluie", auteur: "Tazi" },
      { id: "hist-11", date: "2024-10-05T11:00:00.000Z", type: "validation", description: "Client a validé l'esquisse du projet", auteur: "Tazi" },
      { id: "hist-12", date: "2024-10-05T11:20:00.000Z", type: "document", description: "Rendu 3D de la façade principale ajouté", auteur: "Tazi" },
      { id: "hist-13", date: "2024-10-08T14:00:00.000Z", type: "whatsapp", description: "Partage des options de matériaux écologiques", auteur: "Tazi" },
      { id: "hist-14", date: "2024-10-10T16:45:00.000Z", type: "document", description: "Plans AutoCAD RDC et étage téléchargés", auteur: "Tazi" },
      { id: "hist-15", date: "2024-10-12T11:30:00.000Z", type: "note", description: "Réunion avec ingénieur structure - Validation de la faisabilité technique", auteur: "Tazi" },
      { id: "hist-16", date: "2024-10-15T10:00:00.000Z", type: "document", description: "Spécifications techniques détaillées ajoutées", auteur: "Tazi" },
      { id: "hist-17", date: "2024-10-18T15:30:00.000Z", type: "document", description: "Concept d'aménagement paysager ajouté", auteur: "Tazi" },
      { id: "hist-18", date: "2024-10-20T14:00:00.000Z", type: "rendez-vous", description: "Visite du terrain effectuée - Validation des implantations", auteur: "Tazi" },
      { id: "hist-19", date: "2024-10-20T16:00:00.000Z", type: "validation", description: "Client a validé l'avant-projet sommaire (APS)", auteur: "Tazi" },
      { id: "hist-20", date: "2024-10-22T11:15:00.000Z", type: "devis", description: "Devis détaillé pour la piscine ajouté", auteur: "Tazi" },
      { id: "hist-21", date: "2024-10-24T09:30:00.000Z", type: "appel", description: "Discussion sur les finitions intérieures - Client préfère style contemporain épuré", auteur: "Tazi" },
      { id: "hist-22", date: "2024-10-25T09:00:00.000Z", type: "rendez-vous", description: "Rendez-vous planifié : Présentation APD finalisé", auteur: "Tazi" },
      { id: "hist-23", date: "2024-10-26T11:00:00.000Z", type: "rendez-vous", description: "Rendez-vous planifié : Dépôt permis de construire à la mairie", auteur: "Tazi" },
      { id: "hist-24", date: "2024-10-27T10:00:00.000Z", type: "note", description: "Travail en cours sur l'APD - Finalisation des détails techniques et choix des matériaux", auteur: "Tazi" },
    ],
  }
}

export function ensureIssamInLocalStorage() {
  try {
    const raw = localStorage.getItem("signature8-clients")
    const list: Client[] = raw ? JSON.parse(raw) : []
    const exists = list.some(c => c.id === "client-issam-tester-2025")
    if (!exists) {
      const issam = buildIssamTesterClient()
      const updated = [issam, ...list]
      localStorage.setItem("signature8-clients", JSON.stringify(updated))
      return issam
    }
  } catch {}
  return null
}
