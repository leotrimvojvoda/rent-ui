import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { CityResponse, cityLabel, cityName } from '../../core/models/city.model';
import { PublicCarSummaryResponse } from '../../core/models/car.model';
import { CityService } from '../../core/services/city.service';
import { PublicCarService } from '../../core/services/public-car.service';
import { formatMoney } from '../../shared/utils/format';

/**
 * Marketing copy for the "How it works" band. Static by design — it describes
 * the product, so it has no API behind it.
 */
const STEPS = [
    { n: '1', title: 'Choose dates & location', body: "Tell us where and when — we'll show every available car with the final price upfront." },
    { n: '2', title: 'Request in under a minute', body: 'No hidden fees, no paperwork. The rental company reviews your request and confirms.' },
    { n: '3', title: 'Pick up and drive', body: "Your booking carries the company's address and contact details for pick-up." }
];

/**
 * PLACEHOLDER COPY, carried over from the design file. There is no reviews or
 * ratings feature in the API, so none of this is real customer feedback —
 * replace it with genuine, attributable testimonials or delete the section
 * before this page goes in front of the public.
 */
const PLACEHOLDER_REVIEWS = [
    { quote: 'Booked at midnight, picked the car up at 8 AM. The price I saw was the price I paid.', initials: 'MR', name: 'Marcus R.', meta: 'Rented a Corolla · June 2026' },
    { quote: 'Free cancellation saved my trip when my flight changed. Rebooked in two taps.', initials: 'AL', name: 'Aisha L.', meta: 'Rented a Model 3 · May 2026' },
    { quote: "Counter pickup took five minutes. Cleanest rental I've ever driven.", initials: 'JT', name: 'Jonas T.', meta: 'Rented a CR-V · July 2026' }
];

/** Rotating card art, standing in for cars that have no photo uploaded yet. */
const PLACEHOLDER_CAR_COLORS = ['#7fa8c9', '#c9515e', '#6b8f5e', '#8a7fc9'];

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [RouterModule, FormsModule, SelectModule, DatePickerModule],
    templateUrl: './home.html'
})
export class Home {
    private cityService = inject(CityService);
    private publicCarService = inject(PublicCarService);
    private router = inject(Router);

    readonly steps = STEPS;
    readonly reviews = PLACEHOLDER_REVIEWS;

    readonly cities = signal<CityResponse[]>([]);
    readonly cityId = signal<string | null>(null);
    readonly pickupAt = signal<Date | null>(null);
    readonly returnAt = signal<Date | null>(null);
    readonly dateError = signal<string | null>(null);

    readonly popularCars = signal<PublicCarSummaryResponse[]>([]);
    readonly popularLoading = signal(true);
    readonly popularFailed = signal(false);

    /** The whole band is hidden when there is nothing real to show. */
    readonly showPopular = computed(() => this.popularLoading() || this.popularCars().length > 0);

    /** Pick-up cannot be in the past, and the return cannot precede the pick-up. */
    readonly minPickup = new Date();
    readonly minReturn = computed(() => this.pickupAt() ?? this.minPickup);

    constructor() {
        // Both loads are decorative: a visitor can still navigate if the API is
        // down, so failures degrade in place rather than raising a toast.
        this.cityService.list(true).subscribe({
            next: (cities) => this.cities.set(cities),
            error: () => this.cities.set([])
        });

        this.publicCarService.search({ sort: 'NEWEST' }, { page: 0, size: 4 }, true).subscribe({
            next: (page) => {
                this.popularCars.set(page.data ?? []);
                this.popularLoading.set(false);
            },
            error: () => {
                this.popularFailed.set(true);
                this.popularLoading.set(false);
            }
        });
    }

    cityOptions = computed(() => this.cities().map((city) => ({ label: cityLabel(city), value: city.id })));

    carColor(index: number): string {
        return PLACEHOLDER_CAR_COLORS[index % PLACEHOLDER_CAR_COLORS.length];
    }

    carLocation(car: PublicCarSummaryResponse): string {
        return cityName(car.company.city);
    }

    /** `€40.00` — always two decimals, never recomputed client-side. */
    price(car: PublicCarSummaryResponse): string {
        return formatMoney(car.dailyPriceFrom);
    }

    /**
     * Hands the search over to the catalog as URL state. Availability dates are
     * both-or-neither in the contract, so the form enforces that before leaving.
     */
    search(): void {
        const pickup = this.pickupAt();
        const dropoff = this.returnAt();

        if ((pickup && !dropoff) || (!pickup && dropoff)) {
            this.dateError.set('Choose both a pick-up and a return time, or neither.');
            return;
        }
        if (pickup && dropoff && dropoff <= pickup) {
            this.dateError.set('The return time must be after the pick-up time.');
            return;
        }
        this.dateError.set(null);

        void this.router.navigate(['/cars'], {
            queryParams: {
                cityId: this.cityId() ?? undefined,
                // The API speaks UTC instants; the pickers speak local time.
                availableFrom: pickup?.toISOString(),
                availableTo: dropoff?.toISOString()
            }
        });
    }
}
