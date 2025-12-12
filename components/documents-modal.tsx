"use client"

import { useRef, useState, useEffect } from "react"
import { X, FolderOpen, File, FileText, Image, Download, Plus, Calendar, User, Search, Loader2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import type { Client } from "@/types/client"
import { useToast } from "@/hooks/use-toast"
import { cleanFileName, getDevisDisplayName } from "@/lib/file-utils"

interface DocumentsModalProps {
  isOpen: boolean
  onClose: () => void
  client: Client
  onDocumentsAdded?: (docs: import("@/types/client").ClientDocument[]) => void
}

const getFileIcon = (type: string) => {
  switch (type) {
    case 'pdf':
      return <FileText className="w-5 h-5 text-red-400" />
    case 'image':
    case 'jpg':
    case 'png':
      return <Image className="w-5 h-5 text-blue-400" />
    case 'dwg':
    case 'dxf':
      return <File className="w-5 h-5 text-purple-400" />
    default:
      return <File className="w-5 h-5 text-white/40" />
  }
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export function DocumentsModal({
  isOpen,
  onClose,
  client,
  onDocumentsAdded
}: DocumentsModalProps) {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [localDocuments, setLocalDocuments] = useState<any[]>([])
  const [hasInitialized, setHasInitialized] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Convert devis files to document format for traceability
  const convertDevisToDocuments = (devisList: any[]): any[] => {
    if (!devisList || devisList.length === 0) return []
    
    return devisList
      .filter(devis => devis.fichier) // Only devis with files
      .map(devis => {
        // Get clean, readable display name
        const displayName = getDevisDisplayName(devis)
        
        // Extract file extension from cleaned filename
        const fileExt = displayName.split('.').pop()?.toLowerCase() || 'pdf'
        
        // Determine file type
        let docType = 'pdf'
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
          docType = 'image'
        } else if (['doc', 'docx'].includes(fileExt)) {
          docType = 'doc'
        } else if (['xls', 'xlsx'].includes(fileExt)) {
          docType = 'xls'
        }
        
        return {
          id: `devis-${devis.id}`, // Unique ID for devis documents
          name: displayName, // Use clean, readable name
          type: docType,
          category: 'devis',
          size: 0, // Size not available from devis
          uploadedBy: devis.createdBy || 'Système',
          uploadedAt: devis.createdAt || devis.date || new Date().toISOString(),
          url: null, // Will be generated when needed
          path: devis.fichier,
          bucket: null,
          isDevis: true, // Flag to identify devis documents
          devisId: devis.id,
          devisTitle: devis.title,
        }
      })
  }

  // Sync local documents with client.documents prop and include devis
  // Only update if we have more documents from server (to prevent disappearing)
  useEffect(() => {
    const serverDocs = client.documents || []
    const devisDocs = convertDevisToDocuments(client.devis || [])
    
    // Combine regular documents and devis documents
    // Remove duplicates by checking if a devis document already exists as a regular document
    const allDocs = [
      ...serverDocs,
      ...devisDocs.filter(devisDoc => 
        !serverDocs.some(doc => doc.path === devisDoc.path || doc.name === devisDoc.name)
      )
    ]
    
    // Initialize on first load or when modal opens
    if (!hasInitialized && isOpen) {
      setLocalDocuments(allDocs)
      setHasInitialized(true)
      return
    }
    
    // Update only if server has more or different documents
    if (allDocs.length >= localDocuments.length) {
      setLocalDocuments(allDocs)
    }
  }, [client.documents, client.devis, isOpen, hasInitialized, localDocuments.length])

  // Reset initialization when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasInitialized(false)
    }
  }, [isOpen])

  const documents = localDocuments
  
  // Calculate category counts including devis
  const categories = [
    { value: "all", label: "Tous", count: documents.length },
    { value: "plan", label: "Plans", count: documents.filter(d => d.category === 'plan').length },
    { 
      value: "devis", 
      label: "Devis", 
      count: documents.filter(d => d.category === 'devis' || d.isDevis).length 
    },
    { value: "photo", label: "Photos", count: documents.filter(d => d.category === 'photo').length },
    { value: "contrat", label: "Contrats", count: documents.filter(d => d.category === 'contrat').length },
    { value: "autre", label: "Autres", count: documents.filter(d => d.category === 'autre').length },
  ]

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (doc.devisTitle && doc.devisTitle.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === "all" || 
                           doc.category === selectedCategory || 
                           (selectedCategory === "devis" && doc.isDevis)
    return matchesSearch && matchesCategory
  })

  const handleDownload = async (doc: any) => {
    try {
      let fileUrl = doc.url

      // If it's a devis document, get signed URL from path
      if (doc.isDevis && doc.path) {
        if (!fileUrl || !fileUrl.startsWith('http')) {
          try {
            const response = await fetch(`/api/storage/signed-url?path=${encodeURIComponent(doc.path)}`)
            const data = await response.json()
            if (data.url) {
              fileUrl = data.url
            } else {
              throw new Error('Impossible d\'obtenir l\'URL du fichier')
            }
          } catch (error) {
            toast({
              title: "Erreur",
              description: "Impossible d'obtenir l'URL du fichier devis.",
            })
            return
          }
        }
      }

      if (!fileUrl) {
        toast({
          title: "Téléchargement indisponible",
          description: "Aucun lien trouvé pour ce fichier.",
        })
        return
      }

      const downloading = toast({
        title: "Téléchargement…",
        description: doc.name,
      })

      const res = await fetch(fileUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = doc.name || 'document'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      downloading.dismiss()
      toast({
        title: "Téléchargement terminé",
        description: doc.name,
      })
    } catch (err: any) {
      toast({
        title: "Échec du téléchargement",
        description: err?.message || "Veuillez réessayer plus tard.",
      })
    }
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setUploadProgress(0)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const uploaded: any[] = []
    let completed = 0
    for (const file of Array.from(files)) {
      const form = new FormData()
      form.append('file', file)
      form.append('clientId', client.id)
      // Let the server auto-categorize; send 'auto' to explicitly request detection
      form.append('category', 'auto')
      const res = await fetch('/api/uploads/documents', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      })
      if (res.ok) {
        const data = await res.json()
        uploaded.push(data)
      }
      completed += 1
      setUploadProgress(Math.round((completed / files.length) * 100))
    }
    setUploading(false)
    setUploadProgress(0)
    
    if (uploaded.length > 0) {
      // Immediately update local state to show new documents
      setLocalDocuments(prev => [...uploaded, ...prev])
      
      // Notify parent component
      onDocumentsAdded?.(uploaded)
      
      // Dispatch custom event for real-time sync
      window.dispatchEvent(new CustomEvent('document-updated', { 
        detail: { clientId: client.id } 
      }))
      
      // Show success toast
      toast({
        title: "Documents ajoutés",
        description: `${uploaded.length} document(s) téléchargé(s) avec succès`,
      })
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
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[85vh] bg-[#171B22] rounded-2xl border border-white/10 shadow-2xl z-[70] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                  <FolderOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#EAEAEA]">Documents</h2>
                  <p className="text-sm text-white/40">
                    {client.nom} • {documents.length} fichier{documents.length > 1 ? 's' : ''}
                    {(client.devis?.filter(d => d.fichier).length || 0) > 0 && (
                      <span className="text-amber-400/60">
                        {' '}• {client.devis?.filter(d => d.fichier).length || 0} devis
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-[#EAEAEA]" />
              </motion.button>
            </div>

            {/* Search & Upload */}
            <div className="p-6 border-b border-white/5 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un document..."
                  className="h-11 pl-11 bg-white/5 border-white/10 text-[#EAEAEA] rounded-xl focus:border-teal-500/50"
                />
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <motion.button
                    key={category.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedCategory(category.value)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      selectedCategory === category.value
                        ? "bg-teal-500/20 text-teal-400 border border-teal-500/50"
                        : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
                    )}
                  >
                    {category.label} ({category.count})
                  </motion.button>
                ))}
              </div>

              {/* Upload Button */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={(e) => handleUpload(e.target.files)}
              />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full h-11 bg-white/5 hover:bg-white/10 text-[#EAEAEA] rounded-xl border border-white/10 font-medium disabled:opacity-60"
              >
                  {uploading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> {uploadProgress}%
                    </span>
                  ) : (
                    <span className="inline-flex items-center">
                      <Plus className="w-4 h-4 mr-2" /> Ajouter un document
                    </span>
                  )}
              </Button>
            </div>

            {/* Documents List */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {filteredDocuments.length > 0 ? (
                <div className="space-y-2">
                  {filteredDocuments.map((doc) => (
                    <motion.div
                      key={doc.id}
                      whileHover={{ x: 2, scale: 1.01 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/8 transition-all group cursor-pointer"
                    >
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        {getFileIcon(doc.type)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-medium text-[#EAEAEA] truncate">
                            {doc.name}
                          </h4>
                          {doc.isDevis && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                              Devis
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-white/40 flex-wrap">
                          <span className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            <span className="font-light">{doc.uploadedBy}</span>
                          </span>
                          <span className="text-white/20">•</span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="font-light">{formatDate(doc.uploadedAt)}</span>
                          </span>
                          {doc.size > 0 && (
                            <>
                              <span className="text-white/20">•</span>
                              <span className="font-light">{formatFileSize(doc.size)}</span>
                            </>
                          )}
                          {doc.devisTitle && doc.devisTitle !== doc.name && (
                            <>
                              <span className="text-white/20">•</span>
                              <span className="text-amber-400/70 font-light italic">{doc.devisTitle}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {doc.isDevis && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={async (e) => {
                              e.stopPropagation()
                              try {
                                let fileUrl = doc.url
                                if (!fileUrl || !fileUrl.startsWith('http')) {
                                  // Show loading state
                                  const loadingToast = toast({
                                    title: "Chargement...",
                                    description: "Ouverture du fichier en cours",
                                  })
                                  
                                  const response = await fetch(`/api/storage/signed-url?path=${encodeURIComponent(doc.path)}`)
                                  const data = await response.json()
                                  
                                  loadingToast.dismiss()
                                  
                                  if (data.url) {
                                    fileUrl = data.url
                                  } else {
                                    throw new Error('Impossible d\'obtenir l\'URL du fichier')
                                  }
                                }
                                
                                // Open in new browser tab
                                window.open(fileUrl, '_blank', 'noopener,noreferrer')
                                
                                toast({
                                  title: "Fichier ouvert",
                                  description: "Le devis s'ouvre dans un nouvel onglet",
                                })
                              } catch (error: any) {
                                console.error('[Visualiser Devis] Error:', error)
                                toast({
                                  title: "Erreur",
                                  description: error.message || "Impossible d'ouvrir le fichier devis",
                                  variant: "destructive",
                                })
                              }
                            }}
                            className="p-2.5 hover:bg-blue-500/10 rounded-lg border border-blue-500/20 hover:border-blue-500/30 transition-all"
                            title="Visualiser dans le navigateur"
                          >
                            <ExternalLink className="w-4 h-4 text-blue-400" />
                          </motion.button>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(doc)
                          }}
                          className="p-2.5 hover:bg-white/10 rounded-lg border border-white/10 hover:border-white/20 transition-all"
                          title="Télécharger"
                        >
                          <Download className="w-4 h-4 text-white/60" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FolderOpen className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">
                    {searchQuery || selectedCategory !== "all"
                      ? "Aucun document trouvé"
                      : "Aucun document pour ce client"}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5">
              <Button
                onClick={onClose}
                className="w-full h-11 bg-white/5 hover:bg-white/10 text-[#EAEAEA] rounded-xl border border-white/10"
              >
                Fermer
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
