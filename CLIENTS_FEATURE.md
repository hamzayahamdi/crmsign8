# 🏢 Clients Management Page - Signature8 CRM

## 📋 Vue d'ensemble

La page **Clients** est une interface moderne et intuitive conçue pour aider les architectes et administrateurs à gérer facilement tous les clients confirmés (leads signés) et leurs projets en cours.

## ✨ Fonctionnalités principales

### 🎯 Tableau de bord statistique
- **Total Clients** : Nombre total de clients dans le système
- **Projets actifs** : Projets en conception ou en travaux
- **Projets terminés** : Projets complétés avec succès
- **Budget total** : Somme des budgets de tous les projets

### 🔍 Recherche et filtrage
- **Barre de recherche** : Recherche par nom, ville, téléphone, email
- **Filtres intelligents** :
  - Statut du projet (En conception / En travaux / Terminé)
  - Ville
  - Type de projet (Appartement, Villa, Magasin, Bureau, etc.)
  - Architecte assigné
- **Chips de filtres actifs** : Visualisation et suppression rapide des filtres appliqués

### 📊 Tableau des clients
- **Colonnes** :
  - Nom du client (avec avatar généré)
  - Téléphone
  - Ville
  - Type de projet
  - Architecte assigné
  - Statut du projet (badges colorés)
  - Dernière mise à jour
  - Actions
- **Tri dynamique** : Cliquez sur les en-têtes pour trier
- **Hover states** : Effet visuel au survol des lignes
- **Responsive** : S'adapte à tous les écrans

### 📱 Fiche Client (Slide-over Panel)
Ouverte en cliquant sur une ligne du tableau, elle affiche :

#### Informations détaillées
- Téléphone, Email, Ville, Adresse
- Type de projet et budget
- Statut du projet avec badge coloré

#### Architecte responsable
- Nom et avatar de l'architecte assigné

#### Notes & Historique
- Notes personnalisées sur le client/projet
- Timeline des interactions (appels, WhatsApp, modifications, changements de statut)

#### Actions rapides
- **Modifier** : Éditer les informations du client
- **Appeler** : Lancer un appel téléphonique direct
- **WhatsApp** : Ouvrir une conversation WhatsApp
- **Marquer comme Terminé** : Changer le statut à "Terminé"

### ➕ Ajout/Modification de clients

Modal moderne avec formulaire complet :

#### Informations de base
- Nom du client *
- Téléphone *
- Email
- Ville *
- Adresse complète

#### Détails du projet
- Type de projet * (Appartement, Villa, Magasin, Bureau, Riad, Studio, Autre)
- Statut du projet * (En conception, En travaux, Terminé)
- Architecte assigné *
- Budget (MAD)

#### Notes additionnelles
- Zone de texte pour notes personnalisées

## 🎨 Design System

### Palette de couleurs
```css
Background: oklch(22% 0.03 260)
Text: oklch(96% 0.02 250)
Primary: oklch(65% 0.14 250)
Success (Terminé): oklch(75% 0.12 145)
Warning (En travaux): oklch(70% 0.13 75)
Info (En conception): oklch(65% 0.14 250)
```

### Badges de statut
- **En conception** : Badge bleu clair
- **En travaux** : Badge orange
- **Terminé** : Badge vert

### Effets visuels
- **Glassmorphism** : Cartes avec effet de verre dépoli
- **Rounded corners** : Border-radius de 2xl (1rem)
- **Smooth transitions** : Animations fluides (200-300ms)
- **Hover effects** : États interactifs subtils

## 📁 Structure des fichiers

```
signature8-crm/
├── types/
│   └── client.ts                    # Types TypeScript pour Client
├── components/
│   ├── clients-table.tsx            # Tableau des clients avec tri
│   ├── client-detail-panel.tsx      # Panneau latéral de détails
│   └── add-client-modal.tsx         # Modal d'ajout/édition
├── app/
│   └── clients/
│       └── page.tsx                 # Page principale Clients
└── scripts/
    └── seed-clients.js              # Script de données de test
```

## 🚀 Utilisation

### Charger des données de test

1. Ouvrez la page `/clients` dans votre navigateur
2. Ouvrez la console (F12)
3. Copiez le contenu de `scripts/seed-clients.js`
4. Collez dans la console et appuyez sur Entrée
5. Rafraîchissez la page

### Ajouter un nouveau client

1. Cliquez sur le bouton **"+ Nouveau Client"**
2. Remplissez le formulaire
3. Cliquez sur **"Créer le client"**

### Modifier un client

1. Cliquez sur une ligne du tableau
2. Dans le panneau latéral, cliquez sur **"Modifier"**
3. Modifiez les informations
4. Cliquez sur **"Enregistrer"**

### Filtrer les clients

1. Cliquez sur **"Filtres"** pour ouvrir le panneau
2. Sélectionnez vos critères
3. Les résultats se mettent à jour automatiquement
4. Cliquez sur les chips pour retirer un filtre spécifique
5. Ou cliquez sur **"Effacer filtres"** pour tout réinitialiser

### Marquer un projet comme terminé

1. Ouvrez la fiche client
2. Cliquez sur **"Marquer comme Terminé"**
3. Le statut passe automatiquement à "Terminé"
4. Une entrée est ajoutée à l'historique

## 💾 Stockage des données

Les données sont actuellement stockées dans **localStorage** sous la clé `signature8-clients`.

Format :
```typescript
interface Client {
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
```

## 🔮 Évolutions futures

### Phase 2 (Recommandé)
- [ ] Intégration avec base de données (Prisma)
- [ ] Upload de documents (plans, devis)
- [ ] Galerie photos du projet
- [ ] Système de notifications
- [ ] Export PDF des fiches clients
- [ ] Graphiques d'analyse (revenus, projets par type, etc.)

### Phase 3 (Avancé)
- [ ] Intégration WhatsApp Business API
- [ ] Calendrier de rendez-vous
- [ ] Gestion des paiements et factures
- [ ] Timeline visuelle du projet
- [ ] Partage de fichiers sécurisé
- [ ] Application mobile

## 🎯 Bonnes pratiques

### Performance
- Les données sont chargées une seule fois au montage
- Le tri et le filtrage sont côté client (rapide)
- Les animations utilisent `transform` et `opacity` (GPU)

### UX
- États de chargement clairs
- Messages d'erreur informatifs
- Confirmations pour actions destructives
- Feedback visuel immédiat

### Accessibilité
- Labels appropriés sur tous les champs
- Navigation au clavier supportée
- Contraste de couleurs conforme WCAG
- Textes alternatifs pour les icônes

## 🐛 Dépannage

### Les clients n'apparaissent pas
1. Vérifiez que des données existent dans localStorage
2. Ouvrez la console et tapez : `localStorage.getItem('signature8-clients')`
3. Si vide, utilisez le script `seed-clients.js`

### Les filtres ne fonctionnent pas
1. Vérifiez que les données ont les bonnes propriétés
2. Assurez-vous que les valeurs correspondent aux types définis

### Le panneau latéral ne s'ouvre pas
1. Vérifiez la console pour les erreurs
2. Assurez-vous que framer-motion est installé : `pnpm add framer-motion`

## 📞 Support

Pour toute question ou problème, contactez l'équipe de développement Signature8.

---

**Version** : 1.0.0  
**Dernière mise à jour** : Octobre 2025  
**Auteur** : Équipe Signature8 CRM
