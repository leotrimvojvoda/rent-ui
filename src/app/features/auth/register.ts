import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { errorCodeOf, errorMessage } from '../../core/errors/api-error';
import { createCountdown } from '../../core/forms/countdown';
import { applyFieldErrors, clearServerErrors, clearServerErrorsOnEdit } from '../../core/forms/server-errors';
import { SignupRole } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { FieldError } from '../../shared/components/field-error';
import { AuthCard } from './shared/auth-card';
import { MIN_PASSWORD_LENGTH, handleRateLimit, matchesControl } from './shared/auth-form';

interface RoleOption {
    value: SignupRole;
    icon: string;
    title: string;
    body: string;
}

/** The persona is fixed at signup and cannot be changed later, so it leads the form. */
const ROLE_OPTIONS: RoleOption[] = [
    { value: 'CLIENT', icon: 'pi pi-car', title: 'I want to rent cars', body: 'Browse the catalog and book from local companies.' },
    { value: 'OWNER', icon: 'pi pi-building', title: 'I run a rental company', body: 'List your fleet and handle booking requests.' }
];

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule, InputTextModule, PasswordModule, MessageModule, AuthCard, FieldError],
    templateUrl: './register.html'
})
export class Register {
    private authService = inject(AuthService);
    private router = inject(Router);
    private fb = inject(FormBuilder);

    readonly roleOptions = ROLE_OPTIONS;
    readonly minPasswordLength = MIN_PASSWORD_LENGTH;

    readonly countdown = createCountdown();
    readonly loading = signal(false);
    readonly formError = signal<string | null>(null);

    readonly form = this.fb.nonNullable.group({
        role: ['CLIENT' as SignupRole, [Validators.required]],
        firstName: ['', [Validators.required, Validators.maxLength(100)]],
        lastName: ['', [Validators.required, Validators.maxLength(100)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
        confirmPassword: ['', [Validators.required, matchesControl('password')]]
    });

    private readonly password = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });

    /** Live hint. The server's `fieldErrors` remain the authority on the real policy. */
    readonly passwordLongEnough = computed(() => this.password().length >= MIN_PASSWORD_LENGTH);

    constructor() {
        clearServerErrorsOnEdit(this.form);

        // Re-check the confirmation whenever the password itself changes.
        this.form.controls.password.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.form.controls.confirmPassword.updateValueAndValidity({ emitEvent: false }));
    }

    selectRole(role: SignupRole): void {
        this.form.controls.role.setValue(role);
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

        const { firstName, lastName, email, password, role } = this.form.getRawValue();

        this.authService.signup({ firstName, lastName, email, password, role }).subscribe({
            next: () => {
                this.loading.set(false);
                // Signup is enumeration-safe: an existing address returns the very
                // same 202, so the next screen must not promise a code was sent.
                void this.router.navigate(['/auth/verify-email'], { queryParams: { email, from: 'signup' } });
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
                this.formError.set(errorMessage(failure, 'Sign up failed. Please try again.'));
            }
        });
    }
}
