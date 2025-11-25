/**
 * CRM Contact, Opportunity, and Timeline types
 * 
 * These are the core new models for professional CRM structure:
 * Lead → Contact → Opportunities → Client (won opportunity)
 */

export type ContactTag = 'prospect' | 'vip' | 'converted' | 'client' | 'archived';

export type ContactStatus = 'qualifie' | 'prise_de_besoin' | 'acompte_recu' | 'perdu';


export interface Contact {
  id: string;
  nom: string;
  telephone: string;
  email?: string | null;
  ville?: string | null;
  adresse?: string | null;
  leadId?: string | null;
  architecteAssigne?: string | null;
  tag: ContactTag;
  status: ContactStatus;
  clientSince?: Date | null;
  notes?: string | null;
  magasin?: string | null;
  createdBy: string;
  convertedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type OpportunityType =
  | 'villa'
  | 'appartement'
  | 'magasin'
  | 'bureau'
  | 'riad'
  | 'studio'
  | 'renovation'
  | 'autre';

export type OpportunityStatus = 'open' | 'won' | 'lost' | 'on_hold';

export type OpportunityPipelineStage = 'prise_de_besoin' | 'projet_accepte' | 'acompte_recu' | 'gagnee' | 'perdue';

export interface Opportunity {
  id: string;
  contactId: string;
  titre: string;
  type: OpportunityType;
  statut: OpportunityStatus;
  pipelineStage: OpportunityPipelineStage;
  budget?: number | null;
  description?: string | null;
  architecteAssigne?: string | null;
  dateClotureAttendue?: Date | null;
  notes?: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations (optional, loaded separately)
  contact?: Contact;
  tasks?: any[];
  appointments?: any[];
  documents?: any[];
  timeline?: Timeline[];
}

export type TimelineEventType =
  | 'contact_created'
  | 'contact_converted_from_lead'
  | 'opportunity_created'
  | 'opportunity_won'
  | 'opportunity_lost'
  | 'opportunity_on_hold'
  | 'architect_assigned'
  | 'task_created'
  | 'task_completed'
  | 'appointment_created'
  | 'appointment_completed'
  | 'document_uploaded'
  | 'note_added'
  | 'status_changed'
  | 'other';

export interface Timeline {
  id: string;
  contactId?: string | null;
  opportunityId?: string | null;
  eventType: TimelineEventType;
  title: string;
  description?: string | null;
  metadata?: Record<string, any> | null;
  author: string;
  createdAt: Date;
}

export interface ContactDocument {
  id: string;
  contactId: string;
  name: string;
  path: string;
  bucket: string;
  type: string;
  size: number;
  category: string;
  uploadedBy: string;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OpportunityDocument {
  id: string;
  opportunityId: string;
  name: string;
  path: string;
  bucket: string;
  type: string;
  size: number;
  category: string;
  uploadedBy: string;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactPayment {
  id: string;
  contactId: string;
  montant: number;
  date: Date;
  methode: string;
  reference?: string | null;
  description?: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Extended Contact with relations
export interface ContactWithDetails extends Contact {
  opportunities: Opportunity[];
  timeline: Timeline[];
  documents: ContactDocument[];
  payments: ContactPayment[];
  tasks?: any[];
  appointments?: any[];
}

// Extended Opportunity with relations
export interface OpportunityWithDetails extends Opportunity {
  contact: Contact;
  timeline: Timeline[];
  documents: OpportunityDocument[];
  tasks?: any[];
  appointments?: any[];
}

// Conversion response type
export interface ConversionResult {
  success: boolean;
  contact: Contact;
  timeline: Timeline[];
  message: string;
}
