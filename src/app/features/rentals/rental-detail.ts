import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessageModule } from 'primeng/message';
import { switchMap, tap } from 'rxjs';
import { errorCodeOf, errorMessage } from '../../core/errors/api-error';
import { RentalResponse } from '../../core/models/rental.model';
import { ConfirmDialogService } from '../../core/services/confirmation.service';
import { RentalService } from '../../core/services/rental.service';
import { ToastService } from '../../core/services/toast.service';
import { CLIENT_STATUS_EXPLANATIONS, RentalStatusBadge } from '../../shared/components/rental-status-badge';
import { formatDateTime, formatMoney } from '../../shared/utils/format';

@Component({
    selector: 'app-rental-detail',
    standalone: true,
    imports: [RouterModule, MessageModule, RentalStatusBadge],
    templateUrl: './rental-detail.html'
})
export class RentalDetail {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private rentalService = inject(RentalService);
    private confirmDialog = inject(ConfirmDialogService);
    private toast = inject(ToastService);

    readonly rental = signal<RentalResponse | null>(null);
    readonly loading = signal(true);
    readonly cancelling = signal(false);
    readonly conflict = signal<string | null>(null);

    readonly explanation = computed(() => {
        const rental = this.rental();
        return rental ? (CLIENT_STATUS_EXPLANATIONS[rental.status] ?? '') : '';
    });

    /**
     * Cancelling is allowed while PENDING or APPROVED, and only before pick-up.
     * The server enforces both; hiding the button keeps users out of a dead end.
     */
    readonly canCancel = computed(() => {
        const rental = this.rental();
        if (!rental || (rental.status !== 'PENDING' && rental.status !== 'APPROVED')) {
            return false;
        }
        return new Date(rental.startAt).getTime() > Date.now();
    });

    constructor() {
        this.route.paramMap
            .pipe(
                tap(() => this.loading.set(true)),
                switchMap((params) => this.rentalService.getById(params.get('rentalId') ?? '')),
                takeUntilDestroyed()
            )
            .subscribe({
                next: (rental) => {
                    this.rental.set(rental);
                    this.loading.set(false);
                },
                error: (failure) => {
                    this.loading.set(false);
                    // 404 means "not yours or not there" — either way, not found.
                    if (failure instanceof HttpErrorResponse && failure.status === 404) {
                        void this.router.navigate(['/notfound']);
                        return;
                    }
                    this.toast.error('Could not load rental', errorMessage(failure));
                }
            });
    }

    money(amount: number | null | undefined): string {
        return formatMoney(amount);
    }

    dateTime(instant: string | null | undefined): string {
        return formatDateTime(instant);
    }

    async cancel(): Promise<void> {
        const rental = this.rental();
        if (!rental || this.cancelling()) {
            return;
        }

        const confirmed = await this.confirmDialog.confirm({
            header: 'Cancel this rental?',
            message: `This withdraws your request for the ${rental.car.make} ${rental.car.model}. The car goes back on the catalog for those dates and this cannot be undone.`,
            acceptLabel: 'Cancel rental',
            rejectLabel: 'Keep it',
            icon: 'pi pi-exclamation-triangle'
        });
        if (!confirmed) {
            return;
        }

        this.cancelling.set(true);
        this.conflict.set(null);

        this.rentalService.cancel(rental.id).subscribe({
            next: (updated) => {
                this.cancelling.set(false);
                this.rental.set(updated);
                this.toast.success('Rental cancelled', 'Your request has been withdrawn.');
            },
            error: (failure) => {
                this.cancelling.set(false);
                this.handleCancelFailure(failure, rental.id);
            }
        });
    }

    /** A conflict means our copy is stale, so explain it and refetch the truth. */
    private handleCancelFailure(failure: unknown, rentalId: string): void {
        switch (errorCodeOf(failure)) {
            case 'RENTAL_ALREADY_STARTED':
                this.conflict.set('The pick-up time has passed, so this rental can no longer be cancelled.');
                break;
            case 'INVALID_RENTAL_TRANSITION':
                this.conflict.set('This rental has moved on since you opened the page, so it can no longer be cancelled.');
                break;
            default:
                this.conflict.set(errorMessage(failure, 'We could not cancel that rental. Please try again.'));
        }

        this.rentalService.getById(rentalId).subscribe({
            next: (fresh) => this.rental.set(fresh),
            error: () => {
                /* Keep what we have; the message above already explains it. */
            }
        });
    }
}
