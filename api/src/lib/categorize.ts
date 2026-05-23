/**
 * Transaction categorization logic.
 * Ported from the parse-sms edge function (categorizeTransaction).
 */

export function categorizeTransaction(
  description: string,
  _source: string,
  fullSms: string,
): string {
  const desc = description.toLowerCase();
  const sms = fullSms.toLowerCase();

  if (
    desc.includes('church') || desc.includes('offering') ||
    desc.includes('tithe') || desc.includes('donation') ||
    desc.includes('baptist') || desc.includes('chapel') ||
    desc.includes('calvary') || desc.includes('methodist')
  ) return 'Church & Charity';

  if (
    desc.includes('restaurant') || desc.includes('cafe') ||
    desc.includes('pizza') || desc.includes('kfc') ||
    desc.includes('food') || desc.includes('eatery')
  ) return 'Food & Dining';

  if (
    desc.includes('uber') || desc.includes('bolt') ||
    desc.includes('taxi') || desc.includes('fuel') ||
    desc.includes('transport') || desc.includes('yango')
  ) return 'Transportation';

  if (
    desc.includes('shop') || desc.includes('mall') ||
    desc.includes('store') || desc.includes('market')
  ) return 'Shopping';

  if (
    desc.includes('electricity') || desc.includes('water') ||
    desc.includes('internet') || desc.includes('airtime') ||
    desc.includes('ecg') || desc.includes('data')
  ) return 'Utilities & Bills';

  if (
    desc.includes('movie') || desc.includes('cinema') ||
    desc.includes('game') || desc.includes('club')
  ) return 'Entertainment';

  if (
    desc.includes('hospital') || desc.includes('clinic') ||
    desc.includes('medical') || desc.includes('doctor') ||
    desc.includes('pharmacy')
  ) return 'Health';

  if (
    desc.includes('school') || desc.includes('university') ||
    desc.includes('tuition') || desc.includes('fees')
  ) return 'Education';

  if (
    sms.includes('received') &&
    (desc.includes('salary') || desc.includes('wages') || desc.includes('payment'))
  ) return 'Income';

  if (
    desc.includes('atm') || desc.includes('withdrawal') ||
    sms.includes('cash withdrawal')
  ) return 'Cash Withdrawal';

  if (
    desc.includes('fee') || desc.includes('charge') ||
    desc.includes('commission')
  ) return 'Fees & Charges';

  return 'Other';
}
