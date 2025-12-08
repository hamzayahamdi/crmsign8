import {
  Contact,
  Opportunity,
  Timeline,
  ContactWithDetails,
  OpportunityWithDetails,
  ConversionResult,
  TimelineEventType,
} from '@/types/contact';

// Helper to get auth token from localStorage
const getAuthToken = () => localStorage.getItem('token') || '';

const API_BASE = '/api/contacts';

/**
 * Service for Contact operations
 * Handles communication with backend for Contact/Opportunity management
 */
export const ContactService = {
  async convertLead(leadId: string, architectId?: string): Promise<ConversionResult> {
    const response = await fetch(`${API_BASE}/convert-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({
        leadId,
        architectId,
      }),
    });

    const data = await response.json();

    // Handle "already converted" case - this is actually a success!
    if (data.alreadyConverted && data.contact) {
      console.log('[ContactService] Lead already converted, returning existing contact:', data.contact.id);
      return data; // Return the existing contact
    }

    if (!response.ok) {
      throw new Error(data.error || 'Failed to convert lead');
    }

    return data;
  },

  /**
   * Preview what will happen when converting a lead
   */
  async previewConversion(leadId: string) {
    const response = await fetch(`${API_BASE}/convert-lead?leadId=${leadId}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get preview');
    }

    return response.json();
  },

  /**
   * Get a contact with all details (opportunities, timeline, documents, etc.)
   */
  async getContact(contactId: string): Promise<ContactWithDetails> {
    const response = await fetch(`${API_BASE}/${contactId}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || `Failed to fetch contact (${response.status}): ${response.statusText}`);
      } catch (e) {
        if (e instanceof Error) throw e;
        throw new Error(`Failed to fetch contact (${response.status}): ${response.statusText}`);
      }
    }

    return response.json();
  },

  /**
   * Get all contacts with optional filters
   */
  async getContacts(filters?: {
    search?: string;
    tag?: string;
    architectId?: string;
    magasin?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Contact[]; total: number; limit: number; offset: number; hasMore: boolean }> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.tag) params.append('tag', filters.tag);
    if (filters?.architectId) params.append('architectId', filters.architectId);
    if (filters?.magasin) params.append('magasin', filters.magasin);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const response = await fetch(`${API_BASE}?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      try {
        const error = await response.json();
        throw new Error(error.error || `Failed to fetch contacts (${response.status}): ${response.statusText}`);
      } catch (e) {
        if (e instanceof Error) throw e;
        throw new Error(`Failed to fetch contacts (${response.status}): ${response.statusText}`);
      }
    }

    return response.json();
  },

  /**
   * Update contact information
   */
  async updateContact(
    contactId: string,
    data: Partial<Contact>
  ): Promise<Contact> {
    const response = await fetch(`${API_BASE}/${contactId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update contact');
    }

    return response.json();
  },

  /**
   * Create a new opportunity for a contact
   */
  async createOpportunity(
    contactId: string,
    data: {
      titre: string;
      type: string;
      budget?: number;
      description?: string;
      architecteAssigne?: string;
      dateClotureAttendue?: string;
    }
  ): Promise<Opportunity> {
    const response = await fetch(`${API_BASE}/${contactId}/opportunities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create opportunity');
    }

    return response.json();
  },

  /**
   * Get all opportunities for a contact
   */
  async getOpportunities(contactId: string): Promise<Opportunity[]> {
    const response = await fetch(`${API_BASE}/${contactId}/opportunities`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch opportunities');
    }

    const data = await response.json();
    return data.opportunities;
  },

  /**
   * Update an opportunity
   */
  async updateOpportunity(
    opportunityId: string,
    data: Partial<Opportunity>
  ): Promise<Opportunity> {
    const response = await fetch(`/api/opportunities/${opportunityId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update opportunity');
    }

    return response.json();
  },

  /**
   * Change opportunity status (open, won, lost, on_hold)
   */
  async updateOpportunityStatus(
    opportunityId: string,
    status: 'open' | 'won' | 'lost' | 'on_hold'
  ): Promise<Opportunity> {
    const response = await fetch(`/api/opportunities/${opportunityId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error('Failed to update opportunity status');
    }

    return response.json();
  },

  /**
   * Get timeline/activity for a contact
   */
  async getContactTimeline(contactId: string): Promise<Timeline[]> {
    const response = await fetch(`${API_BASE}/${contactId}/timeline`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch timeline');
    }

    const data = await response.json();
    return data.timeline;
  },

  /**
   * Get timeline for an opportunity
   */
  async getOpportunityTimeline(opportunityId: string): Promise<Timeline[]> {
    const response = await fetch(`/api/opportunities/${opportunityId}/timeline`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch timeline');
    }

    const data = await response.json();
    return data.timeline;
  },

  /**
   * Get timeline entries that match a type
   */
  getTimelineByType(timeline: Timeline[], type: TimelineEventType): Timeline[] {
    return timeline.filter(entry => entry.eventType === type);
  },

  /**
   * Merge duplicate contacts
   */
  async mergeContacts(
    mainContactId: string,
    duplicateContactIds: string[]
  ): Promise<Contact> {
    const response = await fetch(`${API_BASE}/${mainContactId}/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ duplicateContactIds }),
    });

    if (!response.ok) {
      throw new Error('Failed to merge contacts');
    }

    return response.json();
  },

  /**
   * Delete a contact
   */
  async deleteContact(contactId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${contactId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete contact');
    }
  },

  /**
   * Get contacts that are "Clients" (have at least one Won opportunity)
   */
  async getClients(filters?: any): Promise<{ data: Contact[]; total: number }> {
    return this.getContacts({
      ...filters,
      // Filtering for clients is handled on backend
    });
  },
};
