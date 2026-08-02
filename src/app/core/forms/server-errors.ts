import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormGroup } from '@angular/forms';
import { fieldErrorsOf } from '../errors/api-error';

/** Key the server's message is parked under, alongside any client validators. */
const SERVER_ERROR = 'server';

/**
 * Binds a `VALIDATION_FAILED` response onto the form. Anything whose `field`
 * has no matching control comes back for the form-level summary, so a server
 * message can never be silently swallowed.
 */
export function applyFieldErrors(form: FormGroup, error: unknown): string[] {
    const unmatched: string[] = [];

    for (const fieldError of fieldErrorsOf(error)) {
        const control = form.get(fieldError.field);
        if (control) {
            control.setErrors({ ...(control.errors ?? {}), [SERVER_ERROR]: fieldError.message });
            control.markAsTouched();
        } else {
            unmatched.push(fieldError.message);
        }
    }

    return unmatched;
}

/** The server's message for a control, if the last submit rejected it. */
export function serverErrorOf(control: AbstractControl | null): string | null {
    return (control?.errors?.[SERVER_ERROR] as string | undefined) ?? null;
}

/** Drops server errors across the form — call before re-submitting. */
export function clearServerErrors(form: FormGroup): void {
    for (const control of Object.values(form.controls)) {
        clearServerError(control);
    }
}

/**
 * Clears a control's server error as soon as the user edits it: the server's
 * verdict was about the old value, so keeping it visible is just wrong.
 * Call from an injection context.
 */
export function clearServerErrorsOnEdit(form: FormGroup): void {
    const destroyRef = inject(DestroyRef);

    for (const control of Object.values(form.controls)) {
        control.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => clearServerError(control));
    }
}

function clearServerError(control: AbstractControl): void {
    if (!control.errors?.[SERVER_ERROR]) {
        return;
    }
    // Re-running the validators is what drops the server key: it is the only
    // error nothing recomputes. Filtering the map by hand instead would wipe the
    // client errors Angular had just calculated for the new value.
    control.updateValueAndValidity({ emitEvent: false });
}
