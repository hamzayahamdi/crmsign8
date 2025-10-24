/**
 * Sample Client Data Generator for Signature8 CRM
 * 
 * This script generates sample client data for testing the Clients Management Page.
 * Run this in the browser console on the /clients page to populate with demo data.
 * 
 * Usage:
 * 1. Open the /clients page in your browser
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. Press Enter
 */

const sampleClients = [
  {
    id: "client-1",
    nom: "Dr. Fatima Zahra Alami",
    telephone: "212 661-234567",
    email: "f.alami@gmail.com",
    ville: "Casablanca",
    adresse: "123 Boulevard Mohammed V, Casablanca",
    typeProjet: "villa",
    architecteAssigne: "TAZI",
    statutProjet: "en_travaux",
    budget: 2500000,
    notes: "Client VIP - Projet de villa moderne avec piscine. Très exigeant sur les finitions.",
    historique: [
      {
        id: "hist-1-1",
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        type: "note",
        description: "Première réunion - Discussion des plans initiaux",
        auteur: "TAZI"
      },
      {
        id: "hist-1-2",
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        type: "appel",
        description: "Appel téléphonique - Validation des modifications",
        auteur: "TAZI"
      }
    ],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    derniereMaj: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "client-2",
    nom: "Omar Benjelloun",
    telephone: "212 662-345678",
    email: "o.benjelloun@outlook.com",
    ville: "Rabat",
    adresse: "45 Avenue Hassan II, Rabat",
    typeProjet: "appartement",
    architecteAssigne: "AZI",
    statutProjet: "en_conception",
    budget: 850000,
    notes: "Appartement 3 chambres avec terrasse. Budget flexible.",
    historique: [
      {
        id: "hist-2-1",
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        type: "whatsapp",
        description: "Échange WhatsApp - Envoi des premières esquisses",
        auteur: "AZI"
      }
    ],
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    derniereMaj: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "client-3",
    nom: "Aicha Tazi",
    telephone: "212 663-456789",
    email: "aicha.tazi@yahoo.fr",
    ville: "Marrakech",
    adresse: "Quartier Guéliz, Marrakech",
    typeProjet: "riad",
    architecteAssigne: "TAZI",
    statutProjet: "termine",
    budget: 1800000,
    notes: "Riad traditionnel rénové avec succès. Cliente très satisfaite.",
    historique: [
      {
        id: "hist-3-1",
        date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        type: "note",
        description: "Début du projet de rénovation",
        auteur: "TAZI"
      },
      {
        id: "hist-3-2",
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        type: "statut",
        description: "Projet marqué comme terminé",
        auteur: "Système"
      }
    ],
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    derniereMaj: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "client-4",
    nom: "Mohammed El Mansouri",
    telephone: "212 664-567890",
    email: "m.elmansouri@entreprise.ma",
    ville: "Casablanca",
    adresse: "Zone Industrielle Ain Sebaa, Casablanca",
    typeProjet: "bureau",
    architecteAssigne: "TAZI",
    statutProjet: "en_travaux",
    budget: 3200000,
    notes: "Bureaux modernes pour entreprise tech. Projet d'envergure.",
    historique: [
      {
        id: "hist-4-1",
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        type: "modification",
        description: "Modification des plans - Ajout d'un espace coworking",
        auteur: "TAZI"
      }
    ],
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    derniereMaj: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "client-5",
    nom: "Youssef El Fassi",
    telephone: "212 665-678901",
    email: "youssef.fassi@gmail.com",
    ville: "Fès",
    adresse: "Médina de Fès",
    typeProjet: "magasin",
    architecteAssigne: "AZI",
    statutProjet: "en_conception",
    budget: 650000,
    notes: "Boutique artisanale dans la médina. Respect du patrimoine architectural.",
    historique: [],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    derniereMaj: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "client-6",
    nom: "Khadija Bennani",
    telephone: "212 666-789012",
    email: "k.bennani@hotmail.com",
    ville: "Tanger",
    adresse: "Quartier Malabata, Tanger",
    typeProjet: "villa",
    architecteAssigne: "TAZI",
    statutProjet: "termine",
    budget: 2100000,
    notes: "Villa avec vue sur mer. Projet livré dans les délais.",
    historique: [
      {
        id: "hist-6-1",
        date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        type: "note",
        description: "Signature du contrat",
        auteur: "TAZI"
      },
      {
        id: "hist-6-2",
        date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        type: "statut",
        description: "Projet marqué comme terminé",
        auteur: "Système"
      }
    ],
    createdAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    derniereMaj: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "client-7",
    nom: "Hassan Alaoui",
    telephone: "212 667-890123",
    email: "h.alaoui@corporate.ma",
    ville: "Casablanca",
    adresse: "Twin Center, Casablanca",
    typeProjet: "bureau",
    architecteAssigne: "AZI",
    statutProjet: "en_travaux",
    budget: 4500000,
    notes: "Bureaux de direction - Finitions haut de gamme requises.",
    historique: [
      {
        id: "hist-7-1",
        date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        type: "appel",
        description: "Point d'avancement hebdomadaire",
        auteur: "AZI"
      }
    ],
    createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    derniereMaj: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "client-8",
    nom: "Amina Chraibi",
    telephone: "212 668-901234",
    email: "amina.chraibi@gmail.com",
    ville: "Rabat",
    adresse: "Hay Riad, Rabat",
    typeProjet: "appartement",
    architecteAssigne: "TAZI",
    statutProjet: "en_conception",
    budget: 920000,
    notes: "Appartement familial moderne. En attente de validation finale des plans.",
    historique: [
      {
        id: "hist-8-1",
        date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        type: "whatsapp",
        description: "Envoi des plans 3D",
        auteur: "TAZI"
      }
    ],
    createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    derniereMaj: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Save to localStorage
localStorage.setItem('signature8-clients', JSON.stringify(sampleClients));

console.log('✅ Sample clients data loaded successfully!');
console.log(`📊 ${sampleClients.length} clients added to the system`);
console.log('🔄 Refresh the page to see the data');
