import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { errorCodeOf, errorMessage } from '../../core/errors/api-error';
import { applyFieldErrors, clearServerErrors, clearServerErrorsOnEdit } from '../../core/forms/server-errors';
import { CityResponse, cityLabel } from '../../core/models/city.model';
import { CityService } from '../../core/services/city.service';
import { CompanyContextService } from '../../core/services/company-context.service';
import { ToastService } from '../../core/services/toast.service';
import { FieldError } from '../../shared/components/field-error';
import { buildCompanyForm, toSaveRequest } from './company-form';

@Component({
    selector: 'app-company-setup',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule, InputTextModule, TextareaModule, SelectModule, MessageModule, FieldError],
    templateUrl: './company-setup.html'
})
export class CompanySetup {
    private fb = inject(FormBuilder);
    private cityService = inject(CityService);
    private companyContext = inject(CompanyContextService);
    private router = inject(Router);
    private toast = inject(ToastService);

    readonly cities = signal<CityResponse[]>([]);
    readonly saving = signal(false);
    readonly formError = signal<string | null>(null);

    readonly form = buildCompanyForm(this.fb);
    readonly cityOptions = computed(() => this.cities().map((city) => ({ label: cityLabel(city), value: city.id })));

    constructor() {
        clearServerErrorsOnEdit(this.form);
        this.cityService.list().subscribe({
            next: (cities) => this.cities.set(cities),
            error: () => this.cities.set([])
        });
    }

    onSubmit(): void {
        if (this.saving()) {
            return;
        }
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.saving.set(true);
        this.formError.set(null);
        clearServerErrors(this.form);

        this.companyContext.create(toSaveRequest(this.form.getRawValue())).subscribe({
            next: () => {
                this.saving.set(false);
                this.toast.success('Company created', 'Now add your first car so customers can find you.');
                void this.router.navigate(['/fleet'], { queryParams: { welcome: 1 } });
            },
            error: (failure) => {
                this.saving.set(false);
                this.handleFailure(failure);
            }
        });
    }

    private handleFailure(failure: unknown): void {
        switch (errorCodeOf(failure)) {
            case 'COMPANY_ALREADY_EXISTS':
                // The guard's cached answer is stale — drop it and let the profile reload.
                this.companyContext.invalidate();
                void this.router.navigate(['/company']);
                return;
            case 'VALIDATION_FAILED': {
                const unmatched = applyFieldErrors(this.form, failure);
                this.formError.set(unmatched.length ? unmatched.join(' ') : null);
                return;
            }
            default:
                this.formError.set(errorMessage(failure, 'We could not create your company. Please try again.'));
        }
    }
}
