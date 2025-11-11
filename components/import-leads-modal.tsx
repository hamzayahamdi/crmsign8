"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface ImportLeadsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete?: () => void
}

export function ImportLeadsModal({ open, onOpenChange, onImportComplete }: ImportLeadsModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [campaignName, setCampaignName] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [importResults, setImportResults] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Format invalide",
          description: "Veuillez sélectionner un fichier CSV",
          variant: "destructive"
        })
        return
      }
      setFile(selectedFile)
    }
  }

  const parseCSV = (text: string) => {
    const lines = text.split('\n')
    const headers = lines[0].split(',').map(h => h.trim())
    const data = []

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue
      
      const values = lines[i].split(',')
      const row: any = {}
      
      headers.forEach((header, index) => {
        const value = values[index]?.trim() || ''
        
        // Map CSV headers to our format
        if (header === 'Nom et Prénom') row.nom = value
        else if (header === 'Numéro de téléphone') row.telephone = value
        else if (header === 'Type de Bien') row.typeBien = value
        else if (header === 'Ville') row.ville = value
        else if (header === 'Statut') row.statut = value
        else if (header === 'Note') row.note = value
        else if (header === 'Assigné à') row.assigneA = value
        else if (header === 'Called on') row.calledOn = value
        else if (header === 'Deuxième appel') row.deuxiemeAppel = value
        else if (header === '3 éme appel') row.troisiemeAppel = value
      })
      
      if (row.nom && row.telephone) {
        data.push(row)
      }
    }

    return data
  }

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "Fichier manquant",
        description: "Veuillez sélectionner un fichier CSV",
        variant: "destructive"
      })
      return
    }

    if (!campaignName.trim()) {
      toast({
        title: "Nom de campagne manquant",
        description: "Veuillez entrer un nom de campagne",
        variant: "destructive"
      })
      return
    }

    setIsImporting(true)
    setImportResults(null)

    try {
      // Read file
      const text = await file.text()
      const leads = parseCSV(text)

      if (leads.length === 0) {
        toast({
          title: "Fichier vide",
          description: "Aucun lead trouvé dans le fichier",
          variant: "destructive"
        })
        setIsImporting(false)
        return
      }

      // Get token
      const token = localStorage.getItem('token')
      if (!token) {
        toast({
          title: "Non authentifié",
          description: "Veuillez vous reconnecter",
          variant: "destructive"
        })
        setIsImporting(false)
        return
      }

      // Import leads
      const response = await fetch('/api/leads/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          leads,
          campaignName: campaignName.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Import failed')
      }

      setImportResults(data.results)
      
      toast({
        title: "Import réussi",
        description: `${data.results.imported} leads importés, ${data.results.updated} mis à jour`,
      })

      if (onImportComplete) {
        onImportComplete()
      }

      // Reset form after 3 seconds
      setTimeout(() => {
        setFile(null)
        setCampaignName("")
        setImportResults(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }, 3000)

    } catch (error: any) {
      console.error('Import error:', error)
      toast({
        title: "Erreur d'import",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    if (!isImporting) {
      setFile(null)
      setCampaignName("")
      setImportResults(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-[#0A0A0A] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <Upload className="h-5 w-5 text-purple-400" />
            Importer des Leads TikTok
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Campaign Name */}
          <div className="space-y-2">
            <Label htmlFor="campaign-name" className="text-sm text-gray-300">
              Nom de la campagne
            </Label>
            <Input
              id="campaign-name"
              placeholder="Ex: Octobre-Novembre 2025"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              disabled={isImporting}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50"
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="csv-file" className="text-sm text-gray-300">
              Fichier CSV
            </Label>
            <div className="relative">
              <input
                ref={fileInputRef}
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isImporting}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="w-full h-24 border-2 border-dashed border-white/20 bg-white/5 hover:bg-white/10 hover:border-purple-500/50 transition-all"
              >
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-8 w-8 text-gray-400" />
                  <span className="text-sm text-gray-300">
                    {file ? file.name : "Cliquez pour sélectionner un fichier CSV"}
                  </span>
                </div>
              </Button>
            </div>
          </div>

          {/* Import Results */}
          <AnimatePresence>
            {importResults && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-lg bg-white/5 border border-white/10 p-4 space-y-3"
              >
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Import terminé</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <div className="text-green-400 font-semibold text-2xl">
                      {importResults.imported}
                    </div>
                    <div className="text-gray-400 text-xs">Nouveaux leads</div>
                  </div>
                  
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <div className="text-blue-400 font-semibold text-2xl">
                      {importResults.updated}
                    </div>
                    <div className="text-gray-400 text-xs">Mis à jour</div>
                  </div>
                  
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <div className="text-yellow-400 font-semibold text-2xl">
                      {importResults.duplicates}
                    </div>
                    <div className="text-gray-400 text-xs">Doublons</div>
                  </div>
                  
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <div className="text-red-400 font-semibold text-2xl">
                      {importResults.errors}
                    </div>
                    <div className="text-gray-400 text-xs">Erreurs</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info Box */}
          <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="text-purple-300 font-medium">Format attendu</p>
                <p className="text-gray-400 text-xs">
                  Le fichier CSV doit contenir les colonnes : Nom et Prénom, Numéro de téléphone, 
                  Type de Bien, Ville, Statut, Note, Assigné à, Called on, Deuxième appel, 3 éme appel
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isImporting}
            className="text-gray-400 hover:text-white hover:bg-white/5"
          >
            Annuler
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || !campaignName.trim() || isImporting}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Import en cours...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Importer
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
