import { ParamMap, Params } from '@angular/router';
import { PublicCarFilterRequest, PublicCarSort } from '../../core/models/car.model';

export const CATALOG_PAGE_SIZE = 12;

const SORTS: PublicCarSort[] = ['PRICE_ASC', 'PRICE_DESC', 'NEWEST', 'OLDEST'];

/**
 * The catalog keeps all of its state in the URL, so a search is shareable and
 * the back button works. This module is the single translation between query
 * params and the filter body the API expects.
 */
export interface CatalogState extends PublicCarFilterRequest {
    page: number;
}

export function readCatalogState(params: ParamMap): CatalogState {
    const sort = params.get('sort');

    return {
        cityId: params.get('cityId') || null,
        make: params.get('make') || null,
        model: params.get('model') || null,
        minDailyPrice: readNumber(params.get('minDailyPrice')),
        maxDailyPrice: readNumber(params.get('maxDailyPrice')),
        availableFrom: params.get('availableFrom') || null,
        availableTo: params.get('availableTo') || null,
        sort: sort && SORTS.includes(sort as PublicCarSort) ? (sort as PublicCarSort) : null,
        page: Math.max(0, readNumber(params.get('page')) ?? 0)
    };
}

/**
 * Only meaningful values reach the URL — `undefined` tells the router to drop
 * the key, which keeps a default search at a bare `/cars`.
 */
export function writeCatalogParams(state: CatalogState): Params {
    return {
        cityId: state.cityId || undefined,
        make: state.make?.trim() || undefined,
        model: state.model?.trim() || undefined,
        minDailyPrice: state.minDailyPrice ?? undefined,
        maxDailyPrice: state.maxDailyPrice ?? undefined,
        availableFrom: state.availableFrom || undefined,
        availableTo: state.availableTo || undefined,
        sort: state.sort || undefined,
        page: state.page > 0 ? state.page : undefined
    };
}

/** The filter body, without the paging that travels as query params. */
export function toFilterRequest(state: CatalogState): PublicCarFilterRequest {
    const { page: _page, ...filter } = state;
    return filter;
}

/** True when the user has narrowed anything — drives the "clear filters" affordance. */
export function hasActiveFilters(state: CatalogState): boolean {
    return Boolean(state.cityId || state.make || state.model || state.minDailyPrice != null || state.maxDailyPrice != null || state.availableFrom || state.availableTo);
}

function readNumber(value: string | null): number | null {
    if (value === null || value.trim() === '') {
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}
