import { Component, computed, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PublicCarSummaryResponse } from '../../core/models/car.model';
import { cityName } from '../../core/models/city.model';
import { formatMoney } from '../utils/format';

/** Rotating card art, standing in for cars with no photo uploaded yet. */
const PLACEHOLDER_COLORS = ['#7fa8c9', '#c9515e', '#6b8f5e', '#8a7fc9'];

/**
 * One catalog result. Shared by the landing page's "Popular near you" band and
 * the catalog grid so the two can never drift apart (PLAN.md §3.3).
 */
@Component({
    selector: 'app-car-card',
    standalone: true,
    imports: [RouterModule],
    template: `
        <a
            [routerLink]="['/cars', car().id]"
            [queryParams]="linkParams()"
            class="no-underline text-inherit bg-surface-0 dark:bg-surface-900 rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(15,40,30,0.07)] dark:shadow-none dark:border dark:border-surface transition-[transform,box-shadow] duration-150 hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(15,40,30,0.12)] block"
        >
            <div class="h-[130px] bg-keyway-shade dark:bg-surface-800 flex items-center justify-center relative">
                @if (car().primaryImageUrl) {
                    <img [src]="car().primaryImageUrl" [alt]="car().make + ' ' + car().model" class="w-full h-full object-cover" loading="lazy" />
                } @else {
                    <svg width="140" height="60" viewBox="0 0 120 52" fill="none" aria-hidden="true">
                        <path d="M14 38c0-2 1-9 4-12 8-8 20-10 32-10s26 2 34 10c3 3 16 4 20 8 2 2 2 4 2 4H14z" [attr.fill]="placeholderColor()"></path>
                        <path d="M38 18c5-2 12-2 18-2s13 0 18 2l6 8H32l6-8z" fill="rgba(255,255,255,0.35)"></path>
                        <circle cx="34" cy="40" r="7" fill="#2a2f2c"></circle>
                        <circle cx="34" cy="40" r="3" fill="#9aa39d"></circle>
                        <circle cx="94" cy="40" r="7" fill="#2a2f2c"></circle>
                        <circle cx="94" cy="40" r="3" fill="#9aa39d"></circle>
                    </svg>
                }
                @if (location()) {
                    <span class="absolute top-2.5 left-2.5 bg-keyway-green/90 text-white text-[10.5px] font-semibold px-2.5 py-1 rounded-full">{{ location() }}</span>
                }
            </div>

            <div class="p-4">
                <div class="text-base font-bold">{{ car().make }} {{ car().model }}</div>
                <div class="text-[12.5px] text-keyway-subtle mt-[3px]">{{ car().modelYear }} · {{ car().company.name }}</div>
                <div class="flex items-baseline justify-between mt-3">
                    <div>
                        <span class="text-lg font-bold text-primary">{{ price() }}</span>
                        <span class="text-[12.5px] text-keyway-subtle">/day</span>
                    </div>
                    <!-- dailyPriceFrom is a floor: longer rentals can price lower per day. -->
                    <span class="text-[13px] font-semibold text-muted-color">from</span>
                </div>
            </div>
        </a>
    `
})
export class CarCard {
    car = input.required<PublicCarSummaryResponse>();
    /** Only used to vary the placeholder art across a grid. */
    index = input<number>(0);
    /** Carried onto the detail link so a searched date range survives the click. */
    linkParams = input<Record<string, string>>({});

    readonly location = computed(() => cityName(this.car().company?.city));
    readonly price = computed(() => formatMoney(this.car().dailyPriceFrom));
    readonly placeholderColor = computed(() => PLACEHOLDER_COLORS[this.index() % PLACEHOLDER_COLORS.length]);
}

/** The loading shape of a `CarCard` — same dimensions, no content. */
@Component({
    selector: 'app-car-card-skeleton',
    standalone: true,
    template: `
        <div class="bg-surface-0 dark:bg-surface-900 rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(15,40,30,0.07)] dark:shadow-none dark:border dark:border-surface" aria-hidden="true">
            <div class="h-[130px] bg-keyway-shade dark:bg-surface-800 animate-pulse"></div>
            <div class="p-4 flex flex-col gap-2">
                <div class="h-4 w-2/3 rounded bg-keyway-shade dark:bg-surface-800 animate-pulse"></div>
                <div class="h-3 w-1/2 rounded bg-keyway-shade dark:bg-surface-800 animate-pulse"></div>
                <div class="h-5 w-1/3 rounded bg-keyway-shade dark:bg-surface-800 animate-pulse mt-2"></div>
            </div>
        </div>
    `
})
export class CarCardSkeleton {}
