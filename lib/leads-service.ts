import type { Lead } from '@/types/lead'

const API_BASE = '/api/leads'

interface PaginatedLeadsResponse {
  success: boolean
  data: Lead[]
  totalCount: number
  page: number
  limit: number
  totalPages: number
  nextCursor?: string
  nextCursorId?: string
  hasMore?: boolean
}

export class LeadsService {
  // Get paginated leads with cursor support
  static async getLeads(params: { page?: number; limit?: number; cursor?: string; cursorId?: string } = {}): Promise<PaginatedLeadsResponse> {
    try {
      const { page = 1, limit = 20, cursor, cursorId } = params
      const url = new URL(API_BASE, window.location.origin)
      url.searchParams.set('page', page.toString())
      url.searchParams.set('limit', limit.toString())
      
      // Add cursor params if provided
      if (cursor) {
        url.searchParams.set('cursor', cursor)
      }
      if (cursorId) {
        url.searchParams.set('cursorId', cursorId)
      }
      
      const response = await fetch(url.toString(), {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store',
        },
      })
      if (!response.ok) {
        throw new Error('Failed to fetch leads')
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching leads:', error)
      throw error
    }
  }

  // Get all leads (legacy - for backward compatibility)
  static async getAllLeads(): Promise<Lead[]> {
    try {
      const response = await this.getLeads({ page: 1, limit: 10000 })
      return response.data
    } catch (error) {
      console.error('Error fetching leads:', error)
      throw error
    }
  }

  // Get a specific lead
  static async getLead(id: string): Promise<Lead> {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store',
        },
      })
      if (!response.ok) {
        throw new Error('Failed to fetch lead')
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching lead:', error)
      throw error
    }
  }

  // Create a new lead
  static async createLead(lead: Omit<Lead, 'id'>): Promise<Lead> {
    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lead),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create lead')
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error creating lead:', error)
      throw error
    }
  }

  // Update a lead
  static async updateLead(id: string, lead: Partial<Lead>): Promise<Lead> {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lead),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update lead')
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error updating lead:', error)
      throw error
    }
  }

  // Delete a lead
  static async deleteLead(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete lead')
      }
    } catch (error) {
      console.error('Error deleting lead:', error)
      throw error
    }
  }
}
