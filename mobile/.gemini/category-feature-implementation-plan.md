# Category Feature Implementation Plan

## Overview
Add a comprehensive category system to the spending tracker that allows:
1. Automatic category assignment to transactions
2. Manual recategorization by users
3. Category-based analytics and insights

## ✅ Implementation Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Foundation | ✅ Complete | `categories.ts` created, `transaction-service.ts` updated |
| Phase 2: UI Components | ✅ Complete | CategoryPicker and TransactionDetail bottom sheets created |
| Phase 3: Integration | ✅ Complete | Dashboard tap handler added, wallets.tsx updated |
| Phase 4: Settings | 🔲 Future | Manage custom categories |

---

## Phase 1: Foundation (Data Layer)

### 1.1 Create Category Definitions
**File:** `lib/categories.ts` (NEW)

```typescript
// Define Category interface
export interface Category {
  id: string;
  name: string;
  icon: string;        // HugeIcons icon name
  color: string;       // Hex color for visual distinction
  keywords: string[];  // For auto-categorization matching
}

// Predefined categories
export const CATEGORIES: Category[] = [
  { id: 'food', name: 'Food & Dining', icon: 'restaurant-01', color: '#F59E0B', keywords: ['restaurant', 'food', 'eat', 'lunch', 'dinner', 'breakfast', 'cafe', 'coffee'] },
  { id: 'transport', name: 'Transport', icon: 'car-01', color: '#3B82F6', keywords: ['uber', 'bolt', 'fuel', 'petrol', 'taxi', 'bus', 'transport'] },
  { id: 'shopping', name: 'Shopping', icon: 'shopping-bag-01', color: '#EC4899', keywords: ['shop', 'store', 'mall', 'purchase', 'buy'] },
  { id: 'bills', name: 'Bills & Utilities', icon: 'invoice-02', color: '#6366F1', keywords: ['electricity', 'water', 'ecg', 'gwcl', 'dstv', 'internet', 'subscription'] },
  { id: 'entertainment', name: 'Entertainment', icon: 'game-controller-03', color: '#8B5CF6', keywords: ['movie', 'cinema', 'netflix', 'spotify', 'game'] },
  { id: 'healthcare', name: 'Healthcare', icon: 'first-aid-kit', color: '#10B981', keywords: ['hospital', 'pharmacy', 'clinic', 'doctor', 'medicine', 'health'] },
  { id: 'education', name: 'Education', icon: 'book-02', color: '#06B6D4', keywords: ['school', 'tuition', 'course', 'book', 'training'] },
  { id: 'transfer', name: 'Transfer', icon: 'arrow-data-transfer-horizontal', color: '#64748B', keywords: ['transfer', 'sent to', 'received from'] },
  { id: 'income', name: 'Income', icon: 'money-receive-01', color: '#22C55E', keywords: ['salary', 'payment received', 'credit'] },
  { id: 'other', name: 'Other', icon: 'more-horizontal-circle-01', color: '#94A3B8', keywords: [] },
];

// Helper functions
export function getCategoryById(id: string): Category | undefined;
export function getCategoryByName(name: string): Category | undefined;
export function suggestCategory(description: string): Category;
```

**Deliverables:**
- [ ] Category interface definition
- [ ] 10 predefined categories with icons, colors, keywords
- [ ] `getCategoryById()` helper
- [ ] `getCategoryByName()` helper
- [ ] `suggestCategory()` auto-categorization function

---

### 1.2 Update Transaction Service
**File:** `lib/transaction-service.ts` (MODIFY)

**Add:**
```typescript
// Update a transaction's category
export async function updateTransactionCategory(
  transactionId: string, 
  categoryId: string
): Promise<boolean>;

// Get category spending for a date range (enhanced)
export async function getCategorySpendingByRange(
  startDate: Date,
  endDate: Date
): Promise<CategorySpending[]>;
```

**Deliverables:**
- [ ] `updateTransactionCategory()` function
- [ ] Enhanced category analytics with date filtering
- [ ] Import and use `CATEGORIES` from categories.ts

---

### 1.3 Update Supabase Types (Optional Enhancement)
**File:** `lib/supabase.ts` (MODIFY - if needed)

Consider whether `category` should remain a free-form string or be constrained to category IDs:
- **Current:** `category?: string` (free-form)
- **Recommendation:** Keep as string for flexibility, but use category IDs consistently

---

## Phase 2: UI Components

### 2.1 Category Picker Bottom Sheet
**File:** `components/category-picker-bottom-sheet.tsx` (NEW)

**Features:**
- Grid layout of category options (2 columns)
- Each option shows: Icon + Name + Color indicator
- Current selection highlighted
- Smooth animations (GorhomBottomSheet)
- Search/filter capability (optional, Phase 2+)

**Props:**
```typescript
interface Props {
  isVisible: boolean;
  currentCategory?: string;
  onClose: () => void;
  onSelect: (categoryId: string) => void;
}
```

