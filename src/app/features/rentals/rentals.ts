import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { switchMap, tap } from 'rxjs';
import { RENTAL_STATUSES, RentalResponse, RentalStatus } from '../../core/models/rental.model';
import { RentalService } from '../../core/services/rental.service';
import { EmptyState } from '../../shared/components/empty-state';
import { Pager } from '../../shared/components/pager';
import { STATUS_LABELS, RentalStatusBadge } from '../../shared/components/rental-status-badge';
import { formatDateTime, formatMoney } from '../../shared/utils/format';

const PAGE_SIZE = 10;

interface StatusFilter {
    label: string;
    value: RentalStatus | null;
}

/** "All" plus the seven statuses — the API accepts one at a time. */
const STATUS_FILTERS: StatusFilter[] = [{ label: 'All', value: null }, ...RENTAL_STATUSES.map((status) => ({ label: STATUS_LABELS[status], value: status }))];

@Component({
    selector: 'app-rentals',
    standalone: true,
    imports: [RouterModule, RentalStatusBadge, EmptyState, Pager],
    templateUrl: './rentals.html'
})
export class Rentals {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private rentalService = inject(RentalService);

    readonly statusFilters = STATUS_FILTERS;
    readonly pageSize = PAGE_SIZE;
    readonly skeletons = [0, 1, 2];

    readonly rentals = signal<RentalResponse[]>([]);
    readonly loading = signal(true);
    readonly failed = signal(false);
    readonly page = signal(0);
    readonly totalPages = signal(0);
    readonly totalElements = signal(0);
    readonly activeStatus = signal<RentalStatus | null>(null);

    readonly isFiltered = computed(() => this.activeStatus() !== null);

    constructor() {
        // Status and page live in the URL so a filtered list is shareable and the
        // back button behaves.
        this.route.queryParamMap
            .pipe(
                tap((params) => {
                    this.activeStatus.set(readStatus(params.get('status')));
                    this.page.set(Math.max(0, Number(params.get('page') ?? 0) || 0));
                    this.loading.set(true);
                    this.failed.set(false);
                }),
                switchMap(() => this.rentalService.list({ status: this.activeStatus(), page: this.page(), size: PAGE_SIZE })),
                takeUntilDestroyed()
            )
            .subscribe({
                next: (result) => {
                    this.rentals.set(result.data ?? []);
                    this.totalPages.set(result.totalPages ?? 0);
                    this.totalElements.set(result.totalElements ?? 0);
                    this.loading.set(false);
                },
                error: () => {
                    this.rentals.set([]);
                    this.totalElements.set(0);
                    this.totalPages.set(0);
                    this.failed.set(true);
                    this.loading.set(false);
                }
            });
    }

    selectStatus(status: RentalStatus | null): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { status: status ?? undefined, page: undefined }
        });
    }

    onPageChange(page: number): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { status: this.activeStatus() ?? undefined, page: page > 0 ? page : undefined }
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    money(amount: number | null | undefined): string {
        return formatMoney(amount);
    }

    dateTime(instant: string | null | undefined): string {
        return formatDateTime(instant);
    }
}

function readStatus(value: string | null): RentalStatus | null {
    return value && RENTAL_STATUSES.includes(value as RentalStatus) ? (value as RentalStatus) : null;
}
