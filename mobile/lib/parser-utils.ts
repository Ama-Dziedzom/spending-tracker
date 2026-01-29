/**
 * Utility functions for parsing transaction SMS messages
 */

export interface ParsedTransactionInfo {
    isTransferLikely: boolean;
    suggestedSourceType: 'momo' | 'bank' | 'cash' | 'other' | null;
    suggestedDestType: 'momo' | 'bank' | 'cash' | 'other' | null;
    balanceSnapshot: number | null;
}

const SMS_PATTERNS = {
    // Patterns for Bank Inflows from MoMo (StanChart example)
    bankFromMomo: /instant pay: (\d+)|from \d+/i,
    // Patterns for MoMo Inflows from Bank (Emergent example)
    momoFromBank: /payment received.*from (emergent|bank|transfer)/i,
    // Patterns for MTN to Bank
    mtnToBank: /transfer.*to (bank|acc|account)/i,
    // Balance extraction patterns
    momoBalance: /current balance: ghs\s*([0-9,.]+)/i,
    bankBalance: /available balance is now ghs\s*([0-9,.]+)/i,
    genericBalance: /balance:?\s*ghs\s*([0-9,.]+)/i,
};

/**
 * Detects if a transaction description indicates a transfer
 * and attempts to identify source/destination types.
 */
export function parseSmsDescription(description: string): ParsedTransactionInfo {
    const desc = description.toLowerCase();

    let isTransferLikely = SMS_PATTERNS.bankFromMomo.test(desc) ||
        SMS_PATTERNS.momoFromBank.test(desc) ||
        SMS_PATTERNS.mtnToBank.test(desc) ||
        desc.includes('transfer to') ||
        desc.includes('transferred to') ||
        desc.includes('payment to');

    let suggestedSourceType: 'momo' | 'bank' | 'cash' | 'other' | null = null;
    let suggestedDestType: 'momo' | 'bank' | 'cash' | 'other' | null = null;
    let balanceSnapshot: number | null = null;

    if (SMS_PATTERNS.bankFromMomo.test(desc)) {
        suggestedSourceType = 'momo';
        suggestedDestType = 'bank';
    } else if (SMS_PATTERNS.momoFromBank.test(desc)) {
        suggestedSourceType = 'bank';
        suggestedDestType = 'momo';
    } else if (SMS_PATTERNS.mtnToBank.test(desc)) {
        suggestedSourceType = 'momo';
        suggestedDestType = 'bank';
    }

    // Extract balance if present
    const momoMatch = description.match(SMS_PATTERNS.momoBalance);
    const bankMatch = description.match(SMS_PATTERNS.bankBalance);
    const genericMatch = description.match(SMS_PATTERNS.genericBalance);
    const balanceStr = (momoMatch || bankMatch || genericMatch)?.[1];

    if (balanceStr) {
        balanceSnapshot = parseFloat(balanceStr.replace(/,/g, ''));
    }

    return {
        isTransferLikely,
        suggestedSourceType,
        suggestedDestType,
        balanceSnapshot
    };
}
