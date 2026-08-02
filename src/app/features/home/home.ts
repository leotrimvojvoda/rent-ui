import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { CityResponse, cityLabel } from '../../core/models/city.model';
import { PublicCarSummaryResponse } from '../../core/models/car.model';
import { CityService } from '../../core/services/city.service';
import { CarCard, CarCardSkeleton } from '../../shared/components/car-card';
import { PublicCarService } from '../../core/services/public-car.service';

/**
 * Marketing copy for the "How it works" band. Static by design — it describes
 * the product, so it has no API behind it.
 */
const STEPS = [
    { n: '1', title: 'Choose dates & location', body: "Tell us where and when — we'll show every available car with the final price upfront." },
    { n: '2', title: 'Request in under a minute', body: 'No hidden fees, no paperwork. The rental company reviews your request and confirms.' },
    { n: '3', title: 'Pick up and drive', body: "Your booking carries the company's address and contact details for pick-up." }
];

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [RouterModule, FormsModule, SelectModule, DatePickerModule, CarCard, CarCardSkeleton],
    templateUrl: './home.html'
})
export class Home {
    private cityService = inject(CityService);
    private publicCarService = inject(PublicCarService);
    private router = inject(Router);

    readonly steps = STEPS;

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
