import { PriceTierResponse } from '../../core/models/car.model';

const MS_PER_HOUR = 3_600_000;
const HOURS_PER_DAY = 24;
/** Overrun strictly below this is forgiven: 24 h is 1 day, 25 h is 2. */
const GRACE_HOURS = 1;

export interface RentalEstimate {
    totalDays: number;
    dailyPrice: number;
    totalPrice: number;
}

/**
 * The documented billing rule: every started 24-hour block from pick-up counts
 * as a day, with an exclusive one-hour grace.
 *
 * This is only ever used to show a **non-binding** estimate before the request
 * exists. The server computes and snapshots the real figures on `POST /rentals`,
 * and those are the numbers displayed everywhere afterwards.
 */
export function estimateTotalDays(start: Date, end: Date): number {
    const hours = (end.getTime() - start.getTime()) / MS_PER_HOUR;
    if (hours <= 0) {
        return 0;
    }

    const fullDays = Math.floor(hours / HOURS_PER_DAY);
    const overrun = hours - fullDays * HOURS_PER_DAY;
    const days = overrun === 0 || overrun < GRACE_HOURS ? fullDays : fullDays + 1;

    // Any usable rental is at least a day.
    return Math.max(1, days);
}

/** The tier covering this many days, else the car's standard rate. */
export function resolveDailyPrice(totalDays: number, tiers: PriceTierResponse[] | undefined, defaultDailyPrice: number): number {
    const match = (tiers ?? []).find((tier) => totalDays >= tier.minDays && (tier.maxDays == null || totalDays <= tier.maxDays));
    return match?.dailyPrice ?? defaultDailyPrice;
}

export function estimateRental(start: Date | null, end: Date | null, car: { priceTiers?: PriceTierResponse[]; defaultDailyPrice: number }): RentalEstimate | null {
    if (!start || !end || end <= start) {
        return null;
    }

    const totalDays = estimateTotalDays(start, end);
    const dailyPrice = resolveDailyPrice(totalDays, car.priceTiers, car.defaultDailyPrice);

    return {
        totalDays,
        dailyPrice,
        // Display-only arithmetic. The server's `totalPrice` is authoritative and
        // is never recomputed from these numbers.
        totalPrice: Math.round(totalDays * dailyPrice * 100) / 100
    };
}
