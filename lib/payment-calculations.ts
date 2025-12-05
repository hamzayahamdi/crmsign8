/**
 * Payment Calculation Utilities
 * 
 * This module provides utilities for calculating payment progress and percentages
 * based on project budget, devis (quotes), and payments.
 */

import type { Client, Devis } from "@/types/client";

export interface PaymentMetrics {
    // Budget Information
    totalBudget: number;
    budgetSource: 'project_budget' | 'accepted_devis' | 'none';

    // Devis Information
    totalDevis: number;
    acceptedDevisAmount: number;
    acceptedDevisCount: number;
    paidDevisAmount: number;
    paidDevisCount: number;

    // Payment Information
    totalPayments: number;
    paymentsCount: number;

    // Progress Calculations
    paymentPercentage: number;
    devisPaymentPercentage: number;
    remainingAmount: number;

    // Status Flags
    hasAcceptedDevis: boolean;
    hasBudget: boolean;
    hasPayments: boolean;
    isFullyPaid: boolean;
}

/**
 * Calculate comprehensive payment metrics for a client
 */
export function calculatePaymentMetrics(client: Client): PaymentMetrics {
    const devisList = client.devis || [];
    const paymentsList = client.payments || [];

    // Calculate Devis Metrics
    const acceptedDevis = devisList.filter((d) => d.statut === "accepte");
    const acceptedDevisAmount = acceptedDevis.reduce((sum, d) => sum + d.montant, 0);
    const paidDevis = acceptedDevis.filter((d) => d.facture_reglee);
    const paidDevisAmount = paidDevis.reduce((sum, d) => sum + d.montant, 0);

    // Calculate Payment Metrics
    const totalPayments = paymentsList.reduce((sum, p) => sum + p.amount, 0);

    // Determine Budget Source
    const projectBudget = client.budget || 0;
    let totalBudget: number;
    let budgetSource: PaymentMetrics['budgetSource'];

    if (projectBudget > 0) {
        totalBudget = projectBudget;
        budgetSource = 'project_budget';
    } else if (acceptedDevisAmount > 0) {
        totalBudget = acceptedDevisAmount;
        budgetSource = 'accepted_devis';
    } else {
        totalBudget = 0;
        budgetSource = 'none';
    }

    // Calculate Progress Percentages
    // Main percentage: based on total payments vs budget
    const paymentPercentage = totalBudget > 0
        ? Math.min(Math.round((totalPayments / totalBudget) * 100), 100)
        : 0;

    // Alternative percentage: based on paid devis vs accepted devis
    const devisPaymentPercentage = acceptedDevisAmount > 0
        ? Math.min(Math.round((paidDevisAmount / acceptedDevisAmount) * 100), 100)
        : 0;

    // Calculate Remaining Amount
    const remainingAmount = Math.max(totalBudget - totalPayments, 0);

    // Status Flags
    const hasAcceptedDevis = acceptedDevis.length > 0;
    const hasBudget = totalBudget > 0;
    const hasPayments = paymentsList.length > 0;
    const isFullyPaid = totalBudget > 0 && totalPayments >= totalBudget;

    return {
        // Budget Information
        totalBudget,
        budgetSource,

        // Devis Information
        totalDevis: devisList.length,
        acceptedDevisAmount,
        acceptedDevisCount: acceptedDevis.length,
        paidDevisAmount,
        paidDevisCount: paidDevis.length,

        // Payment Information
        totalPayments,
        paymentsCount: paymentsList.length,

        // Progress Calculations
        paymentPercentage,
        devisPaymentPercentage,
        remainingAmount,

        // Status Flags
        hasAcceptedDevis,
        hasBudget,
        hasPayments,
        isFullyPaid,
    };
}

/**
 * Get a human-readable description of the payment status
 */
export function getPaymentStatusDescription(metrics: PaymentMetrics): string {
    if (metrics.isFullyPaid) {
        return "Projet entièrement payé";
    }

    if (!metrics.hasBudget) {
        return "Budget non défini";
    }

    if (!metrics.hasPayments) {
        return "Aucun paiement reçu";
    }

    if (metrics.paymentPercentage < 25) {
        return "Paiement initial";
    }

    if (metrics.paymentPercentage < 50) {
        return "Paiement en cours";
    }

    if (metrics.paymentPercentage < 75) {
        return "Plus de la moitié payée";
    }

    if (metrics.paymentPercentage < 100) {
        return "Presque terminé";
    }

    return "En cours";
}

/**
 * Get color class based on payment percentage
 */
export function getPaymentProgressColor(percentage: number): {
    bg: string;
    text: string;
    border: string;
} {
    if (percentage >= 100) {
        return {
            bg: 'bg-green-500/20',
            text: 'text-green-400',
            border: 'border-green-500/30',
        };
    }

    if (percentage >= 75) {
        return {
            bg: 'bg-emerald-500/20',
            text: 'text-emerald-400',
            border: 'border-emerald-500/30',
        };
    }

    if (percentage >= 50) {
        return {
            bg: 'bg-blue-500/20',
            text: 'text-blue-400',
            border: 'border-blue-500/30',
        };
    }

    if (percentage >= 25) {
        return {
            bg: 'bg-yellow-500/20',
            text: 'text-yellow-400',
            border: 'border-yellow-500/30',
        };
    }

    return {
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        border: 'border-red-500/30',
    };
}

/**
 * Format currency in MAD
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("fr-MA", {
        style: "currency",
        currency: "MAD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}
