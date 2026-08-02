import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageModule } from 'primeng/message';
import { switchMap, tap } from 'rxjs';
import { PriceTierResponse, PublicCarDetailResponse } from '../../core/models/car.model';
import { cityName } from '../../core/models/city.model';
import { AuthService } from '../../core/services/auth.service';
import { PublicCarService } from '../../core/services/public-car.service';
import { formatMoney } from '../../shared/utils/format';

interface TierRow {
    range: string;
    price: string;
    isDefault?: boolean;
}

@Component({
    selector: 'app-car-detail',
    standalone: true,
    imports: [RouterModule, FormsModule, DatePickerModule, MessageModule],
    templateUrl: './car-detail.html'
})
export class CarDetail {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private publicCarService = inject(PublicCarService);

    authService = inject(AuthService);

    readonly car = signal<PublicCarDetailResponse | null>(null);
    readonly loading = signal(true);
    /** A hidden, retired or unknown car is a 404 — a state, not an error. */
    readonly unavailable = signal(false);
    readonly failed = signal(false);

    readonly pickupAt = signal<Date | null>(null);
    readonly returnAt = signal<Date | null>(null);
    readonly dateError = signal<string | null>(null);

    readonly now = new Date();
    readonly minReturn = computed(() => this.pickupAt() ?? this.now);

    readonly gallery = computed(() => this.car()?.imageUrls ?? []);
    readonly activeImage = signal(0);
    readonly companyCity = computed(() => cityName(this.car()?.company?.city));

    readonly canBook = computed(() => !this.authService.isLoggedIn() || this.authService.isClient());
    readonly isOwner = computed(() => this.authService.isOwner());

    /**
     * Tier rows, sorted, with an explicit row for the durations no tier covers —
     * those fall back to `defaultDailyPrice`, which is otherwise invisible.
     */
    readonly tierRows = computed<TierRow[]>(() => {
        const car = this.car();
        if (!car) {
            return [];
        }

        const tiers = [...(car.priceTiers ?? [])].sort((a, b) => a.minDays - b.minDays);
        const rows: TierRow[] = tiers.map((tier) => ({ range: describeTier(tier), price: `${formatMoney(tier.dailyPrice)}/day` }));

        rows.push({ range: tiers.length ? 'All other durations' : 'Any duration', price: `${formatMoney(car.defaultDailyPrice)}/day`, isDefault: true });
        return rows;
    });

    constructor() {
        const params = this.route.snapshot.queryParamMap;
        this.pickupAt.set(parseDate(params.get('availableFrom')));
        this.returnAt.set(parseDate(params.get('availableTo')));

        this.route.paramMap
            .pipe(
                tap(() => {
                    this.loading.set(true);
                    this.unavailable.set(false);
                    this.failed.set(false);
                }),
                switchMap((paramMap) => this.publicCarService.getById(paramMap.get('carId') ?? '')),
                takeUntilDestroyed()
            )
            .subscribe({
                next: (car) => {
                    this.car.set(car);
                    this.activeImage.set(0);
                    this.loading.set(false);
                },
                error: (failure) => {
                    this.loading.set(false);
                    if (failure instanceof HttpErrorResponse && failure.status === 404) {
                        this.unavailable.set(true);
                    } else {
                        this.failed.set(true);
                    }
                }
            });
    }

    selectImage(index: number): void {
        this.activeImage.set(index);
    }

    /**
     * Anonymous visitors are sent to sign in and come straight back — dates and
     * all. Owners cannot book at all: `POST /rentals` is CLIENT-only.
     */
    requestBooking(): void {
        const pickup = this.pickupAt();
        const dropoff = this.returnAt();

        if (!pickup || !dropoff) {
            this.dateError.set('Choose a pick-up and a return time to continue.');
            return;
        }
        if (dropoff <= pickup) {
            this.dateError.set('The return time must be after the pick-up time.');
            return;
        }
        if (pickup <= new Date()) {
            this.dateError.set('Pick-up has to be in the future.');
            return;
        }
        this.dateError.set(null);

        const carId = this.car()?.id;
        if (!carId) {
            return;
        }

        const dates = { availableFrom: pickup.toISOString(), availableTo: dropoff.toISOString() };

        if (!this.authService.isLoggedIn()) {
            const returnUrl = this.router.createUrlTree(['/cars', carId], { queryParams: dates }).toString();
            void this.router.navigate(['/auth/login'], { queryParams: { returnUrl } });
            return;
        }

        void this.router.navigate(['/cars', carId, 'book'], { queryParams: { startAt: dates.availableFrom, endAt: dates.availableTo } });
    }
}

/** `"3–6 days"`, or `"7+ days"` when the tier is open-ended. */
function describeTier(tier: PriceTierResponse): string {
    if (tier.maxDays == null) {
        return `${tier.minDays}+ days`;
    }
    if (tier.maxDays === tier.minDays) {
        return `${tier.minDays} ${tier.minDays === 1 ? 'day' : 'days'}`;
    }
    return `${tier.minDays}–${tier.maxDays} days`;
}

function parseDate(value: string | null): Date | null {
    if (!value) {
        return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}
