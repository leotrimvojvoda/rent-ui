import { environment } from '../../../environments/environment';

/**
 * Money arrives as a JSON number, so `40.00` parses to `40`. Always render two
 * decimals, and never recompute a total the server already sent.
 */
export function formatMoney(amount: number | null | undefined): string {
    if (amount === null || amount === undefined || Number.isNaN(amount)) {
        return '—';
    }
    return `${environment.currencySymbol}${amount.toFixed(2)}`;
}

/** Per-day price, e.g. `€40.00/day`. */
export function formatDailyPrice(amount: number | null | undefined): string {
    return amount === null || amount === undefined ? '—' : `${formatMoney(amount)}/day`;
}

/** Timestamps are UTC instants; rentals need the time, so always show it. */
export function formatDateTime(instant: string | null | undefined): string {
    if (!instant) {
        return '—';
    }
    const date = new Date(instant);
    return Number.isNaN(date.getTime())
        ? '—'
        : date.toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short'
          });
}

export function formatDate(instant: string | null | undefined): string {
    if (!instant) {
        return '—';
    }
    const date = new Date(instant);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

/** Local `Date` from a picker to the UTC ISO instant the API expects. */
export function toUtcInstant(date: Date | null | undefined): string | null {
    return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}
