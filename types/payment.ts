export interface Payment {
  id: string;
  clientId: string;
  montant: number;
  date: string | Date;
  methode: string; // espece, virement, cheque
  reference?: string;
  description?: string;
  createdBy: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}
