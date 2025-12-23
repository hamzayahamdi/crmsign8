"use client";

import { useState, useEffect } from "react";
import { X, DollarSign, Calendar, FileText, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Client } from "@/types/client";
import { toast } from "@/hooks/use-toast";

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onAddPayment: (payment: PaymentData) => void;
}

export interface PaymentData {
  amount: number;
  date: string;
  method: string;
  reference?: string;
  notes?: string;
  paymentType?: "accompte" | "paiement"; // Explicit payment type from modal
}

export function AddPaymentModal({
  isOpen,
  onClose,
  client,
  onAddPayment,
}: AddPaymentModalProps) {
  const [formData, setFormData] = useState<PaymentData>({
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    method: "espece",
    reference: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        amount: 0,
        date: new Date().toISOString().split("T")[0],
        method: "espece",
        reference: "",
        notes: "",
      });
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.amount === undefined || formData.amount === null || formData.amount < 0 || isNaN(formData.amount)) {
      newErrors.amount = "Le montant doit être un nombre valide (0 ou plus)";
    }
    if (!formData.date) {
      newErrors.date = "La date du paiement est requise";
    }
    if (!formData.method) {
      newErrors.method = "Veuillez sélectionner une méthode de paiement";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!validateForm()) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez corriger les erreurs dans le formulaire",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Determine payment type based on modal title (what user sees)
      const isAcompteModal = !hasExistingAcompte();
      const paymentDataWithType = {
        ...formData,
        paymentType: isAcompteModal ? "accompte" : "paiement" as const,
      };
      
      // Handle both async and sync onAddPayment functions
      // The toast will be shown by the handler, not here
      const result = onAddPayment(paymentDataWithType);
      if (result instanceof Promise) {
        await result;
      }
      
      // Don't show toast here - the handler (handleAddPayment) will show it with correct message

      // Reset form
      setFormData({
        amount: 0,
        date: new Date().toISOString().split("T")[0],
        method: "espece",
        reference: "",
        notes: "",
      });
      setErrors({});
      onClose();
    } catch (error: any) {
      console.error("Error adding payment:", error);
      toast({
        title: "Erreur",
        description: error?.message || "Une erreur est survenue lors de l'enregistrement",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string, numbers, and decimal points
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      const numValue = value === "" ? 0 : parseFloat(value);
      setFormData({
        ...formData,
        amount: isNaN(numValue) ? 0 : numValue,
      });
      // Clear error when user starts typing
      if (errors.amount) {
        const newErrors = { ...errors };
        delete newErrors.amount;
        setErrors(newErrors);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Helper function to check if client already has an acompte
  const hasExistingAcompte = () => {
    const hasAcompteStatus =
      client.statutProjet === "acompte_recu" ||
      client.statutProjet === "acompte_verse" ||
      client.statutProjet === "conception" ||
      client.statutProjet === "devis_negociation" ||
      client.statutProjet === "accepte" ||
      client.statutProjet === "premier_depot" ||
      client.statutProjet === "projet_en_cours" ||
      client.statutProjet === "chantier" ||
      client.statutProjet === "facture_reglee";

    // Check specifically for acompte payments, not just any payment
    const hasAcomptePayment = client.payments && client.payments.some(
      (payment) => payment.type === "accompte" || payment.type === "Acompte"
    );
    
    return hasAcompteStatus || hasAcomptePayment;
  };

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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#171B22] rounded-2xl border border-white/10 shadow-2xl z-[70] p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#EAEAEA]">
                    {hasExistingAcompte()
                      ? "Ajouter nouveau paiement"
                      : "Ajouter un acompte"}
                  </h2>
                  <p className="text-sm text-white/40">{client.nom}</p>
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

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Amount */}
              <div>
                <Label className="text-sm font-medium text-white/70 mb-2 block">
                  {hasExistingAcompte()
                    ? "Montant du paiement *"
                    : "Montant de l'acompte *"}
                </Label>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={formData.amount >= 0 ? formData.amount.toString() : ""}
                    onChange={handleAmountChange}
                    placeholder="0"
                    required
                    className={cn(
                      "h-12 pl-4 pr-16 bg-white/5 border text-[#EAEAEA] text-lg font-semibold rounded-xl focus:ring-2 focus:ring-orange-500/20 transition-all",
                      errors.amount
                        ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
                        : "border-white/10 focus:border-orange-500/50"
                    )}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 font-medium">
                    MAD
                  </span>
                </div>
                {errors.amount && (
                  <p className="text-xs text-red-400 flex items-center gap-1 mt-1.5">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {errors.amount}
                  </p>
                )}
                {formData.amount >= 0 && !errors.amount && (
                  <p className="text-xs text-white/40 mt-1.5">
                    {formatCurrency(formData.amount)}
                  </p>
                )}
              </div>

              {/* Date */}
              <div>
                <Label className="text-sm font-medium text-white/70 mb-2 block">
                  Date du paiement *
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 z-10" />
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => {
                      setFormData({ ...formData, date: e.target.value });
                      if (errors.date) {
                        const newErrors = { ...errors };
                        delete newErrors.date;
                        setErrors(newErrors);
                      }
                    }}
                    required
                    className={cn(
                      "h-12 pl-11 bg-white/5 border text-[#EAEAEA] rounded-xl focus:ring-2 focus:ring-orange-500/20 transition-all",
                      errors.date
                        ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
                        : "border-white/10 focus:border-orange-500/50"
                    )}
                  />
                </div>
                {errors.date && (
                  <p className="text-xs text-red-400 flex items-center gap-1 mt-1.5">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {errors.date}
                  </p>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <Label className="text-sm font-medium text-white/70 mb-2 block">
                  Méthode de paiement *
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "espece", label: "Espèce" },
                    { value: "virement", label: "Virement" },
                    { value: "cheque", label: "Chèque" },
                  ].map((method) => (
                    <motion.button
                      key={method.value}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setFormData({ ...formData, method: method.value });
                        if (errors.method) {
                          const newErrors = { ...errors };
                          delete newErrors.method;
                          setErrors(newErrors);
                        }
                      }}
                      className={cn(
                        "h-11 rounded-xl font-medium text-sm transition-all border",
                        formData.method === method.value
                          ? "bg-orange-500/20 border-orange-500/50 text-orange-400"
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10",
                        errors.method && formData.method !== method.value
                          ? "border-red-500/30"
                          : ""
                      )}
                    >
                      {method.label}
                    </motion.button>
                  ))}
                </div>
                {errors.method && (
                  <p className="text-xs text-red-400 flex items-center gap-1 mt-1.5">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {errors.method}
                  </p>
                )}
              </div>

              {/* Reference (optional) */}
              <div>
                <Label className="text-sm font-medium text-white/70 mb-2 block">
                  Référence (optionnel)
                </Label>
                <Input
                  type="text"
                  value={formData.reference}
                  onChange={(e) =>
                    setFormData({ ...formData, reference: e.target.value })
                  }
                  placeholder="N° chèque, référence virement..."
                  className="h-11 bg-white/5 border-white/10 text-[#EAEAEA] rounded-xl focus:border-orange-500/50"
                />
              </div>

              {/* Notes (optional) */}
              <div>
                <Label className="text-sm font-medium text-white/70 mb-2 block">
                  Notes (optionnel)
                </Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Ajouter des notes sur ce paiement..."
                  className="min-h-[80px] bg-white/5 border-white/10 text-[#EAEAEA] rounded-xl focus:border-orange-500/50 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || formData.amount < 0 || isNaN(formData.amount)}
                  className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-medium shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full"
                      />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {hasExistingAcompte()
                        ? "Enregistrer le paiement"
                        : "Enregistrer l'acompte"}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setErrors({});
                    onClose();
                  }}
                  disabled={isSubmitting}
                  className="h-12 px-6 bg-white/5 hover:bg-white/10 text-[#EAEAEA] rounded-xl border border-white/10 disabled:opacity-50"
                >
                  Annuler
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
