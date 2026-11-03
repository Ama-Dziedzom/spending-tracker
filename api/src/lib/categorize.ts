/**
 * Transaction categorization.
 *
 * Returns the app's category IDs (mobile/lib/categories.ts): food, transport,
 * shopping, bills, entertainment, healthcare, education, housing, travel,
 * fitness, gifts, transfer, income, subscription, other.
 * Keep the two lists in sync — the app shows anything it doesn't recognise as "Other".
 */

type CategoryId =
  | 'food' | 'transport' | 'shopping' | 'bills' | 'entertainment' | 'healthcare'
  | 'education' | 'housing' | 'travel' | 'fitness' | 'gifts' | 'transfer'
  | 'income' | 'subscription' | 'other';

/** Keywords per category, including common Ghanaian merchants and billers. */
const KEYWORDS: Record<Exclude<CategoryId, 'transfer' | 'income' | 'other'>, string[]> = {
  bills: [
    'airtime', 'bundle', 'data', 'ecg', 'electricity', 'prepaid', 'postpaid', 'power',
    'gwcl', 'ghana water', 'water', 'internet', 'broadband', 'fibre', 'vodafone broadband',
    'surfline', 'busy', 'utility', 'bill', 'nedco', 'dstv', 'gotv', 'startimes', 'multichoice',
  ],
  food: [
    'restaurant', 'food', 'eatery', 'chop', 'kitchen', 'cafe', 'coffee', 'kfc', 'pizza', 'chicken',
    'papaye', 'barcelos', 'chicken republic', 'burger', 'bakery', 'waakye', 'jollof', 'canteen',
    'glovo', 'bolt food', 'jumia food', 'mcdonald', 'starbites', 'grill', 'lunch', 'dinner', 'breakfast',
  ],
  transport: [
    'uber', 'bolt', 'yango', 'taxi', 'trotro', 'stc', 'vip bus', 'metro mass', 'fuel', 'petrol',
    'diesel', 'goil', 'shell', 'total', 'totalenergies', 'star oil', 'allied', 'puma', 'filling station',
    'transport', 'ride', 'fare', 'toll', 'parking',
  ],
  shopping: [
    'shop', 'store', 'mall', 'market', 'melcom', 'shoprite', 'game stores', 'palace', 'maxmart',
    'koala', 'china mall', 'jumia', 'tonaton', 'supermarket', 'mart', 'boutique', 'enterprise', 'ventures',
    'trading', 'purchase', 'pos ',
  ],
  entertainment: ['movie', 'cinema', 'silverbird', 'netflix', 'spotify', 'showmax', 'concert', 'club', 'lounge', 'game', 'betting', 'betway', 'sportybet', 'event', 'ticket'],
  healthcare: ['hospital', 'clinic', 'medical', 'doctor', 'pharmacy', 'chemist', 'drug', 'lab', 'diagnostic', 'health', 'nhis', 'dental'],
  education: ['school', 'university', 'college', 'tuition', 'fees', 'academy', 'institute', 'waec', 'books', 'course', 'training', 'ug ', 'knust', 'ucc', 'upsa', 'gimpa'],
  housing: ['rent', 'landlord', 'apartment', 'hostel', 'accommodation', 'estate', 'property'],
  travel: ['flight', 'airline', 'airport', 'hotel', 'airbnb', 'booking', 'africa world', 'passion air', 'travel', 'visa'],
  fitness: ['gym', 'fitness', 'workout', 'sport'],
  gifts: ['church', 'offering', 'tithe', 'donation', 'charity', 'chapel', 'mosque', 'ministry', 'ministries', 'baptist', 'methodist', 'presby', 'calvary', 'pentecost', 'icgc', 'temple', 'assemblies', 'lighthouse', 'christ', 'gift'],
  subscription: ['subscription', 'renewal', 'recurring', 'membership', 'apple.com', 'google', 'icloud', 'youtube', 'canva', 'chatgpt', 'openai'],
};

/** Words that suggest a business, so a name is not treated as a person. */
const BUSINESS_HINTS = [
  'ltd', 'limited', 'enterprise', 'ventures', 'company', 'co.', 'services', 'store', 'shop',
  'bank', 'pay', 'merchant', 'mtn', 'telecel', 'vodafone', 'airtel', 'ghana', 'gh ', 'agency',
  'mart', 'station', 'hospital', 'school', 'church', 'restaurant', 'hotel', 'pharmacy', 'momo',
];

/** "AKOSUA MENSAH", "Kofi Asante" — two to four plain words, no business hints, no digits. */
function looksLikePerson(description: string): boolean {
  const d = description.trim();
  if (!d || /\d/.test(d)) return false;
  const words = d.split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  if (!words.every((w) => /^[A-Za-z][A-Za-z'.-]*$/.test(w))) return false;
  const lower = ` ${d.toLowerCase()} `;
  return !BUSINESS_HINTS.some((h) => lower.includes(h));
}

function bestKeywordMatch(text: string): { id: CategoryId; score: number } | null {
  let best: { id: CategoryId; score: number } | null = null;
  for (const [id, words] of Object.entries(KEYWORDS) as [CategoryId, string[]][]) {
    let score = 0;
    for (const w of words) if (text.includes(w)) score += w.length;
    if (score > 0 && (!best || score > best.score)) best = { id, score };
  }
  return best;
}

export function categorizeTransaction(
  description: string,
  _source: string,
  fullSms: string,
  type: 'debit' | 'credit' = 'debit',
): CategoryId {
  const desc = ` ${description.toLowerCase()} `;
  const sms = ` ${fullSms.toLowerCase()} `;

  // Money in: salary/refunds are income; anything else received is income too.
  if (type === 'credit') {
    if (/\b(salary|wages|payroll|allowance|bonus|refund|reversal|interest)\b/.test(sms)) return 'income';
    return 'income';
  }

  // Cash out at an agent / ATM: the payee is the agent, not what you spent on.
  if (/\b(cash ?out|withdrawal|atm)\b/.test(sms)) return 'other';

  // Money out: the payee name is the best signal, then the full SMS text.
  const fromDesc = bestKeywordMatch(desc);
  if (fromDesc) return fromDesc.id;

  const fromSms = bestKeywordMatch(sms);
  if (fromSms) return fromSms.id;

  // Sending money to a person (family, friends, someone you owe)
  if (looksLikePerson(description) || /\b(you have sent|transfer to|sent to)\b/.test(sms)) return 'transfer';

  return 'other';
}
