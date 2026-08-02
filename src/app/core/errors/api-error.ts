import { HttpErrorResponse } from '@angular/common/http';
import { ApiError, ApiErrorCode, FieldError } from '../models/api.model';

/** Reads the `ApiError` envelope out of an HTTP failure, when there is one. */
export function toApiError(error: unknown): ApiError | null {
    if (!(error instanceof HttpErrorResponse)) {
        return null;
    }
    const body = error.error;
    if (body && typeof body === 'object' && typeof (body as ApiError).code === 'string') {
        return body as ApiError;
    }
    return null;
}

/** The stable `code` to branch on, or null when the server sent no envelope. */
export function errorCodeOf(error: unknown): string | null {
    return toApiError(error)?.code ?? null;
}

export function hasErrorCode(error: unknown, ...codes: ApiErrorCode[]): boolean {
    const code = errorCodeOf(error);
    return code !== null && codes.includes(code as ApiErrorCode);
}

/** Field errors from a `VALIDATION_FAILED` response; empty for anything else. */
export function fieldErrorsOf(error: unknown): FieldError[] {
    return toApiError(error)?.fieldErrors ?? [];
}

/** `Retry-After` in seconds from a 429, when the header is present and numeric. */
export function retryAfterSeconds(error: unknown): number | null {
    if (!(error instanceof HttpErrorResponse)) {
        return null;
    }
    const header = error.headers.get('Retry-After');
    if (!header) {
        return null;
    }
    const seconds = Number(header);
    return Number.isFinite(seconds) && seconds >= 0 ? Math.ceil(seconds) : null;
}

/** User-facing copy per error code — the single map PLAN.md §3 asks for. */
export const ERROR_COPY: Record<ApiErrorCode, { summary: string; detail: string }> = {
    VALIDATION_FAILED: {
        summary: 'Check the form',
        detail: 'Some fields need fixing before this can be saved.'
    },
    MALFORMED_REQUEST: {
        summary: 'Request could not be read',
        detail: 'Something in the request was malformed. Please try again.'
    },
    UNSUPPORTED_IMAGE_TYPE: {
        summary: 'Unsupported image',
        detail: 'Only JPEG, PNG and WebP images are accepted.'
    },
    EMPTY_UPLOAD: {
        summary: 'No file selected',
        detail: 'Choose an image before uploading.'
    },
    INVALID_RENTAL_PERIOD: {
        summary: 'Check the dates',
        detail: 'The return time must be after the pickup time.'
    },
    UNAUTHENTICATED: {
        summary: 'Sign in required',
        detail: 'Please sign in to continue.'
    },
    INVALID_CREDENTIALS: {
        summary: 'Sign in failed',
        detail: 'That email and password combination is not right.'
    },
    ACCOUNT_NOT_VERIFIED: {
        summary: 'Email not verified',
        detail: 'Enter the verification code we emailed you.'
    },
    ACCOUNT_DISABLED: {
        summary: 'Account inactive',
        detail: 'This account is not active. Contact support for help.'
    },
    INVALID_REFRESH_TOKEN: {
        summary: 'Session expired',
        detail: 'Please sign in again.'
    },
    ACCESS_DENIED: {
        summary: 'Not allowed',
        detail: 'Your account cannot perform this action.'
    },
    RESOURCE_NOT_FOUND: {
        summary: 'Not found',
        detail: 'That item does not exist, or is no longer available to you.'
    },
    ENDPOINT_NOT_FOUND: {
        summary: 'Not found',
        detail: 'That page or action does not exist.'
    },
    METHOD_NOT_ALLOWED: {
        summary: 'Not supported',
        detail: 'That action is not supported here.'
    },
    CONFLICT: {
        summary: 'Conflict',
        detail: 'This clashes with the current state. Refresh and try again.'
    },
    INVALID_VERIFICATION_CODE: {
        summary: 'Code not valid',
        detail: 'Check the code and try again.'
    },
    VERIFICATION_CODE_EXPIRED: {
        summary: 'Code expired',
        detail: 'Request a new code and try again.'
    },
    TOO_MANY_VERIFICATION_ATTEMPTS: {
        summary: 'Too many attempts',
        detail: 'Request a new code and try again.'
    },
    COMPANY_REQUIRED: {
        summary: 'Company needed',
        detail: 'Create your company before managing cars.'
    },
    COMPANY_ALREADY_EXISTS: {
        summary: 'Company already exists',
        detail: 'You already have a company.'
    },
    DUPLICATE_LICENSE_PLATE: {
        summary: 'Plate already used',
        detail: 'Another car in your company already uses that licence plate.'
    },
    OVERLAPPING_PRICE_TIERS: {
        summary: 'Overlapping tiers',
        detail: 'Price tiers must not cover overlapping day ranges.'
    },
    CAR_NOT_AVAILABLE: {
        summary: 'Car not available',
        detail: 'That car is already booked for part of those dates.'
    },
    INVALID_RENTAL_TRANSITION: {
        summary: 'Status changed',
        detail: 'This rental can no longer change that way. The list has been refreshed.'
    },
    RENTAL_ALREADY_STARTED: {
        summary: 'Pickup time passed',
        detail: 'This rental can no longer be cancelled.'
    },
    PAYLOAD_TOO_LARGE: {
        summary: 'File too large',
        detail: 'Images must be 10 MB or smaller.'
    },
    TOO_MANY_REQUESTS: {
        summary: 'Too many requests',
        detail: 'Please wait a moment and try again.'
    },
    INTERNAL_ERROR: {
        summary: 'Something went wrong',
        detail: 'The server hit an error. Please try again.'
    },
    STORAGE_UNAVAILABLE: {
        summary: 'Image service unavailable',
        detail: 'Nothing was saved — please try the upload again.'
    }
};

