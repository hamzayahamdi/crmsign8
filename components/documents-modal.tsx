"use client"

import { useRef, useState, useEffect } from "react"
import { X, FolderOpen, File, FileText, Image, Download, Plus, Calendar, User, Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import type { Client } from "@/types/client"
import { toast } from "@/components/ui/use-toast"

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
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [localDocuments, setLocalDocuments] = useState<any[]>([])
  const [hasInitialized, setHasInitialized] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Sync local documents with client.documents prop
  // Only update if we have more documents from server (to prevent disappearing)
  useEffect(() => {
    const serverDocs = client.documents || []
    
    // Initialize on first load or when modal opens
    if (!hasInitialized && isOpen) {
      setLocalDocuments(serverDocs)
      setHasInitialized(true)
      return
    }
    
    // Update only if server has more or different documents
    if (serverDocs.length >= localDocuments.length) {
      setLocalDocuments(serverDocs)
    }
  }, [client.documents, isOpen, hasInitialized, localDocuments.length])

  // Reset initialization when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasInitialized(false)
    }
  }, [isOpen])

  const documents = localDocuments
  
  const categories = [
    { value: "all", label: "Tous", count: documents.length },
    { value: "plan", label: "Plans", count: documents.filter(d => d.category === 'plan').length },
    { value: "devis", label: "Devis", count: documents.filter(d => d.category === 'devis').length },
    { value: "photo", label: "Photos", count: documents.filter(d => d.category === 'photo').length },
    { value: "contrat", label: "Contrats", count: documents.filter(d => d.category === 'contrat').length },
    { value: "autre", label: "Autres", count: documents.filter(d => d.category === 'autre').length },
  ]

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || doc.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleDownload = async (doc: any) => {
    try {
      if (!doc?.url) {
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

      const res = await fetch(doc.url)
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
                  <p className="text-sm text-white/40">{client.nom} • {documents.length} fichier{documents.length > 1 ? 's' : ''}</p>
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
                      whileHover={{ x: 4 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group"
                    >
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        {getFileIcon(doc.type)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-[#EAEAEA] truncate">
                          {doc.name}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {doc.uploadedBy}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(doc.uploadedAt)}
                          </span>
                          <span>•</span>
                          <span>{formatFileSize(doc.size)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDownload(doc)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-lg"
                      >
                        <Download className="w-4 h-4 text-white/60" />
                      </motion.button>
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
