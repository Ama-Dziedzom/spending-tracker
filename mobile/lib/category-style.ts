import type { CategoryColor } from '@/constants/theme';
import type { IconName } from '@/components/ui/icon';
import { getCategoryByIdOrName } from './categories';

export interface CategoryStyle {
    /** cat/* token, or 'muted' for categories the design has no colour for. */
    tone: CategoryColor | 'muted';
    icon: IconName;
    /** Short label used in v1 lists ("Food", not "Food & Dining"). */
    label: string;
}

/**
 * App category id → v1 visual style. The design (handoff §3) has ten category
 * colours; app categories without one render neutral rather than borrowing a
 * colour that means something else.
 */
const STYLES: Record<string, CategoryStyle> = {
    food: { tone: 'food', icon: 'food', label: 'Food' },
    transport: { tone: 'transport', icon: 'transport', label: 'Transport' },
    shopping: { tone: 'shopping', icon: 'shopping', label: 'Shopping' },
    bills: { tone: 'bills', icon: 'bills', label: 'Bills' },
    airtime: { tone: 'airtime', icon: 'airtime', label: 'Airtime & data' },
    subscription: { tone: 'subscription', icon: 'subscription', label: 'Subscriptions' },
    cash: { tone: 'cash', icon: 'cash', label: 'Cash' },
    loans: { tone: 'loans', icon: 'loans', label: 'Loans' },
    fees: { tone: 'fees', icon: 'fees', label: 'Fees' },
    // Money sent to a person is "People" in the design.
    transfer: { tone: 'people', icon: 'people', label: 'People' },
    income: { tone: 'muted', icon: 'receive', label: 'Income' },
    entertainment: { tone: 'muted', icon: 'sparkle', label: 'Entertainment' },
    healthcare: { tone: 'muted', icon: 'shield', label: 'Health' },
    education: { tone: 'muted', icon: 'idea', label: 'Education' },
    housing: { tone: 'muted', icon: 'home', label: 'Housing' },
    travel: { tone: 'muted', icon: 'send', label: 'Travel' },
    fitness: { tone: 'muted', icon: 'flash', label: 'Fitness' },
    gifts: { tone: 'muted', icon: 'receive', label: 'Gifts' },
    other: { tone: 'muted', icon: 'more', label: 'Other' },
};

const FALLBACK: CategoryStyle = { tone: 'muted', icon: 'more', label: 'Other' };

export function categoryStyle(idOrName?: string | null): CategoryStyle {
    if (!idOrName) return FALLBACK;
    const id = getCategoryByIdOrName(idOrName)?.id ?? idOrName;
    return STYLES[id] ?? FALLBACK;
}
