"use client";

import { DollarSign, TrendingUp, Wallet, AlertCircle } from "lucide-react";
import type { Client } from "@/types/client";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
    calculatePaymentMetrics,
    formatCurrency,
    getPaymentProgressColor,
    getPaymentStatusDescription,
} from "@/lib/payment-calculations";

interface PaymentProgressCardProps {
    client: Client;
    className?: string;
}

export function PaymentProgressCard({
    client,
    className,
}: PaymentProgressCardProps) {
    const metrics = calculatePaymentMetrics(client);
    const colors = getPaymentProgressColor(metrics.paymentPercentage);
    const statusDescription = getPaymentStatusDescription(metrics);

    return (
        <div
            className={cn(
                "bg-[#171B22] rounded-xl border border-white/10 p-4 space-y-4",
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-semibold text-white/80">
                        Progression des Paiements
                    </h3>
                </div>
                <div
                    className={cn(
                        "px-3 py-1 rounded-lg text-xs font-semibold",
                        colors.bg,
                        colors.text,
                        colors.border,
                        "border"
                    )}
                >
                    {metrics.paymentPercentage}%
                </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
                <Progress
                    value={metrics.paymentPercentage}
                    className="h-3 bg-white/5"
                    indicatorClassName={cn(
                        "transition-all duration-500",
                        metrics.paymentPercentage >= 100
                            ? "bg-green-500"
                            : metrics.paymentPercentage >= 75
                                ? "bg-emerald-500"
                                : metrics.paymentPercentage >= 50
                                    ? "bg-blue-500"
                                    : metrics.paymentPercentage >= 25
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                    )}
                />
                <p className="text-xs text-white/50 text-center">
                    {statusDescription}
                </p>
            </div>

            {/* Budget Information */}
            {metrics.hasBudget && (
                <div className="grid grid-cols-2 gap-3">
                    {/* Total Budget */}
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <div className="flex items-center gap-1.5 mb-1">
                            <DollarSign className="w-3.5 h-3.5 text-white/40" />
                            <span className="text-xs text-white/40">
                                {metrics.budgetSource === "project_budget"
                                    ? "Budget Total"
                                    : "Devis Acceptés"}
                            </span>
                        </div>
                        <p className="text-sm font-bold text-white">
                            {formatCurrency(metrics.totalBudget)}
                        </p>
                    </div>

                    {/* Total Payments */}
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Wallet className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-xs text-white/40">Paiements Reçus</span>
                        </div>
                        <p className="text-sm font-bold text-green-400">
                            {formatCurrency(metrics.totalPayments)}
                        </p>
                    </div>

                    {/* Remaining Amount */}
                    {metrics.remainingAmount > 0 && (
                        <div className="bg-white/5 rounded-lg p-3 border border-white/10 col-span-2">
                            <div className="flex items-center gap-1.5 mb-1">
                                <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
                                <span className="text-xs text-white/40">Montant Restant</span>
                            </div>
                            <p className="text-sm font-bold text-orange-400">
                                {formatCurrency(metrics.remainingAmount)}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* No Budget Warning */}
            {!metrics.hasBudget && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-xs font-medium text-yellow-400 mb-1">
                            Budget non défini
                        </p>
                        <p className="text-xs text-yellow-300/70">
                            Définissez un budget projet ou acceptez un devis pour suivre la
                            progression des paiements.
                        </p>
                    </div>
                </div>
            )}

            {/* Devis Summary */}
            {metrics.hasAcceptedDevis && (
                <div className="pt-3 border-t border-white/10">
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                            <p className="text-xs text-white/40 mb-1">Devis Acceptés</p>
                            <p className="text-sm font-semibold text-white">
                                {metrics.acceptedDevisCount}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-white/40 mb-1">Devis Payés</p>
                            <p className="text-sm font-semibold text-green-400">
                                {metrics.paidDevisCount}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-white/40 mb-1">Paiements</p>
                            <p className="text-sm font-semibold text-blue-400">
                                {metrics.paymentsCount}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
