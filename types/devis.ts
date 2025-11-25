export interface Devis {
  id: string;
  clientId: string;
  title: string;
  montant: number;
  date: string | Date;
  statut: 'en_attente' | 'accepte' | 'refuse' | 'en_cours';
  factureReglee?: boolean;
  description?: string;
  fichier?: string;
  createdBy: string;
  createdAt: string | Date;
  validatedAt?: string | Date;
  notes?: string;
  updatedAt: string | Date;
}
