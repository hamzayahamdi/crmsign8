"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Loader2, ArrowRight, User, Briefcase, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Lead } from '@/types/lead'
import { ContactService } from '@/lib/contact-service'

interface ConvertLeadModalProps {
  isOpen: boolean
  onClose: () => void
  lead: Lead | null
  onSuccess?: (data: any) => void
}

/**
 * Beautiful modal for converting a Lead to Contact + Opportunity
 * 
 * Flow:
 * 1. Show lead preview
 * 2. Ask for architect assignment (optional)
 * 3. Ask for opportunity type
 * 4. Convert and show success
 */
export function ConvertLeadModal({
  isOpen,
  onClose,
  lead,
  onSuccess,
}: ConvertLeadModalProps) {
  const [step, setStep] = useState<'preview' | 'details' | 'converting' | 'success'>('preview')
  const [selectedArchitect, setSelectedArchitect] = useState<string>('none')
  const [architects, setArchitects] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [resultSummary, setResultSummary] = useState({
    contactName: '',
    opportunityTitle: undefined,
  })

  // Load architects on mount
  useEffect(() => {
    if (isOpen) {
      loadArchitects()
      setResultSummary({
        contactName: result?.contact?.nom,
        opportunityTitle: undefined,
      })
      setStep('preview')
      setSelectedArchitect('none')
    }
  }, [isOpen, result])

  const loadArchitects = async () => {
    try {
      const response = await fetch('/api/architects')
      if (response.ok) {
        const data = await response.json()
        setArchitects(data.architects || [])
      }
    } catch (error) {
      console.error('Error loading architects:', error)
    }
  }

  const handleConvert = async () => {
    if (!lead) return

    setLoading(true)
    setStep('converting')

    try {
      console.log('🔄 [Convert Modal] Starting conversion for:', lead.nom)
      
      const result = await ContactService.convertLead(
        lead.id,
        selectedArchitect && selectedArchitect !== 'none' ? selectedArchitect : undefined,
      )

      console.log('✅ [Convert Modal] Conversion successful:', result)
      
      setResult(result)
      setStep('success')

      // Show success toast with emoji
      console.log('🎉 [Convert Modal] Showing success toast')
      toast.success(`✨ ${lead.nom} converti en contact !`, {
        description: "Redirection vers le profil du contact...",
        duration: 3000,
      })

      if (onSuccess) {
        console.log('🔄 [Convert Modal] Calling onSuccess callback')
        onSuccess(result)
      }

      // Close modal immediately after success
      setTimeout(() => {
        console.log('🚪 [Convert Modal] Closing modal and redirecting')
        onClose()
        setStep('preview')
      }, 1500)
    } catch (error) {
      console.error('❌ [Convert Modal] Error converting lead:', error)
      toast.error(error instanceof Error ? error.message : 'Échec de la conversion')
      setStep('details')
    } finally {
      setLoading(false)
    }
  }

  if (!lead) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-gradient-to-b from-slate-50 to-white border-0 shadow-2xl">
        <DialogHeader className="space-y-4">
          <DialogTitle className="text-2xl font-bold text-slate-900">
            Convertir Lead en Contact
          </DialogTitle>
          <DialogDescription className="text-base text-slate-600">
            Transformez ce prospect en contact permanent et assignez un architecte pour le suivi
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* STEP 1: PREVIEW */}
          {step === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6 py-4"
            >
              {/* Lead Preview Card */}
              <Card className="p-6 bg-white border-slate-200 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white flex-shrink-0">
                      <User className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900">{lead.nom}</h3>
                      <p className="text-sm text-slate-500">Lead actuel</p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500">📱 Téléphone:</span>
                      <span className="font-medium text-slate-900">{lead.telephone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500">🏠 Type:</span>
                      <span className="font-medium text-slate-900">{lead.typeBien}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-500">Ville:</span>
                      <span className="font-medium text-slate-900">{lead.ville}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500">📊 Statut:</span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {lead.statut}
                      </span>
                    </div>
                  </div>

                  {lead.message && (
                    <div className="pt-4 border-t border-slate-100">
                      <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg italic">
                        "{lead.message}"
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* What Will Happen */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-700">Ce qui va se passer:</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-slate-700">
                      <strong>Contact créé:</strong> {lead.nom} devient un contact permanent dans votre CRM
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <User className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span className="text-sm text-slate-700">
                      <strong>Architecte assigné:</strong> Possibilité d'assigner un architecte immédiatement
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <Briefcase className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    <span className="text-sm text-slate-700">
                      <strong>Timeline enregistrée:</strong> Traçabilité complète de la conversion
                    </span>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900">
                  Après la conversion, vous pourrez créer des opportunités (devis, projets) pour ce contact depuis son profil.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  onClick={() => setStep('details')}
                >
                  Continuer <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: DETAILS */}
          {step === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6 py-4"
            >
              {/* Architect Selection (Optional) */}
              <div className="space-y-3">
                <Label htmlFor="architect" className="text-base font-semibold text-slate-900">
                  Architecte assigné <span className="text-slate-400 font-normal">(Optionnel)</span>
                </Label>
                <Select value={selectedArchitect} onValueChange={setSelectedArchitect}>
                  <SelectTrigger id="architect" className="h-10 border-slate-300">
                    <SelectValue placeholder="Choisir un architecte..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun - Assigner plus tard</SelectItem>
                    {architects.map((arch) => (
                      <SelectItem key={arch.id} value={arch.id}>
                        {arch.name} {arch.ville ? `- ${arch.ville}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  L'architecte sera automatiquement assigné au contact et pourra gérer les opportunités futures
                </p>
              </div>

              {/* Info about opportunities */}
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <Briefcase className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Gestion des opportunités</p>
                  <p className="text-blue-700">
                    Après la conversion, vous pourrez créer et gérer les opportunités (devis, projets) depuis le profil du contact.
                  </p>
                </div>
              </div>

              {/* Preview of what will be created */}
              <Card className="p-4 bg-slate-50 border-slate-200">
                <p className="text-xs font-semibold text-slate-600 mb-3 uppercase">Aperçu du contact créé</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Nom:</span>
                    <span className="font-medium text-slate-900">{lead.nom}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Téléphone:</span>
                    <span className="font-medium text-slate-900">{lead.telephone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Ville:</span>
                    <span className="font-medium text-slate-900">{lead.ville}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Type de bien:</span>
                    <span className="font-medium text-slate-900">{lead.typeBien}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tag:</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      Converti
                    </span>
                  </div>
                  {selectedArchitect && selectedArchitect !== 'none' && architects.find(a => a.id === selectedArchitect) && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Architecte:</span>
                      <span className="font-medium text-slate-900">
                        {architects.find(a => a.id === selectedArchitect)?.name}
                      </span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep('preview')}
                  disabled={loading}
                >
                  Retour
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                  onClick={handleConvert}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Conversion...
                    </>
                  ) : (
                    <>
                      Convertir maintenant
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: CONVERTING */}
          {step === 'converting' && (
            <motion.div
              key="converting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 space-y-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600"
              />
              <p className="text-base font-semibold text-slate-900">Conversion en cours...</p>
              <p className="text-sm text-slate-500">Création du contact et de l'opportunité</p>
            </motion.div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 'success' && result && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-12 space-y-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
              </motion.div>
              <p className="text-lg font-bold text-slate-900">Conversion réussie!</p>
              <p className="text-sm text-slate-600 text-center max-w-xs">
                {result.contact.nom} est maintenant un contact permanent dans votre CRM
              </p>
              <p className="text-xs text-slate-500">Redirection vers le profil du contact...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
