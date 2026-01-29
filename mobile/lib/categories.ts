/**
 * Category definitions and utilities for transaction categorization
 */

// HugeIcons imports for type safety
import {
    Restaurant01Icon,
    Car01Icon,
    ShoppingBag01Icon,
    Invoice02Icon,
    GameController02Icon,
    FirstAidKitIcon,
    Book02Icon,
    ArrowDataTransferHorizontalIcon,
    MoneyReceive01Icon,
    MoreHorizontalCircle01Icon,
    Home01Icon,
    Airplane01Icon,
    GiftIcon,
    Dumbbell01Icon,
} from '@hugeicons/core-free-icons';

export interface Category {
    id: string;
    name: string;
    icon: any;           // HugeIcons icon component
    color: string;       // Hex color for visual distinction
    keywords: string[];  // For auto-categorization matching
}

// Predefined categories with icons, colors, and keywords for auto-matching
export const CATEGORIES: Category[] = [
    {
        id: 'food',
        name: 'Food & Dining',
        icon: Restaurant01Icon,
        color: '#F59E0B',
        keywords: ['restaurant', 'food', 'eat', 'lunch', 'dinner', 'breakfast', 'cafe', 'coffee', 'kfc', 'pizza', 'chicken', 'meal', 'hungry']
    },
    {
        id: 'transport',
        name: 'Transport',
        icon: Car01Icon,
        color: '#3B82F6',
        keywords: ['uber', 'bolt', 'fuel', 'petrol', 'taxi', 'bus', 'transport', 'ride', 'fare', 'goil', 'shell', 'total', 'filling']
    },
    {
        id: 'shopping',
        name: 'Shopping',
        icon: ShoppingBag01Icon,
        color: '#EC4899',
        keywords: ['shop', 'store', 'mall', 'purchase', 'buy', 'melcom', 'game', 'palace', 'market', 'retail']
    },
    {
        id: 'bills',
        name: 'Bills & Utilities',
        icon: Invoice02Icon,
        color: '#6366F1',
        keywords: ['electricity', 'water', 'ecg', 'gwcl', 'dstv', 'internet', 'subscription', 'bill', 'utility', 'prepaid', 'postpaid', 'airtime', 'bundle']
    },
    {
        id: 'entertainment',
        name: 'Entertainment',
        icon: GameController02Icon,
        color: '#8B5CF6',
        keywords: ['movie', 'cinema', 'netflix', 'spotify', 'game', 'concert', 'show', 'silverbird', 'fun']
    },
    {
        id: 'healthcare',
        name: 'Healthcare',
        icon: FirstAidKitIcon,
        color: '#10B981',
        keywords: ['hospital', 'pharmacy', 'clinic', 'doctor', 'medicine', 'health', 'medical', 'drug', 'chemist', 'lab']
    },
    {
        id: 'education',
        name: 'Education',
        icon: Book02Icon,
        color: '#06B6D4',
        keywords: ['school', 'tuition', 'course', 'book', 'training', 'university', 'college', 'fees', 'learning', 'class']
    },
    {
        id: 'housing',
        name: 'Housing',
        icon: Home01Icon,
        color: '#78716C',
        keywords: ['rent', 'apartment', 'house', 'accommodation', 'landlord', 'lease', 'deposit']
    },
    {
        id: 'travel',
        name: 'Travel',
        icon: Airplane01Icon,
        color: '#0EA5E9',
        keywords: ['flight', 'hotel', 'vacation', 'trip', 'booking', 'airport', 'airline', 'travel']
    },
    {
        id: 'fitness',
        name: 'Fitness',
        icon: Dumbbell01Icon,
        color: '#DC2626',
        keywords: ['gym', 'fitness', 'workout', 'exercise', 'sport', 'membership']
    },
    {
        id: 'gifts',
        name: 'Gifts & Donations',
        icon: GiftIcon,
        color: '#DB2777',
        keywords: ['gift', 'donate', 'charity', 'tithe', 'offering', 'contribution', 'present']
    },
    {
        id: 'transfer',
        name: 'Transfer',
        icon: ArrowDataTransferHorizontalIcon,
        color: '#64748B',
        keywords: ['transfer', 'sent to', 'received from', 'send money', 'instant pay']
    },
    {
        id: 'income',
        name: 'Income',
        icon: MoneyReceive01Icon,
        color: '#22C55E',
        keywords: ['salary', 'payment received', 'credit', 'deposit', 'wage', 'bonus', 'refund']
    },
    {
        id: 'subscription',
        name: 'Subscription',
        icon: Invoice02Icon,
        color: '#6366F1',
        keywords: ['subscription', 'renew', 'recurring', 'payment', 'bill', 'utility', 'prepaid', 'postpaid', 'airtime', 'bundle']
    },
    {
        id: 'other',
        name: 'Other',
        icon: MoreHorizontalCircle01Icon,
        color: '#94A3B8',
        keywords: []
    },  
];

