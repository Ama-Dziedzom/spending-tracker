import { extractSmsDate } from './src/lib/sms-helpers.ts';
const now = new Date('2026-11-03T12:00:00Z');
const s = [
 'Your payment of GHS 10.00 to MTN AIRTIME has been completed at 2026-04-05 17:29:57. Your new balance: GHS 20.00.',
 'Acct **2290 credited with GHS 300.00 on 05-APR-26. Avail bal: GHS 2,310.00',
 'GHS 50.00 was debited from your Acc on 02/11/2026 14:05. Your available balance is now GHS 100',
 'Payment received for GHS 150.00 from AKOSUA MENSAH. Current Balance: GHS 170.00.',
 'debited 2027-01-01 10:00:00 future',
];
for (const x of s) console.log(extractSmsDate(x, now)?.toISOString() ?? null);
