import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { errorCodeOf, errorMessage } from '../../core/errors/api-error';
import { createCountdown } from '../../core/forms/countdown';
import { applyFieldErrors, clearServerErrors, clearServerErrorsOnEdit } from '../../core/forms/server-errors';
import { AuthService } from '../../core/services/auth.service';
import { FieldError } from '../../shared/components/field-error';
import { AuthCard } from './shared/auth-card';
import { CodeInput } from './shared/code-input';
import { handleRateLimit } from './shared/auth-form';

const CODE_LENGTH = 6;
/** Local courtesy cooldown; the server's own limit is 10 requests a minute. */
const RESEND_COOLDOWN_SECONDS = 60;

@Component({
    selector: 'app-verify-email',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule, InputTextModule, MessageModule, AuthCard, CodeInput, FieldError],
    templateUrl: './verify-email.html'
})
export class VerifyEmail {
    private authService = inject(AuthService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private fb = inject(FormBuilder);

    readonly rateLimit = createCountdown();
    readonly resendCooldown = createCountdown();

    readonly loading = signal(false);
    readonly resending = signal(false);
    readonly formError = signal<string | null>(null);
    readonly notice = signal<string | null>(null);
    /** Expired or exhausted codes are only fixable by resending — say so loudly. */
    readonly resendIsTheFix = signal(false);

    readonly form = this.fb.nonNullable.group({
        email: ['', [Validators.required, Validators.email]],
        code: ['', [Validators.required, Validators.minLength(CODE_LENGTH)]]
    });

    constructor() {
        clearServerErrorsOnEdit(this.form);

        const params = this.route.snapshot.queryParamMap;
        const email = params.get('email');
        if (email) {
            this.form.controls.email.setValue(email);
        }

        switch (params.get('from')) {
            case 'signup':
                // Enumeration-safe signup: we genuinely cannot say whether one was sent.
                this.notice.set('If this address is new, a verification code has been emailed to it.');
                break;
            case 'login':
                this.notice.set("This account isn't verified yet. Enter the code we emailed you, or send a new one.");
                break;
        }
    }

    onSubmit(): void {
        if (this.loading() || this.rateLimit.active()) {
            return;
        }
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.loading.set(true);
        this.formError.set(null);
        this.notice.set(null);
        this.resendIsTheFix.set(false);
        clearServerErrors(this.form);

        const { email, code } = this.form.getRawValue();

        this.authService.verifyEmail({ email, code }).subscribe({
            next: () => {
                this.loading.set(false);
                // Verifying does not sign anyone in — the contract returns no tokens.
                void this.router.navigate(['/auth/login'], { queryParams: { email, status: 'verified' } });
            },
            error: (failure) => {
                this.loading.set(false);
                this.handleFailure(failure);
            }
        });
    }

    resend(): void {
        if (this.resending() || this.resendCooldown.active() || this.rateLimit.active()) {
            return;
        }

        const email = this.form.controls.email;
        if (email.invalid) {
            email.markAsTouched();
            return;
        }

        this.resending.set(true);
        this.formError.set(null);

        this.authService.resendVerification(email.value).subscribe({
            next: () => {
                this.resending.set(false);
                this.resendIsTheFix.set(false);
                this.form.controls.code.reset('');
                this.resendCooldown.start(RESEND_COOLDOWN_SECONDS);
                this.notice.set('A new code is on its way. The previous code no longer works.');
            },
            error: (failure) => {
                this.resending.set(false);
                if (handleRateLimit(failure, this.rateLimit)) {
                    return;
                }
                this.formError.set(errorMessage(failure, 'Could not send a new code. Please try again.'));
            }
        });
    }

    private handleFailure(failure: unknown): void {
        if (handleRateLimit(failure, this.rateLimit)) {
            return;
        }

        switch (errorCodeOf(failure)) {
            case 'INVALID_VERIFICATION_CODE':
                this.form.controls.code.setErrors({ server: 'That code is not valid. Check the digits and try again.' });
                this.form.controls.code.markAsTouched();
                return;
            case 'VERIFICATION_CODE_EXPIRED':
                this.formError.set('That code has expired. Request a new one below.');
                this.resendIsTheFix.set(true);
                return;
            case 'TOO_MANY_VERIFICATION_ATTEMPTS':
                this.formError.set('Too many incorrect attempts on this code. Request a new one below.');
                this.resendIsTheFix.set(true);
                return;
            case 'VALIDATION_FAILED': {
                const unmatched = applyFieldErrors(this.form, failure);
                this.formError.set(unmatched.length ? unmatched.join(' ') : null);
                return;
            }
            default:
                this.formError.set(errorMessage(failure, 'Could not verify that code. Please try again.'));
        }
    }
}
