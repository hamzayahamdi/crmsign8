import type { Architect, ArchitectStatus, ArchitectSpecialty } from "@/types/architect"
import type { Client } from "@/types/client"

const STORAGE_KEY = "signature8-architects"

export class ArchitectsService {
  /**
   * Get all architects from localStorage
   */
  static getArchitects(): Architect[] {
    if (typeof window === "undefined") return []
    
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  }

  /**
   * Get a single architect by ID
   */
  static getArchitectById(id: string): Architect | null {
    const architects = this.getArchitects()
    return architects.find(a => a.id === id) || null
  }

  /**
   * Save architects to localStorage
   */
  static saveArchitects(architects: Architect[]): void {
    if (typeof window === "undefined") return
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(architects))
  }

  /**
   * Add a new architect
   */
  static addArchitect(architect: Omit<Architect, "id" | "createdAt" | "updatedAt">): Architect {
    const architects = this.getArchitects()
    const now = new Date().toISOString()
    
    const newArchitect: Architect = {
      ...architect,
      id: `arch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    }
    
    architects.push(newArchitect)
    this.saveArchitects(architects)
    
    return newArchitect
  }

  /**
   * Update an existing architect
   */
  static updateArchitect(id: string, updates: Partial<Architect>): Architect | null {
    const architects = this.getArchitects()
    const index = architects.findIndex(a => a.id === id)
    
    if (index === -1) return null
    
    const updatedArchitect = {
      ...architects[index],
      ...updates,
      id: architects[index].id, // Preserve ID
      createdAt: architects[index].createdAt, // Preserve creation date
      updatedAt: new Date().toISOString(),
    }
    
    architects[index] = updatedArchitect
    this.saveArchitects(architects)
    
    return updatedArchitect
  }

  /**
   * Delete an architect
   */
  static deleteArchitect(id: string): boolean {
    const architects = this.getArchitects()
    const filtered = architects.filter(a => a.id !== id)
    
    if (filtered.length === architects.length) return false
    
    this.saveArchitects(filtered)
    return true
  }

  /**
   * Generate architects from existing client data
   */
  static generateFromClients(clients: Client[]): Architect[] {
    const uniqueArchitectNames = Array.from(new Set(clients.map(c => c.architecteAssigne)))
    
    return uniqueArchitectNames.map((name, index) => {
      const nameStr = String(name)
      const [prenom, ...nomParts] = nameStr.split(' ')
      const nom = nomParts.join(' ') || prenom
      
      return {
        id: `arch-${Date.now()}-${index}`,
        nom: nom,
        prenom: prenom,
        email: `${prenom.toLowerCase()}.${nom.toLowerCase()}@sketchdesign.ma`,
        telephone: `+212 6${Math.floor(10000000 + Math.random() * 90000000)}`,
        ville: ["Casablanca", "Rabat", "Marrakech", "Tanger"][index % 4],
        specialite: (["residentiel", "commercial", "luxe", "mixte"][index % 4] as ArchitectSpecialty),
        statut: "actif" as ArchitectStatus,
        dateEmbauche: new Date(2020 + (index % 4), index % 12, 1).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    })
  }

  /**
   * Initialize architects from clients if not already present
   */
  static initializeFromClients(clients: Client[]): void {
    const existing = this.getArchitects()
    
    if (existing.length === 0 && clients.length > 0) {
      const generated = this.generateFromClients(clients)
      this.saveArchitects(generated)
    }
  }

  /**
   * Get clients for a specific architect
   */
  static getArchitectClients(architect: Architect, clients: Client[]): Client[] {
    return clients.filter(c => 
      c.architecteAssigne.toLowerCase().includes(architect.prenom.toLowerCase()) ||
      c.architecteAssigne.toLowerCase().includes(architect.nom.toLowerCase())
    )
  }

  /**
   * Calculate statistics for an architect
   */
  static calculateStats(architect: Architect, clients: Client[]) {
    const architectClients = this.getArchitectClients(architect, clients)
    
    const totalDossiers = architectClients.length
    const dossiersEnCours = architectClients.filter(c => 
      c.statutProjet !== "termine" && c.statutProjet !== "livraison"
    ).length
    const dossiersTermines = architectClients.filter(c => c.statutProjet === "termine").length
    const dossiersEnAttente = architectClients.filter(c => c.statutProjet === "nouveau").length
    const totalRevenue = architectClients.reduce((sum, c) => sum + (c.budget || 0), 0)
    
    return {
      totalDossiers,
      dossiersEnCours,
      dossiersTermines,
      dossiersEnAttente,
      totalRevenue,
    }
  }

  /**
   * Get architects with computed statistics
   */
  static getArchitectsWithStats(clients: Client[]): Architect[] {
    const architects = this.getArchitects()
    
    return architects.map(architect => {
      const stats = this.calculateStats(architect, clients)
      return {
        ...architect,
        ...stats,
      }
    })
  }

  /**
   * Search architects by name, email, or ville
   */
  static searchArchitects(query: string, architects: Architect[]): Architect[] {
    if (!query) return architects
    
    const searchLower = query.toLowerCase()
    return architects.filter(architect => 
      architect.nom.toLowerCase().includes(searchLower) ||
      architect.prenom.toLowerCase().includes(searchLower) ||
      architect.email.toLowerCase().includes(searchLower) ||
      architect.ville.toLowerCase().includes(searchLower)
    )
  }

  /**
   * Filter architects by criteria
   */
  static filterArchitects(
    architects: Architect[],
    filters: {
      statut?: ArchitectStatus | "all"
      ville?: string | "all"
      specialite?: ArchitectSpecialty | "all"
    }
  ): Architect[] {
    return architects.filter(architect => {
      const matchesStatus = !filters.statut || filters.statut === "all" || architect.statut === filters.statut
      const matchesVille = !filters.ville || filters.ville === "all" || architect.ville === filters.ville
      const matchesSpecialite = !filters.specialite || filters.specialite === "all" || architect.specialite === filters.specialite
      
      return matchesStatus && matchesVille && matchesSpecialite
    })
  }

  /**
   * Get unique cities from architects
   */
  static getUniqueCities(architects: Architect[]): string[] {
    return Array.from(new Set(architects.map(a => a.ville))).sort()
  }

  /**
   * Get architects by status
   */
  static getArchitectsByStatus(status: ArchitectStatus): Architect[] {
    const architects = this.getArchitects()
    return architects.filter(a => a.statut === status)
  }

  /**
   * Get architects by specialty
   */
  static getArchitectsBySpecialty(specialty: ArchitectSpecialty): Architect[] {
    const architects = this.getArchitects()
    return architects.filter(a => a.specialite === specialty)
  }

  /**
   * Get top performing architects by completed projects
   */
  static getTopPerformers(clients: Client[], limit: number = 5): Architect[] {
    const architectsWithStats = this.getArchitectsWithStats(clients)
    return architectsWithStats
      .sort((a, b) => (b.dossiersTermines || 0) - (a.dossiersTermines || 0))
      .slice(0, limit)
  }

  /**
   * Get architects with highest workload
   */
  static getHighestWorkload(clients: Client[], limit: number = 5): Architect[] {
    const architectsWithStats = this.getArchitectsWithStats(clients)
    return architectsWithStats
      .sort((a, b) => (b.dossiersEnCours || 0) - (a.dossiersEnCours || 0))
      .slice(0, limit)
  }

  /**
   * Export architects data as JSON
   */
  static exportToJSON(): string {
    const architects = this.getArchitects()
    return JSON.stringify(architects, null, 2)
  }

  /**
   * Import architects data from JSON
   */
  static importFromJSON(jsonData: string): boolean {
    try {
      const architects = JSON.parse(jsonData) as Architect[]
      
      // Validate data structure
      if (!Array.isArray(architects)) return false
      
      this.saveArchitects(architects)
      return true
    } catch (error) {
      console.error("Failed to import architects:", error)
      return false
    }
  }
}
