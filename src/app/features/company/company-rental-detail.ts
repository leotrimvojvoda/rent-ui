import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessageModule } from 'primeng/message';
import { switchMap, tap } from 'rxjs';
import { errorCodeOf, errorMessage } from '../../core/errors/api-error';
import { CompanyRentalResponse } from '../../core/models/rental.model';
import { CompanyRentalService } from '../../core/services/company-rental.service';
import { ConfirmDialogService } from '../../core/services/confirmation.service';
import { ToastService } from '../../core/services/toast.service';
import { OWNER_STATUS_EXPLANATIONS, RentalStatusBadge } from '../../shared/components/rental-status-badge';
import { RentalTimeline } from '../../shared/components/rental-timeline';
import { formatDateTime, formatMoney } from '../../shared/utils/format';
import { RentalActionDefinition, actionsFor } from './rental-actions';

@Component({
    selector: 'app-company-rental-detail',
    standalone: true,
    imports: [RouterModule, MessageModule, RentalStatusBadge, RentalTimeline],
    templateUrl: './company-rental-detail.html'
})
export class CompanyRentalDetail {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private rentalService = inject(CompanyRentalService);
    private confirmDialog = inject(ConfirmDialogService);
    private toast = inject(ToastService);

    readonly rental = signal<CompanyRentalResponse | null>(null);
    readonly loading = signal(true);
    readonly working = signal(false);
    readonly conflict = signal<string | null>(null);

    readonly explanation = computed(() => {
        const rental = this.rental();
        return rental ? (OWNER_STATUS_EXPLANATIONS[rental.status] ?? '') : '';
    });

    readonly actions = computed(() => {
        const rental = this.rental();
        return rental ? actionsFor(rental.status) : [];
    });

    readonly clientName = computed(() => {
        const client = this.rental()?.client;
        return client ? `${client.firstName} ${client.lastName}`.trim() : '';
    });

    readonly carName = computed(() => {
        const car = this.rental()?.car;
        return car ? `${car.make} ${car.model}` : '';
    });

    /**
     * A pending request the customer can no longer be held to: the pick-up time
     * has passed and the job that expires it has not run yet. Approving now would
     * hand over a car for dates that have already started.
     */
    readonly pickupPassed = computed(() => {
        const rental = this.rental();
        return !!rental && rental.status === 'PENDING' && new Date(rental.startAt).getTime() <= Date.now();
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
                    // 404 means "not one of your rentals", which is the same dead end as gone.
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

    async run(definition: RentalActionDefinition): Promise<void> {
        const rental = this.rental();
        if (!rental || this.working()) {
            return;
        }

        const confirmed = await this.confirmDialog.confirm({
            header: definition.confirmHeader,
            message: definition.confirmMessage(this.carName(), this.clientName()),
            acceptLabel: definition.acceptLabel,
            rejectLabel: definition.rejectLabel,
            icon: definition.tone === 'danger' ? 'pi pi-exclamation-triangle' : 'pi pi-question-circle'
        });
        if (!confirmed) {
            return;
        }

        this.working.set(true);
        this.conflict.set(null);

        this.rentalService.act(rental.id, definition.action).subscribe({
            next: (updated) => {
                this.working.set(false);
                this.rental.set(updated);
                this.toast.success(definition.successSummary, definition.successDetail);
            },
            error: (failure) => {
                this.working.set(false);
                this.handleFailure(failure, definition, rental.id);
            }
        });
    }

    /** A conflict means our copy is stale, so explain it and refetch the truth. */
    private handleFailure(failure: unknown, definition: RentalActionDefinition, rentalId: string): void {
        this.conflict.set(errorCodeOf(failure) === 'INVALID_RENTAL_TRANSITION' ? definition.conflictMessage : errorMessage(failure, 'That did not go through. Please try again.'));

        this.rentalService.getById(rentalId).subscribe({
            next: (fresh) => this.rental.set(fresh),
            error: () => {
                /* Keep what we have; the message above already explains it. */
            }
        });
    }
}
