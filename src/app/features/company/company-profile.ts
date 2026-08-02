import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { forkJoin } from 'rxjs';
import { errorCodeOf, errorMessage } from '../../core/errors/api-error';
import { applyFieldErrors, clearServerErrors, clearServerErrorsOnEdit } from '../../core/forms/server-errors';
import { CityResponse, cityLabel, cityName } from '../../core/models/city.model';
import { CompanyResponse } from '../../core/models/company.model';
import { CityService } from '../../core/services/city.service';
import { CompanyContextService } from '../../core/services/company-context.service';
import { ToastService } from '../../core/services/toast.service';
import { FieldError } from '../../shared/components/field-error';
import { buildCompanyForm, resolveCityId, toSaveRequest } from './company-form';

@Component({
    selector: 'app-company-profile',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule, InputTextModule, TextareaModule, SelectModule, MessageModule, FieldError],
    templateUrl: './company-profile.html'
})
export class CompanyProfile {
    private fb = inject(FormBuilder);
    private cityService = inject(CityService);
    private companyContext = inject(CompanyContextService);
    private toast = inject(ToastService);

    readonly cities = signal<CityResponse[]>([]);
    readonly company = signal<CompanyResponse | null>(null);
    readonly loading = signal(true);
    readonly editing = signal(false);
    readonly saving = signal(false);
    readonly formError = signal<string | null>(null);

    readonly form = buildCompanyForm(this.fb);
    readonly cityOptions = computed(() => this.cities().map((city) => ({ label: cityLabel(city), value: city.id })));
    readonly displayCity = computed(() => cityName(this.company()?.city));

    constructor() {
        clearServerErrorsOnEdit(this.form);

        // Both are needed before the form can preselect the current city.
        forkJoin({ cities: this.cityService.list(), company: this.companyContext.resolve() }).subscribe({
            next: ({ cities, company }) => {
                this.cities.set(cities);
                this.company.set(company);
                if (company) {
                    this.resetForm(company, cities);
                }
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    startEditing(): void {
        const company = this.company();
        if (company) {
            this.resetForm(company, this.cities());
        }
        this.formError.set(null);
        this.editing.set(true);
    }

    cancelEditing(): void {
        this.editing.set(false);
        this.formError.set(null);
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

        this.companyContext.update(toSaveRequest(this.form.getRawValue())).subscribe({
            next: (company) => {
                this.saving.set(false);
                this.company.set(company);
                this.editing.set(false);
                this.toast.success('Company updated', 'Your details are live for customers.');
            },
            error: (failure) => {
                this.saving.set(false);
                if (errorCodeOf(failure) === 'VALIDATION_FAILED') {
                    const unmatched = applyFieldErrors(this.form, failure);
                    this.formError.set(unmatched.length ? unmatched.join(' ') : null);
                    return;
                }
                this.formError.set(errorMessage(failure, 'We could not save those changes. Please try again.'));
            }
        });
    }

    private resetForm(company: CompanyResponse, cities: CityResponse[]): void {
        this.form.setValue({
            name: company.name ?? '',
            description: company.description ?? '',
            // The response has no cityId, so it is resolved from the city itself.
            cityId: resolveCityId(company, cities),
            address: company.address ?? '',
            contactEmail: company.contactEmail ?? '',
            contactPhone: company.contactPhone ?? ''
        });
    }
}