**Design Notes:**
- Use existing bottom sheet pattern from `configure-wallet-bottom-sheet.tsx`
- Match app color scheme (#1642E5 primary)
- Use HugeIcons for category icons
- Rounded corners, shadows consistent with app design

**Deliverables:**
- [ ] Bottom sheet with category grid
- [ ] Visual highlight for selected category
- [ ] Smooth open/close animations
- [ ] Consistent styling with app design system

---

### 2.2 Transaction Detail Bottom Sheet (or Screen)
**File:** `components/transaction-detail-bottom-sheet.tsx` (NEW)

**Features:**
- Display transaction details:
  - Amount (large, prominent)
  - Description
  - Date and time
  - Wallet source
  - Current category (tappable to edit)
- "Edit Category" button/area
- Close button

**Design Layout:**
```
┌─────────────────────────────────────┐
│  ─────  (drag handle)               │
│                                     │
│  [Icon]  GHS 150.00                │
│          ─ (expense) or + (income) │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Description                        │
│  MTN Mobile Money...                │
│                                     │
│  Date                               │
│  Jan 28, 2026 • 4:30 PM            │
│                                     │
│  Wallet                             │
│  Mobile Money                       │
│                                     │
│  Category                     [>]   │
│  🍔 Food & Dining            Edit   │
│                                     │
└─────────────────────────────────────┘
```

**Deliverables:**
- [ ] Transaction detail display
- [ ] Tappable category row that opens CategoryPicker
- [ ] Integration with category update function
- [ ] Success feedback on category change

---

## Phase 3: Integration

### 3.1 Dashboard Transaction List
**File:** `app/(tabs)/index.tsx` (MODIFY)

**Changes:**
- Add `onPress` handler to each transaction item
- Open TransactionDetailBottomSheet on tap
- Pass selected transaction data
- Refresh list after category update

**Code Location:** Lines 406-432 (transaction list mapping)

**Deliverables:**
- [ ] Tap handler on transaction items
- [ ] State for selected transaction
- [ ] TransactionDetailBottomSheet integration
- [ ] Refresh after category update

---

### 3.2 Wallet Analytics View
**File:** `app/(tabs)/wallets.tsx` (MODIFY)

**Changes:**
- Update `getCategoryIcon()` to use centralized categories.ts
- Ensure category colors come from CATEGORIES constant
- Add tap on category items to filter transactions (future)

**Deliverables:**
- [ ] Use centralized category definitions
- [ ] Consistent icons and colors

---

### 3.3 Auto-Categorization on Transaction Creation
**File:** `lib/transaction-service.ts` or SMS processing (if exists)

**Where auto-categorization should trigger:**
- When transactions are created from SMS parsing
- When transactions are manually added
- Default to "Other" if no match

**Deliverables:**
- [ ] Call `suggestCategory()` when creating transactions
- [ ] Store suggested category ID in transaction

---

## Phase 4: Settings & Customization (Future)

### 4.1 Manage Categories in Settings
**File:** `app/(tabs)/settings.tsx` (MODIFY)

**Add section for:**
- View all categories
- Edit category names (optional)
- Create custom categories (optional)
- Delete custom categories (optional)

---

## Implementation Order

| Step | Task | Est. Time | Dependencies |
|------|------|-----------|--------------|
| 1 | Create `lib/categories.ts` | 30 min | None |
| 2 | Add `updateTransactionCategory()` to transaction-service.ts | 20 min | Step 1 |
| 3 | Create `CategoryPickerBottomSheet` | 1 hr | Step 1, existing bottom sheet patterns |
| 4 | Create `TransactionDetailBottomSheet` | 1.5 hr | Step 3 |
| 5 | Integrate tap handler in Dashboard | 30 min | Step 4 |
| 6 | Update wallets.tsx to use centralized categories | 20 min | Step 1 |
| 7 | Add auto-categorization to transaction creation | 30 min | Step 1 |
| 8 | Testing & Polish | 1 hr | All above |

**Total Estimated Time: ~5-6 hours**

---

## Files Summary

| File | Action | Priority |
|------|--------|----------|
| `lib/categories.ts` | CREATE | 🔴 High |
| `lib/transaction-service.ts` | MODIFY | 🔴 High |
| `components/category-picker-bottom-sheet.tsx` | CREATE | 🔴 High |
| `components/transaction-detail-bottom-sheet.tsx` | CREATE | 🔴 High |
| `app/(tabs)/index.tsx` | MODIFY | 🟡 Medium |
| `app/(tabs)/wallets.tsx` | MODIFY | 🟡 Medium |
| `app/(tabs)/settings.tsx` | MODIFY | 🟢 Low (Future) |

---

## Testing Checklist

### Functional Tests
- [ ] Category picker opens and closes smoothly
- [ ] Selecting a category updates the transaction in DB
- [ ] Transaction list refreshes after category change
- [ ] Analytics reflect updated categories
- [ ] Auto-categorization works for new transactions

### UI/UX Tests
- [ ] Category icons display correctly
- [ ] Colors are consistent across app
- [ ] Bottom sheets match existing app patterns
- [ ] Animations are smooth
- [ ] Dark mode compatibility (if applicable)

### Edge Cases
- [ ] Transaction with no category shows "Uncategorized" or "Other"
- [ ] Category update works offline (or shows appropriate error)
- [ ] Very long descriptions don't break auto-categorization

---

## Notes

1. **Icon Mapping:** Verify HugeIcons package has all required icons. Use fallbacks if needed.
2. **Database:** No schema changes required - `category` field already exists as string.
3. **Backwards Compatibility:** Existing transactions with text categories should still work; analytics already handle arbitrary category strings.
4. **Performance:** Category lookup should be O(1) using ID-based lookups.

---

*Created: 2026-01-28*
*Last Updated: 2026-01-28*
