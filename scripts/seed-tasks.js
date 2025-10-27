// Seed script to add sample tasks to localStorage for testing
// Run this in the browser console on the CRM page

function seedTasks() {
  const sampleTasks = [
    {
      id: "task-1",
      title: "Appeler M. Benali pour validation des plans",
      description: "Contacter le client pour valider les plans d'architecture finaux avant de commencer les travaux",
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
      assignedTo: "Issam",
      linkedType: "client",
      linkedId: "client-issam-1",
      linkedName: "Issam Benali",
      status: "a_faire",
      reminderEnabled: true,
      reminderDays: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "Admin"
    },
    {
      id: "task-2",
      title: "Préparer devis pour nouveau lead",
      description: "Établir un devis détaillé pour le projet de villa à Marrakech",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
      assignedTo: "Issam",
      linkedType: "lead",
      linkedId: "lead-1",
      linkedName: "Ahmed Alami",
      status: "en_cours",
      reminderEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "Admin"
    },
    {
      id: "task-3",
      title: "Visite de chantier - Projet Casablanca",
      description: "Inspection du chantier et vérification de l'avancement des travaux",
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago (overdue)
      assignedTo: "Issam",
      linkedType: "client",
      linkedId: "client-2",
      linkedName: "Fatima Zahra",
      status: "a_faire",
      reminderEnabled: true,
      reminderDays: 2,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "Admin"
    },
    {
      id: "task-4",
      title: "Finaliser les documents administratifs",
      description: "Compléter tous les documents nécessaires pour le permis de construire",
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      assignedTo: "Issam",
      linkedType: "client",
      linkedId: "client-3",
      linkedName: "Karim Benjelloun",
      status: "en_cours",
      reminderEnabled: true,
      reminderDays: 1,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "Admin"
    },
    {
      id: "task-5",
      title: "Réunion avec fournisseurs",
      description: "Organiser une réunion avec les fournisseurs de matériaux pour négocier les prix",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      assignedTo: "Issam",
      linkedType: "lead",
      linkedId: "lead-2",
      linkedName: "Youssef Tazi",
      status: "a_faire",
      reminderEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "Admin"
    }
  ];

  localStorage.setItem("signature8-tasks", JSON.stringify(sampleTasks));
  console.log("✅ Sample tasks seeded successfully!");
  console.log(`Added ${sampleTasks.length} tasks to localStorage`);
}

// Run the seed function
seedTasks();
