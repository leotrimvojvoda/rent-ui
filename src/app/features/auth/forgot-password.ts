import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { errorCodeOf, errorMessage } from '../../core/errors/api-error';
import { createCountdown } from '../../core/forms/countdown';
import { applyFieldErrors, clearServerErrors, clearServerErrorsOnEdit } from '../../core/forms/server-errors';
import { AuthService } from '../../core/services/auth.service';
import { FieldError } from '../../shared/components/field-error';
import { AuthCard } from './shared/auth-card';
import { handleRateLimit } from './shared/auth-form';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule, InputTextModule, MessageModule, AuthCard, FieldError],
    templateUrl: './forgot-password.html'
})
export class ForgotPassword {
    private authService = inject(AuthService);
    private fb = inject(FormBuilder);

    readonly countdown = createCountdown();
    readonly loading = signal(false);
    readonly formError = signal<string | null>(null);
    /** The request always returns 202, so success is a state, not a message. */
    readonly submitted = signal(false);

    readonly form = this.fb.nonNullable.group({
        email: ['', [Validators.required, Validators.email]]
    });

    constructor() {
        clearServerErrorsOnEdit(this.form);
    }

    get email(): string {
        return this.form.controls.email.value;
    }

    onSubmit(): void {
        if (this.loading() || this.countdown.active()) {
            return;
        }
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.loading.set(true);
        this.formError.set(null);
        clearServerErrors(this.form);

        this.authService.requestPasswordReset(this.email).subscribe({
            next: () => {
                this.loading.set(false);
                // Identical 202 whether or not the address exists — the copy on the
                // confirmation screen must not imply an account was found.
                this.submitted.set(true);
            },
            error: (failure) => {
                this.loading.set(false);
                if (handleRateLimit(failure, this.countdown)) {
                    return;
                }
                if (errorCodeOf(failure) === 'VALIDATION_FAILED') {
                    const unmatched = applyFieldErrors(this.form, failure);
                    this.formError.set(unmatched.length ? unmatched.join(' ') : null);
                    return;
                }
                this.formError.set(errorMessage(failure, 'Could not send the reset code. Please try again.'));
            }
        });
    }
}
