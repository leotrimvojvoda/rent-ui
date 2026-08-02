import { Component, computed, input } from '@angular/core';
import { RentalStatus } from '../../core/models/rental.model';

/**
 * Status presentation, defined once (PLAN.md §4). APPROVED and ACTIVE differ by
 * fill rather than hue, so the live progression reads as one family; the dead
 * ends are muted so they recede.
 */
const STATUS_STYLES: Record<RentalStatus, string> = {
    PENDING: 'bg-keyway-mint text-[#8a5a12] dark:bg-surface-800 dark:text-keyway-star',
    APPROVED: 'border border-primary text-primary bg-transparent',
    ACTIVE: 'bg-primary text-primary-contrast',
    COMPLETED: 'bg-surface-200 text-muted-color dark:bg-surface-800',
    REJECTED: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
    CANCELLED: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
    EXPIRED: 'bg-surface-200 text-muted-color dark:bg-surface-800'
};

export const STATUS_LABELS: Record<RentalStatus, string> = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    ACTIVE: 'Picked up',
    COMPLETED: 'Completed',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
    EXPIRED: 'Expired'
};

/** What each status means for the customer, in plain language. */
export const CLIENT_STATUS_EXPLANATIONS: Record<RentalStatus, string> = {
    PENDING: 'The rental company has your request and has not decided yet. If nobody decides before your pick-up time, the request expires automatically.',
    APPROVED: 'The company accepted your request and is holding the car for these dates. Bring your booking details to pick it up.',
    ACTIVE: 'You have the car. The company marks the rental complete when you return it.',
    COMPLETED: 'The car has been returned and this rental is closed.',
    REJECTED: 'The company turned this request down. Nothing was charged — try different dates or another car.',
    CANCELLED: 'This request was cancelled before pick-up.',
    EXPIRED: 'Your pick-up time arrived before the company decided, so the request expired automatically. Nothing was charged.'
};

@Component({
    selector: 'app-rental-status-badge',
    standalone: true,
    template: `
        <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap" [class]="styles()">
            {{ label() }}
        </span>
    `
})
export class RentalStatusBadge {
    status = input.required<RentalStatus>();

    readonly label = computed(() => STATUS_LABELS[this.status()] ?? this.status());
    readonly styles = computed(() => STATUS_STYLES[this.status()] ?? STATUS_STYLES.COMPLETED);
}
