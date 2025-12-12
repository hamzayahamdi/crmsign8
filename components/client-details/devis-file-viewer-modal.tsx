"use client"

import { useState, useEffect } from "react"
import { X, Download, FileText, Image, File, Loader2, ExternalLink, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface DevisFileViewerModalProps {
  isOpen: boolean
  onClose: () => void
  fileUrl: string | null
  fileName: string
  devisTitle: string
}

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'pdf':
      return <FileText className="w-6 h-6 text-red-400" />
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return <Image className="w-6 h-6 text-blue-400" />
    case 'doc':
    case 'docx':
      return <FileText className="w-6 h-6 text-blue-500" />
    case 'xls':
    case 'xlsx':
      return <FileText className="w-6 h-6 text-green-500" />
    default:
      return <File className="w-6 h-6 text-white/40" />
  }
}

const isImageFile = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')
}

const isPdfFile = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  return ext === 'pdf'
}

export function DevisFileViewerModal({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  devisTitle,
}: DevisFileViewerModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fileData, setFileData] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !fileUrl) {
      setFileData(null)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // If it's an image or PDF, we can display it directly
    if (isImageFile(fileName) || isPdfFile(fileName)) {
      // For signed URLs or direct URLs, use them as-is
      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        setFileData(fileUrl)
        setLoading(false)
      } else {
        // If it's a path, we need to get a signed URL
        fetch(`/api/storage/signed-url?path=${encodeURIComponent(fileUrl)}`)
          .then(res => res.json())
          .then(data => {
            if (data.url) {
              setFileData(data.url)
            } else {
              setError('Impossible de charger le fichier')
            }
            setLoading(false)
          })
          .catch(err => {
            console.error('[Devis Viewer] Error fetching signed URL:', err)
            setError('Erreur lors du chargement du fichier')
            setLoading(false)
          })
      }
    } else {
      // For other file types, just show download option
      setLoading(false)
    }
  }, [isOpen, fileUrl, fileName])

  const handleDownload = async () => {
    if (!fileUrl) {
      toast({
        title: "Téléchargement indisponible",
        description: "Aucun fichier disponible",
        variant: "destructive",
      })
      return
    }

    try {
      let downloadUrl = fileUrl

      // If it's a path, get signed URL
      if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
        const res = await fetch(`/api/storage/signed-url?path=${encodeURIComponent(fileUrl)}`)
        const data = await res.json()
        if (data.url) {
          downloadUrl = data.url
        } else {
          throw new Error('Impossible d\'obtenir l\'URL de téléchargement')
        }
      }

      const response = await fetch(downloadUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      toast({
        title: "Téléchargement terminé",
        description: fileName,
      })
    } catch (err: any) {
      console.error('[Devis Viewer] Download error:', err)
      toast({
        title: "Erreur de téléchargement",
        description: err?.message || "Impossible de télécharger le fichier",
        variant: "destructive",
      })
    }
  }

  const handleOpenInNewTab = () => {
    if (fileData) {
      window.open(fileData, '_blank')
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl max-h-[90vh] bg-[#171B22] rounded-2xl border border-white/10 shadow-2xl z-[100] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {getFileIcon(fileName)}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-white truncate">{devisTitle}</h2>
                  <p className="text-sm text-white/50 truncate">{fileName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {fileData && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleOpenInNewTab}
                      className="text-white/60 hover:text-white hover:bg-white/5"
                      title="Ouvrir dans un nouvel onglet"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDownload}
                      className="text-white/60 hover:text-white hover:bg-white/5"
                      title="Télécharger"
                    >
                      <Download className="w-5 h-5" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white/60 hover:text-white hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-6">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-4" />
                    <p className="text-white/60">Chargement du fichier...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
                    <p className="text-white/60 mb-4">{error}</p>
                    <Button onClick={handleDownload} variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger le fichier
                    </Button>
                  </div>
                </div>
              ) : fileData ? (
                <div className="h-full overflow-auto">
                  {isImageFile(fileName) ? (
                    <div className="flex items-center justify-center h-full">
                      <img
                        src={fileData}
                        alt={fileName}
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onError={() => setError('Impossible d\'afficher l\'image')}
                      />
                    </div>
                  ) : isPdfFile(fileName) ? (
                    <div className="h-full w-full">
                      <iframe
                        src={fileData}
                        className="w-full h-full min-h-[600px] rounded-lg border border-white/10"
                        title={fileName}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <File className="w-16 h-16 text-white/40 mx-auto mb-4" />
                        <p className="text-white/60 mb-4">
                          Aperçu non disponible pour ce type de fichier
                        </p>
                        <Button onClick={handleDownload} className="bg-amber-500 hover:bg-amber-600">
                          <Download className="w-4 h-4 mr-2" />
                          Télécharger le fichier
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <File className="w-16 h-16 text-white/40 mx-auto mb-4" />
                    <p className="text-white/60 mb-4">Aucun fichier disponible</p>
                    <Button onClick={onClose} variant="outline">
                      Fermer
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

