import { heroAmount, listAmount } from '@/lib/format';

/** Money in sentences and buttons: "GHS 30", "GHS 30.50", "GHS 1,200". */
export function money(n: number): string {
    return Number.isInteger(Math.round(n * 100) / 100) ? `GHS ${heroAmount(n)}` : `GHS ${listAmount(n)}`;
}
