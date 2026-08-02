import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { errorCodeOf, errorMessage } from '../../core/errors/api-error';
import { createCountdown } from '../../core/forms/countdown';
import { applyFieldErrors, clearServerErrors, clearServerErrorsOnEdit } from '../../core/forms/server-errors';
import { UserResponse } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { FieldError } from '../../shared/components/field-error';
import { AuthCard } from './shared/auth-card';
import { handleRateLimit } from './shared/auth-form';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule, InputTextModule, PasswordModule, MessageModule, AuthCard, FieldError],
    templateUrl: './login.html'
})
export class Login {
    private authService = inject(AuthService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private fb = inject(FormBuilder);

    readonly countdown = createCountdown();
    readonly loading = signal(false);
    readonly formError = signal<string | null>(null);
    /** Set after arriving from verify-email or password reset. */
    readonly notice = signal<string | null>(null);

    readonly form = this.fb.nonNullable.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required]]
    });

    constructor() {
        clearServerErrorsOnEdit(this.form);

        const params = this.route.snapshot.queryParamMap;
        const email = params.get('email');
        if (email) {
            this.form.controls.email.setValue(email);
        }

        switch (params.get('status')) {
            case 'verified':
                this.notice.set('Your email is verified — sign in to continue.');
                break;
            case 'password-reset':
                this.notice.set('Your password has been changed. Sign in with the new one.');
                break;
        }
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
        this.notice.set(null);
        clearServerErrors(this.form);

        const { email, password } = this.form.getRawValue();

        this.authService.login({ email, password }).subscribe({
            next: (user) => {
                this.loading.set(false);
                void this.router.navigateByUrl(this.destination(user));
            },
            error: (failure) => {
                this.loading.set(false);
                this.handleFailure(failure, email);
            }
        });
    }

    /** Every branch is on `code` — `message` is localised copy that moves. */
    private handleFailure(failure: unknown, email: string): void {
        if (handleRateLimit(failure, this.countdown)) {
            return;
        }

        switch (errorCodeOf(failure)) {
            case 'ACCOUNT_NOT_VERIFIED':
                // Not a dead end: the code is already in their inbox.
                void this.router.navigate(['/auth/verify-email'], { queryParams: { email, from: 'login' } });
                return;
            case 'INVALID_CREDENTIALS':
                this.formError.set('That email and password combination is not right.');
                return;
            case 'ACCOUNT_DISABLED':
                this.formError.set('This account is not active. Get in touch with support to reopen it.');
                return;
            case 'VALIDATION_FAILED': {
                const unmatched = applyFieldErrors(this.form, failure);
                this.formError.set(unmatched.length ? unmatched.join(' ') : null);
                return;
            }
            default:
                this.formError.set(errorMessage(failure, 'Sign in failed. Please try again.'));
        }
    }

    private destination(user: UserResponse): string {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (returnUrl && isInternalUrl(returnUrl)) {
            return returnUrl;
        }
        // ADMIN has no endpoints of its own, so it lands on the public catalog.
        return user.role === 'CLIENT' || user.role === 'OWNER' ? '/dashboard' : '/';
    }
}

/**
 * `returnUrl` arrives from the query string, so it is attacker-controllable.
 * Only in-app paths are followed — `//host` and `https://host` are not ours.
 */
function isInternalUrl(url: string): boolean {
    return url.startsWith('/') && !url.startsWith('//');
}