// O(1) Lookups
const CATEGORY_MAP = new Map(CATEGORIES.map(cat => [cat.id, cat]));
const CATEGORY_NAME_MAP = new Map(CATEGORIES.map(cat => [cat.name.toLowerCase(), cat]));

/**
 * Get a category by its ID
 */
export function getCategoryById(id: string): Category | undefined {
    return CATEGORY_MAP.get(id);
}

/**
 * Get a category by its display name
 */
export function getCategoryByName(name: string): Category | undefined {
    return CATEGORY_NAME_MAP.get(name.toLowerCase());
}

/**
 * Get the default "Other" category
 */
export function getDefaultCategory(): Category {
    return CATEGORY_MAP.get('other')!;
}

/**
 * Get a category by its ID or display name (case-insensitive)
 */
export function getCategoryByIdOrName(idOrName?: string): Category | undefined {
    if (!idOrName) return undefined;
    return getCategoryById(idOrName) || getCategoryByName(idOrName);
}

/**
 * Suggest a category based on transaction description using keyword matching
 * Returns the best matching category or "Other" if no match found
 */
export function suggestCategory(description: string, transactionType?: string): Category {
    const desc = description.toLowerCase();

    // If it's an income transaction, suggest the income category
    if (transactionType === 'income' || transactionType === 'credit') {
        const transferCategory = CATEGORY_MAP.get('transfer');
        if (transferCategory && transferCategory.keywords.some(kw => desc.includes(kw))) {
            return transferCategory;
        }
        return CATEGORY_MAP.get('income') || getDefaultCategory();
    }

    // Check for transfer patterns
    const transferKeywords = ['transfer', 'sent to', 'send to', 'instant pay', 'received from'];
    const describesTransfer = transferKeywords.some(kw => desc.includes(kw));

    // Score each category based on keyword matches
    let bestMatch: Category | null = null;
    let bestScore = 0;

    for (const category of CATEGORIES) {
        if (category.id === 'other' || category.id === 'income' || category.id === 'transfer') continue;

        let score = 0;
        for (const keyword of category.keywords) {
            if (desc.includes(keyword.toLowerCase())) {
                score += keyword.length;
            }
        }

        if (score > bestScore) {
            bestScore = score;
            bestMatch = category;
        }
    }

    // If we have a good spending/utility match, use it even if it's a transfer
    if (bestMatch && bestScore > 0) {
        return bestMatch;
    }

    // If no specific match but it's a transfer, return "Transfer"
    if (describesTransfer) {
        return CATEGORY_MAP.get('transfer') || getDefaultCategory();
    }

    return bestMatch || getDefaultCategory();
}

/**
 * Get all expense categories (excludes income and transfer)
 */
export function getExpenseCategories(): Category[] {
    return CATEGORIES.filter(cat => cat.id !== 'income');
}

/**
 * Get all categories suitable for manual selection
 */
export function getSelectableCategories(): Category[] {
    return CATEGORIES;
}

/**
 * Get category color by ID or name
 */
export function getCategoryColor(categoryIdOrName: string): string {
    const category = getCategoryByIdOrName(categoryIdOrName);
    return category?.color || '#94A3B8';
}

/**
 * Get category icon by ID or name
 */
export function getCategoryIcon(categoryIdOrName: string): any {
    const category = getCategoryByIdOrName(categoryIdOrName);
    return category?.icon || MoreHorizontalCircle01Icon;
}

