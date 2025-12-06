"use client"

import React from 'react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2, AlertTriangle } from 'lucide-react'

interface DeleteContactDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    contactName: string
    onConfirm: () => void
    isDeleting?: boolean
}

export function DeleteContactDialog({
    open,
    onOpenChange,
    contactName,
    onConfirm,
    isDeleting = false,
}: DeleteContactDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="glass border-slate-600/30">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-red-400" />
                        </div>
                        <AlertDialogTitle className="text-xl font-bold text-white">
                            Supprimer le contact
                        </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-slate-300 text-base leading-relaxed">
                        Êtes-vous sûr de vouloir supprimer le contact{' '}
                        <span className="font-semibold text-white">"{contactName}"</span> ?
                        <br />
                        <br />
                        <span className="text-red-400 font-medium">
                            Cette action est irréversible.
                        </span>{' '}
                        Toutes les données associées (opportunités, tâches, rendez-vous, documents, etc.) seront également supprimées.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:gap-2">
                    <AlertDialogCancel
                        disabled={isDeleting}
                        className="bg-slate-700/50 hover:bg-slate-700 text-white border-slate-600/30"
                    >
                        Annuler
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault()
                            onConfirm()
                        }}
                        disabled={isDeleting}
                        className="bg-red-500 hover:bg-red-600 text-white border-0"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Suppression...
                            </>
                        ) : (
                            'Supprimer définitivement'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
