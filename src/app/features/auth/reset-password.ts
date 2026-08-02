import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { errorCodeOf, errorMessage } from '../../core/errors/api-error';
import { createCountdown } from '../../core/forms/countdown';
import { applyFieldErrors, clearServerErrors, clearServerErrorsOnEdit } from '../../core/forms/server-errors';
import { AuthService } from '../../core/services/auth.service';
import { FieldError } from '../../shared/components/field-error';
import { AuthCard } from './shared/auth-card';
import { CodeInput } from './shared/code-input';
import { MIN_PASSWORD_LENGTH, handleRateLimit, matchesControl } from './shared/auth-form';

const CODE_LENGTH = 6;

@Component({
    selector: 'app-reset-password',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule, InputTextModule, PasswordModule, MessageModule, AuthCard, CodeInput, FieldError],
    templateUrl: './reset-password.html'
})
export class ResetPassword {
    private authService = inject(AuthService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private fb = inject(FormBuilder);

    readonly minPasswordLength = MIN_PASSWORD_LENGTH;

    readonly countdown = createCountdown();
    readonly loading = signal(false);
    readonly formError = signal<string | null>(null);
    /** An expired or exhausted code can only be replaced from the forgot screen. */
    readonly needsNewCode = signal(false);

    readonly form = this.fb.nonNullable.group({
        email: ['', [Validators.required, Validators.email]],
        code: ['', [Validators.required, Validators.minLength(CODE_LENGTH)]],
        newPassword: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
        confirmPassword: ['', [Validators.required, matchesControl('newPassword')]]
    });

    private readonly password = toSignal(this.form.controls.newPassword.valueChanges, { initialValue: '' });
    readonly passwordLongEnough = computed(() => this.password().length >= MIN_PASSWORD_LENGTH);

    constructor() {
        clearServerErrorsOnEdit(this.form);

        const email = this.route.snapshot.queryParamMap.get('email');
        if (email) {
            this.form.controls.email.setValue(email);
        }

        this.form.controls.newPassword.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.form.controls.confirmPassword.updateValueAndValidity({ emitEvent: false }));
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
        this.needsNewCode.set(false);
        clearServerErrors(this.form);

        const { email, code, newPassword } = this.form.getRawValue();

        this.authService.confirmPasswordReset({ email, code, newPassword }).subscribe({
            next: () => {
                this.loading.set(false);
                // Confirming revokes every refresh token, so any other session is
                // now dead too — signing in again is the only way forward.
                void this.router.navigate(['/auth/login'], { queryParams: { email, status: 'password-reset' } });
            },
            error: (failure) => {
                this.loading.set(false);
                this.handleFailure(failure);
            }
        });
    }

    private handleFailure(failure: unknown): void {
        if (handleRateLimit(failure, this.countdown)) {
            return;
        }

        switch (errorCodeOf(failure)) {
            case 'INVALID_VERIFICATION_CODE':
                this.form.controls.code.setErrors({ server: 'That code is not valid. Check the digits and try again.' });
                this.form.controls.code.markAsTouched();
                return;
            case 'VERIFICATION_CODE_EXPIRED':
                this.formError.set('That code has expired. Request a fresh one to continue.');
                this.needsNewCode.set(true);
                return;
            case 'TOO_MANY_VERIFICATION_ATTEMPTS':
                this.formError.set('Too many incorrect attempts on this code. Request a fresh one to continue.');
                this.needsNewCode.set(true);
                return;
            case 'VALIDATION_FAILED': {
                const unmatched = applyFieldErrors(this.form, failure);
                this.formError.set(unmatched.length ? unmatched.join(' ') : null);
                return;
            }
            default:
                this.formError.set(errorMessage(failure, 'Could not change the password. Please try again.'));
        }
    }
}
