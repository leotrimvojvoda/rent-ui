import { Component, computed, input } from '@angular/core';
import { CarStatus } from '../../core/models/car.model';

const STATUS_STYLES: Record<CarStatus, string> = {
    ACTIVE: 'bg-primary text-primary-contrast',
    IN_MAINTENANCE: 'bg-keyway-mint text-[#8a5a12] dark:bg-surface-800 dark:text-keyway-star',
    RETIRED: 'bg-surface-200 text-muted-color dark:bg-surface-800'
};

export const CAR_STATUS_LABELS: Record<CarStatus, string> = {
    ACTIVE: 'Active',
    IN_MAINTENANCE: 'In maintenance',
    RETIRED: 'Retired'
};

@Component({
    selector: 'app-car-status-badge',
    standalone: true,
    template: ` <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap" [class]="styles()">{{ label() }}</span> `
})
export class CarStatusBadge {
    status = input.required<CarStatus>();

    readonly label = computed(() => CAR_STATUS_LABELS[this.status()] ?? this.status());
    readonly styles = computed(() => STATUS_STYLES[this.status()] ?? STATUS_STYLES.RETIRED);
}

/**
 * Publishing alone does not make a car public: the catalog needs
 * `published = true` **and** `status = ACTIVE`. A published car in maintenance
 * is invisible to customers, which is worth saying out loud rather than
 * leaving the owner to work out from two separate badges.
 */
@Component({
    selector: 'app-published-badge',
    standalone: true,
    template: `
        @if (publiclyVisible()) {
            <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-primary-50 text-primary dark:bg-surface-800 whitespace-nowrap">
                <i class="pi pi-eye text-[10px]"></i>
                Live in catalog
            </span>
        } @else if (published()) {
            <span
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-keyway-mint text-[#8a5a12] dark:bg-surface-800 dark:text-keyway-star whitespace-nowrap"
                [title]="'Published, but ' + statusLabel().toLowerCase() + ' — customers cannot see it'"
            >
                <i class="pi pi-eye-slash text-[10px]"></i>
                Not publicly visible
            </span>
        } @else {
            <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-surface-200 text-muted-color dark:bg-surface-800 whitespace-nowrap">
                <i class="pi pi-eye-slash text-[10px]"></i>
                Unpublished
            </span>
        }
    `
})
export class PublishedBadge {
    published = input.required<boolean>();
    status = input.required<CarStatus>();

    readonly publiclyVisible = computed(() => this.published() && this.status() === 'ACTIVE');
    readonly statusLabel = computed(() => CAR_STATUS_LABELS[this.status()] ?? this.status());
}
