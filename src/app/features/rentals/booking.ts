import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageModule } from 'primeng/message';
import { errorCodeOf, errorMessage } from '../../core/errors/api-error';
import { PublicCarDetailResponse } from '../../core/models/car.model';
import { RentalResponse } from '../../core/models/rental.model';
import { cityName } from '../../core/models/city.model';
import { PublicCarService } from '../../core/services/public-car.service';
import { RentalService } from '../../core/services/rental.service';
import { RentalStatusBadge } from '../../shared/components/rental-status-badge';
import { estimateRental } from '../../shared/utils/billing';
import { formatDateTime, formatMoney } from '../../shared/utils/format';

@Component({
    selector: 'app-booking',
    standalone: true,
    imports: [RouterModule, FormsModule, DatePickerModule, MessageModule, RentalStatusBadge],
    templateUrl: './booking.html'
})
export class Booking {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private publicCarService = inject(PublicCarService);
    private rentalService = inject(RentalService);

    readonly car = signal<PublicCarDetailResponse | null>(null);
    readonly loading = signal(true);
    readonly unavailable = signal(false);

    readonly startAt = signal<Date | null>(null);
    readonly endAt = signal<Date | null>(null);
    readonly dateError = signal<string | null>(null);
    readonly formError = signal<string | null>(null);
    readonly submitting = signal(false);

    /** The server's snapshot, shown once the request exists. */
    readonly created = signal<RentalResponse | null>(null);

    readonly now = new Date();
    readonly minReturn = computed(() => this.startAt() ?? this.now);

    /** Non-binding: the server prices the rental when it creates it. */
    readonly estimate = computed(() => {
        const car = this.car();
        return car ? estimateRental(this.startAt(), this.endAt(), car) : null;
    });

    readonly companyCity = computed(() => cityName(this.car()?.company?.city));

    constructor() {
        const params = this.route.snapshot.queryParamMap;
        this.startAt.set(parseDate(params.get('startAt')));
        this.endAt.set(parseDate(params.get('endAt')));

        const carId = this.route.snapshot.paramMap.get('carId') ?? '';
        this.publicCarService.getById(carId).subscribe({
            next: (car) => {
                this.car.set(car);
                this.loading.set(false);
            },
            error: (failure) => {
                this.loading.set(false);
                this.unavailable.set(failure instanceof HttpErrorResponse && failure.status === 404);
                if (!this.unavailable()) {
                    this.formError.set(errorMessage(failure, 'We could not load this car.'));
                }
            }
        });
    }

    money(amount: number | null | undefined): string {
        return formatMoney(amount);
    }

    dateTime(instant: string | null | undefined): string {
        return formatDateTime(instant);
    }

    submit(): void {
        if (this.submitting()) {
            return;
        }

        const start = this.startAt();
        const end = this.endAt();
        const car = this.car();
        if (!car) {
            return;
        }

        const dateProblem = this.validateDates(start, end);
        this.dateError.set(dateProblem);
        if (dateProblem || !start || !end) {
            return;
        }

        this.submitting.set(true);
        this.formError.set(null);

        this.rentalService
            // Local pickers to the UTC instants the API expects.
            .create({ carId: car.id, startAt: start.toISOString(), endAt: end.toISOString() })
            .subscribe({
                next: (rental) => {
                    this.submitting.set(false);
                    this.created.set(rental);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                },
                error: (failure) => {
                    this.submitting.set(false);
                    this.handleFailure(failure);
                }
            });
    }

    private handleFailure(failure: unknown): void {
        switch (errorCodeOf(failure)) {
            case 'INVALID_RENTAL_PERIOD':
                this.dateError.set('Those dates are not a usable rental period. Check the pick-up and return times.');
                return;
            case 'CAR_NOT_AVAILABLE':
                // Keep the form: different dates are the fix, not a different page.
                this.formError.set('This car is already booked for part of those dates. Try a different window.');
                return;
            case 'RESOURCE_NOT_FOUND':
                this.unavailable.set(true);
                return;
            default:
                if (failure instanceof HttpErrorResponse && failure.status === 404) {
                    this.unavailable.set(true);
                    return;
                }
                this.formError.set(errorMessage(failure, 'We could not create that request. Please try again.'));
        }
    }

    private validateDates(start: Date | null, end: Date | null): string | null {
        if (!start || !end) {
            return 'Choose both a pick-up and a return time.';
        }
        if (end <= start) {
            return 'The return time must be after the pick-up time.';
        }
        if (start <= new Date()) {
            return 'Pick-up has to be in the future.';
        }
        return null;
    }
}

function parseDate(value: string | null): Date | null {
    if (!value) {
        return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}
