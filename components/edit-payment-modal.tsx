"use client";

import { useState, useEffect } from "react";
import { X, DollarSign, Calendar, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Client, Payment } from "@/types/client";
import { useAuth } from "@/contexts/auth-context";

interface EditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  payment: Payment | null;
  onUpdatePayment: (payment: Payment) => void;
}

export function EditPaymentModal({
  isOpen,
  onClose,
  client,
  payment,
  onUpdatePayment,
}: EditPaymentModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    method: "espece",
    reference: "",
    notes: "",
    type: "paiement",
  });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (payment) {
      setFormData({
        amount: payment.amount,
        date: new Date(payment.date).toISOString().split("T")[0],
        method: payment.method,
        reference: payment.reference || "",
        notes: payment.notes || "",
        type: payment.type || "paiement",
      });
    }
  }, [payment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0 || !payment) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/clients/${client.id}/payments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          paymentId: payment.id,
          montant: formData.amount,
          date: formData.date,
          methode: formData.method,
          reference: formData.reference || null,
          description: formData.notes || "",
          type: formData.type,
          updatedBy: user?.name || "Utilisateur",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update payment");
      }

      const result = await response.json();
      
      // Refresh client data
      const clientResponse = await fetch(`/api/clients/${client.id}`, {
        credentials: "include",
      });

      if (clientResponse.ok) {
        const clientResult = await clientResponse.json();
        onUpdatePayment(result.data);
        onClose();
      }
    } catch (error: any) {
      console.error("[Edit Payment] Error:", error);
      alert(error.message || "Failed to update payment");
    } finally {
      setIsUpdating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!payment) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#171B22] rounded-2xl border border-white/10 shadow-2xl z-[70] p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#EAEAEA]">
                    Modifier le paiement
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

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label className="text-sm font-medium text-white/70 mb-2 block">
                  Type *
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "accompte", label: "Acompte" },
                    { value: "paiement", label: "Paiement" },
                  ].map((type) => (
                    <motion.button
                      key={type.value}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() =>
                        setFormData({ ...formData, type: type.value })
                      }
                      className={cn(
                        "h-11 rounded-xl font-medium text-sm transition-all border",
                        formData.type === type.value
                          ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10",
                      )}
                    >
                      {type.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-white/70 mb-2 block">
                  Montant *
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.amount || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                    min="0"
                    step="100"
                    required
                    className="h-12 pl-4 pr-16 bg-white/5 border-white/10 text-[#EAEAEA] text-lg font-semibold rounded-xl focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 font-medium">
                    MAD
                  </span>
                </div>
                {formData.amount > 0 && (
                  <p className="text-xs text-white/40 mt-1.5">
                    {formatCurrency(formData.amount)}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-white/70 mb-2 block">
                  Date *
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    required
                    className="h-12 pl-11 bg-white/5 border-white/10 text-[#EAEAEA] rounded-xl focus:border-blue-500/50"
                  />
                </div>
              </div>

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
                      onClick={() =>
                        setFormData({ ...formData, method: method.value })
                      }
                      className={cn(
                        "h-11 rounded-xl font-medium text-sm transition-all border",
                        formData.method === method.value
                          ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10",
                      )}
                    >
                      {method.label}
                    </motion.button>
                  ))}
                </div>
              </div>

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
                  className="h-11 bg-white/5 border-white/10 text-[#EAEAEA] rounded-xl focus:border-blue-500/50"
                />
              </div>

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
                  className="min-h-[80px] bg-white/5 border-white/10 text-[#EAEAEA] rounded-xl focus:border-blue-500/50 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={formData.amount <= 0 || isUpdating}
                  className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {isUpdating ? "Mise à jour..." : "Enregistrer"}
                </Button>
                <Button
                  type="button"
                  onClick={onClose}
                  className="h-12 px-6 bg-white/5 hover:bg-white/10 text-[#EAEAEA] rounded-xl border border-white/10"
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

