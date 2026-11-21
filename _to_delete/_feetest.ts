import { extractFee } from '/sessions/rcw-0172as5kpdvrqjpasxx8r9oq/mnt/spending-tracker/api/src/lib/sms-helpers.ts';
const cases: [string, number][] = [
 ['Payment made for GHS 50.00 to KFC. Current Balance: GHS 120.00. Fee charged: GHS0.50 Tax charged: 0.25', 0.75],
 ['You have used 13.43 GHS on FRI:x/MM with access fee 0.68', 0.68],
 ['Your account 1234XXXX has been debited with GHS 200.00. Charges: GHS 2.00. Avail Bal: GHS 1,000.00', 2],
 ['GCB: Transfer of GHS500.00 to 0244123456. Transfer charge GHS1.50, E-Levy: GHS 0.75', 2.25],
 ['Your card was charged GHS 50.00 at SHOPRITE', 0],
 ['Debit: GHS 100.00 Commission: 0.50 COT 0.25 Bal 300.00', 0.75],
 ['Sent GHS 20 to 0244123456. Fee: 0.00', 0],
];
for (const [s, want] of cases) { const got = extractFee(s); console.log(got === want ? 'ok  ' : 'FAIL', got, want, '|', s.slice(0,50)); }
