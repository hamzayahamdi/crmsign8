"use client"

import { useRef, useState } from "react"
import { X, FileText, Loader2, Upload, File, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import type { Client } from "@/types/client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

interface AddDevisModalProps {
  isOpen: boolean
  onClose: () => void
  client: Client
  onSave: (client: Client, skipApiCall?: boolean) => void
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function AddDevisModal({ isOpen, onClose, client, onSave }: AddDevisModalProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)

  const handleFileSelect = (file: File | null) => {
    if (!file) return
    
    // Validate file type (PDF, images, Word, Excel, etc.)
    const validTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const validExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx']
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension || '')) {
      toast({
        title: "Type de fichier non supporté",
        description: "Veuillez sélectionner un fichier PDF, image, Word ou Excel.",
        variant: "destructive",
      })
      return
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale autorisée est de 10 MB.",
        variant: "destructive",
      })
      return
    }
    
    setSelectedFile(file)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      
      // Create FormData
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('clientId', client.id)
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      // Upload file and create devis
      const response = await fetch('/api/clients/devis/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.details || 'Échec de l\'upload du devis')
      }

      const result = await response.json()
      console.log('[Attach Devis] ✅ Devis uploaded and created:', result.data)

      // Wait a moment for database to fully commit
      await new Promise(resolve => setTimeout(resolve, 150))

      // Force refresh client data to ensure devis shows up immediately
      const clientResponse = await fetch(`/api/clients/${client.id}`, {
        credentials: 'include',
      })

      if (clientResponse.ok) {
        const clientResult = await clientResponse.json()
        console.log('[Attach Devis] 📊 Fresh client data from server:', {
          clientId: clientResult.data.id,
          devisCount: clientResult.data.devis?.length || 0,
        })

        // Update parent component with fresh data
        onSave(clientResult.data, true)

        toast({
          title: "Devis attaché avec succès",
          description: `Le fichier "${selectedFile.name}" a été ajouté comme devis`,
        })
      } else {
        console.error('[Attach Devis] Failed to fetch updated client data')
        toast({
          title: "Devis attaché",
          description: "Veuillez rafraîchir la page pour voir le devis",
          variant: "default",
        })
      }

      // Reset state
      setSelectedFile(null)
      setUploadProgress(0)
      onClose()
    } catch (error: any) {
      console.error('[Attach Devis] Error uploading devis:', error)
      toast({
        title: "Erreur",
        description: error.message || 'Impossible d\'attacher le devis. Veuillez réessayer.',
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null)
      setUploadProgress(0)
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#171B22] rounded-2xl border border-white/10 shadow-2xl z-50 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/30">
                  <FileText className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Attacher un devis</h2>
                  <p className="text-sm text-white/50">Joignez un fichier de devis pour {client.nom}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                disabled={isUploading}
                className="text-white/60 hover:text-white hover:bg-white/5 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* File Upload Area */}
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                disabled={isUploading}
              />

              {!selectedFile ? (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={cn(
                    "relative border-2 border-dashed rounded-xl p-8 text-center transition-all",
                    dragActive
                      ? "border-amber-500/50 bg-amber-500/5"
                      : "border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/[0.07]"
                  )}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/30">
                      <Upload className="w-8 h-8 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white mb-1">
                        Glissez-déposez votre fichier ici
                      </p>
                      <p className="text-xs text-white/50 mb-4">
                        ou cliquez pour sélectionner un fichier
                      </p>
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      >
                        <File className="w-4 h-4 mr-2" />
                        Sélectionner un fichier
                      </Button>
                    </div>
                    <p className="text-xs text-white/40 mt-2">
                      Formats acceptés: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX (max. 10 MB)
                    </p>
                  </div>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Selected File Preview */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                        <FileText className="w-6 h-6 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-white/50 mt-0.5">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedFile(null)}
                        disabled={isUploading}
                        className="text-white/60 hover:text-white hover:bg-white/5"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Upload Progress */}
                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-white/60">
                        <span>Upload en cours...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isUploading}
                  className="flex-1 bg-transparent border-white/10 text-white hover:bg-white/5 disabled:opacity-50"
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Attachement...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Attacher le devis
                    </>
                  )}
                </Button>
              </div>

              {/* Info Box */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300/80">
                  Le devis sera automatiquement créé avec le statut "En attente". Vous pourrez modifier les détails après l'ajout.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
