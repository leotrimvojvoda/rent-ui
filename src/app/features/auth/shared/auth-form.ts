import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { retryAfterSeconds } from '../../../core/errors/api-error';
import { Countdown } from '../../../core/forms/countdown';

/** The contract documents only "at least 10 characters" — mirror exactly that. */
export const MIN_PASSWORD_LENGTH = 10;

/**
 * Starts the retry window when the auth rate limiter pushes back, and reports
 * whether it did — so callers can skip their own error copy.
 *
 * Only `/auth/*` is rate limited, and only these screens talk to it, so this
 * lives here rather than in the interceptor.
 */
export function handleRateLimit(error: unknown, countdown: Countdown): boolean {
    if (!(error instanceof HttpErrorResponse) || error.status !== 429) {
        return false;
    }
    // The header is the server's number; a minute is a safe stand-in without it.
    countdown.start(retryAfterSeconds(error) ?? 60);
    return true;
}

/** Cross-field validator putting a `mismatch` error on the confirmation control. */
export function matchesControl(sourceName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const source = control.parent?.get(sourceName);
        if (!source || !control.value) {
            return null;
        }
        return source.value === control.value ? null : { mismatch: true };
    };
}
