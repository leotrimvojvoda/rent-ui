/**
 * Envelope every collection endpoint returns. `page` is 0-based, `size` defaults
 * to 20 and is capped at 100 server-side.
 */
export interface PageResponse<T> {
    data: T[];
    page: number;
    size: number;
    totalPages: number;
    totalElements: number;
}

/** Paging query parameters accepted by every collection endpoint. */
export interface PageQuery {
    page?: number;
    size?: number;
}

/** Endpoints that only acknowledge (signup, verify, resend, password reset). */
export interface MessageResponse {
    message: string;
}

export interface FieldError {
    field: string;
    message: string;
}

/**
 * The single error envelope used by controllers, the security filter chain and
 * the rate limiter alike. Branch on `code` — `message` is localised copy that
 * changes freely. `fieldErrors` is only present on `VALIDATION_FAILED`.
 */
export interface ApiError {
    code: string;
    message: string;
    timestamp: string;
    path: string;
    fieldErrors?: FieldError[];
}

/** Every code in API.md, in the order it is documented. */
export type ApiErrorCode =
    | 'VALIDATION_FAILED'
    | 'MALFORMED_REQUEST'
    | 'UNSUPPORTED_IMAGE_TYPE'
    | 'EMPTY_UPLOAD'
    | 'INVALID_RENTAL_PERIOD'
    | 'UNAUTHENTICATED'
    | 'INVALID_CREDENTIALS'
    | 'ACCOUNT_NOT_VERIFIED'
    | 'ACCOUNT_DISABLED'
    | 'INVALID_REFRESH_TOKEN'
    | 'ACCESS_DENIED'
    | 'RESOURCE_NOT_FOUND'
    | 'ENDPOINT_NOT_FOUND'
    | 'METHOD_NOT_ALLOWED'
    | 'CONFLICT'
    | 'INVALID_VERIFICATION_CODE'
    | 'VERIFICATION_CODE_EXPIRED'
    | 'TOO_MANY_VERIFICATION_ATTEMPTS'
    | 'COMPANY_REQUIRED'
    | 'COMPANY_ALREADY_EXISTS'
    | 'DUPLICATE_LICENSE_PLATE'
    | 'OVERLAPPING_PRICE_TIERS'
    | 'CAR_NOT_AVAILABLE'
    | 'INVALID_RENTAL_TRANSITION'
    | 'RENTAL_ALREADY_STARTED'
    | 'PAYLOAD_TOO_LARGE'
    | 'TOO_MANY_REQUESTS'
    | 'INTERNAL_ERROR'
    | 'STORAGE_UNAVAILABLE';
