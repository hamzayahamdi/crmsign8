/**
 * Payment Calculation Tests
 * 
 * Run this file to test the payment calculation logic
 */

import { calculatePaymentMetrics } from './lib/payment-calculations';
import type { Client } from './types/client';

// Test Case 1: Project with Budget
console.log('=== Test Case 1: Project with Budget ===');
const client1: Client = {
    id: 'test-1',
    nom: 'Test Client 1',
    telephone: '0600000000',
    ville: 'Casablanca',
    typeProjet: 'villa',
    architecteAssigne: 'Architect 1',
    statutProjet: 'projet_en_cours',
    derniereMaj: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    budget: 500000,
    payments: [
        {
            id: 'p1',
            amount: 150000,
            date: new Date().toISOString(),
            method: 'virement',
            createdBy: 'user1',
            createdAt: new Date().toISOString(),
        },
        {
            id: 'p2',
            amount: 100000,
            date: new Date().toISOString(),
            method: 'cheque',
            createdBy: 'user1',
            createdAt: new Date().toISOString(),
        }
    ],
    devis: []
};

const metrics1 = calculatePaymentMetrics(client1);
console.log('Budget:', metrics1.totalBudget, 'MAD');
console.log('Total Payments:', metrics1.totalPayments, 'MAD');
console.log('Payment Percentage:', metrics1.paymentPercentage, '%');
console.log('Remaining:', metrics1.remainingAmount, 'MAD');
console.log('Budget Source:', metrics1.budgetSource);
console.log('Expected: 50% (250,000 / 500,000)');
console.log('✅ PASS:', metrics1.paymentPercentage === 50);
console.log('');

// Test Case 2: Project without Budget (Using Devis)
console.log('=== Test Case 2: Project without Budget (Using Devis) ===');
const client2: Client = {
    id: 'test-2',
    nom: 'Test Client 2',
    telephone: '0600000001',
    ville: 'Rabat',
    typeProjet: 'appartement',
    architecteAssigne: 'Architect 2',
    statutProjet: 'devis_negociation',
    derniereMaj: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    budget: 0,
    payments: [
        {
            id: 'p3',
            amount: 200000,
            date: new Date().toISOString(),
            method: 'virement',
            createdBy: 'user1',
            createdAt: new Date().toISOString(),
        }
    ],
    devis: [
        {
            id: 'd1',
            title: 'Devis Architecture',
            montant: 300000,
            date: new Date().toISOString(),
            statut: 'accepte',
            facture_reglee: false,
            createdBy: 'user1',
            createdAt: new Date().toISOString(),
        },
        {
            id: 'd2',
            title: 'Devis Supplémentaire',
            montant: 100000,
            date: new Date().toISOString(),
            statut: 'en_attente',
            facture_reglee: false,
            createdBy: 'user1',
            createdAt: new Date().toISOString(),
        }
    ]
};

const metrics2 = calculatePaymentMetrics(client2);
console.log('Budget (from accepted devis):', metrics2.totalBudget, 'MAD');
console.log('Total Payments:', metrics2.totalPayments, 'MAD');
console.log('Payment Percentage:', metrics2.paymentPercentage, '%');
console.log('Remaining:', metrics2.remainingAmount, 'MAD');
console.log('Budget Source:', metrics2.budgetSource);
console.log('Expected: 67% (200,000 / 300,000)');
console.log('✅ PASS:', metrics2.paymentPercentage === 67);
console.log('');

// Test Case 3: No Budget, No Devis
console.log('=== Test Case 3: No Budget, No Devis ===');
const client3: Client = {
    id: 'test-3',
    nom: 'Test Client 3',
    telephone: '0600000002',
    ville: 'Marrakech',
    typeProjet: 'riad',
    architecteAssigne: 'Architect 3',
    statutProjet: 'qualifie',
    derniereMaj: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    budget: 0,
    payments: [],
    devis: []
};

const metrics3 = calculatePaymentMetrics(client3);
console.log('Budget:', metrics3.totalBudget, 'MAD');
console.log('Total Payments:', metrics3.totalPayments, 'MAD');
console.log('Payment Percentage:', metrics3.paymentPercentage, '%');
console.log('Budget Source:', metrics3.budgetSource);
console.log('Expected: 0% (no budget)');
console.log('✅ PASS:', metrics3.paymentPercentage === 0);
console.log('');

// Test Case 4: Fully Paid Project
console.log('=== Test Case 4: Fully Paid Project ===');
const client4: Client = {
    id: 'test-4',
    nom: 'Test Client 4',
    telephone: '0600000003',
    ville: 'Tanger',
    typeProjet: 'bureau',
    architecteAssigne: 'Architect 4',
    statutProjet: 'facture_reglee',
    derniereMaj: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    budget: 1000000,
    payments: [
        {
            id: 'p4',
            amount: 300000,
            date: new Date().toISOString(),
            method: 'virement',
            createdBy: 'user1',
            createdAt: new Date().toISOString(),
        },
        {
            id: 'p5',
            amount: 400000,
            date: new Date().toISOString(),
            method: 'cheque',
            createdBy: 'user1',
            createdAt: new Date().toISOString(),
        },
        {
            id: 'p6',
            amount: 300000,
            date: new Date().toISOString(),
            method: 'espece',
            createdBy: 'user1',
            createdAt: new Date().toISOString(),
        }
    ],
    devis: []
};

const metrics4 = calculatePaymentMetrics(client4);
console.log('Budget:', metrics4.totalBudget, 'MAD');
console.log('Total Payments:', metrics4.totalPayments, 'MAD');
console.log('Payment Percentage:', metrics4.paymentPercentage, '%');
console.log('Is Fully Paid:', metrics4.isFullyPaid);
console.log('Expected: 100% (1,000,000 / 1,000,000)');
console.log('✅ PASS:', metrics4.paymentPercentage === 100 && metrics4.isFullyPaid);
console.log('');

// Summary
console.log('=== Test Summary ===');
const allPassed =
    metrics1.paymentPercentage === 50 &&
    metrics2.paymentPercentage === 67 &&
    metrics3.paymentPercentage === 0 &&
    metrics4.paymentPercentage === 100;

console.log(allPassed ? '✅ All tests PASSED!' : '❌ Some tests FAILED');
