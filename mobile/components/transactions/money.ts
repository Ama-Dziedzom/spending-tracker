import { heroAmount, listAmount } from '@/lib/format';
import { cur } from '@/lib/currency';

/** Money in sentences and buttons: "GHS 30", "GHS 30.50", "NGN 1,200". */
export function money(n: number): string {
    const whole = cur().decimals === 0 || Number.isInteger(Math.round(n * 100) / 100);
    return `${cur().label} ${whole ? heroAmount(n) : listAmount(n)}`;
}
