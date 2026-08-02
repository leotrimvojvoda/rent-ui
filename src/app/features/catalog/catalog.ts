import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { switchMap, tap } from 'rxjs';
import { PublicCarSort, PublicCarSummaryResponse } from '../../core/models/car.model';
import { CityResponse, cityLabel } from '../../core/models/city.model';
import { CityService } from '../../core/services/city.service';
import { PublicCarService } from '../../core/services/public-car.service';
import { CarCard, CarCardSkeleton } from '../../shared/components/car-card';
import { EmptyState } from '../../shared/components/empty-state';
import { Pager } from '../../shared/components/pager';
import { CATALOG_PAGE_SIZE, CatalogState, hasActiveFilters, readCatalogState, toFilterRequest, writeCatalogParams } from './catalog-params';

const SORT_OPTIONS: { label: string; value: PublicCarSort }[] = [
    { label: 'Price: low to high', value: 'PRICE_ASC' },
    { label: 'Price: high to low', value: 'PRICE_DESC' },
    { label: 'Newest first', value: 'NEWEST' },
    { label: 'Oldest first', value: 'OLDEST' }
];

@Component({
    selector: 'app-catalog',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule, SelectModule, DatePickerModule, InputTextModule, InputNumberModule, MessageModule, CarCard, CarCardSkeleton, EmptyState, Pager],
    templateUrl: './catalog.html'
})
export class Catalog {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private cityService = inject(CityService);
    private publicCarService = inject(PublicCarService);
    private fb = inject(FormBuilder);

    readonly sortOptions = SORT_OPTIONS;
    readonly pageSize = CATALOG_PAGE_SIZE;
    readonly skeletons = Array.from({ length: CATALOG_PAGE_SIZE }, (_, index) => index);

    readonly cities = signal<CityResponse[]>([]);
    readonly cars = signal<PublicCarSummaryResponse[]>([]);
    readonly loading = signal(true);
    readonly failed = signal(false);
    readonly page = signal(0);
    readonly totalPages = signal(0);
    readonly totalElements = signal(0);
    readonly filterError = signal<string | null>(null);

    /** The state the current results belong to — not the in-progress form. */
    readonly appliedState = signal<CatalogState | null>(null);
    readonly filtersActive = computed(() => {
        const state = this.appliedState();
        return state ? hasActiveFilters(state) : false;
    });

    readonly form = this.fb.group({
        cityId: [null as string | null],
        make: [null as string | null],
        model: [null as string | null],
        minDailyPrice: [null as number | null],
        maxDailyPrice: [null as number | null],
        availableFrom: [null as Date | null],
        availableTo: [null as Date | null],
        sort: [null as PublicCarSort | null]
    });

    readonly now = new Date();
    readonly minReturn = computed(() => this.form.controls.availableFrom.value ?? this.now);

    /** Dates on a result page mean "free for this window" — carry them to detail. */
    readonly detailParams = computed<Record<string, string>>(() => {
        const params: Record<string, string> = {};
        const state = this.appliedState();

        if (state?.availableFrom && state?.availableTo) {
            params['availableFrom'] = state.availableFrom;
            params['availableTo'] = state.availableTo;
        }
        return params;
    });

    constructor() {
        this.cityService.list(true).subscribe({
            next: (cities) => this.cities.set(cities),
            error: () => this.cities.set([])
        });

        // The URL is the source of truth: every search, sort and page change is a
        // navigation, and this is the single place that reacts to one.
        this.route.queryParamMap
            .pipe(
                tap((params) => {
                    const state = readCatalogState(params);
                    this.syncForm(state);
                    this.appliedState.set(state);
                    this.page.set(state.page);
                    this.loading.set(true);
                    this.failed.set(false);
                }),
                switchMap((params) => {
                    const state = readCatalogState(params);
                    return this.publicCarService.search(toFilterRequest(state), { page: state.page, size: CATALOG_PAGE_SIZE });
                }),
                takeUntilDestroyed()
            )
            .subscribe({
                next: (result) => {
                    this.cars.set(result.data ?? []);
                    this.totalPages.set(result.totalPages ?? 0);
                    this.totalElements.set(result.totalElements ?? 0);
                    this.loading.set(false);
                },
                error: () => {
                    this.cars.set([]);
                    this.totalElements.set(0);
                    this.totalPages.set(0);
                    this.failed.set(true);
                    this.loading.set(false);
                }
            });
    }

    cityOptions = computed(() => this.cities().map((city) => ({ label: cityLabel(city), value: city.id })));

    /** Explicit search: validate, then hand the state to the URL. */
    onSearch(): void {
        const error = this.validate();
        this.filterError.set(error);
        if (error) {
            return;
        }
        this.navigate(0);
    }

    /** Sorting is not a filter, so it re-runs immediately — but still resets paging. */
    onSortChange(): void {
        if (this.validate()) {
            return;
        }
        this.navigate(0);
    }

    onPageChange(page: number): void {
        this.navigate(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    clearFilters(): void {
        this.form.reset({ cityId: null, make: null, model: null, minDailyPrice: null, maxDailyPrice: null, availableFrom: null, availableTo: null, sort: this.form.controls.sort.value });
        this.filterError.set(null);
        this.navigate(0);
    }

    /**
     * Availability must be sent both-or-neither, and a backwards range or an
     * inverted price band is worth catching before it reaches the server.
     */
    private validate(): string | null {
        const { availableFrom, availableTo, minDailyPrice, maxDailyPrice } = this.form.getRawValue();

        if ((availableFrom && !availableTo) || (!availableFrom && availableTo)) {
            return 'Choose both a pick-up and a return time, or neither.';
        }
        if (availableFrom && availableTo && availableTo <= availableFrom) {
            return 'The return time must be after the pick-up time.';
        }
        if (minDailyPrice != null && maxDailyPrice != null && minDailyPrice > maxDailyPrice) {
            return 'The lowest price cannot be above the highest price.';
        }
        return null;
    }

    private navigate(page: number): void {
        const { cityId, make, model, minDailyPrice, maxDailyPrice, availableFrom, availableTo, sort } = this.form.getRawValue();

        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: writeCatalogParams({
                cityId,
                make,
                model,
                minDailyPrice,
                maxDailyPrice,
                // The pickers speak local time; the API speaks UTC instants.
                availableFrom: availableFrom ? availableFrom.toISOString() : null,
                availableTo: availableTo ? availableTo.toISOString() : null,
                sort,
                page
            })
        });
    }

    /** Mirrors URL state back into the controls, so reload and back both restore it. */
    private syncForm(state: CatalogState): void {
        this.form.setValue(
            {
                cityId: state.cityId ?? null,
                make: state.make ?? null,
                model: state.model ?? null,
                minDailyPrice: state.minDailyPrice ?? null,
                maxDailyPrice: state.maxDailyPrice ?? null,
                availableFrom: state.availableFrom ? new Date(state.availableFrom) : null,
                availableTo: state.availableTo ? new Date(state.availableTo) : null,
                sort: state.sort ?? null
            },
            { emitEvent: false }
        );
    }
}
