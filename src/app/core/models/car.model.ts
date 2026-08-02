import { PublicCompanyResponse } from './company.model';

export type CarStatus = 'ACTIVE' | 'IN_MAINTENANCE' | 'RETIRED';

/** Sort options for `POST /public/cars/filter` — sent in the body, not the query. */
export type PublicCarSort = 'PRICE_ASC' | 'PRICE_DESC' | 'NEWEST' | 'OLDEST';

export interface CarImageResponse {
    id: string;
    url: string;
    /** Lowest position is the primary image. There is no reorder endpoint. */
    position: number;
}

export interface PriceTierResponse {
    id: string;
    minDays: number;
    /** Absent means an open-ended tier ("7 days and up"). */
    maxDays: number | null;
    dailyPrice: number;
}

export interface PriceTierRequest {
    minDays: number;
    maxDays?: number | null;
    dailyPrice: number;
}

/** `PUT /cars/{carId}/price-tiers` replaces the whole set at once. */
export interface ReplacePriceTiersRequest {
    tiers: PriceTierRequest[];
}

/** Row in the owner's fleet list. */
export interface CarSummaryResponse {
    id: string;
    make: string;
    model: string;
    modelYear: number;
    licensePlate: string;
    defaultDailyPrice: number;
    published: boolean;
    status: CarStatus;
}

/** Full owner-side car, with tiers and images. */
export interface CarResponse extends CarSummaryResponse {
    priceTiers: PriceTierResponse[];
    images: CarImageResponse[];
    createdAt: string;
    updatedAt: string;
}

/** Body of `POST /cars` and `PUT /cars/{carId}`. */
export interface SaveCarRequest {
    make: string;
    model: string;
    modelYear: number;
    licensePlate: string;
    defaultDailyPrice: number;
    status: CarStatus;
}

/** Public catalog card — no licence plate, no car status, no company contacts. */
export interface PublicCarSummaryResponse {
    id: string;
    make: string;
    model: string;
    modelYear: number;
    dailyPriceFrom: number;
    primaryImageUrl: string | null;
    company: PublicCompanyResponse;
}

export interface PublicCarDetailResponse {
    id: string;
    make: string;
    model: string;
    modelYear: number;
    defaultDailyPrice: number;
    dailyPriceFrom: number;
    priceTiers: PriceTierResponse[];
    /** First url is the primary image; may be empty. */
    imageUrls: string[];
    company: PublicCompanyResponse;
}

/**
 * Body of `POST /public/cars/filter`. `availableFrom` / `availableTo` are
 * both-or-neither; `page` and `size` travel as query parameters.
 */
export interface PublicCarFilterRequest {
    cityId?: string | null;
    make?: string | null;
    model?: string | null;
    minDailyPrice?: number | null;
    maxDailyPrice?: number | null;
    availableFrom?: string | null;
    availableTo?: string | null;
    sort?: PublicCarSort | null;
}
