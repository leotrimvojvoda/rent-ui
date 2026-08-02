import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessageModule } from 'primeng/message';
import { switchMap, tap } from 'rxjs';
import { errorCodeOf, errorMessage } from '../../core/errors/api-error';
import { CompanyRentalResponse, RENTAL_STATUSES, RentalStatus } from '../../core/models/rental.model';
import { CompanyRentalService } from '../../core/services/company-rental.service';
import { ConfirmDialogService } from '../../core/services/confirmation.service';
import { ToastService } from '../../core/services/toast.service';
import { EmptyState } from '../../shared/components/empty-state';
import { Pager } from '../../shared/components/pager';
import { STATUS_LABELS, RentalStatusBadge } from '../../shared/components/rental-status-badge';
import { formatDateTime, formatMoney } from '../../shared/utils/format';
import { RentalActionDefinition, actionsFor } from './rental-actions';

const PAGE_SIZE = 10;

interface StatusFilter {
    label: string;
    value: RentalStatus | null;
}

const STATUS_FILTERS: StatusFilter[] = [{ label: 'All', value: null }, ...RENTAL_STATUSES.map((status) => ({ label: STATUS_LABELS[status], value: status }))];

/**
 * The queue opens on PENDING rather than on everything, because the only reason
 * to come here is to answer requests. The API filters one status at a time, so
 * "pending first" has to be a default filter rather than a sort — re-sorting a
 * server-paged list client-side would only reorder the page you happen to be on.
 */
const DEFAULT_STATUS: RentalStatus = 'PENDING';

@Component({
    selector: 'app-company-rentals',
    standalone: true,
    imports: [RouterModule, MessageModule, RentalStatusBadge, EmptyState, Pager],
    templateUrl: './company-rentals.html'
})
export class CompanyRentals {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private rentalService = inject(CompanyRentalService);
    private confirmDialog = inject(ConfirmDialogService);
    private toast = inject(ToastService);

    readonly statusFilters = STATUS_FILTERS;
    readonly pageSize = PAGE_SIZE;
    readonly skeletons = [0, 1, 2];

    readonly rentals = signal<CompanyRentalResponse[]>([]);
    readonly loading = signal(true);
    readonly failed = signal(false);
    readonly page = signal(0);
    readonly totalPages = signal(0);
    readonly totalElements = signal(0);
    readonly activeStatus = signal<RentalStatus | null>(DEFAULT_STATUS);
    readonly conflict = signal<string | null>(null);

    private readonly busy = signal<ReadonlySet<string>>(new Set());

    readonly showingDefault = computed(() => this.activeStatus() === DEFAULT_STATUS);

    constructor() {
        this.route.queryParamMap
            .pipe(
                tap((params) => {
                    this.activeStatus.set(readStatus(params.get('status')));
                    this.page.set(Math.max(0, Number(params.get('page') ?? 0) || 0));
                    this.loading.set(true);
                    this.failed.set(false);
                    this.conflict.set(null);
                }),
                switchMap(() => this.rentalService.list({ status: this.activeStatus(), page: this.page(), size: PAGE_SIZE })),
                takeUntilDestroyed()
            )
            .subscribe({
                next: (result) => this.applyPage(result.data ?? [], result.totalPages ?? 0, result.totalElements ?? 0),
                error: () => {
                    this.applyPage([], 0, 0);
                    this.failed.set(true);
                }
            });
    }

    selectStatus(status: RentalStatus | null): void {
        // `all` is explicit in the URL because an absent param means the default
        // (pending), not "no filter".
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { status: status ?? 'all', page: undefined }
        });
    }

    onPageChange(page: number): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { status: this.activeStatus() ?? 'all', page: page > 0 ? page : undefined }
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    actions(rental: CompanyRentalResponse): RentalActionDefinition[] {
        return actionsFor(rental.status);
    }

    isBusy(rentalId: string): boolean {
        return this.busy().has(rentalId);
    }

    clientName(rental: CompanyRentalResponse): string {
        return `${rental.client.firstName} ${rental.client.lastName}`.trim();
    }

    money(amount: number | null | undefined): string {
        return formatMoney(amount);
    }

    dateTime(instant: string | null | undefined): string {
        return formatDateTime(instant);
    }

    async run(rental: CompanyRentalResponse, definition: RentalActionDefinition): Promise<void> {
        if (this.isBusy(rental.id)) {
            return;
        }

        const car = `${rental.car.make} ${rental.car.model}`;
        const confirmed = await this.confirmDialog.confirm({
            header: definition.confirmHeader,
            message: definition.confirmMessage(car, this.clientName(rental)),
            acceptLabel: definition.acceptLabel,
            rejectLabel: definition.rejectLabel,
            icon: definition.tone === 'danger' ? 'pi pi-exclamation-triangle' : 'pi pi-question-circle'
        });
        if (!confirmed) {
            return;
        }

        this.setBusy(rental.id, true);
        this.conflict.set(null);

        this.rentalService.act(rental.id, definition.action).subscribe({
            next: (updated) => {
                this.setBusy(rental.id, false);
                this.replace(updated);
                this.toast.success(definition.successSummary, definition.successDetail);
            },
            error: (failure) => {
                this.setBusy(rental.id, false);
                this.handleFailure(failure, definition);
            }
        });
    }

    /**
     * A rejected transition means someone else moved first — usually the customer
     * cancelling a request we still show as pending. Say so, then reload the page
     * of results so the row tells the truth again.
     */
    private handleFailure(failure: unknown, definition: RentalActionDefinition): void {
        this.conflict.set(errorCodeOf(failure) === 'INVALID_RENTAL_TRANSITION' ? definition.conflictMessage : errorMessage(failure, 'That did not go through. Please try again.'));
        this.reload();
    }

    private reload(): void {
        this.rentalService.list({ status: this.activeStatus(), page: this.page(), size: PAGE_SIZE }).subscribe({
            next: (result) => this.applyPage(result.data ?? [], result.totalPages ?? 0, result.totalElements ?? 0),
            error: () => {
                /* Keep the stale rows; the conflict message above already explains it. */
            }
        });
    }

    /** Swap one row in place, so acting on a rental does not move it under the cursor. */
    private replace(updated: CompanyRentalResponse): void {
        const stillMatches = this.activeStatus() === null || this.activeStatus() === updated.status;
        if (stillMatches) {
            this.rentals.update((rentals) => rentals.map((rental) => (rental.id === updated.id ? updated : rental)));
            return;
        }
        // It no longer belongs in this filtered list — drop it and correct the count.
        this.rentals.update((rentals) => rentals.filter((rental) => rental.id !== updated.id));
        this.totalElements.update((total) => Math.max(0, total - 1));
    }

    private applyPage(rentals: CompanyRentalResponse[], totalPages: number, totalElements: number): void {
        this.rentals.set(rentals);
        this.totalPages.set(totalPages);
        this.totalElements.set(totalElements);
        this.loading.set(false);
    }

    private setBusy(rentalId: string, busy: boolean): void {
        this.busy.update((current) => {
            const next = new Set(current);
            if (busy) {
                next.add(rentalId);
            } else {
                next.delete(rentalId);
            }
            return next;
        });
    }
}

/** No `status` param means the pending queue; `all` is the way to ask for everything. */
function readStatus(value: string | null): RentalStatus | null {
    if (value === null) {
        return DEFAULT_STATUS;
    }
    if (value === 'all') {
        return null;
    }
    return RENTAL_STATUSES.includes(value as RentalStatus) ? (value as RentalStatus) : DEFAULT_STATUS;
}