export const NETWORK_ERROR_COPY = {
    summary: 'Network error',
    detail: 'The server could not be reached. Check your connection.'
};

/**
 * Codes a form or page owns. The interceptor never toasts these — the page that
 * made the call renders them inline where the user can act on them.
 */
const PAGE_OWNED_CODES: ReadonlySet<string> = new Set<ApiErrorCode>([
    // Forms bind these to their controls.
    'VALIDATION_FAILED',
    // Auth screens branch on these and render inline guidance.
    'INVALID_CREDENTIALS',
    'ACCOUNT_NOT_VERIFIED',
    'ACCOUNT_DISABLED',
    'INVALID_VERIFICATION_CODE',
    'VERIFICATION_CODE_EXPIRED',
    'TOO_MANY_VERIFICATION_ATTEMPTS',
    'TOO_MANY_REQUESTS',
    // Owned by the refresh flow in the auth interceptor.
    'UNAUTHENTICATED',
    'INVALID_REFRESH_TOKEN',
    // Business conflicts handled inline by the page that triggered them.
    'INVALID_RENTAL_PERIOD',
    'COMPANY_REQUIRED',
    'COMPANY_ALREADY_EXISTS',
    'DUPLICATE_LICENSE_PLATE',
    'OVERLAPPING_PRICE_TIERS',
    'CAR_NOT_AVAILABLE',
    'INVALID_RENTAL_TRANSITION',
    'RENTAL_ALREADY_STARTED',
    // Image manager reports these against the file being uploaded.
    'UNSUPPORTED_IMAGE_TYPE',
    'EMPTY_UPLOAD',
    'PAYLOAD_TOO_LARGE',
    'STORAGE_UNAVAILABLE',
    // 404 routes to a not-found or "no longer available" state, never a toast.
    'RESOURCE_NOT_FOUND'
]);

/**
 * What the global toast should say about this failure, or null when nobody
 * should toast it (page-owned, or already surfaced elsewhere).
 */
export function globalToastFor(error: unknown): { summary: string; detail: string } | null {
    if (!(error instanceof HttpErrorResponse)) {
        return null;
    }
    if (error.status === 0) {
        return NETWORK_ERROR_COPY;
    }

    const apiError = toApiError(error);
    if (!apiError) {
        // No envelope: only worth a toast when the server itself broke.
        return error.status >= 500 ? ERROR_COPY.INTERNAL_ERROR : null;
    }
    if (PAGE_OWNED_CODES.has(apiError.code)) {
        return null;
    }

    const known = ERROR_COPY[apiError.code as ApiErrorCode];
    // Unknown codes fall back to the server's own message.
    return known ?? { summary: 'Something went wrong', detail: apiError.message };
}

/** Inline copy for a code, falling back to the server message then a generic line. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
    const apiError = toApiError(error);
    if (!apiError) {
        return error instanceof HttpErrorResponse && error.status === 0 ? NETWORK_ERROR_COPY.detail : fallback;
    }
    return ERROR_COPY[apiError.code as ApiErrorCode]?.detail ?? apiError.message ?? fallback;
}
