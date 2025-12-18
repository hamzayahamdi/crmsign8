"use client";

import { Building2, DollarSign, FileText, CheckCircle, UserPlus } from "lucide-react";
import type { Client } from "@/types/client";

interface ProjectInformationCardProps {
  client: Client;
  onUpdate: (client: Client) => void;
}

interface ParsedNote {
  id?: string;
  content: string;
  createdAt?: string;
  createdBy?: string;
  author?: string;
  type?: string;
  source?: string;
  sourceId?: string;
}

export function ProjectInformationCard({
  client,
}: ProjectInformationCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Parse notes - handle both JSON array and plain string
  // NEVER display raw JSON - always parse and format
  const parseNotes = (notes: string | undefined): ParsedNote[] => {
    if (!notes || typeof notes !== 'string') return [];

    // Clean up the notes string first - remove any escaped characters
    let cleanedNotes = notes.trim();
    if (!cleanedNotes) return [];

    // Handle escaped JSON strings
    if (cleanedNotes.startsWith('"') && cleanedNotes.endsWith('"')) {
      try {
        cleanedNotes = JSON.parse(cleanedNotes);
      } catch {
        // If parsing fails, remove quotes manually
        cleanedNotes = cleanedNotes.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n');
      }
    }

    const trimmedNotes = typeof cleanedNotes === 'string' ? cleanedNotes.trim() : String(cleanedNotes).trim();
    if (!trimmedNotes) return [];

    // Check if it looks like JSON (starts with [ or {)
    const looksLikeJson = trimmedNotes.startsWith('[') || trimmedNotes.startsWith('{');

    if (looksLikeJson) {
      try {
        const parsed = JSON.parse(trimmedNotes);
        
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Valid array of notes - extract content from each
          return parsed
            .map((note: any, idx: number) => {
              // Extract content - handle various field names
              let content = '';
              if (typeof note === 'string') {
                content = note;
              } else if (note?.content) {
                content = note.content;
              } else if (note?.text) {
                content = note.text;
              } else if (note?.message) {
                content = note.message;
              } else if (typeof note === 'object') {
                // Last resort: try to extract any string value
                const values = Object.values(note).filter(v => typeof v === 'string' && v.trim());
                content = values[0] || '';
              } else {
                content = String(note);
              }

              // Only return if we have actual content (not empty or just JSON structure)
              if (!content || content.trim().length === 0) {
                return null;
              }

              // Skip if content looks like raw JSON structure
              if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
                return null;
              }

              return {
                id: note.id || `note-${idx}-${Date.now()}`,
                content: content.trim(),
                createdAt: note.createdAt || note.date || note.created_at || note.timestamp,
                createdBy: note.createdBy || note.author || note.created_by || note.by || "Système",
                author: note.author || note.createdBy || note.created_by || note.by || "Système",
                type: note.type,
                source: note.source,
                sourceId: note.sourceId || note.source_id,
              };
            })
            .filter((note: ParsedNote | null): note is ParsedNote => 
              note !== null && note.content && note.content.trim().length > 0
            );
        } else if (typeof parsed === 'object' && parsed !== null) {
          // Single object - try to extract content
          const content = parsed.content || parsed.text || parsed.message || '';
          if (content && typeof content === 'string' && content.trim() && !content.trim().startsWith('{') && !content.trim().startsWith('[')) {
            return [{
              id: parsed.id || `note-${Date.now()}`,
              content: content.trim(),
              createdAt: parsed.createdAt || parsed.date || parsed.created_at,
              createdBy: parsed.createdBy || parsed.author || parsed.created_by || "Système",
              author: parsed.author || parsed.createdBy || parsed.created_by || "Système",
              type: parsed.type,
              source: parsed.source,
              sourceId: parsed.sourceId || parsed.source_id,
            }];
          }
        }
      } catch (parseError) {
        // JSON parse failed - treat as plain text but clean it up
        // Remove any JSON-like structures that might be visible
        const cleaned = trimmedNotes
          .replace(/\{[\s\S]*?"content"\s*:\s*"([^"]+)"/g, '$1')
          .replace(/\{[\s\S]*?"text"\s*:\s*"([^"]+)"/g, '$1')
          .replace(/\[[\s\S]*?\]/g, '')
          .replace(/\{[\s\S]*?\}/g, '')
          .trim();

        if (cleaned && cleaned.length > 0 && !cleaned.startsWith('{') && !cleaned.startsWith('[')) {
          return [{
            id: `plain-${Date.now()}`,
            content: cleaned,
            createdAt: new Date().toISOString(),
            createdBy: "Système",
            author: "Système",
          }];
        }
      }
    }

    // Not JSON or failed to parse - treat as plain text
    // But make sure it's not displaying JSON structure
    if (trimmedNotes && !trimmedNotes.startsWith('{') && !trimmedNotes.startsWith('[')) {
      return [{
        id: `plain-${Date.now()}`,
        content: trimmedNotes,
        createdAt: new Date().toISOString(),
        createdBy: "Système",
        author: "Système",
      }];
    }

    // If we get here, it's likely malformed JSON or empty - return empty array
    return [];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).replace(/\s/g, " "); // Ensure single spaces
    } catch {
      return "";
    }
  };

  const parsedNotes = parseNotes(client.notes);

  return (
    <div className="bg-[#171B22] rounded-lg border border-white/5 p-4">
      <h2 className="text-xs font-light text-white/90 mb-4 tracking-wide uppercase">Informations Projet</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3.5">
        {/* Type de Projet */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md border border-blue-500/20 bg-blue-500/5 flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-white/35 mb-0.5 font-light uppercase tracking-wider">Type de Projet</p>
            <p className="text-xs text-white/90 font-light capitalize">
              {client.typeProjet}
            </p>
          </div>
        </div>

        {/* Paiements Reçus */}
        {(() => {
          const paymentsList = client.payments || [];
          const totalPayments = paymentsList.reduce(
            (sum, p) => sum + p.amount,
            0,
          );

          return totalPayments > 0 ? (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-center shrink-0">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-white/35 mb-0.5 font-light uppercase tracking-wider">Paiements Reçus</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-white/90 font-light">
                    {formatCurrency(totalPayments)}
                  </p>
                  <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded font-light">
                    {paymentsList.length}
                  </span>
                </div>
              </div>
            </div>
          ) : null;
        })()}

        {/* Devis Acceptés */}
        {(() => {
          const devisList = client.devis || [];
          const acceptedDevis = devisList.filter((d) => d.statut === "accepte");
          const totalAccepted = acceptedDevis.reduce(
            (sum, d) => sum + d.montant,
            0,
          );
          const allPaid =
            acceptedDevis.length > 0 &&
            acceptedDevis.every((d) => d.facture_reglee);

          return totalAccepted > 0 ? (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md border border-green-500/20 bg-green-500/5 flex items-center justify-center shrink-0">
                <DollarSign className="w-3.5 h-3.5 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-white/35 mb-0.5 font-light uppercase tracking-wider">Devis Acceptés</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-white/90 font-light">
                    {formatCurrency(totalAccepted)}
                  </p>
                  {allPaid && (
                    <CheckCircle className="w-3 h-3 text-green-400" />
                  )}
                </div>
              </div>
            </div>
          ) : null;
        })()}

        {/* Nom du commercial */}
        {(() => {
          // Determine the correct commercial name (same logic as client overview card)
          let commercialName = ''
          
          // Try to get leadData (could be object or JSON string)
          let leadData: any = null
          if (client.leadData) {
            if (typeof client.leadData === 'string') {
              try {
                leadData = JSON.parse(client.leadData)
              } catch (e) {
                console.error('[Project Info] Failed to parse leadData:', e)
              }
            } else if (typeof client.leadData === 'object') {
              leadData = client.leadData
            }
          }
          
          // Priority 1: Use commercialMagasin from leadData (most accurate, especially for magasin leads)
          if (leadData && leadData.commercialMagasin && leadData.commercialMagasin.trim()) {
            commercialName = leadData.commercialMagasin.trim()
          } 
          // Priority 2: Use commercialAttribue from API (which should already have the correct value)
          else if (client.commercialAttribue && client.commercialAttribue.trim()) {
            commercialName = client.commercialAttribue.trim()
          }
          
          const isMagasinLead = client.magasin || (leadData && leadData.source === 'magasin')
          
          if (commercialName || isMagasinLead) {
            return (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md border border-amber-500/20 bg-amber-500/5 flex items-center justify-center shrink-0">
                  <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-white/35 mb-0.5 font-light uppercase tracking-wider">
                    Nom du commercial
                  </p>
                  <p className="text-xs text-white/90 font-light truncate" title={commercialName}>
                    {commercialName || 'Non assigné'}
                  </p>
                </div>
              </div>
            )
          }
          return null
        })()}

        {/* Opportunité créée par - Only show if different from commercial name */}
        {(() => {
          const opportunityCreator = client.opportunityCreatedBy || client.contactCreatedBy
          // Only show if it's different from commercial name and exists
          if (opportunityCreator && opportunityCreator !== client.commercialAttribue) {
            return (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md border border-purple-500/20 bg-purple-500/5 flex items-center justify-center shrink-0">
                  <UserPlus className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-white/35 mb-0.5 font-light uppercase tracking-wider">
                    Opportunité créée par
                  </p>
                  <p className="text-xs text-white/90 font-light truncate">
                    {opportunityCreator}
                  </p>
                </div>
              </div>
            )
          }
          return null
        })()}
      </div>

      {/* Notes & Détails - Separate section for better readability */}
      {(parsedNotes.length > 0 || client.nomProjet) && (
        <div className="mt-3.5 pt-3.5 border-t border-white/5">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-md border border-purple-500/20 bg-purple-500/5 flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-white/35 mb-1 font-light uppercase tracking-wider">Notes & Détails</p>
              <div className="space-y-1">
                {client.nomProjet && (
                  <p className="text-xs text-white/90 font-light">
                    {client.nomProjet}
                  </p>
                )}
                {parsedNotes.length > 0 && (
                  <div className="space-y-1">
                    {parsedNotes.map((note, index) => {
                      const displayContent = note.content && 
                        !note.content.trim().startsWith('{') && 
                        !note.content.trim().startsWith('[') &&
                        !note.content.includes('"id"') &&
                        !note.content.includes('"content"') &&
                        note.content.trim().length > 0
                        ? note.content.trim()
                        : null;

                      if (!displayContent) return null;

                      return (
                        <div key={note.id || index} className="flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-purple-400/50 mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              {note.createdAt && (
                                <span className="text-[9px] text-white/40 font-light">
                                  {formatDate(note.createdAt)}
                                </span>
                              )}
                              <span className="text-xs text-white/80 font-light">
                                {displayContent}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
